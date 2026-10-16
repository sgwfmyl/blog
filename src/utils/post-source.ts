import { type CollectionEntry, getCollection } from "astro:content";
import type { PrivateMetaItem } from "@utils/private-contract";

export type PostEntry = CollectionEntry<"posts">;

/**
 * 公开文章统一取数入口（唯一权威来源）。
 *
 * 生产环境排除 draft，开发环境保留全部。归档、分类、标签、最近更新等
 * 聚合视图统一经此获取 posts，避免各处重复 `getCollection("posts", draft 过滤)`。
 *
 * 私有文章源合并见下方 getMergedPosts：仅在 SSR 登录态调用。
 */
export async function getPublicPosts(): Promise<PostEntry[]> {
	return getCollection("posts", ({ data }) =>
		import.meta.env.PROD ? data.draft !== true : true,
	);
}

/**
 * 私有 post 的聚合视图（轻量元数据，无 body/render，仅覆盖聚合所需的字段）。
 * 私有条目不置顶、无 order，默认按 date 参与列表排序。
 */
export type PrivatePostView = {
	id: string;
	data: {
		title: string;
		published: Date;
		tags: string[];
		order?: number | undefined;
		pinned?: boolean | undefined;
		/** 标记私来源，渲染层据此跳转 /private/<slug>/ */
		isPrivate: true;
	};
};

/** 私有 meta 中 type=post 的条目映射为聚合视图（纯函数，无运行时依赖）。 */
export function privateMetaToPosts(meta: PrivateMetaItem[]): PrivatePostView[] {
	return meta
		.filter((item) => item.type === "post")
		.map((item) => ({
			id: item.slug,
			data: {
				title: item.title,
				published: new Date(item.date),
				tags: item.tags,
				isPrivate: true,
			},
		}));
}

/**
 * 公开 + 私有 posts 合并（仅在 SSR 登录态调用，供阶段 4 路由改造的聚合视图使用）。
 *
 * 私有数据源经动态 import 延迟加载，避免把 `cloudflare:workers`（仅 workerd 运行时
 * 可解析）传导到构建期 prerender 的静态页面依赖链。
 */
export async function getMergedPosts(
	privateMeta?: PrivateMetaItem[],
): Promise<(PostEntry | PrivatePostView)[]> {
	const publicPosts = await getPublicPosts();
	const meta =
		privateMeta ??
		(await (await import("@utils/private-source")).getPrivateMetaFromKV());
	return [...publicPosts, ...privateMetaToPosts(meta)];
}
