<script lang="ts">
import { onMount, tick } from "svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import { getPostUrlBySlug } from "@/utils/url-utils";

interface Post {
	id: string;
	type?: string;
	data: {
		title: string;
		tags: string[];
		category?: string | null;
		published: Date;
	};
}
interface MonthGroup {
	month: number;
	posts: Post[];
}
interface YearGroup {
	year: number;
	months: MonthGroup[];
	totalCount: number;
}
interface ActiveFilter {
	labelKey: I18nKey;
	values: string[];
}
type TypeFilter = "all" | "post" | "moment" | "bangumi" | "life";

const TABS = [
	{ value: "all", labelKey: I18nKey.all },
	{ value: "post", labelKey: I18nKey.posts },
	{ value: "moment", labelKey: I18nKey.moments },
	{ value: "bangumi", labelKey: I18nKey.bangumi },
	{ value: "life", labelKey: I18nKey.life },
] as const;

let {
	sortedPosts = [],
	selectedYear,
	availableYears = [],
}: {
	sortedPosts?: Post[];
	selectedYear?: number;
	availableYears?: number[];
} = $props();

const typeLabels: Record<string, string> = {
	post: "文章",
	moment: "动态",
	bangumi: "记录",
	life: "生活",
};
function getTypeLabel(t: string | undefined): string {
	return t ? typeLabels[t] || t : "";
}

let tags = $state<string[]>([]);
let categories = $state<string[]>([]);
let activeType = $state<TypeFilter>("all");
let yearGroups = $state<YearGroup[]>([]);
let activeFilters = $state<ActiveFilter[]>([]);
let primaryFilter = $state<ActiveFilter | null>(null);
let secondaryFilters = $state<ActiveFilter[]>([]);
let filteredPostCount = $state(0);
let categoryColors = $state(new Map<string, string>());
let hoveredPostId = $state<string | null>(null);
let highlightedYear = $state<number | null>(null);
let highlightedMonth = $state<string | null>(null);

// 各类型条目计数（Tab 徽章）
let typeCounts = $derived.by(() => {
	const c: Record<TypeFilter, number> = {
		all: sortedPosts.length,
		post: 0,
		moment: 0,
		bangumi: 0,
		life: 0,
	};
	for (const p of sortedPosts) {
		if (
			p.type === "post" ||
			p.type === "moment" ||
			p.type === "bangumi" ||
			p.type === "life"
		) {
			c[p.type]++;
		}
	}
	return c;
});

interface HighlightSeg {
	x: number;
	top: number;
	height: number;
}
interface HighlightHLine {
	x: number;
	y: number;
	width: number;
}
let highlightSegs = $state<HighlightSeg[]>([]);
let highlightHLines = $state<HighlightHLine[]>([]);

let panelEl = $state<HTMLElement>();
let tabsEl = $state<HTMLElement>();
let tabIndicatorEl = $state<HTMLElement>();
let yearBlockRefs = new Map<number, HTMLElement>();
let monthBlockRefs = new Map<string, HTMLElement>();
let postRowRefs = new Map<string, HTMLElement>();

function registerYearBlock(node: HTMLElement, year: number) {
	yearBlockRefs.set(year, node);
	return {
		destroy() {
			yearBlockRefs.delete(year);
		},
	};
}
function registerMonthBlock(
	node: HTMLElement,
	key: { year: number; month: number },
) {
	monthBlockRefs.set(`${key.year}-${key.month}`, node);
	return {
		destroy() {
			monthBlockRefs.delete(`${key.year}-${key.month}`);
		},
	};
}
function registerPostRow(node: HTMLElement, postId: string) {
	postRowRefs.set(postId, node);
	return {
		destroy() {
			postRowRefs.delete(postId);
		},
	};
}

