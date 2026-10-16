import { env } from "cloudflare:workers";

import {
	type PrivateHtmlPayload,
	type PrivateMetaItem,
	isValidPrivateMetaItem,
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

export type { PrivateMetaItem, PrivateHtmlPayload };

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
