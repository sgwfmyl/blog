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
	/**
	 * 正文 frontmatter（构建期用 gray-matter 解析后随正文一起落 KV）。
	 * 供详情页按 type 分派渲染读取 type 专属字段（如 bangumi 的 image/score/status、
	 * moment 的 images/location）。旧 KV 产物可能缺失，消费方须 `?? {}` 兜底。
	 */
	frontmatter?: Record<string, unknown>;
};

export function isValidPrivateMetaItem(
	value: unknown,
): value is PrivateMetaItem {
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

/** 私有内容访问路由的白名单前缀（每个前缀一个 SSR rest 路由文件）。 */
export const PRIVATE_ROUTE_PREFIXES = ["diary"];

/**
 * 规范化访问路由（映射兜底路由用）。
 * 流程：百分号解码 → 拒绝查询串/`..`/`//`/空段/控制字符 → 统一尾部斜杠。
 * 返回规范化后的路由（如 "/diary/hello/"），非法则返回 null。
 */
export function normalizeRoute(rawPath: string): string | null {
	let path = rawPath;
	// 去掉查询串
	const qIdx = path.indexOf("?");
	if (qIdx !== -1) path = path.slice(0, qIdx);

	// 百分号解码（一次）；解码后再校验，防编码绕过
	try {
		path = decodeURIComponent(path);
	} catch {
		return null;
	}

	// 拒绝控制字符
	// eslint-disable-next-line no-control-regex
	// biome-ignore lint/suspicious/noControlCharactersInRegex: 需显式匹配 C0/DEL 控制字符做路径校验
	if (/[\u0000-\u001f\u007f]/.test(path)) return null;
	// 拒绝路径穿越与空段
	if (path.includes("..") || path.includes("//")) return null;
	// 必须以 / 开头
	if (!path.startsWith("/")) return null;

	// 统一尾部斜杠
	if (!path.endsWith("/")) path += "/";

	return path;
}

/** 校验私有 slug（拒绝空段、首尾斜杠、..、控制字符）。 */
export function isValidPrivateSlug(slug: string): boolean {
	if (!slug || slug.length === 0) return false;
	if (slug.startsWith("/") || slug.endsWith("/")) return false;
	if (slug.includes("..") || slug.includes("//")) return false;
	// eslint-disable-next-line no-control-regex
	// biome-ignore lint/suspicious/noControlCharactersInRegex: 需显式匹配 C0/DEL 控制字符做 slug 校验
	if (/[\u0000-\u001f\u007f]/.test(slug)) return false;
	return true;
}

/** 从元数据按规范化 route 查找条目（映射兜底路由用）。 */
export function getPrivateEntryByRoute(
	meta: PrivateMetaItem[],
	normalizedRoute: string,
): PrivateMetaItem | undefined {
	return meta.find((item) => {
		const route = item.route ?? `/private/${item.slug}/`;
		return normalizeRoute(route) === normalizedRoute;
	});
}
