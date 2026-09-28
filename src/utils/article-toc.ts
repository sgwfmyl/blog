/**
 * 文章目录面板（Obsidian 风格）· 移植版（单文件、零依赖）
 *
 * 移植自参考博客 my-blog 的 article-toc-panel-controller.ts + article-toc-tree.ts，
 * 按「右侧栏内嵌、容器自身 sticky」场景裁剪，不使用其框架包装。
 *
 * 保留：
 *   1. 正文 h1–h3 采集 + 层级归一化（最浅层级视为一级；父节点 = 前面最近的更浅标题）
 *   2. 圆点 + 连接线 + 按层级缩进的树渲染（根节点显示文章标题）
 *   3. 分组折叠（行尾箭头）+「全部展开 / 全部收起」
 *   4. scrollspy：文档坐标缓存 + ResizeObserver 重测 + scrollY+80 二分查找
 *      + 活动项自动滚入面板可视区（防抖 + smooth）
 *   5. 阅读进度百分比（NN% + aria-valuenow）
 *   6. 点击标题平滑滚动（偏移 80px）并写 hash（标题无 id 时不写 hash）
 *
 * 裁剪：fixed 停靠逻辑、思维导图弹窗、自动收缩手风琴。
 *
 * 用法（Swup 下每条路径调用一次即可，内部会先销毁旧实例）：
 *   import { initArticleToc } from "@/utils/article-toc";
 *   const boot = () => initArticleToc();
 *   document.addEventListener("astro:page-load", boot);
 *   document.addEventListener("swup:content:replaced", boot);
 */

/** 阅读判定偏移：scrollY + 80 处找活动标题，跳转落点同样偏移 80 */
const READING_OFFSET = 80;
/** 活动行滚入可视区的防抖间隔（ms） */
const ACTIVE_SCROLL_DEBOUNCE = 120;
/** 关注的标题层级上限 */
const HEADING_SELECTOR = "h1, h2, h3";

/**
 * 正文容器兜底链。必须逐个 querySelector 探测，不能合并成逗号选择器：
 * 逗号选择器返回「文档中最靠前」的匹配，而不是「列表中优先级最高」的匹配。
 */
const CONTENT_SELECTORS = [
	"#post-container .markdown-content",
	".markdown-content",
	".custom-md",
	".prose",
] as const;

const PANEL_SELECTOR = "#article-toc-panel, [data-toc-panel]";
const TITLE_SELECTOR = ".post-hero__title";

interface TocNode {
	index: number;
	/** 归一化层级：根的直接子级为 1 */
	level: number;
	/** 原始标题层级（h1=1 … h3=3），建栈时使用 */
	depth: number;
	text: string;
	id: string | null;
	element: HTMLElement;
	parent: number;
	children: number[];
}

interface TocTree {
	title: string;
	titleElement: HTMLElement | null;
	nodes: TocNode[];
}

