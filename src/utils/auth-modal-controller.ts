/**
 * 认证弹窗控制器（window 单例门面，供坞站 / 移动菜单按钮与 Svelte 弹窗双向通信）
 *
 * 镜像 search-modal-controller.ts 的跨导航单例模式：
 * - 弹窗组件挂载时 bindAuthModalController 注册自身
 * - 其它按钮 / 脚本通过 requestAuthModalOpen 请求打开（未挂载时缓存 pending 请求）
 */

export type AuthModalController = {
	open: () => void;
	close: () => void;
};

type AuthModalWindow = Window & {
	__fireflyAuthModalController?: AuthModalController;
	__fireflyAuthModalPendingOpen?: boolean;
	__fireflyAuthModalUnbind?: () => void;
};

function getWindow(windowRef?: Window): AuthModalWindow | null {
	if (windowRef) return windowRef as AuthModalWindow;
	if (typeof window !== "undefined") return window as AuthModalWindow;
	return null;
}

export function requestAuthModalOpen(windowRef?: Window): void {
	const targetWindow = getWindow(windowRef);
	if (!targetWindow) return;

	const controller = targetWindow.__fireflyAuthModalController;
	if (controller) {
		controller.open();
		return;
	}

	targetWindow.__fireflyAuthModalPendingOpen = true;
}

export function bindAuthModalController(
	windowRef: Window,
	controller: AuthModalController,
): () => void {
	const targetWindow = getWindow(windowRef);
	if (!targetWindow) return () => {};

	targetWindow.__fireflyAuthModalUnbind?.();
	targetWindow.__fireflyAuthModalController = controller;

	if (targetWindow.__fireflyAuthModalPendingOpen) {
		targetWindow.__fireflyAuthModalPendingOpen = false;
		queueMicrotask(() => {
			if (targetWindow.__fireflyAuthModalController === controller) {
				controller.open();
			}
		});
	}

	function unbind() {
		if (
			targetWindow &&
			targetWindow.__fireflyAuthModalController === controller
		) {
			delete targetWindow.__fireflyAuthModalController;
		}
		if (targetWindow && targetWindow.__fireflyAuthModalUnbind === unbind) {
			delete targetWindow.__fireflyAuthModalUnbind;
		}
	}

	targetWindow.__fireflyAuthModalUnbind = unbind;
	return unbind;
}
