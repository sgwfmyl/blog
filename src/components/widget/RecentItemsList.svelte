<script lang="ts">
import { onMount } from "svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import {
	type PrivateMetaItem,
	subscribePrivateMeta,
} from "@/utils/private-meta-store";

type RecentItem = {
	type: string;
	title: string;
	date: Date;
	url: string;
	image: string;
	id: string;
	private?: boolean;
};

let { items = [] }: { items?: RecentItem[] } = $props();
let list = $state<RecentItem[]>([]);

const defaultImage = "https://img.tsh520.cn/file/blog/album/武侠风/22.webp";

/** Astro 序列化 props 时 Date 会变成 ISO 字符串，统一规整为 Date */
function normalize(it: RecentItem): RecentItem {
	return { ...it, date: new Date(it.date) };
}

function toRecentItem(it: PrivateMetaItem): RecentItem {
	return {
		type: it.type,
		title: it.title,
		date: new Date(it.date),
		url: it.url ?? `/private/${it.slug}/`,
		image: defaultImage,
		id: it.slug,
		private: true,
	};
}

function typeLabelOf(type: string): string {
	switch (type) {
		case "post":
			return i18n(I18nKey.recentPosts);
		case "moment":
			return i18n(I18nKey.recentMoments);
		case "bangumi":
			return i18n(I18nKey.recentLife);
		case "life-notebook":
			return "笔记";
		default:
			return type;
	}
}

function formatDate(d: Date): string {
	return d.toISOString().substring(0, 10);
}

function rebuild(privateItems: PrivateMetaItem[]) {
	list = [...items.map(normalize), ...privateItems.map(toRecentItem)]
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, 10);
}

onMount(() => {
	rebuild([]);
	return subscribePrivateMeta((s) => rebuild(s.items));
});
</script>

<div class="flex flex-col" id="recent-items-list">
	{#each list as item, i (item.id)}
		<a
			href={item.url}
			class="recent-item group"
			style={`animation-delay: ${i * 50}ms`}
		>
			<div class="recent-thumb">
				<img
					src={item.image || defaultImage}
					alt={item.title}
					class="w-full h-full object-cover"
					loading="lazy"
					onerror={(e) => {
						const img = e.currentTarget as HTMLImageElement;
						img.onerror = null;
						img.src = defaultImage;
					}}
				/>
			</div>
			<div class="recent-body">
				<span class="recent-title">{item.title}</span>
				<span class="recent-date">
					<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
						<line x1="16" y1="2" x2="16" y2="6"></line>
						<line x1="8" y1="2" x2="8" y2="6"></line>
						<line x1="3" y1="10" x2="21" y2="10"></line>
					</svg>
					{formatDate(item.date)}
					<span class="recent-badge">{item.private ? "私密" : typeLabelOf(item.type)}</span>
				</span>
			</div>
		</a>
	{/each}
</div>

<style>
	.recent-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.375rem;
		border-radius: 8px;
		text-decoration: none;
		transition: background-color 0.15s ease;
		animation: recentFadeIn 0.3s ease backwards;
	}
	@keyframes recentFadeIn {
		from {
			opacity: 0;
			transform: translateX(-6px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	.recent-item:hover {
		background-color: var(--btn-plain-bg-hover);
	}
	:root.dark .recent-item:hover {
		background-color: oklch(0.16 0 0);
	}
	.recent-item + .recent-item {
		border-top: 1px solid var(--line-divider);
	}
	.recent-item:first-child {
		border-top: none;
	}

	.recent-thumb {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		border-radius: 8px;
		overflow: hidden;
		border: 2px solid #000;
		transition: border-color 0.2s, transform 0.2s;
	}
	:root.dark .recent-thumb {
		border-color: #3f3f46;
	}
	.recent-item:hover .recent-thumb {
		border-color: var(--primary);
		transform: scale(1.08);
	}
	:root.dark .recent-item:hover .recent-thumb {
		border-color: #fff;
	}

	.recent-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.recent-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--deep-text);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
		transition: color 0.15s;
	}
	.recent-item:hover .recent-title {
		color: var(--primary);
	}

	.recent-date {
		font-size: 0.65rem;
		color: var(--content-meta);
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.recent-badge {
		margin-left: auto;
		display: inline-block;
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		background: var(--btn-plain-bg-hover);
		color: var(--primary);
		transition: background-color 0.15s;
	}
	:root.dark .recent-badge {
		background: oklch(0.2 0 0);
	}
	.recent-item:hover .recent-badge {
		background: var(--primary);
		color: var(--page-bg);
	}
	:root.dark .recent-item:hover .recent-badge {
		background: #fff;
		color: #000;
	}
</style>
