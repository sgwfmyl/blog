<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount, tick } from "svelte";
import { bindAuthModalController } from "@/utils/auth-modal-controller";
import {
	type AuthState,
	getAuthState,
	login,
	logout,
	subscribeAuth,
} from "@/utils/auth-store";

// --- State ---
let visible = $state(false);
let isAdmin = $state(false);
let password = $state("");
let submitting = $state(false);
type AuthError = "invalid_password" | "rate_limited" | "network" | null;
let error = $state<AuthError>(null);
let cooldownSeconds = $state(0);

// --- Refs ---
let modalEl = $state<HTMLDivElement>();
let inputEl = $state<HTMLInputElement>();

let cooldownTimer: ReturnType<typeof setInterval> | undefined;

// --- 弹窗开关 ---
function open() {
	visible = true;
	error = null;
	tick().then(() => {
		if (!isAdmin) inputEl?.focus();
	});
}

function close() {
	visible = false;
	password = "";
	error = null;
}

function handleBackdropClick(e: MouseEvent) {
	if (e.target === modalEl) {
		close();
	}
}

// --- 登录 ---
function startCooldown(seconds: number) {
	cooldownSeconds = seconds;
	clearInterval(cooldownTimer);
	cooldownTimer = setInterval(() => {
		cooldownSeconds -= 1;
		if (cooldownSeconds <= 0) {
			clearInterval(cooldownTimer);
			cooldownTimer = undefined;
			error = null;
		}
	}, 1000);
}

async function handleSubmit(e: SubmitEvent) {
	e.preventDefault();
	if (submitting || cooldownSeconds > 0) return;
	if (!password) return;

	submitting = true;
	error = null;
	const result = await login(password);
	submitting = false;

	if (result.ok) {
		password = "";
		document.dispatchEvent(new CustomEvent("firefly:auth-logged-in"));
		close();
		return;
	}

	password = "";
	if (result.error === "rate_limited") {
		error = "rate_limited";
		startCooldown(result.retryAfter);
	} else if (result.error === "invalid_password") {
		error = "invalid_password";
	} else {
		error = "network";
	}
}

// --- 退出 ---
async function handleLogout() {
	await logout();
	close();
	document.dispatchEvent(new CustomEvent("firefly:auth-logged-out"));
}

// --- 初始化 ---
onMount(() => {
	const sync = (s: AuthState) => {
		isAdmin = s.isAdmin;
	};
	sync(getAuthState());
	const unsubscribeAuth = subscribeAuth(sync);

	const unbindAuthModalController = bindAuthModalController(window, {
		open,
		close,
	});

	// 供 Swup 容器内内联脚本（如 MobileMenuSheet 的 is:inline 脚本）触发
	const handleGlobalOpen = () => open();
	document.addEventListener("firefly:auth-modal-open", handleGlobalOpen);

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape" && visible) {
			close();
		}
	};
	document.addEventListener("keydown", handleKeyDown);

	return () => {
		unsubscribeAuth();
		unbindAuthModalController();
		document.removeEventListener("firefly:auth-modal-open", handleGlobalOpen);
		document.removeEventListener("keydown", handleKeyDown);
		clearInterval(cooldownTimer);
	};
});

// --- 错误文案 ---
function errorText(): string {
	if (error === "invalid_password") return i18n(I18nKey.adminWrongPassword);
	if (error === "rate_limited") {
		return i18n(I18nKey.adminCooldown).replace(
			"{seconds}",
			String(cooldownSeconds),
		);
	}
	if (error === "network") return i18n(I18nKey.adminLoginFailed);
	return "";
}
</script>

