import { BANNER_HEIGHT } from "@/constants/constants";

declare global {
	interface Window {
		_navbarHidden?: boolean;
		_lastScrollY?: number;
	}
}

/**
 * Initialize scroll-based UI behaviors:
 * - Back-to-top button visibility
 * - TOC visibility
 * - Navbar auto-hide/show based on scroll direction
 */
export function initScrollHandler(): void {
	const bannerEnabled = !!document.getElementById("wallpaper-wrapper");
	const backToTopBtn = document.getElementById("back-to-top-btn");
	const toc = document.getElementById("toc-wrapper");
	const navbar = document.getElementById("navbar-wrapper");

	function scrollFunction() {
		const scrollTop = document.documentElement.scrollTop;
		const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);

		// Batch DOM operations for performance
		const operations: (() => void)[] = [];

		if (backToTopBtn) {
			operations.push(() => {
				if (scrollTop > bannerHeight) {
					backToTopBtn.classList.remove("hide");
				} else {
					backToTopBtn.classList.add("hide");
				}
			});
		}

		if (bannerEnabled && toc) {
			operations.push(() => {
				if (scrollTop > bannerHeight) {
					toc.classList.remove("toc-hide");
				} else {
					toc.classList.add("toc-hide");
				}
			});
		}

		// 导航栏：只保留「滚动后收缩成球」的 scrolled 标记。
		// 按滚动方向隐藏/显示（navbar-hidden ↔ navbar-visible）已于 2026-09-29 按要求移除，
		// 导航栏现在常驻；这里顺手把可能残留的 navbar-hidden 清掉。
		if (navbar) {
			operations.push(() => {
				const currentScrollY =
					window.pageYOffset || document.documentElement.scrollTop;
				window._lastScrollY = currentScrollY;
				window._navbarHidden = false;
				navbar.classList.remove("navbar-hidden");
				navbar.classList.add("navbar-visible");
				const navEl = document.getElementById("navbar");
				if (navEl) navEl.classList.toggle("scrolled", currentScrollY > 20);
			});
		}

		// Batch execute DOM operations
		if (operations.length > 0) {
			requestAnimationFrame(() => {
				operations.forEach((op) => {
					op();
				});
			});
		}
	}

	// Optimized scroll performance handling
	let scrollTimeout: number;
	window.addEventListener(
		"scroll",
		() => {
			if (scrollTimeout) {
				cancelAnimationFrame(scrollTimeout);
			}
			scrollTimeout = requestAnimationFrame(scrollFunction);
		},
		{ passive: true },
	);
}