interface TocRowRef {
	row: HTMLElement;
	link: HTMLAnchorElement;
	toggle: HTMLButtonElement | null;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 标题纯文本：剔除锚点图标 / 脚本等渲染噪声 */
function getHeadingText(heading: HTMLElement): string {
	const clone = heading.cloneNode(true) as HTMLElement;
	clone
		.querySelectorAll(
			"script, style, .anchor, .anchor-icon, [data-pagefind-ignore]",
		)
		.forEach((element) => element.remove());

	const text = clone.textContent?.replace(/#+\s*$/, "").trim();
	return text || heading.getAttribute("aria-label") || heading.id || "Heading";
}

function resolveArticle(): HTMLElement | null {
	for (const selector of CONTENT_SELECTORS) {
		const element = document.querySelector<HTMLElement>(selector);
		if (element) return element;
	}
	return null;
}

/**
 * 归一化规则：维护一条「各层级最近未闭合节点」的祖先栈，遇到新标题时弹出所有
 * depth 不小于自己的节点，栈顶即父节点；level = 栈深 + 1。
 */
function collectTocTree(article: HTMLElement): TocTree | null {
	const elements = Array.from(
		article.querySelectorAll<HTMLElement>(HEADING_SELECTOR),
	);
	if (elements.length === 0) return null;

	const titleElement = document.querySelector<HTMLElement>(TITLE_SELECTOR);
	const title = titleElement?.textContent?.trim() || document.title.trim();

	const nodes: TocNode[] = [];
	const stack: number[] = [];

	for (const element of elements) {
		const depth = Number.parseInt(element.tagName.slice(1), 10);
		while (stack.length > 0 && nodes[stack[stack.length - 1]].depth >= depth) {
			stack.pop();
		}
		const parent = stack.length > 0 ? stack[stack.length - 1] : -1;
		const node: TocNode = {
			index: nodes.length,
			level: stack.length + 1,
			depth,
			text: getHeadingText(element),
			id: element.id || null,
			element,
			parent,
			children: [],
		};
		if (parent >= 0) nodes[parent].children.push(node.index);
		nodes.push(node);
		stack.push(node.index);
	}

	return { title, titleElement, nodes };
}

class ArticleTocController {
	private readonly root: HTMLElement;
	private readonly abortController = new AbortController();
	private readonly treeNav: HTMLElement | null;
	private readonly toggleAllButton: HTMLButtonElement | null;
	private readonly progressRegion: HTMLElement | null;
	private readonly progressLabel: HTMLElement | null;

	private tree: TocTree | null = null;
	private article: HTMLElement | null = null;
	/** 各标题的文档绝对纵坐标，下标对齐 tree.nodes */
	private headingTops: number[] = [];
	private articleStart = 0;
	private articleEnd = 0;

	private rows: TocRowRef[] = [];
	private rootRow: HTMLElement | null = null;
	private activeIndex = -1;
	private lastProgressPercent = -1;

	private updateFrame: number | null = null;
	private measureFrame: number | null = null;
	private activeScrollTimer: ReturnType<typeof setTimeout> | null = null;
	private resizeObserver: ResizeObserver | null = null;

	constructor(root: HTMLElement) {
		this.root = root;
		this.treeNav = root.querySelector("[data-toc-tree]");
		this.toggleAllButton = root.querySelector("[data-toc-toggle-all-btn]");
		this.progressRegion = root.querySelector("[data-toc-progress]");
		this.progressLabel = root.querySelector("[data-toc-progress-label]");
	}

	public init(): boolean {
		const article = resolveArticle();
		const tree = article ? collectTocTree(article) : null;
		if (!article || !tree || !this.treeNav) {
			// 没有正文容器或没有标题：整个面板隐藏
			this.root.hidden = true;
			return false;
		}
		this.article = article;
		this.tree = tree;

		this.root.hidden = false;
		this.render();
		this.bindInteractions();
		this.measure(); // 必须在 render 之后：面板注入可能改变页面布局

		// 标题坐标会因字体加载、图片、上方卡片展开而漂移
		this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
		this.resizeObserver.observe(article);
		if (document.body) this.resizeObserver.observe(document.body);
		void document.fonts?.ready.then(() => this.scheduleMeasure());

		this.root.classList.remove("is-pending");
		this.syncToggleAllButton();
		this.update();
		return true;
	}

	public destroy(): void {
		this.abortController.abort();
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		if (this.updateFrame !== null) cancelAnimationFrame(this.updateFrame);
		if (this.measureFrame !== null) cancelAnimationFrame(this.measureFrame);
		if (this.activeScrollTimer !== null) clearTimeout(this.activeScrollTimer);
		this.updateFrame = null;
		this.measureFrame = null;
		this.activeScrollTimer = null;
		this.tree = null;
		this.article = null;
	}

	/* ------------------------------ 渲染 ------------------------------ */

	private render(): void {
		const tree = this.tree;
		const nav = this.treeNav;
		if (!tree || !nav) return;

		const fragment = document.createDocumentFragment();
		this.rows = [];
		this.activeIndex = -1;
		this.lastProgressPercent = -1;

		// 根节点：文章标题
		const rootRow = document.createElement("div");
		rootRow.className =
			"article-toc-panel__row article-toc-panel__row--root is-branch";
		const rootLink = document.createElement("a");
		rootLink.className = "article-toc-panel__link";
		rootLink.href = "#";
		rootLink.dataset.tocNavigate = "-1";
		rootLink.title = tree.title;
		rootLink.append(this.createDot(), this.createText(tree.title));
		rootRow.appendChild(rootLink);
		fragment.appendChild(rootRow);
		this.rootRow = rootRow;

		const rootList = document.createElement("ul");
		rootList.className = "article-toc-panel__list";
		tree.nodes
			.filter((node) => node.parent < 0)
			.forEach((node) => this.buildItem(tree, node, rootList));
		fragment.appendChild(rootList);

		nav.replaceChildren(fragment); // 幂等：重复 init 不会叠两份树
	}

	private buildItem(tree: TocTree, node: TocNode, list: HTMLElement): void {
		const item = document.createElement("li");
		item.className = "article-toc-panel__item";

		const row = document.createElement("div");
		row.className = "article-toc-panel__row";
		row.dataset.tocLevel = String(node.level);
		row.style.setProperty("--toc-level", String(node.level));
		if (node.children.length > 0) row.classList.add("is-branch");

		const link = document.createElement("a");
		link.className = "article-toc-panel__link";
		link.href = node.id ? `#${encodeURIComponent(node.id)}` : "#";
		link.dataset.tocNavigate = String(node.index);
		link.title = node.text;
		link.append(this.createDot(), this.createText(node.text));
		row.appendChild(link);

		let toggle: HTMLButtonElement | null = null;
		if (node.children.length > 0) {
			toggle = document.createElement("button");
			toggle.type = "button";
			toggle.className = "article-toc-panel__toggle";
			toggle.dataset.tocToggle = String(node.index);
			toggle.setAttribute("aria-expanded", "true");
			toggle.setAttribute("aria-label", node.text);
			row.appendChild(toggle);
		}

		item.appendChild(row);
		this.rows[node.index] = { row, link, toggle };

		if (node.children.length > 0) {
			const wrap = document.createElement("div");
			wrap.className = "article-toc-panel__children";
			const childList = document.createElement("ul");
			childList.className = "article-toc-panel__list";
			node.children.forEach((childIndex) => {
				const child = tree.nodes[childIndex];
				if (child) this.buildItem(tree, child, childList);
			});
			wrap.appendChild(childList);
			item.appendChild(wrap); // 必须是 row 的紧邻兄弟：CSS 用 `+` 选择器
		}

		list.appendChild(item);
	}

	private createDot(): HTMLElement {
		const dot = document.createElement("span");
		dot.className = "article-toc-panel__dot";
		return dot;
	}

	private createText(text: string): HTMLElement {
		const span = document.createElement("span");
		span.className = "article-toc-panel__text";
		span.textContent = text;
		return span;
	}

	/* ------------------------------ 折叠 ------------------------------ */

	private toggleCollapse(index: number): void {
		const ref = this.rows[index];
		if (!ref?.toggle) return;

		const willExpand = ref.row.classList.contains("is-collapsed");
		ref.row.classList.toggle("is-collapsed", !willExpand);
		ref.toggle.setAttribute("aria-expanded", String(willExpand));
		this.syncToggleAllButton();
	}

	private toggleAll(): void {
		const expand = !this.isAllExpanded();
		this.applyExpandAll(expand);
		this.syncToggleAllButton();
	}

	private applyExpandAll(expand: boolean): void {
		this.rows.forEach((ref) => {
			if (!ref.toggle) return;
			ref.row.classList.toggle("is-collapsed", !expand);
			ref.toggle.setAttribute("aria-expanded", String(expand));
		});
	}

	private isAllExpanded(): boolean {
		return this.rows.every(
			(ref) =>
				!ref.toggle || ref.toggle.getAttribute("aria-expanded") === "true",
		);
	}

	private syncToggleAllButton(): void {
		const button = this.toggleAllButton;
		if (!button) return;

		const expanded = this.isAllExpanded();
		button.setAttribute("aria-pressed", String(expanded));
		// 图标由 CSS 依据 aria-pressed 切换（is-expand / is-collapse）
		const label = expanded
			? (button.dataset.tocCollapseLabel ?? "")
			: (button.dataset.tocExpandLabel ?? "");
		if (!label) return;
		button.setAttribute("aria-label", label);
		button.title = label;
	}

	/** 点击标题时顺带展开该节点（收起只通过行尾箭头） */
	private expandNode(index: number): void {
		const ref = this.rows[index];
		if (!ref?.toggle || !ref.row.classList.contains("is-collapsed")) return;
		ref.row.classList.remove("is-collapsed");
		ref.toggle.setAttribute("aria-expanded", "true");
		this.syncToggleAllButton();
	}

	/* ---------------------------- 滚动同步 ---------------------------- */

	private measure(): void {
		const tree = this.tree;
		const article = this.article;
		if (!tree || !article) return;

		const scrollY = window.scrollY;
		const rect = article.getBoundingClientRect();
		this.articleStart = rect.top + scrollY;
		this.articleEnd = rect.bottom + scrollY;
		this.headingTops = tree.nodes.map(
			(node) => node.element.getBoundingClientRect().top + scrollY,
		);
	}

	private getProgress(): number {
		const end = this.articleEnd - window.innerHeight + READING_OFFSET;
		if (end <= this.articleStart) {
			// 正文短到一屏放得下：读过正文起点即 100%
			return window.scrollY + READING_OFFSET >= this.articleStart ? 1 : 0;
		}
		return clamp(
			(window.scrollY - this.articleStart) / (end - this.articleStart),
			0,
			1,
		);
	}

	/** 活动项 = 不大于 scrollY + 80 的最后一个标题（对缓存坐标二分） */
	private getActiveIndex(): number {
		const tops = this.headingTops;
		if (tops.length === 0) return -1;

		const readingPosition = window.scrollY + READING_OFFSET;
		let lower = 0;
		let upper = tops.length - 1;
		let result = 0;
		while (lower <= upper) {
			const middle = Math.floor((lower + upper) / 2);
			if (tops[middle] <= readingPosition) {
				result = middle;
				lower = middle + 1;
			} else {
				upper = middle - 1;
			}
		}
		return result;
	}

	private scheduleUpdate(): void {
		if (this.updateFrame !== null) return;
		this.updateFrame = requestAnimationFrame(() => {
			this.updateFrame = null;
			this.update();
		});
	}

	private scheduleMeasure(): void {
		if (this.measureFrame !== null) return;
		this.measureFrame = requestAnimationFrame(() => {
			this.measureFrame = null;
			if (!this.tree) return;
			this.measure();
			this.update();
		});
	}

	private update(): void {
		if (!this.tree) return;

		const percent = Math.round(this.getProgress() * 100);
		if (percent !== this.lastProgressPercent) {
			this.lastProgressPercent = percent;
			this.progressRegion?.setAttribute("aria-valuenow", String(percent));
			if (this.progressLabel) this.progressLabel.textContent = `${percent}%`;
		}

		const nextActiveIndex = this.getActiveIndex();
		if (nextActiveIndex === this.activeIndex) return;
		this.activeIndex = nextActiveIndex;
		this.syncActive();
	}

	private syncActive(): void {
		const tree = this.tree;
		if (!tree) return;

		// 活动链（自身 + 祖先）：CSS 用它给整条路径的连接线染色
		const chain = new Set<number>();
		for (
			let cursor = this.activeIndex;
			cursor >= 0;
			cursor = tree.nodes[cursor].parent
		) {
			chain.add(cursor);
		}

		this.rows.forEach((ref, index) => {
			const isActive = index === this.activeIndex;
			ref.row.classList.toggle("is-active", isActive);
			ref.row.classList.toggle("is-active-path", chain.has(index));
			if (isActive) ref.link.setAttribute("aria-current", "location");
			else ref.link.removeAttribute("aria-current");
		});
		this.rootRow?.classList.toggle("is-active-path", chain.size > 0);

		this.scheduleActiveRowScroll();
	}

	/** 活动行不在面板可视区时，居中滚入（防抖，避免连续滚动时抖动） */
	private scheduleActiveRowScroll(): void {
		if (this.activeScrollTimer !== null) clearTimeout(this.activeScrollTimer);
		this.activeScrollTimer = setTimeout(() => {
			this.activeScrollTimer = null;
			const nav = this.treeNav;
			const ref = this.rows[this.activeIndex];
			if (!nav || !ref) return;

			const navRect = nav.getBoundingClientRect();
			const rowRect = ref.row.getBoundingClientRect();
			const isVisible =
				rowRect.top >= navRect.top && rowRect.bottom <= navRect.bottom;
			if (isVisible) return;

			// 依赖 CSS 给 .article-toc-panel__tree 的 position: relative
			nav.scrollTo({
				top: Math.max(
					0,
					ref.row.offsetTop - nav.clientHeight / 2 + ref.row.clientHeight / 2,
				),
				behavior: prefersReducedMotion() ? "auto" : "smooth",
			});
		}, ACTIVE_SCROLL_DEBOUNCE);
	}

	/* ------------------------------ 导航 ------------------------------ */

	private navigateTo(index: number): void {
		const tree = this.tree;
		if (!tree) return;

		let targetTop: number;

		if (index < 0) {
			// 根节点：回文章标题（无标题元素则回页顶）
			const titleElement = tree.titleElement;
			targetTop = titleElement
				? titleElement.getBoundingClientRect().top +
					window.scrollY -
					READING_OFFSET
				: 0;
		} else {
			const node = tree.nodes[index];
			const cached = this.headingTops[index];
			const headingTop = Number.isFinite(cached)
				? cached
				: node.element.getBoundingClientRect().top + window.scrollY;
			targetTop = headingTop - READING_OFFSET;

			// 有 id 才写 hash；没 id 时只滚动，避免写入一条失效锚点
			if (node.id) {
				const url = new URL(window.location.href);
				url.hash = node.id;
				// replaceState 不触发 hashchange，Swup 不会把它当成一次页面导航
				window.history.replaceState(null, "", url);
			}
		}

		window.scrollTo({
			top: Math.max(0, targetTop),
			behavior: prefersReducedMotion() ? "auto" : "smooth",
		});
	}

	/* ---------------------------- 事件绑定 ---------------------------- */

	private bindInteractions(): void {
		const { signal } = this.abortController;

		this.toggleAllButton?.addEventListener("click", () => this.toggleAll(), {
			signal,
		});

		this.treeNav?.addEventListener(
			"click",
			(event) => {
				const target = event.target as HTMLElement | null;

				const toggle = target?.closest<HTMLElement>("[data-toc-toggle]");
				if (toggle) {
					event.preventDefault();
					this.toggleCollapse(Number(toggle.dataset.tocToggle));
					return;
				}

				const link = target?.closest<HTMLElement>("[data-toc-navigate]");
				if (!link) return;
				event.preventDefault();
				const index = Number(link.dataset.tocNavigate);
				this.navigateTo(index);
				if (index >= 0) this.expandNode(index);
			},
			{ signal },
		);

		window.addEventListener("scroll", () => this.scheduleUpdate(), {
			passive: true,
			signal,
		});
		window.addEventListener("resize", () => this.scheduleMeasure(), {
			passive: true,
			signal,
		});
	}
}

/* ================================ 入口 ================================ */

let disposeCurrent: (() => void) | null = null;

/**
 * 初始化面板，返回 dispose 函数。
 * 重复调用会先销毁旧实例（Swup 导航后二次挂载的安全网）；
 * 面板不存在或没有可用标题时返回 no-op。
 */
export function initArticleToc(): () => void {
	disposeCurrent?.();
	disposeCurrent = null;

	const root = document.querySelector<HTMLElement>(PANEL_SELECTOR);
	if (!root) return () => {};

	const controller = new ArticleTocController(root);
	if (!controller.init()) return () => {};

	const dispose = () => {
		if (disposeCurrent === dispose) disposeCurrent = null;
		controller.destroy();
	};
	disposeCurrent = dispose;
	return dispose;
}
