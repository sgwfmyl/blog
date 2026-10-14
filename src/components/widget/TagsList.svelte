<script lang="ts">
import { onMount } from "svelte";
import {
	type PrivateMetaItem,
	subscribePrivateMeta,
} from "@/utils/private-meta-store";

type Tag = { name: string; count: number };

let { tags = [] }: { tags?: Tag[] } = $props();
let list = $state<Tag[]>([...tags]);

/** 公开标签（构建期 props）与私密标签（登录后 store）合并：同名计数相加 */
function rebuild(privateItems: PrivateMetaItem[]) {
	const countMap = new Map(tags.map((t) => [t.name, t.count]));
	for (const it of privateItems) {
		for (const raw of it.tags ?? []) {
			const name = raw.trim();
			if (!name) continue;
			countMap.set(name, (countMap.get(name) ?? 0) + 1);
		}
	}
	list = [...countMap.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

onMount(() => {
	rebuild([]);
	return subscribePrivateMeta((s) => rebuild(s.items));
});
</script>

<div class="flex gap-2 flex-wrap">
  {#each list as t (t.name)}
    <a
      href={`/archive/?tag=${encodeURIComponent(t.name)}`}
      aria-label={`View all posts with the ${t.name.trim()} tag`}
      class="btn-regular h-8 text-sm px-3 rounded-lg"
    >
      {t.name.trim()}
    </a>
  {/each}
</div>
