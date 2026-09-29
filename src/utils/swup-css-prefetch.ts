/**
 * Swup hover 预载时顺带预取目标页的样式表。
 *
 * ── 为什么需要它 ──
 * 按页拆包后（`build.cssCodeSplit`），SwupHeadPlugin（`awaitAssets: true`）在
 * 首次导航到某类页面时，要等新的样式表下载完才播入场动画 —— 这正是「第一次点
 * 某类链接会卡一下」的来源。
 *
 * 本模块把这个串行等待藏进 hover 预载：`page:preload` 触发时 `args.page` 已经是
 * 抓回来的目标页 HTML，解析出其中 head 里的样式表，以 `media="print"` 的链接插进
 * 当前文档 —— 照常下载进 `/_astro/*` 的 immutable 缓存，但不作用于当前页渲染。
 * 真正点击导航时，SwupHeadPlugin 插入正式样式表会直接命中缓存，等待几乎为零。
 *
 * ── 为什么 `media="print"` 是安全的 ──
 * SwupHeadPlugin 用 `outerHTML` 精确相等做 head 去重：预取链接（media="print" +
 * data 属性）与正式链接（无 media）永远不相等，换页时前者必然被移除、后者必然被
 * 插入，不存在「保留了 print 副本导致新页样式失效」的路径。
 *
 * ── 防御 ──
 * - 只处理同源绝对路径（Astro 产物全在 `/_astro/`），外链与 data: 不碰；
 * - 同一 href 只插一次（Set + 当前 DOM 双重去重）；
 * - 预取是加速不是正确性依赖：解析失败、钩子不存在都静默跳过。
 */

const PREFETCHED_HREFS = new Set<string>();

function prefetchStylesheetsFromHtml(html: string): void {
	let doc: Document;
	try {
		doc = new DOMParser().parseFromString(html, "text/html");
	} catch {
		return;
	}

	doc
		.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
		.forEach((link) => {
			const href = link.getAttribute("href");
			if (!href?.startsWith("/") || PREFETCHED_HREFS.has(href)) return;
			PREFETCHED_HREFS.add(href);

			// 当前文档已加载（共享 chunk）或已预取过同一样式表时无需再插
			if (
				document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)
			) {
				return;
			}

			const prefetchLink = document.createElement("link");
			prefetchLink.rel = "stylesheet";
			prefetchLink.href = href;
			// media="print"：低优先级下载进缓存，对当前页的屏幕渲染零影响
			prefetchLink.media = "print";
			prefetchLink.dataset.swupCssPrefetch = "";
			document.head.appendChild(prefetchLink);
		});
}

/** 试着装监听；swup 或 preload 插件还没就绪时返回 false */
function tryInstall(): boolean {
	const swup = window.swup as
		| {
				preload?: unknown;
				hooks: {
					on: (
						name: string,
						handler: (visit: unknown, args: unknown) => void,
					) => void;
				};
		  }
		| undefined;

	// swup.preload 由 @swup/preload-plugin 提供；未启用时 page:preload 钩子不存在
	if (!swup || typeof swup.preload !== "function") return false;

	swup.hooks.on("page:preload", (_visit, args) => {
		// @swup/preload-plugin v3 把目标页直接挂在 args 上（{ url, html }）；
		// 更早的版本是 args.page.html —— 两种都兼容，免得跟着插件升级踩空
		const payload = args as
			| { html?: string; page?: { html?: string } }
			| undefined;
		const html = payload?.html ?? payload?.page?.html;
		if (html) prefetchStylesheetsFromHtml(html);
	});
	return true;
}

/**
 * 在 swup 完全就绪后装一次监听。
 *
 * ⚠️ 不能在这里同步检查：`window.swup` 先被创建、各个插件随后才把自己挂上去，
 * 而 `initSwupLifecycle()` 跑得比 preload 插件挂载还早 —— 那时 `swup.preload`
 * 还是 undefined，直接判断会把监听整个跳过（切页时就永远等不到预取）。
 * 所以先等 `swup:enable` / `swup:any`，再留几帧轮询兜底。
 */
export function installSwupCssPrefetch(): void {
	if (tryInstall()) return;

	let tries = 0;
	const drain = (): void => {
		if (!tryInstall()) return;
		document.removeEventListener("swup:enable", drain);
		document.removeEventListener("swup:any", drain);
	};
	document.addEventListener("swup:enable", drain);
	document.addEventListener("swup:any", drain);

	// 兜底：万一时序更靠后（例如这两个事件已经错过），再轮询几帧
	const poll = (): void => {
		if (tryInstall()) {
			document.removeEventListener("swup:enable", drain);
			document.removeEventListener("swup:any", drain);
			return;
		}
		if (tries++ < 120) requestAnimationFrame(poll);
	};
	requestAnimationFrame(poll);
}