const palette = [
	"text-sky-500",
	"text-rose-500",
	"text-emerald-500",
	"text-amber-500",
	"text-violet-500",
	"text-cyan-500",
	"text-orange-500",
	"text-teal-500",
	"text-pink-500",
	"text-indigo-500",
	"text-lime-600",
	"text-blue-500",
	"text-fuchsia-500",
	"text-red-500",
];

function formatDate(d: Date): string {
	return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatMonth(m: number): string {
	return `${m}${i18n(I18nKey.month)}`;
}
function getCatColor(name: string): string {
	const cls = categoryColors.get(name) || "";
	if (!cls) return "var(--meta-divider)";
	// text-sky-500 → oklch approximated, map tailwind class to actual color
	const map: Record<string, string> = {
		"text-sky-500": "oklch(0.62 0.19 240)",
		"text-rose-500": "oklch(0.62 0.22 25)",
		"text-emerald-500": "oklch(0.62 0.15 160)",
		"text-amber-500": "oklch(0.72 0.16 70)",
		"text-violet-500": "oklch(0.58 0.22 290)",
		"text-cyan-500": "oklch(0.68 0.12 200)",
		"text-orange-500": "oklch(0.68 0.18 45)",
		"text-teal-500": "oklch(0.58 0.12 175)",
		"text-pink-500": "oklch(0.62 0.22 350)",
		"text-indigo-500": "oklch(0.56 0.20 270)",
		"text-lime-600": "oklch(0.65 0.17 120)",
		"text-blue-500": "oklch(0.58 0.22 255)",
		"text-fuchsia-500": "oklch(0.60 0.22 320)",
		"text-red-500": "oklch(0.60 0.22 25)",
	};
	return map[cls] || "var(--meta-divider)";
}
function normCategory(name: string | null | undefined): string {
	return (name || "").trim();
}

function initCategoryColors(ps: Post[]) {
	const set = new Set<string>();
	for (const p of ps) {
		const raw = normCategory(p.data.category);
		if (raw) set.add(raw);
		else if (p.type && p.type !== "post") set.add(getTypeLabel(p.type));
		else set.add(i18n(I18nKey.uncategorized));
	}
	const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, "zh-CN"));
	for (let i = 0; i < sorted.length; i++)
		categoryColors.set(sorted[i], palette[i % palette.length]);
}

function groupByYearMonth(ps: Post[]): YearGroup[] {
	const ym = new Map<number, Map<number, Post[]>>();
	for (const p of ps) {
		const y = p.data.published.getFullYear();
		const mo = p.data.published.getMonth() + 1;
		const mm = ym.get(y) ?? new Map<number, Post[]>();
		ym.set(y, mm);
		if (!mm.has(mo)) mm.set(mo, []);
		mm.get(mo)?.push(p);
	}
	return Array.from(ym.keys())
		.sort((a, b) => b - a)
		.map((year) => {
			const mm = ym.get(year) ?? new Map<number, Post[]>();
			const months = Array.from(mm.keys())
				.sort((a, b) => b - a)
				.map((month) => ({ month, posts: mm.get(month) ?? [] }));
			return {
				year,
				months,
				totalCount: months.reduce((s, m) => s + m.posts.length, 0),
			};
		});
}

function getItemUrl(post: Post): string {
	// 动态没有独立详情页，统一指向动态列表（普通说说直接跳 /moments/）
	if (post.type === "moment") {
		return "/moments/";
	}
	if (post.type && post.type !== "post") {
		return (
			(post as { data?: { link?: string } }).data?.link ||
			getPostUrlBySlug(post.id)
		);
	}
	return getPostUrlBySlug(post.id);
}
function formatFilterValues(f: ActiveFilter): string {
	return f.labelKey === I18nKey.tags
		? f.values.map((v) => `#${v}`).join(" / ")
		: f.values.join(" / ");
}
function resolvePrimary(f: ActiveFilter[]): ActiveFilter | null {
	return f.find((f) => f.labelKey === I18nKey.tags) ?? f[0] ?? null;
}
// 切换类型 Tab：重新筛选 + 同步 URL（?type=xxx，all 时删除参数）
function switchType(t: TypeFilter) {
	if (t === activeType) return;
	activeType = t;
	applyFilters(sortedPosts);
	const url = new URL(window.location.href);
	if (t === "all") url.searchParams.delete("type");
	else url.searchParams.set("type", t);
	window.history.replaceState({}, "", url.toString());
	void tick().then(updateTabIndicator);
}

