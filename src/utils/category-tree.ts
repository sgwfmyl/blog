import { removeFileExtension } from "./url-utils";

export type CategoryNode = {
	name: string;
	fullPath: string;
	count: number;
	directCount: number;
	url: string;
	children: CategoryNode[];
	tags: { name: string; count: number; url: string }[];
};

export function normalizeCategory(p: string): string {
	return p
		.trim()
		.replace(/^\/+|\/+$/g, "")
		.replace(/\/+/g, "/");
}

export function getCategoryFromId(id: string): string {
	const normalized = id.replace(/\\/g, "/");
	const noExt = removeFileExtension(normalized);
	const slash = noExt.lastIndexOf("/");
	if (slash < 0) return "";
	return normalizeCategory(noExt.slice(0, slash));
}

export function isSubCategory(child: string, parent: string): boolean {
	const c = normalizeCategory(child);
	const p = normalizeCategory(parent);
	if (!p) return false;
	return c === p || c.startsWith(`${p}/`);
}

function localGetCategoryUrl(category: string): string {
	const norm = normalizeCategory(category);
	if (!norm) return "/categories/uncategorized/";
	return `/categories/${norm.split("/").map(encodeURIComponent).join("/")}/`;
}
function localGetTagUrl(tag: string): string {
	if (!tag) return "/archive/";
	return `/archive/?tag=${encodeURIComponent(tag.trim())}`;
}

export function getCategoryTrail(
	fullPath: string,
): { name: string; fullPath: string; url: string }[] {
	const norm = normalizeCategory(fullPath);
	if (!norm) return [];
	const parts = norm.split("/");
	return parts.map((_, i) => {
		const fp = parts.slice(0, i + 1).join("/");
		return { name: parts[i], fullPath: fp, url: localGetCategoryUrl(fp) };
	});
}

export function buildCategoryTree(
	posts: { id: string; tags: string[]; category?: string }[],
): CategoryNode[] {
	type Raw = {
		directCount: number;
		count: number;
		tagCounts: Map<string, number>;
	};
	const map = new Map<string, Raw>();

	for (const post of posts) {
		// 私有条目（登录态合并）直接给定 category；公开条目由文件夹路径推导
		const full = post.category
			? normalizeCategory(post.category)
			: getCategoryFromId(post.id);
		if (!full) continue;
		const parts = full.split("/");
		// 累加每个前缀的 count（含子孙）
		for (let i = 1; i <= parts.length; i++) {
			const pref = parts.slice(0, i).join("/");
			const entry = map.get(pref) ?? {
				directCount: 0,
				count: 0,
				tagCounts: new Map(),
			};
			entry.count += 1;
			if (i === parts.length) entry.directCount += 1;
			map.set(pref, entry);
		}
		// 仅在叶子层统计 tags（按直接归属，避免父级重复计数污染）
		const leaf = map.get(full);
		if (leaf) {
			const tagSet = new Set(post.tags.map((t) => t.trim()).filter(Boolean));
			for (const tag of tagSet) {
				leaf.tagCounts.set(tag, (leaf.tagCounts.get(tag) ?? 0) + 1);
			}
		}
	}

	// 建树
	const nodeMap = new Map<string, CategoryNode>();
	for (const [fullPath, raw] of map.entries()) {
		const parts = fullPath.split("/");
		const name = parts[parts.length - 1];
		nodeMap.set(fullPath, {
			name,
			fullPath,
			count: raw.count,
			directCount: raw.directCount,
			url: localGetCategoryUrl(fullPath),
			children: [],
			tags: [...raw.tagCounts.entries()]
				.map(([tagName, count]) => ({
					name: tagName,
					count,
					url: localGetTagUrl(tagName),
				}))
				.sort(
					(a, b) =>
						b.count - a.count ||
						a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
				),
		});
	}

	const roots: CategoryNode[] = [];
	for (const [fullPath, node] of nodeMap.entries()) {
		const slash = fullPath.lastIndexOf("/");
		if (slash < 0) {
			roots.push(node);
		} else {
			const parentPath = fullPath.slice(0, slash);
			const parent = nodeMap.get(parentPath);
			if (parent) parent.children.push(node);
			else roots.push(node);
		}
	}

	const sortNodes = (nodes: CategoryNode[]) => {
		nodes.sort((a, b) => {
			const aHas = a.children.length > 0 ? 1 : 0;
			const bHas = b.children.length > 0 ? 1 : 0;
			if (bHas !== aHas) return bHas - aHas;
			if (b.count !== a.count) return b.count - a.count;
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});
		for (const n of nodes) sortNodes(n.children);
	};
	sortNodes(roots);
	return roots;
}
