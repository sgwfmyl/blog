import { isCurrentPagePost } from "./grid-layout-utils";
import { getSidebarPageType } from "./page-type";

/**
 * 侧栏小组件显隐更新。两套机制并存：
 *
 * 1. **旧**（`.widget-hide-on-post` / `.widget-hide-on-non-post`）：只区分"文章详情页 / 其他"
 * 2. **新**（`data-show-pages` 白名单 / `data-hide-pages` 黑名单）：按 `SidebarPageType` 精确控制
 *
 * 因为侧栏渲染在 Swup 容器之外、客户端导航时不会重新渲染，所以每次导航后都要重算一次
 * （调用点：`Layout.astro` 首屏、`swup-lifecycle-controller.ts` 的 content:replace / page:view）。
 */
export function updateSidebarComponentsVisibility(): void {
	const isPostPage = isCurrentPagePost();
	const pageType = getSidebarPageType(window.location.pathname);

	// 旧机制：按是否文章详情页
	document.querySelectorAll(".widget-hide-on-post").forEach((widget) => {
		isPostPage
			? widget.classList.add("hidden")
			: widget.classList.remove("hidden");
	});

	document.querySelectorAll(".widget-hide-on-non-post").forEach((widget) => {
		!isPostPage
			? widget.classList.add("hidden")
			: widget.classList.remove("hidden");
	});

	// 新机制：按页面类型白名单 / 黑名单
	document.querySelectorAll<HTMLElement>("[data-show-pages]").forEach((el) => {
		const allowed = (el.dataset.showPages ?? "").split(",").filter(Boolean);
		el.classList.toggle("hidden", !allowed.includes(pageType));
	});

	document.querySelectorAll<HTMLElement>("[data-hide-pages]").forEach((el) => {
		const blocked = (el.dataset.hidePages ?? "").split(",").filter(Boolean);
		el.classList.toggle("hidden", blocked.includes(pageType));
	});
}
