<script lang="ts">
import { onMount } from "svelte";
import { initAuth, installAuthStore } from "@/utils/auth-store";
import { installPrivateRenderer } from "@/utils/private-renderer";
import AuthModal from "./AuthModal.svelte";

/**
 * 认证模块生命周期挂载点（Layout.astro 中 client:idle，Swup 容器外常驻）：
 * - installAuthStore：安装 window.__fireflyAuthStore 门面，供内联脚本读取登录态
 * - installPrivateRenderer：安装私密页面 markdown 渲染器门面
 * - initAuth：向 /api/auth/me 探测 cookie 是否有效
 */
onMount(() => {
	installAuthStore(window);
	installPrivateRenderer(window);
	void initAuth();
});
</script>

<AuthModal />