{#if visible}
<div
	class="auth-modal-backdrop"
	bind:this={modalEl}
	role="button"
	tabindex="-1"
	onclick={handleBackdropClick}
	onkeydown={(e) => {
		if (e.key === "Enter" || e.key === " ") handleBackdropClick();
	}}
>
	<div class="auth-modal-content" role="dialog" aria-modal="true" aria-label={i18n(I18nKey.admin)}>
		<h2 class="auth-modal-title">{i18n(I18nKey.admin)}</h2>

		{#if isAdmin}
			<div class="auth-modal-panel">
				<p class="auth-modal-hint">{i18n(I18nKey.adminLoginHint)}</p>
				<a
					href="/private/"
					class="auth-modal-private"
					onclick={() => close()}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
					</svg>
					<span>{i18n(I18nKey.adminPrivateSpace)}</span>
				</a>
				<button type="button" class="auth-modal-btn" onclick={handleLogout}>
					{i18n(I18nKey.adminLogout)}
				</button>
			</div>
		{:else}
			<form class="auth-modal-form" onsubmit={handleSubmit}>
				<input
					type="password"
					bind:this={inputEl}
					bind:value={password}
					placeholder={i18n(I18nKey.adminPasswordPlaceholder)}
					disabled={submitting}
					class="auth-modal-input"
					autocomplete="current-password"
				/>
				{#if error}
					<p class="auth-modal-error" class:error-shake={error !== null}>
						{errorText()}
					</p>
				{/if}
				<button
					type="submit"
					disabled={submitting || cooldownSeconds > 0}
					class="auth-modal-btn"
				>
					{submitting ? "..." : i18n(I18nKey.adminLogin)}
				</button>
			</form>
		{/if}

		<button type="button" class="auth-modal-close" aria-label={i18n(I18nKey.close)} onclick={close}>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z" fill="currentColor"/>
			</svg>
		</button>
	</div>
</div>
{/if}

<style>
	.auth-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 110;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 18vh;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		animation: authFadeIn 0.2s ease;
	}

	:root.dark .auth-modal-backdrop {
		background: rgba(0, 0, 0, 0.7);
	}

	@keyframes authFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes authSlideUp {
		from { opacity: 0; transform: translateY(1rem) scale(0.98); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	@keyframes authShake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-6px); }
		40% { transform: translateX(6px); }
		60% { transform: translateX(-4px); }
		80% { transform: translateX(4px); }
	}

	.auth-modal-content {
		position: relative;
		width: 100%;
		max-width: 22rem;
		margin: 0 1rem;
		background: var(--card-bg);
		border-radius: 1.25rem;
		padding: 1.75rem 1.5rem 1.5rem;
		box-shadow: 0 12px 48px -8px rgba(0, 0, 0, 0.25);
		animation: authSlideUp 0.25s ease;
	}

	:root.dark .auth-modal-content {
		box-shadow: 0 12px 48px -8px rgba(0, 0, 0, 0.6);
	}

	.auth-modal-title {
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--content-meta);
		margin-bottom: 1rem;
		text-align: center;
	}

	.auth-modal-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.auth-modal-input {
		width: 100%;
		height: 2.75rem;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 0.75rem;
		background: transparent;
		color: var(--deep-text);
		font-size: 0.9375rem;
		padding: 0 0.875rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	:root.dark .auth-modal-input {
		border-color: rgba(255, 255, 255, 0.14);
	}

	.auth-modal-input:focus {
		border-color: var(--primary, #3b82f6);
	}

	.auth-modal-error {
		font-size: 0.8125rem;
		color: #e11d48;
		text-align: center;
		animation: authShake 0.4s ease;
	}

	:root.dark .auth-modal-error {
		color: #fb7185;
	}

	.auth-modal-btn {
		width: 100%;
		height: 2.75rem;
		border: none;
		border-radius: 0.75rem;
		background: var(--deep-text);
		color: var(--page-bg);
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.auth-modal-btn:hover {
		opacity: 0.85;
	}

	.auth-modal-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.auth-modal-panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.auth-modal-hint {
		font-size: 0.875rem;
		color: var(--content-meta);
		text-align: center;
		line-height: 1.5;
	}

	.auth-modal-private {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 2.75rem;
		border-radius: 0.75rem;
		background: rgba(0, 0, 0, 0.05);
		color: var(--deep-text);
		font-size: 0.9375rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.15s ease;
	}

	:root.dark .auth-modal-private {
		background: rgba(255, 255, 255, 0.08);
	}

	.auth-modal-private:hover {
		background: rgba(0, 0, 0, 0.09);
	}

	:root.dark .auth-modal-private:hover {
		background: rgba(255, 255, 255, 0.14);
	}

	.auth-modal-close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.06);
		color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: background 0.15s ease;
	}

	:root.dark .auth-modal-close {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
	}

	@media (prefers-reduced-motion: reduce) {
		.auth-modal-backdrop,
		.auth-modal-content,
		.auth-modal-error {
			animation: none;
		}
	}
</style>
