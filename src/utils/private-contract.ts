/**
 * 私有内容元数据契约（阶段 4 抽取共享）。
 *
 * 本模块只含「类型定义 + 纯校验逻辑」，**无任何运行时依赖**（不 import cloudflare:workers、
 * 不 import node 原生模块），供「构建期脚本」与「运行时路由」共同引用。
 */

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
	/**
	 * 访问路由（浏览器地址栏路径），缺省 /private/<slug>/。
	 * 阶段 4 起取代原 url 字段：私有内容「存储位置与访问路由解耦」，
	 * route 可落在白名单前缀（如 /diary/<slug>/）下，由 SSR 在映射位置按登录态渲染。
	 */
	route?: string;
};

/** 预渲染正文产物（存 KV `private:html:<slug>`） */
export type PrivateHtmlPayload = {
	html: string;
	headings: { depth: number; text: string; slug: string }[];
};

export function isValidPrivateMetaItem(value: unknown): value is PrivateMetaItem {
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
		(item.route === undefined || typeof item.route === "string")
	);
}
