/**
 * Cloudflare Worker：管理员认证 + 私密内容代理 + 静态资产回退
 *
 * 职责边界：
 * - 路径以 /api/ 开头 → 走认证 / 私密内容 API（本文件处理）
 * - 其余路径 → env.ASSETS.fetch() 原样托管 dist 静态产物（含 404-page 行为）
 *
 * 运行时 Secrets（配到 Worker，非构建期环境变量）：
 * - ADMIN_PASSWORD：登录密码
 * - AUTH_SECRET：Cookie HMAC 签名密钥（≥32 字节随机串，丢失需重新登录）
 * - GH_PAT：GitHub 私有仓库只读 PAT（仅授予内容仓库读取权限）
 * - GH_OWNER / GH_REPO：私有仓库归属，如 sgwfmyl / blog-private
 *
 * 内容源约定（私有仓库内）：
 * - private/nav.json         隐藏导航条目（数组）
 * - private/meta.json        私密内容统一元数据索引（数组），供前端登录后与公开内容融合：
 *                            [{ slug, type, title, date, tags, category?, url? }]
 *                            - slug：详情标识，可含子目录路径（如 "私密/观影记录"），
 *                              对应 private/pages/<slug>.md
 *                            - type：post | moment | bangumi | life（与公开归档类型对齐）
 *                            - url：可选，默认 /private/<slug>/
 * - private/pages/index.json 私密文章索引 [{slug,title,date}]（旧结构，兼容保留）
 * - private/pages/<slug>.md  私密文章 markdown（frontmatter title/date/description + 正文，
 *                            slug 支持子目录路径，如 private/pages/私密/xxx.md）
 */

/** 最小化 KV / ASSETS 类型，避免引入 @cloudflare/workers-types 依赖 */
interface MinimalKV {
	get(key: string): Promise<string | null>;
	put(
		key: string,
		value: string,
		options?: { expirationTtl?: number },
	): Promise<void>;
	delete(key: string): Promise<void>;
}

interface MinimalAssets {
	fetch(request: Request): Promise<Response>;
}

interface Env {
	ASSETS: MinimalAssets;
	ADMIN_KV: MinimalKV;
	ADMIN_PASSWORD: string;
	AUTH_SECRET: string;
	GH_PAT: string;
	GH_OWNER: string;
	GH_REPO: string;
}

const COOKIE_NAME = "blog_admin";
const COOKIE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天免输
const KV_CACHE_TTL = 300; // GitHub 内容缓存 5 分钟，规避 API 限流
const RATE_MAX_FAILURES = 5;
const RATE_COOLDOWN_SECONDS = 30;
const SLUG_PATTERN = /^[\w\u4e00-\u9fa5\-/]+$/;

/* ------------------------------------------------------------------ */
/* 工具函数                                                             */
/* ------------------------------------------------------------------ */

function json(data: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			"content-type": "application/json; charset=utf-8",
			...(init?.headers ?? {}),
		},
	});
}

function parseCookie(header: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const part of header.split(";")) {
		const eq = part.indexOf("=");
		if (eq < 0) continue;
		out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
	}
	return out;
}

/** 常量时间比较（长度不一致直接不等；对登录场景足够） */
function timingSafeEqual(a: string, b: string): boolean {
	const aBuf = new TextEncoder().encode(a);
	const bBuf = new TextEncoder().encode(b);
	if (aBuf.byteLength !== bBuf.byteLength) return false;
	let diff = 0;
	for (let i = 0; i < aBuf.byteLength; i++) {
		diff |= aBuf[i] ^ bBuf[i];
	}
	return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(message),
	);
	return [...new Uint8Array(signature)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function createSessionToken(env: Env): Promise<string> {
	const exp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
	const signature = await hmacHex(env.AUTH_SECRET, `${COOKIE_NAME}:${exp}`);
	return `${exp}.${signature}`;
}

async function isAdminRequest(env: Env, request: Request): Promise<boolean> {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return false;
	const value = parseCookie(cookieHeader)[COOKIE_NAME];
	if (!value) return false;
	const dot = value.indexOf(".");
	if (dot < 0) return false;
	const exp = Number(value.slice(0, dot));
	const signature = value.slice(dot + 1);
	if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
		return false;
	}
	const expected = await hmacHex(env.AUTH_SECRET, `${COOKIE_NAME}:${exp}`);
	return timingSafeEqual(expected, signature);
}

/* ------------------------------------------------------------------ */
/* 登录限流（按客户端 IP，KV 计数；5 次失败冷却 30s）                      */
/* ------------------------------------------------------------------ */

async function checkRateLimit(
	env: Env,
	ip: string,
): Promise<{ blocked: boolean; retryAfter: number }> {
	const raw = await env.ADMIN_KV.get(`rl:${ip}`);
	if (raw) {
		const parsed = JSON.parse(raw) as { until: number };
		if (parsed.until > Date.now()) {
			return {
				blocked: true,
				retryAfter: Math.ceil((parsed.until - Date.now()) / 1000),
			};
		}
	}
	return { blocked: false, retryAfter: 0 };
}

async function recordFailure(env: Env, ip: string): Promise<void> {
	const key = `rl:${ip}`;
	const raw = await env.ADMIN_KV.get(key);
	const previous = raw
		? (JSON.parse(raw) as { count: number; until: number })
		: null;
	if (previous && previous.until > Date.now()) return; // 已在冷却期
	const count = (previous?.count ?? 0) + 1;
	const until =
		count >= RATE_MAX_FAILURES ? Date.now() + RATE_COOLDOWN_SECONDS * 1000 : 0;
	await env.ADMIN_KV.put(
		key,
		JSON.stringify({ count: count >= RATE_MAX_FAILURES ? 0 : count, until }),
		{ expirationTtl: RATE_COOLDOWN_SECONDS * 2 },
	);
}

