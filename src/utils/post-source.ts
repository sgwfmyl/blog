import { type CollectionEntry, getCollection } from "astro:content";

export type PostEntry = CollectionEntry<"posts">;

/**
 * 公开文章统一取数入口（唯一权威来源）。
 *
 * 生产环境排除 draft，开发环境保留全部。归档、分类、标签、最近更新等
 * 聚合视图统一经此获取 posts，避免各处重复 `getCollection("posts", draft 过滤)`。
 *
 * 后续私有文章源将在此文件内合并（登录挂载 / 登出卸载），聚合视图无需改动。
 */
export async function getPublicPosts(): Promise<PostEntry[]> {
	return getCollection("posts", ({ data }) =>
		import.meta.env.PROD ? data.draft !== true : true,
	);
}
