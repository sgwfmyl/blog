<script lang="ts">
import { onMount } from "svelte";
import { buildCategoryTree, type CategoryNode } from "@/utils/category-tree";
import {
	type PrivateMetaItem,
	subscribePrivateMeta,
} from "@/utils/private-meta-store";

/** 分类树节点，private 标记用于区分登录后注入的私密分类 */
type TreeNode = CategoryNode & { private?: boolean };

let { tree = [], depth = 0 }: { tree?: TreeNode[]; depth?: number } = $props();
let nodes = $state<TreeNode[]>([...tree]);

function panelIdOf(node: CategoryNode): string {
	return `category-folder-panel-${node.fullPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

/** 私密分类节点 url 重写为归档页筛选（/archive/?category=xx，该页同样合并私密条目） */
function rewritePrivateUrls(ns: CategoryNode[]): CategoryNode[] {
	return ns.map((n) => ({
		...n,
		url: `/archive/?category=${encodeURIComponent(n.fullPath)}`,
		children: rewritePrivateUrls(n.children),
	}));
}

/** 用私密条目 category/tags 复用 buildCategoryTree 构建私密分类树 */
function buildPrivateNodes(items: PrivateMetaItem[]): TreeNode[] {
	const fakePosts = items
		.filter((it) => (it.category || "").trim())
		.map((it) => ({
			id: `${(it.category || "").replace(/^\/+|\/+$/g, "")}/${it.slug}`,
			tags: it.tags ?? [],
		}));
	if (fakePosts.length === 0) return [];
	return rewritePrivateUrls(buildCategoryTree(fakePosts)).map((n) => ({
		...n,
		private: true,
	}));
}

function rebuild(privateItems: PrivateMetaItem[]) {
	nodes = [...tree, ...buildPrivateNodes(privateItems)];
}

onMount(() => {
	rebuild([]);
	return subscribePrivateMeta((s) => rebuild(s.items));
});
</script>

<div class:list={["category-folders", depth > 0 && "category-folders--nested"]}>
	{#each nodes as node (node.fullPath + node.private)}
		{#if node.children.length > 0}
			<details class="category-folder" data-depth={depth} data-private={node.private || undefined}>
				<summary class="category-folder__summary" aria-controls={panelIdOf(node)}>
					<span class="category-folder__icon" aria-hidden="true">
						<svg class="category-folder__icon-closed" width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
						<svg class="category-folder__icon-open" width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
					</span>
					<span class="category-folder__heading">
						<strong class="category-folder__name">
							{node.name}
							{#if node.private}<span class="category-folder__private-badge" title="私密内容">密</span>{/if}
						</strong>
						<span class="category-folder__meta">{node.count} 篇 · {node.children.length} 个子目录</span>
					</span>
					<svg class="category-folder__chevron" width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
				</summary>
				<div id={panelIdOf(node)} class="category-folder__content category-folder__content--tree">
					<a href={node.url} class="category-folder__view-all" aria-label={`查看${node.fullPath}分类的所有文章`}>
						<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
						查看 {node.name} 全部 {node.count} 篇
					</a>
					<svelte:self tree={node.children} depth={depth + 1} />
				</div>
			</details>
		{:else}
			<a href={node.url} class="category-folder category-folder--leaf" data-private={node.private || undefined} aria-label={`查看${node.fullPath}分类`}>
				<span class="category-folder__summary category-folder__summary--leaf">
					<span class="category-folder__icon" aria-hidden="true">
						<svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
					</span>
					<span class="category-folder__heading">
						<strong class="category-folder__name">
							{node.name}
							{#if node.private}<span class="category-folder__private-badge" title="私密内容">密</span>{/if}
						</strong>
						<span class="category-folder__meta">{node.count} 篇</span>
					</span>
				</span>
			</a>
		{/if}
	{/each}
</div>
