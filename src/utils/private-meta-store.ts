/**
 * 私密内容元数据存储（模块级单例，跨 Swup 导航常驻）
 *
 * 设计说明：
 * - 与 auth-store 同构的纯 TS pub-sub store，不使用 Svelte runes（项目无 .svelte.ts 先例）
 * - 数据来源：Worker `/api/private/meta`（私有仓库 private/meta.json），未登录返回 401
 * - 内部订阅 auth-store：isAdmin 变 true 时拉取元数据，变 false 时清空，
 *   登录/退出全程自动同步，无需组件手动触发
 * - 性能优化（v1.65.1）：
 *   - localStorage stale-while-revalidate 缓存（TTL 60s）：安装时先 seed 缓存秒出数据，
 *     后台再并行刷新，避免「过一会才出现私密数据」
 *   - 数据指纹去重：数据未变化时不重复通知订阅者，避免组件反复重绘卡顿
 *   - 安装时立即并行拉取（不等 auth 确认）：cookie 有效则首屏即最新，游客 401 无副作用
 * - window.__fireflyPrivateMetaStore 门面供非组件脚本（内联 JS）读取私密元数据
 */

import { subscribeAuth } from "./auth-store";
import { buildPrivateStats, type PrivateStatsBundle } from "./private-stats";

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
	/** 私密条目统计口径（供统计组件内联脚本折算增量） */
	getStats: () => PrivateStatsBundle;
};

type PrivateMetaWindow = Window & {
	__fireflyPrivateMetaStore?: PrivateMetaStoreFacade;
};

/** 缓存键带版本号：数据形状变更时整体失效，避免旧格式污染 */
const META_CACHE_KEY = "firefly:private-meta:v1";
/** 缓存有效期 60s：stale-while-revalidate，期间秒出缓存数据并后台刷新 */
const META_CACHE_TTL = 60_000;

const state: PrivateMetaState = {
	items: [],
	loaded: false,
	loading: false,
};

const listeners = new Set<PrivateMetaListener>();
let loadPromise: Promise<void> | null = null;
/** 最近一次已通知订阅者的数据指纹：数据未变化时跳过 notify，避免组件反复重绘 */
let notifiedFingerprint = "";

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

/** 仅在数据指纹变化时通知订阅者（loading 状态变化不单独通知） */
function notifyIfChanged(): void {
	const fingerprint = JSON.stringify(state.items);
	if (fingerprint === notifiedFingerprint) return;
	notifiedFingerprint = fingerprint;
	notify();
}

function readMetaCache(): PrivateMetaItem[] | null {
	try {
		if (typeof localStorage === "undefined") return null;
		const raw = localStorage.getItem(META_CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { at?: number; items?: unknown };
		if (typeof parsed.at !== "number" || !Array.isArray(parsed.items)) {
			return null;
		}
		if (Date.now() - parsed.at > META_CACHE_TTL) return null;
		return parsed.items as PrivateMetaItem[];
	} catch {
		return null;
	}
}

function writeMetaCache(items: PrivateMetaItem[]): void {
	try {
		if (typeof localStorage === "undefined") return;
		localStorage.setItem(
			META_CACHE_KEY,
			JSON.stringify({ at: Date.now(), items }),
		);
	} catch {
		// 隐私模式 / 存储受限：静默降级为无缓存
	}
}

function clearMetaCache(): void {
	try {
		if (typeof localStorage === "undefined") return;
		localStorage.removeItem(META_CACHE_KEY);
	} catch {
		// 忽略
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
 * 成功后写 localStorage 缓存；401/数据异常时清缓存（游客视角缓存不可信）；
 * 网络异常时保留已有数据（含缓存 seed 的兜底）。
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
			if (response.ok && payload.ok === true && Array.isArray(payload.data)) {
				state.items = payload.data;
				writeMetaCache(state.items);
			} else {
				// 401 / 数据异常：游客或服务异常，缓存不可信，清空降级为公开基线
				state.items = [];
				clearMetaCache();
			}
		} catch {
			// 网络异常：保留已有数据（含缓存 seed 的兜底），不清空。
			// 静态预览 / 无 Worker 环境下 items 本就为空，等价于静默降级
		} finally {
			state.loading = false;
			state.loaded = true;
			loadPromise = null;
			notifyIfChanged();
		}
	})();

	return loadPromise;
}

/** 清空本地私密元数据（退出登录时调用），下次登录会重新拉取 */
export function resetPrivateMeta(): void {
	if (state.items.length === 0 && !state.loaded && !state.loading) return;
	state.items = [];
	state.loaded = false;
	state.loading = false;
	clearMetaCache();
	notifyIfChanged();
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
		getStats: () => buildPrivateStats(state.items),
	};

	// 仅在 auth 确认为管理员时接触本地缓存/发起请求，游客绝不 seed 缓存，
	// 避免残留的私密标题在未登录状态下泄露（遵守「游客不发私密请求」约束）。
	// 管理员登录确认后：先同步 seed 缓存（秒出数据），再后台 stale-while-revalidate 刷新。
	subscribeAuth((auth) => {
		if (auth.isAdmin) {
			if (!state.loaded && state.items.length === 0) {
				const cached = readMetaCache();
				if (cached && cached.length > 0) {
					state.items = cached;
					notifyIfChanged();
				}
			}
			void loadPrivateMeta();
		} else {
			resetPrivateMeta();
		}
	});

	// 门面就绪事件：统计组件的内联脚本（无法 import 模块）靠它等待订阅入口
	targetWindow.dispatchEvent(
		new CustomEvent("firefly:private-meta-store-ready"),
	);
}