// 更新滑动指示条：对齐当前激活 Tab 按钮
function updateTabIndicator() {
	if (!tabIndicatorEl || !tabsEl) return;
	const activeBtn = tabsEl.querySelector<HTMLElement>(
		'[role="tab"][aria-selected="true"]',
	);
	if (!activeBtn) return;
	tabIndicatorEl.style.left = `${activeBtn.offsetLeft}px`;
	tabIndicatorEl.style.top = `${activeBtn.offsetTop}px`;
	tabIndicatorEl.style.width = `${activeBtn.offsetWidth}px`;
	tabIndicatorEl.style.height = `${activeBtn.offsetHeight}px`;
	tabIndicatorEl.style.opacity = "1";
}
function formatFilterSummary(fs: ActiveFilter[]): string {
	return fs
		.map((f) => `${i18n(f.labelKey)}: ${formatFilterValues(f)}`)
		.join("  ·  ");
}

async function computeHighlight(postId: string) {
	await tick();
	if (!panelEl) {
		highlightSegs = [];
		highlightHLines = [];
		return;
	}
	let ty: number | null = null;
	let tm: number | null = null;
	for (const yg of yearGroups)
		for (const mg of yg.months)
			if (mg.posts.some((p) => p.id === postId)) {
				ty = yg.year;
				tm = mg.month;
				break;
			}
	if (ty === null || tm === null) {
		highlightSegs = [];
		highlightHLines = [];
		highlightedYear = null;
		highlightedMonth = null;
		return;
	}
	highlightedYear = ty;
	highlightedMonth = `${ty}-${tm}`;

	const pr = panelEl.getBoundingClientRect();
	const tw =
		Number.parseFloat(getComputedStyle(panelEl).getPropertyValue("--tw")) * 16;
	const yb = yearBlockRefs.get(ty);
	const mb = monthBlockRefs.get(`${ty}-${tm}`);
	const prow = postRowRefs.get(postId);
	if (!yb || !mb || !prow) {
		highlightSegs = [];
		highlightHLines = [];
		return;
	}

	const yr = yb.getBoundingClientRect();
	const mr = mb.getBoundingClientRect();
	const por = prow.getBoundingClientRect();
	const ylx = yr.left - pr.left + tw / 2;
	const mlx = mr.left - pr.left + tw / 2;
	const plx = por.left - pr.left + tw / 2;
	const yncy = yr.top - pr.top + tw / 2;
	const mncy = mr.top - pr.top + tw / 2;
	const pncy = por.top - pr.top + por.height / 2;

	highlightSegs = [
		{ x: ylx, top: yncy, height: mncy - yncy },
		{ x: mlx, top: mncy, height: pncy - mncy },
	];
	highlightHLines = [
		{ x: ylx, y: mncy, width: mlx - ylx },
		{ x: mlx, y: pncy, width: plx - mlx },
	];
}

async function onPostEnter(id: string) {
	hoveredPostId = id;
	await computeHighlight(id);
}
function onPostLeave() {
	hoveredPostId = null;
	highlightedYear = null;
	highlightedMonth = null;
	highlightSegs = [];
	highlightHLines = [];
}

let selectedYearState = $state<number | undefined>(selectedYear);

function getSelectedYear(): number | undefined {
	const y = selectedYearState ?? selectedYear;
	return typeof y === "number" ? y : undefined;
}

