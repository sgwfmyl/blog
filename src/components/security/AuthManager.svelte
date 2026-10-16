<script lang="ts">
import { onMount } from "svelte";
import { requestAuthModalOpen } from "@/utils/auth-modal-controller";
import { initAuth, installAuthStore } from "@/utils/auth-store";
import AuthModal from "./AuthModal.svelte";

/**
 * 认证模块生命周期挂载点（Layout.astro 中 client:idle，Swup 容器外常驻）：
 * - installAuthStore：安装 window.__fireflyAuthStore 门面，供内联脚本读取登录态
 * - initAuth：向 /api/auth/me 探测 cookie 是否有效
 * - 统一登录入口事件委托：document 级 click 委托，捕获 `[data-auth-open]` 点击并打开弹窗，
 *   坞站/移动菜单/登录门三处按钮只需写 `data-auth-open` 属性，无需各自绑定脚本
 * - pageshow 检测 bfcache：`e.persisted` 为真时强制刷新，防 bfcache 残留私密 HTML（安全约束）
 * - 登录/退出后刷新当前页：SSR 页面（归档/私密/映射路由）内容取决于登录态，
 *   登录态变化后需重新请求服务端渲染（否则归档页停在游客版/登录版不更新）
 */
onMount(() => {
	installAuthStore(window);
	void initAuth();

	// 登录/退出后刷新当前页面（重新请求 SSR，拿到最新登录态）。
	// 优先走 Swup loadPage 保持平滑；无 Swup 时回退整页 reload。
	function refreshCurrentPage() {
		const currentUrl = window.location.pathname + window.location.search;
		if (window.swup && typeof window.swup.loadPage === "function") {
			window.swup.loadPage(currentUrl, { animate: false });
		} else {
			window.location.reload();
		}
	}

	// 统一登录入口事件委托（一次注册，覆盖所有 data-auth-open 按钮）
	const handleClick = (e: MouseEvent) => {
		const target = e.target as Element | null;
		if (target?.closest?.("[data-auth-open]")) {
			e.preventDefault();
			requestAuthModalOpen(window);
		}
	};
	document.addEventListener("click", handleClick);

	// 登录 / 退出成功后刷新当前页
	const handleAuthChange = () => {
		refreshCurrentPage();
	};
	document.addEventListener("firefly:auth-logged-in", handleAuthChange);
	document.addEventListener("firefly:auth-logged-out", handleAuthChange);

	// bfcache 检测：从往返缓存恢复时强制刷新，防私密 HTML 残留
	const handlePageShow = (e: PageTransitionEvent) => {
		if (e.persisted) {
			window.location.reload();
		}
	};
	window.addEventListener("pageshow", handlePageShow);

	return () => {
		document.removeEventListener("click", handleClick);
		document.removeEventListener("firefly:auth-logged-in", handleAuthChange);
		document.removeEventListener("firefly:auth-logged-out", handleAuthChange);
		window.removeEventListener("pageshow", handlePageShow);
	};
});
</script>

<AuthModal />
