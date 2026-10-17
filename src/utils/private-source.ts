import { env } from "cloudflare:workers";

import {
	isValidPrivateMetaItem,
	type PrivateHtmlPayload,
	type PrivateMetaItem,
} from "./private-contract";

/**
 * 私有内容运行时访问层（阶段 4 定稿：SSG 方案）。
 *
 * 定稿架构：私有内容的「渲染」在构建期完成（scripts/私有预渲染/index.mjs），产物写入 KV；
 * 本模块只负责**运行时**从 KV 读回预渲染产物。运行时**不再拉 GitHub、不再渲染 markdown**。
 *
 * KV 键约定：
 * - `private:html:<slug>` → 预渲染正文 `{ html, headings }`（供映射路由 / 详情页）
 * - `private:meta`       → 私有元数据数组（供归档/目录/`/private/` 列表登录态读取）
 *
 * 构建期拉取 GitHub 的逻辑见 scripts/私有预渲染/index.mjs（Node 环境，用 process.env）。
 */

export type { PrivateHtmlPayload, PrivateMetaItem };

export { isValidPrivateMetaItem };

/** 从 KV 读预渲染正文（映射路由 / 详情页用）。未命中返回 null。 */
export async function getPrivateHtmlFromKV(
	slug: string,
): Promise<PrivateHtmlPayload | null> {
	const raw = await env.ADMIN_KV.get(`private:html:${slug}`);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as PrivateHtmlPayload;
	} catch {
		return null;
	}
}

/** 从 KV 读私有元数据数组（归档/目录/`/private/` 列表用）。未命中或格式非法返回空数组。 */
export async function getPrivateMetaFromKV(): Promise<PrivateMetaItem[]> {
	const raw = await env.ADMIN_KV.get("private:meta");
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidPrivateMetaItem);
	} catch {
		return [];
	}
}

// ---------- 私有条目的列表视图（登录态合并进公开列表页） ----------

/**
 * 私有 bangumi 条目的聚合视图（books / movies-games 列表页登录态合并用）。
 * 展示字段（封面/评分/状态/子分类/短评）来自 KV 正文的 frontmatter（对齐公开 bangumi schema），
 * `private:meta` 只有摘要字段，故需逐条读 `private:html:<slug>` 的 frontmatter。
 */
export type PrivateBangumiEntry = {
	slug: string;
	title: string;
	name_cn: string;
	category: "book" | "anime" | "game";
	subcategory?: string;
	status: number;
	score: number;
	comment: string;
	tags: string[];
	date: Date;
	image: string;
	/** 详情跳转：route（如 /diary/<slug>/）缺省 /private/<slug>/ */
	link: string;
};

/** 私有 post 条目的聚合视图（categories 列表/详情页登录态合并用）。 */
export type PrivatePostEntry = {
	slug: string;
	title: string;
	date: Date;
	tags: string[];
	category: string | null;
	description: string;
	image: string;
	link: string;
};

function readPrivateFrontmatter(
	payload: PrivateHtmlPayload | null,
): Record<string, unknown> {
	return (payload?.frontmatter ?? {}) as Record<string, unknown>;
}

/** 读私有 bangumi 条目完整视图（含 frontmatter 展示字段）。仅在 SSR 登录态调用。 */
export async function getPrivateBangumiFromKV(): Promise<
	PrivateBangumiEntry[]
> {
	const meta = await getPrivateMetaFromKV();
	const bangumiMeta = meta.filter((item) => item.type === "bangumi");
	return Promise.all(
		bangumiMeta.map(async (item) => {
			const payload = await getPrivateHtmlFromKV(item.slug);
			const fm = readPrivateFrontmatter(payload);
			const rawCategory =
				typeof fm.category === "string" ? fm.category : "anime";
			const category: PrivateBangumiEntry["category"] =
				rawCategory === "book" || rawCategory === "game"
					? rawCategory
					: "anime";
			return {
				slug: item.slug,
				title: item.title,
				name_cn: typeof fm.name_cn === "string" ? fm.name_cn : "",
				category,
				subcategory:
					typeof fm.subcategory === "string" ? fm.subcategory : undefined,
				status: typeof fm.status === "number" ? fm.status : 2,
				score: typeof fm.score === "number" ? fm.score : 0,
				comment: typeof fm.comment === "string" ? fm.comment : "",
				tags: item.tags ?? [],
				date: new Date(item.date),
				image: typeof fm.image === "string" ? fm.image : "",
				link: item.route ?? `/private/${item.slug}/`,
			};
		}),
	);
}

/** 读私有 post 条目完整视图（含 frontmatter 的 description/image）。仅在 SSR 登录态调用。 */
export async function getPrivatePostsFromKV(): Promise<PrivatePostEntry[]> {
	const meta = await getPrivateMetaFromKV();
	const postMeta = meta.filter((item) => item.type === "post");
	return Promise.all(
		postMeta.map(async (item) => {
			const payload = await getPrivateHtmlFromKV(item.slug);
			const fm = readPrivateFrontmatter(payload);
			return {
				slug: item.slug,
				title: item.title,
				date: new Date(item.date),
				tags: item.tags ?? [],
				category: item.category ?? null,
				description: typeof fm.description === "string" ? fm.description : "",
				image: typeof fm.image === "string" ? fm.image : "",
				link: item.route ?? `/private/${item.slug}/`,
			};
		}),
	);
}