function applyFilters(allPosts: Post[]) {
	const params = new URLSearchParams(window.location.search);
	tags = params.has("tag") ? params.getAll("tag") : [];
	categories = params.has("category") ? params.getAll("category") : [];
	const uncategorized = params.get("uncategorized");
	let filtered = allPosts;
	const year = getSelectedYear();
	if (typeof year === "number") {
		filtered = filtered.filter((p) => p.data.published.getFullYear() === year);
	}
	// 类型 Tab 过滤（与 tag/category 过滤正交）
	filtered =
		activeType === "all"
			? filtered
			: filtered.filter((p) => p.type === activeType);
	const cf: ActiveFilter[] = [];
	if (categories.length > 0)
		cf.push({ labelKey: I18nKey.categories, values: categories });
	if (uncategorized)
		cf.push({
			labelKey: I18nKey.categories,
			values: [i18n(I18nKey.uncategorized)],
		});
	if (tags.length > 0) cf.push({ labelKey: I18nKey.tags, values: tags });
	activeFilters = cf;
	primaryFilter = resolvePrimary(cf);
	secondaryFilters = primaryFilter ? cf.filter((f) => f !== primaryFilter) : [];
	if (tags.length > 0)
		filtered = filtered.filter(
			(p) =>
				Array.isArray(p.data.tags) && p.data.tags.some((t) => tags.includes(t)),
		);
	if (categories.length > 0)
		filtered = filtered.filter(
			(p) =>
				p.data.category &&
				categories.some(
					(c) => p.data.category === c || p.data.category?.startsWith(`${c}/`),
				),
		);
	if (uncategorized) filtered = filtered.filter((p) => !p.data.category);
	filtered = filtered
		.slice()
		.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
	filteredPostCount = filtered.length;
	initCategoryColors(filtered);
	yearGroups = groupByYearMonth(filtered);
}

onMount(() => {
	const typeParam = new URLSearchParams(window.location.search).get("type");
	if (
		typeParam === "post" ||
		typeParam === "moment" ||
		typeParam === "bangumi" ||
		typeParam === "life"
	) {
		activeType = typeParam;
	}
	// 年份由 archive.astro 的全局 is:inline 脚本通过 archive-year-change 事件驱动（避免与 document 点击双重处理冲突）
	const onYearChange = (e: Event) => {
		const y = (e as CustomEvent).detail?.year;
		if (typeof y === "number" && !Number.isNaN(y)) {
			selectedYearState = y;
			applyFilters([...sortedPosts]);
			void tick().then(updateTabIndicator);
		}
	};
	window.addEventListener("archive-year-change", onYearChange as EventListener);

	applyFilters([...sortedPosts]);

	// 初始化滑动指示条（等 Svelte 完成 DOM 更新后再测量偏移）
	const initIndicator = () => tick().then(updateTabIndicator);
	initIndicator();
	window.addEventListener("resize", updateTabIndicator);
	return () => {
		window.removeEventListener("resize", updateTabIndicator);
		window.removeEventListener(
			"archive-year-change",
			onYearChange as EventListener,
		);
	};
});
</script>

