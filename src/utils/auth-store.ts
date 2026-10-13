/**
 * 管理员认证状态存储（模块级单例，跨 Swup 导航常驻）
 *
 * 设计说明：
 * - 纯 TS pub-sub store，不使用 Svelte runes（项目无 .svelte.ts 先例，避免类型检查兼容问题）
 * - 模块常驻天然跨 Svelte 组件与页面内联脚本共享
 * - window.__fireflyAuthStore 门面供非组件脚本（如 projects.astro 内联 JS）读取登录态
 * - 后端由 Cloudflare Worker 提供：/api/auth/login、/api/auth/logout、/api/auth/me
 */

export type AuthState = {
	/** 是否已通过管理员认证 */
	isAdmin: boolean;
	/** 是否已向 /api/auth/me 完成初始化探测 */
	initialized: boolean;
};

export type AuthResult =
	| { ok: true }
	| { ok: false; error: "invalid_password" }
	| { ok: false; error: "rate_limited"; retryAfter: number }
	| { ok: false; error: "network" };

export type AuthListener = (state: AuthState) => void;

export type AuthStoreFacade = {
	getAuthState: () => AuthState;
	initAuth: () => Promise<void>;
	login: (password: string) => Promise<AuthResult>;
	logout: () => Promise<void>;
	subscribeAuth: (listener: AuthListener) => () => void;
};

type AuthStoreWindow = Window & {
	__fireflyAuthStore?: AuthStoreFacade;
};

const state: AuthState = {
	isAdmin: false,
	initialized: false,
};

const listeners = new Set<AuthListener>();
let initPromise: Promise<void> | null = null;

function notify(): void {
	const snapshot: AuthState = {
		isAdmin: state.isAdmin,
		initialized: state.initialized,
	};
	for (const listener of listeners) {
		listener(snapshot);
	}
}

export function getAuthState(): AuthState {
	return { isAdmin: state.isAdmin, initialized: state.initialized };
}

export function subscribeAuth(listener: AuthListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * 初始化探测：向 /api/auth/me 询问当前 cookie 是否有效。
 * 幂等：已初始化或已有进行中的请求时不会重复发起。
 */
export async function initAuth(): Promise<void> {
	if (state.initialized) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			const response = await fetch("/api/auth/me", {
				headers: { Accept: "application/json" },
				credentials: "same-origin",
			});
			const payload = (await response.json()) as { admin?: boolean };
			state.isAdmin = payload.admin === true;
		} catch {
			// 静态预览 / 无 Worker 环境：静默降级为游客
			state.isAdmin = false;
		} finally {
			state.initialized = true;
			initPromise = null;
			notify();
		}
	})();

	return initPromise;
}

/** 密码登录；错误时返回判别联合结果供 UI 展示（密码错误 / 限流冷却 / 网络异常） */
export async function login(password: string): Promise<AuthResult> {
	try {
		const response = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ password }),
		});

		if (response.status === 429) {
			const payload = (await response.json()) as { retryAfter?: number };
			return {
				ok: false,
				error: "rate_limited",
				retryAfter: Math.max(1, Math.ceil(payload.retryAfter ?? 30)),
			};
		}
		if (response.status === 401) {
			return { ok: false, error: "invalid_password" };
		}
		if (response.status === 200) {
			state.isAdmin = true;
			state.initialized = true;
			notify();
			return { ok: true };
		}
		return { ok: false, error: "network" };
	} catch {
		return { ok: false, error: "network" };
	}
}

/** 退出登录：通知 Worker 清除 HttpOnly cookie，并同步本地状态 */
export async function logout(): Promise<void> {
	try {
		await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "same-origin",
		});
	} catch {
		// 网络异常也本地登出，保证 UI 一致
	}
	state.isAdmin = false;
	state.initialized = true;
	notify();
}

/**
 * 安装 window 门面，供 Swup 容器内脚本 / 内联脚本读取登录态。
 * 仅在首次安装（幂等）。
 */
export function installAuthStore(windowRef?: Window): void {
	const targetWindow =
		windowRef ?? (typeof window === "undefined" ? null : window);
	if (!targetWindow) return;
	const target = targetWindow as AuthStoreWindow;
	if (target.__fireflyAuthStore) return;
	target.__fireflyAuthStore = {
		getAuthState,
		initAuth,
		login,
		logout,
		subscribeAuth,
	};
}
