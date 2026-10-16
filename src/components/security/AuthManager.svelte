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
 */
onMount(() => {
	installAuthStore(window);
	void initAuth();

	// 统一登录入口事件委托（一次注册，覆盖所有 data-auth-open 按钮）
	const handleClick = (e: MouseEvent) => {
		const target = e.target as Element | null;
		if (target?.closest?.("[data-auth-open]")) {
			e.preventDefault();
			requestAuthModalOpen(window);
		}
	};
	document.addEventListener("click", handleClick);

	// bfcache 检测：从往返缓存恢复时强制刷新，防私密 HTML 残留
	const handlePageShow = (e: PageTransitionEvent) => {
		if (e.persisted) {
			window.location.reload();
		}
	};
	window.addEventListener("pageshow", handlePageShow);

	return () => {
		document.removeEventListener("click", handleClick);
		window.removeEventListener("pageshow", handlePageShow);
	};
});
</script>

<AuthModal />
