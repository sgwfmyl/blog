/**
 * 私密内容元数据存储（模块级单例，跨 Swup 导航常驻）
 *
 * 设计说明：
 * - 与 auth-store 同构的纯 TS pub-sub store，不使用 Svelte runes（项目无 .svelte.ts 先例）
 * - 数据来源：Worker `/api/private/meta`（私有仓库 private/meta.json），未登录返回 401
 * - 内部订阅 auth-store：isAdmin 变 true 时拉取元数据，变 false 时清空，
 *   登录/退出全程自动同步，无需组件手动触发
 * - window.__fireflyPrivateMetaStore 门面供非组件脚本（内联 JS）读取私密元数据
 */

import { getAuthState, subscribeAuth } from "./auth-store";

export type PrivateMetaItem = {
	/** 详情标识，可含子目录路径（如 "私密/观影记录"），对应私有仓库 private/pages/<slug>.md */
	slug: string;
	/** 与公开归档类型对齐：post | moment | bangumi | life */
	type: "post" | "moment" | "bangumi" | "life";
	title: string;
	/** ISO 日期（可含时间），如 "2026-10-15" 或 "2026-10-15T12:00:00Z" */
	date: string;
	tags: string[];
	/** 分类路径，可含 "/"（如 "私密/影视"）；缺省为空串 */
	category?: string | null;
	/** 可选详情页 URL，缺省为 /private/<slug>/ */
	url?: string;
};

export type PrivateMetaState = {
	items: PrivateMetaItem[];
	/** 是否已完成一次拉取（成功或 401 均置位，避免重复请求） */
	loaded: boolean;
	loading: boolean;
};

export type PrivateMetaListener = (state: PrivateMetaState) => void;

export type PrivateMetaStoreFacade = {
	getPrivateMeta: () => PrivateMetaState;
	loadPrivateMeta: () => Promise<void>;
	resetPrivateMeta: () => void;
	subscribePrivateMeta: (listener: PrivateMetaListener) => () => void;
};

type PrivateMetaWindow = Window & {
	__fireflyPrivateMetaStore?: PrivateMetaStoreFacade;
};

const state: PrivateMetaState = {
	items: [],
	loaded: false,
	loading: false,
};

const listeners = new Set<PrivateMetaListener>();
let loadPromise: Promise<void> | null = null;

function notify(): void {
	const snapshot: PrivateMetaState = {
		items: state.items.slice(),
		loaded: state.loaded,
		loading: state.loading,
	};
	for (const listener of listeners) {
		listener(snapshot);
	}
}

export function getPrivateMeta(): PrivateMetaState {
	return {
		items: state.items.slice(),
		loaded: state.loaded,
		loading: state.loading,
	};
}

export function subscribePrivateMeta(
	listener: PrivateMetaListener,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * 拉取私密内容元数据。幂等：已有进行中的请求时复用同一 Promise；
 * 已成功加载或已确认为游客时不重复请求（退出登录会 reset 以允许再次拉取）。
 */
export async function loadPrivateMeta(): Promise<void> {
	if (state.loading) return loadPromise ?? Promise.resolve();
	if (state.loaded && state.items.length > 0) return;

	state.loading = true;
	notify();
	loadPromise = (async () => {
		try {
			const response = await fetch("/api/private/meta", {
				headers: { Accept: "application/json" },
				credentials: "same-origin",
			});
			const payload = (await response.json()) as {
				ok?: boolean;
				data?: PrivateMetaItem[];
			};
			state.items =
				response.ok && payload.ok === true && Array.isArray(payload.data)
					? payload.data
					: [];
		} catch {
			// 静态预览 / 无 Worker 环境：静默降级为空列表
			state.items = [];
		} finally {
			state.loading = false;
			state.loaded = true;
			loadPromise = null;
			notify();
		}
	})();

	return loadPromise;
}

/** 清空本地私密元数据（退出登录时调用），下次登录会重新拉取 */
export function resetPrivateMeta(): void {
	if (state.items.length === 0 && !state.loaded) return;
	state.items = [];
	state.loaded = false;
	state.loading = false;
	notify();
}

/**
 * 安装 window 门面并订阅 auth-store：登录→拉取，登出→清空。
 * 幂等，仅安装一次（在 Layout 的 AuthManager onMount 中调用）。
 */
export function installPrivateMetaStore(windowRef?: Window): void {
	const targetWindow =
		windowRef ?? (typeof window === "undefined" ? null : window);
	if (!targetWindow) return;
	const target = targetWindow as PrivateMetaWindow;
	if (target.__fireflyPrivateMetaStore) return;
	target.__fireflyPrivateMetaStore = {
		getPrivateMeta,
		loadPrivateMeta,
		resetPrivateMeta,
		subscribePrivateMeta,
	};

	subscribeAuth((auth) => {
		if (auth.isAdmin) {
			void loadPrivateMeta();
		} else {
			resetPrivateMeta();
		}
	});
	// 若初始化时已处于登录态（cookie 有效且 initAuth 已完成），立即拉取
	if (getAuthState().isAdmin && !state.loaded) {
		void loadPrivateMeta();
	}
}
