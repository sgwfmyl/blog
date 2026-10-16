import { env } from "cloudflare:workers";

/**
 * 私有内容数据源访问层（阶段 3 引入）。
 *
 * 私有内容仍存放在独立私有 GitHub 仓库（沿用旧方案），通过 Contents API 按需拉取，
 * 经 ADMIN_KV 缓存 5 分钟规避 API 限流。本模块同时负责私有元数据（private/meta.json）
 * 的拉取与校验，供 SSR 登录态下与公开内容融合使用。
 *
 * 数据契约见私有仓库 private/meta.json，字段与公开 Content Collection 对齐（去重
 * 本文/图片/封面等富媒体字段，仅保留聚合所需元数据）。
 */

const KV_CACHE_TTL = 300; // GitHub 内容缓存 5 分钟

export type PrivateMetaItem = {
	/** 详情标识，可含子目录路径（如 "私密/观影记录"） */
	slug: string;
	/** 与公开归档类型对齐：post | moment | bangumi | life */
	type: "post" | "moment" | "bangumi" | "life";
	title: string;
	/** ISO 日期或日期时间，如 "2026-10-15" / "2026-10-15T12:00:00Z" */
	date: string;
	tags: string[];
	/** 分类路径，可含 "/"（如 "私密/影视"）；缺省为空 */
	category?: string | null;
	/** 可选详情页 URL，缺省 /private/<slug>/ */
	url?: string;
};

function decodeGitHubContent(payload: {
	content?: string;
	type?: string;
}): string {
	if (payload.type !== "file" || typeof payload.content !== "string") {
		throw new Error("GitHub 返回的不是文件内容");
	}
	// base64 容忍换行/空白（Contents API 返回带换行的 base64）
	const binary = atob(payload.content.replace(/\s+/g, ""));
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

/** 拉取私有仓库指定路径的文件内容（KV 缓存）。 */
async function fetchGitHubFile(path: string): Promise<string> {
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
	const content = decodeGitHubContent(
		(await response.json()) as { content?: string; type?: string },
	);
	await env.ADMIN_KV.put(cacheKey, content, {
		expirationTtl: KV_CACHE_TTL,
	});
	return content;
}

function isValidPrivateMetaItem(value: unknown): value is PrivateMetaItem {
	if (!value || typeof value !== "object") return false;
	const item = value as Partial<PrivateMetaItem>;
	return (
		typeof item.slug === "string" &&
		(item.type === "post" ||
			item.type === "moment" ||
			item.type === "bangumi" ||
			item.type === "life") &&
		typeof item.title === "string" &&
		typeof item.date === "string" &&
		Array.isArray(item.tags) &&
		item.tags.every((tag) => typeof tag === "string") &&
		(item.category === undefined ||
			item.category === null ||
			typeof item.category === "string") &&
		(item.url === undefined || typeof item.url === "string")
	);
}

/**
 * 拉取私有内容统一元数据索引（private/meta.json）。
 * 仓库未就绪或 GitHub 临时不可用时降级为空数组（公开站点不受影响）。
 */
export async function getPrivateMeta(): Promise<PrivateMetaItem[]> {
	try {
		const content = await fetchGitHubFile("private/meta.json");
		const parsed: unknown = JSON.parse(content);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidPrivateMetaItem);
	} catch {
		return [];
	}
}