async function clearFailures(env: Env, ip: string): Promise<void> {
	await env.ADMIN_KV.delete(`rl:${ip}`);
}

/* ------------------------------------------------------------------ */
/* GitHub 私有仓库内容拉取（Contents API + KV 缓存）                     */
/* ------------------------------------------------------------------ */

async function fetchGitHubFile(env: Env, path: string): Promise<string> {
	const cacheKey = `gh:${path}`;
	const cached = await env.ADMIN_KV.get(cacheKey);
	if (cached) return cached;

	const url = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/contents/${path}`;
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${env.GH_PAT}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "blog-worker",
		},
	});
	if (!response.ok) {
		throw new Error(`GitHub API ${response.status}`);
	}
	const payload = (await response.json()) as {
		content?: string;
		type?: string;
	};
	if (payload.type !== "file" || typeof payload.content !== "string") {
		throw new Error("GitHub 返回的不是文件内容");
	}
	const binary = atob(payload.content.replace(/\s+/g, ""));
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	const content = new TextDecoder().decode(bytes);

	await env.ADMIN_KV.put(cacheKey, content, { expirationTtl: KV_CACHE_TTL });
	return content;
}

/* ------------------------------------------------------------------ */
/* /api 路由                                                            */
/* ------------------------------------------------------------------ */

async function handleLogin(env: Env, request: Request): Promise<Response> {
	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

	const { blocked, retryAfter } = await checkRateLimit(env, ip);
	if (blocked) {
		return json(
			{ ok: false, error: "rate_limited", retryAfter },
			{ status: 429 },
		);
	}

	let password = "";
	try {
		const body = (await request.json()) as { password?: unknown };
		password = typeof body.password === "string" ? body.password : "";
	} catch {
		// 非 JSON body 视为空密码
	}

	if (!env.ADMIN_PASSWORD || !timingSafeEqual(password, env.ADMIN_PASSWORD)) {
		await recordFailure(env, ip);
		return json({ ok: false, error: "invalid_password" }, { status: 401 });
	}

	await clearFailures(env, ip);
	const token = await createSessionToken(env);
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"set-cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_TTL_SECONDS}`,
		},
	});
}

async function handleLogout(): Promise<Response> {
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"set-cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
		},
	});
}

async function handleMe(env: Env, request: Request): Promise<Response> {
	const admin = await isAdminRequest(env, request);
	return json({ ok: true, admin });
}

async function handlePrivate(
	env: Env,
	request: Request,
	url: URL,
): Promise<Response> {
	if (!(await isAdminRequest(env, request))) {
		return json({ ok: false, error: "unauthorized" }, { status: 401 });
	}

	const path = url.pathname;
	let ghPath: string;

	if (path === "/api/private/nav") {
		ghPath = "private/nav.json";
	} else if (path === "/api/private/meta") {
		ghPath = "private/meta.json";
	} else if (path === "/api/private/pages") {
		ghPath = "private/pages/index.json";
	} else if (path.startsWith("/api/private/pages/")) {
		const slug = decodeURIComponent(
			path.slice("/api/private/pages/".length),
		).replace(/\/+$/, "");
		if (!SLUG_PATTERN.test(slug) || slug.includes("..")) {
			return json({ ok: false, error: "bad_slug" }, { status: 400 });
		}
		ghPath = `private/pages/${slug}.md`;
	} else {
		return json({ ok: false, error: "not_found" }, { status: 404 });
	}

	try {
		const content = await fetchGitHubFile(env, ghPath);
		if (ghPath.endsWith(".json")) {
			return json({ ok: true, data: JSON.parse(content) });
		}
		return json({ ok: true, data: content });
	} catch (error) {
		return json(
			{
				ok: false,
				error: "fetch_failed",
				detail: String(error instanceof Error ? error.message : error),
			},
			{ status: 502 },
		);
	}
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */
/* ------------------------------------------------------------------ */

const worker: {
	fetch(request: Request, env: Env): Promise<Response>;
} = {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/api/")) {
			if (url.pathname === "/api/auth/login" && request.method === "POST") {
				return handleLogin(env, request);
			}
			if (url.pathname === "/api/auth/logout" && request.method === "POST") {
				return handleLogout();
			}
			if (url.pathname === "/api/auth/me" && request.method === "GET") {
				return handleMe(env, request);
			}
			if (
				url.pathname.startsWith("/api/private/") &&
				request.method === "GET"
			) {
				return handlePrivate(env, request, url);
			}
			return json({ ok: false, error: "not_found" }, { status: 404 });
		}

		// 私密空间：/private 与 /private/<slug> 都返回同一个静态壳（构建期只生成 /private/）。
		// 详情内容由页面脚本按 pathname 提取 slug 后经 /api/private/pages/<slug> 动态加载，
		// 这样任意 slug 的 URL 都能打开（刷新/分享链接可用），且内容不进部署产物。
		if (url.pathname === "/private" || url.pathname.startsWith("/private/")) {
			const shellUrl = new URL("/private/", url.origin);
			return env.ASSETS.fetch(new Request(shellUrl, request));
		}

		// 其余路径回退到静态资产（含 404-page 行为）
		return env.ASSETS.fetch(request);
	},
};

export default worker;
