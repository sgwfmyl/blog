<script lang="ts">
import { onMount } from "svelte";
import {
	type PrivateMetaItem,
	subscribePrivateMeta,
} from "@/utils/private-meta-store";

type Category = { name: string; count: number; url: string };

let { categories = [] }: { categories?: Category[] } = $props();
let list = $state<Category[]>([...categories]);

/**
 * 公开分类（构建期 props）与私密分类（登录后 store）合并：
 * 同名分类计数相加；私密条目若无分类则跳过。私密分类链接指向归档页
 * （/archive/?category=xx，该页合并后同样能筛选出私密条目）。
 */
function rebuild(privateItems: PrivateMetaItem[]) {
	const countMap = new Map(categories.map((c) => [c.name, c.count]));
	const urlMap = new Map(categories.map((c) => [c.name, c.url]));
	for (const it of privateItems) {
		const name = (it.category || "").trim();
		if (!name) continue;
		countMap.set(name, (countMap.get(name) ?? 0) + 1);
		if (!urlMap.has(name)) {
			urlMap.set(name, `/archive/?category=${encodeURIComponent(name)}`);
		}
	}
	list = [...countMap.entries()]
		.map(([name, count]) => ({
			name,
			count,
			url: urlMap.get(name) ?? `/archive/?category=${encodeURIComponent(name)}`,
		}))
		.sort(
			(a, b) =>
				b.count - a.count ||
				a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
		);
}

onMount(() => {
	rebuild([]);
	return subscribePrivateMeta((s) => rebuild(s.items));
});
</script>

{#each list as c (c.name)}
  <a href={c.url} aria-label={`View all posts in the ${c.name.trim()} category`}>
    <button
      class="w-full h-10 rounded-lg bg-none hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active) transition-all pl-2 hover:pl-3 text-neutral-700 hover:text-(--primary) dark:text-neutral-300 dark:hover:text-(--primary)"
    >
      <div class="flex items-center justify-between relative mr-2">
        <div class="overflow-hidden text-left whitespace-nowrap text-ellipsis">{c.name.trim()}</div>
        <div class="transition px-2 h-7 ml-4 min-w-8 rounded-lg text-sm font-bold text-(--btn-content) dark:text-neutral-900 bg-[oklch(0.95_0_0)] dark:bg-(--primary) flex items-center justify-center">{c.count}</div>
      </div>
    </button>
  </a>
{/each}