<div class="archive-panel" bind:this={panelEl}>
  <div class="ap-tabs" role="tablist" aria-label="归档类型筛选" bind:this={tabsEl}>
    <div class="ap-tab-indicator" aria-hidden="true" bind:this={tabIndicatorEl}></div>
    {#each TABS as tab (tab.value)}
      <button
        type="button"
        role="tab"
        aria-selected={activeType === tab.value}
        class="ap-tab"
        onclick={() => switchType(tab.value)}
      >
        {i18n(tab.labelKey)}
        <span class="ap-tab-count">{typeCounts[tab.value]}</span>
      </button>
    {/each}
  </div>

  {#if primaryFilter}
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div class="min-w-0 text-sm text-75">
          <span class="text-50">{i18n(primaryFilter.labelKey)}</span>
          <span class="mx-2 text-30">/</span>
          <span class="font-semibold text-(--primary)">{formatFilterValues(primaryFilter)}</span>
          {#if secondaryFilters.length > 0}
            <span class="ml-2 text-50">· {formatFilterSummary(secondaryFilters)}</span>
          {/if}
        </div>
        <div class="shrink-0 text-xs text-50">
          {filteredPostCount} {i18n(filteredPostCount === 1 ? I18nKey.postCount : I18nKey.postsCount)}
          <span class="mx-1.5 text-30">·</span>
          {yearGroups.length} {i18n(I18nKey.year)}
        </div>
      </div>
    </div>
  {/if}

  {#each yearGroups as yg (yg.year)}
    <div class="ap-year-block" use:registerYearBlock={yg.year}>
      {#each yg.months as mg, mi (mg.month)}
        <div class="ap-year-header" style={mi === 0 ? "" : "margin-top:1.25rem"}>
          <h2 class="ap-h1">{yg.year} · {String(mg.month).padStart(2, "0")}</h2>
          <span class="ap-count">/{mg.posts.length}篇{activeType === "all" ? "更新" : getTypeLabel(activeType)}</span>
        </div>
        {#each mg.posts as post (post.id)}
          <div class="ap-row-simple" use:registerPostRow={post.id}>
            <a href={getItemUrl(post)} aria-label={post.data.title} class="ap-post-link group btn-plain ap-post-link--stack" onmouseenter={() => onPostEnter(post.id)} onmouseleave={onPostLeave}>
              <span class="ap-row-top">
                <span class="ap-date">{formatDate(post.data.published)}</span>
                <span class="ap-title group-hover:text-(--primary)">{post.data.title.length > 20 ? post.data.title.slice(0, 20) + "…" : post.data.title}</span>
              </span>
              <span class="ap-right-meta">
                {#if post.data.category}
                  <span class="ap-cat" style={`color:${getCatColor(post.data.category)};`}>#{post.data.category}</span>
                {:else if post.type && post.type !== "post"}
                  <span class="ap-cat" style={`color:${getCatColor(getTypeLabel(post.type))};`}>#{getTypeLabel(post.type)}</span>
                {/if}
                {#if post.data.tags?.length}
                  {#each post.data.tags.slice(0, 3) as t, i}
                    <span class="ap-tag-sep">/</span><span class="ap-tag">{t}</span>
                  {/each}
                  {#if post.data.tags.length > 3}<span class="ap-more"> +{post.data.tags.length - 3}</span>{/if}
                {/if}
              </span>
              </a>
            </div>
        {/each}
      {/each}
    </div>
  {/each}

  {#if yearGroups.length === 0}
    <div class="ap-empty">该类型暂无条目</div>
  {/if}

  {#if highlightSegs.length > 0 || highlightHLines.length > 0}
    <div class="ap-highlight-layer" aria-hidden="true">
      {#each highlightSegs as seg}<div class="ap-hl-vline" style="left:{seg.x}px;top:{seg.top}px;height:{seg.height}px"></div>{/each}
      {#each highlightHLines as hl}<div class="ap-hl-hline" style="left:{hl.x}px;top:{hl.y}px;width:{hl.width}px"></div>{/each}
    </div>
  {/if}
</div>

<style>
  .archive-panel { --tw: 2rem; --lc: var(--line-color, oklch(0.82 0 0)); --lh: oklch(0.15 0 0); --nc: var(--line-color, oklch(0.82 0 0)); --nh: oklch(0.15 0 0); --lw: 2.5px; position: relative; padding: 0 0.5rem; }
  .ap-empty { padding: 2.5rem 1rem; text-align: center; color: var(--content-meta); font-size: 0.9rem; }
  .ap-year-block { position: relative; margin-bottom: 1.5rem; }
  .ap-row-simple { display: flex; align-items: center; min-height: 2rem; padding: 0.15rem 0; }
  .ap-post-row { position: relative; display: flex; align-items: center; min-height: 2.25rem; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1); }
  .ap-post-row:hover { transform: translateX(0.375rem); }
  .ap-col { position: relative; width: var(--tw); flex-shrink: 0; align-self: stretch; }
  .ap-node { position: absolute; left: 50%; transform: translateX(-50%); border-radius: 50%; z-index: 2; transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
  .ap-year-node { top: calc(50% - 0.375rem); width: 0.75rem; height: 0.75rem; border: 2px solid var(--nc); background: var(--page-bg, white); }
  .ap-year-node[data-hl="true"] { background: var(--nh); border-color: var(--nh); }
  .ap-month-node { top: calc(50% - 0.25rem); width: 0.5rem; height: 0.5rem; background: var(--nc); }
  .ap-month-node[data-hl="true"] { background: var(--nh); }
  .ap-post-node { top: calc(50% - 0.2rem); width: 0.4rem; height: 0.4rem; background: var(--nc); }
  .ap-post-row:hover .ap-post-node { background: var(--nh); transform: translateX(-50%) scale(1.6); }
  .ap-hline { position: absolute; height: 0; border-top: var(--lw) dashed var(--lc); z-index: 1; }
  .ap-month-hline { top: 50%; left: calc(-1 * var(--tw) / 2); width: var(--tw); }
  .ap-post-hline { top: 50%; left: calc(-1 * var(--tw) / 2); width: var(--tw); }
  .ap-highlight-layer { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
  .ap-hl-vline { position: absolute; width: 0; border-left: 3px solid var(--lh); transform: translateX(-50%); }
  .ap-hl-hline { position: absolute; height: 0; border-top: 3px solid var(--lh); }
  .ap-year-header { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.5rem; }
  .ap-h1 { font-size: 1.35rem; font-weight: 700; color: var(--deep-text); margin: 0; }
  .ap-count { font-size: 0.8rem; color: var(--content-meta); }
  .ap-post-link { display: flex; align-items: center; gap: 0.6rem; flex: 1; min-height: 2rem; padding: 0.15rem 0; text-decoration: none; overflow: hidden; justify-content: flex-start; }
  .ap-row-top { display: inline-flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; }
  .ap-date { font-size: 0.875rem; color: var(--content-meta); font-variant-numeric: tabular-nums; white-space: nowrap; flex-shrink: 0; width: 2.6rem; }
  .ap-title { font-size: 0.95rem; font-weight: 600; color: var(--deep-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; transition: color 0.15s ease; }
  .ap-right-meta { display: inline-flex; align-items: center; gap: 0.25rem; flex-shrink: 0; font-size: 0.8rem; white-space: nowrap; }
  .ap-cat { font-weight: 600; }
  .ap-tag { font-weight: 700; color: var(--deep-text); }
  .ap-tag-sep { color: var(--content-meta); opacity: 0.5; font-weight: 700; }
  .ap-more { color: var(--content-meta); font-weight: 700; }
  :global(.dark) .archive-panel { --lh: oklch(0.9 0 0); --nh: oklch(0.9 0 0); }
  @media (max-width: 768px) {
    .ap-date { width: 2.4rem; font-size: 0.8rem; }
    .ap-title { font-size: 0.82rem; }
    .ap-post-link--stack { flex-direction: column; align-items: flex-start; gap: 0.25rem; min-height: auto; padding: 0.35rem 0; }
    .ap-post-link--stack .ap-row-top { display: flex; align-items: center; gap: 0.5rem; width: 100%; min-width: 0; }
    .ap-post-link--stack .ap-right-meta { width: 100%; padding-left: 3.1rem; justify-content: flex-start; flex-wrap: wrap; }
  }
  @media (min-width: 769px) {
    .ap-post-link--stack .ap-row-top { width: auto; }
  }
</style>
