import { env } from "cloudflare:workers";

/**
 * 管理员会话鉴权（D1 强一致 storage，阶段 3 引入，替代旧 HMAC 无状态 Cookie 方案）。
 *
 * 设计：
 * - 登录成功后生成 256 位随机 token，Cookie 存 token 原文，D1 只存 SHA-256 哈希
 *   （防 D1 泄露后反推 token 伪造 Cookie）。
 * - 强一致：删除 D1 记录即立刻失效，改密码/踢人可通过清空 sessions 表实现全端登出。
 * - 登录限流按客户端 IP 记入 D1 rate_limits 表（5 次失败冷却 30s）。
 *
 * 本模块只提供纯逻辑，Cookie 读写、请求上下文由调用方（src/pages/api/auth/*.ts）负责。
 */

export const AUTH_COOKIE_NAME = "blog_admin";
export const AUTH_COOKIE_TTL_SECONDS = 7 * 24 * 60 * 60;

const RATE_MAX_FAILURES = 5;
const RATE_COOLDOWN_SECONDS = 30;

type SessionRow = {
	token_hash: string;
	expires_at: number;
};

type RateLimitRow = {
	failures: number;
	until: number;
};

export type AuthResult =
	| { ok: true }
	| { ok: false; error: "invalid_password" }
	| { ok: false; error: "rate_limited"; retryAfter: number };

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

async function sha256Hex(input: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(input),
	);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function randomToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getRateLimit(ip: string): Promise<RateLimitRow | null> {
	return await env.DB.prepare(
		"SELECT failures, until FROM rate_limits WHERE ip = ?",
	)
		.bind(ip)
		.first<RateLimitRow>();
}

async function recordFailure(ip: string): Promise<void> {
	const current = await getRateLimit(ip);
	const now = Math.floor(Date.now() / 1000);
	if (current && current.until > now) return; // 已在冷却期
	const failures = (current ? current.failures : 0) + 1;
	await env.DB.prepare(
		"INSERT INTO rate_limits (ip, failures, until) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET failures = excluded.failures, until = excluded.until",
	)
		.bind(
			ip,
			failures,
			failures >= RATE_MAX_FAILURES ? now + RATE_COOLDOWN_SECONDS : 0,
		)
		.run();
}

async function clearFailures(ip: string): Promise<void> {
	await env.DB.prepare("DELETE FROM rate_limits WHERE ip = ?").bind(ip).run();
}

/** 密码校验 + 登录限流。成功返回 { ok: true }。 */
export async function authenticate(
	ip: string,
	password: string,
): Promise<AuthResult> {
	const rate = await getRateLimit(ip);
	const now = Math.floor(Date.now() / 1000);
	if (rate && rate.until > now) {
		return { ok: false, error: "rate_limited", retryAfter: rate.until - now };
	}

	if (!env.ADMIN_PASSWORD || !timingSafeEqual(password, env.ADMIN_PASSWORD)) {
		await recordFailure(ip);
		return { ok: false, error: "invalid_password" };
	}

	await clearFailures(ip);
	return { ok: true };
}

/** 创建会话，返回 Cookie 应写入的 token 原文（含过期秒数）。 */
export async function createSession(ip: string): Promise<{
	token: string;
	expiresAt: number;
}> {
	const token = randomToken();
	const tokenHash = await sha256Hex(token);
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + AUTH_COOKIE_TTL_SECONDS;
	await env.DB.prepare(
		"INSERT INTO sessions (token_hash, created_at, expires_at, ip) VALUES (?, ?, ?, ?)",
	)
		.bind(tokenHash, now, expiresAt, ip)
		.run();
	return { token, expiresAt };
}

/** 验证 token 是否对应未过期的会话（过期则顺手清理）。 */
export async function verifySession(
	token: string | undefined | null,
): Promise<boolean> {
	if (!token) return false;
	const tokenHash = await sha256Hex(token);
	const row = await env.DB.prepare(
		"SELECT token_hash, expires_at FROM sessions WHERE token_hash = ?",
	)
		.bind(tokenHash)
		.first<SessionRow>();
	if (!row) return false;
	if (row.expires_at < Math.floor(Date.now() / 1000)) {
		await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
			.bind(tokenHash)
			.run();
		return false;
	}
	return true;
}

/** 销毁会话（登出）。 */
export async function destroySession(
	token: string | undefined | null,
): Promise<void> {
	if (!token) return;
	const tokenHash = await sha256Hex(token);
	await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
		.bind(tokenHash)
		.run();
}
