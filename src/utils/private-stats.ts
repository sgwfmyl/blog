/**
 * 私密内容统计口径（客户端合并用）
 *
 * 各统计组件在服务端基于公开内容集合算出基准值，登录后订阅
 * private-meta-store，用本模块的纯函数把私密条目折算成增量，
 * 再叠加进 DOM 统计数字（见各统计组件的内联脚本）。
 *
 * 类型映射口径（与 SiteStats/PortalStats/LifeStats 等组件对齐）：
 * - post    → 文章
 * - moment  → 说说/动态
 * - bangumi → 记录次数（书影音）
 * - life    → 足迹/生活记录
 */

import type { PrivateMetaItem } from "./private-meta-store";

export type PrivateStatsBundle = {
	/** 私密文章条目 */
	posts: PrivateMetaItem[];
	/** 私密说说条目 */
	moments: PrivateMetaItem[];
	/** 私密书影音条目（bangumi） */
	bangumi: PrivateMetaItem[];
	/** 私密生活条目（life） */
	life: PrivateMetaItem[];
	/** 私密分类（去重、去空、排序） */
	categories: string[];
	/** 私密标签（去重、去空、排序） */
	tags: string[];
	/** 私密条目的最大日期（ISO 字符串；无私密条目时为 null） */
	latestDate: string | null;
};

export function buildPrivateStats(
	items: PrivateMetaItem[],
): PrivateStatsBundle {
	const posts: PrivateMetaItem[] = [];
	const moments: PrivateMetaItem[] = [];
	const bangumi: PrivateMetaItem[] = [];
	const life: PrivateMetaItem[] = [];
	const categorySet = new Set<string>();
	const tagSet = new Set<string>();
	let latestDate: string | null = null;

	for (const item of items) {
		switch (item.type) {
			case "post":
				posts.push(item);
				break;
			case "moment":
				moments.push(item);
				break;
			case "bangumi":
				bangumi.push(item);
				break;
			case "life":
				life.push(item);
				break;
		}
		if (item.category) categorySet.add(item.category);
		for (const tag of item.tags ?? []) {
			if (tag) tagSet.add(tag);
		}
		if (item.date && (!latestDate || item.date > latestDate)) {
			latestDate = item.date;
		}
	}

	return {
		posts,
		moments,
		bangumi,
		life,
		categories: Array.from(categorySet).sort(),
		tags: Array.from(tagSet).sort(),
		latestDate,
	};
}
