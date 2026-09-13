import {
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
	SYSTEM_MODE,
} from "@constants/constants";
import type { LIGHT_DARK_MODE } from "@/types/config";
import { expressiveCodeConfig, siteConfig } from "../config";

export function getDefaultHue(): number {
	const fallback = "250";
	// 检查是否在浏览器环境中
	if (typeof document === "undefined") {
		return Number.parseInt(fallback, 10);
	}
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getDefaultTheme(): LIGHT_DARK_MODE {
	// 如果配置文件中设置了 defaultMode，使用配置的值
	// 否则使用 DEFAULT_THEME（向后兼容）
	return siteConfig.themeColor.defaultMode ?? DEFAULT_THEME;
}

// 获取系统主题
export function getSystemTheme(): LIGHT_DARK_MODE {
	if (typeof window === "undefined") {
		return LIGHT_MODE;
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? DARK_MODE
		: LIGHT_MODE;
}

// 解析主题（如果是system模式，则获取系统主题）
export function resolveTheme(theme: LIGHT_DARK_MODE): LIGHT_DARK_MODE {
	if (theme === SYSTEM_MODE) {
		return getSystemTheme();
	}
	return theme;
}

export function getHue(): number {
	// 先检查全局对象
	if (typeof window === "undefined" || !window.localStorage) {
		return getDefaultHue();
	}
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	// 先检查是否在浏览器环境
	if (
		typeof window === "undefined" ||
		!window.localStorage ||
		typeof document === "undefined"
	) {
		return;
	}
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	// 检查是否在浏览器环境中
	if (typeof document === "undefined") {
		return;
	}

	// 解析主题
	const resolvedTheme = resolveTheme(theme);

	// 获取当前主题状态的完整信息
	const currentIsDark = document.documentElement.classList.contains("dark");
	const currentTheme = document.documentElement.getAttribute("data-theme");

	// 计算目标主题状态
	let targetIsDark = false; // 初始化默认值
	switch (resolvedTheme) {
		case LIGHT_MODE:
			targetIsDark = false;
			break;
		case DARK_MODE:
			targetIsDark = true;
			break;
		default:
			// 处理默认情况，使用当前主题状态
			targetIsDark = currentIsDark;
			break;
	}

	// 检测是否真的需要主题切换：
	// 1. dark类状态是否改变
	// 2. expressiveCode主题是否需要更新
	const needsThemeChange = currentIsDark !== targetIsDark;
	const expectedTheme = targetIsDark
		? expressiveCodeConfig.darkTheme
		: expressiveCodeConfig.lightTheme;
	const needsCodeThemeUpdate = currentTheme !== expectedTheme;

	// 如果既不需要主题切换也不需要代码主题更新，直接返回
	if (!needsThemeChange && !needsCodeThemeUpdate) {
		return;
	}

	// 批量 DOM 操作，减少重绘
	if (needsThemeChange) {
		// 添加过渡保护类（但会导致大量重绘，所以使用更轻量的方式）
		// document.documentElement.classList.add("is-theme-transitioning");

		// 直接切换主题，利用 CSS 变量的特性让浏览器优化过渡
		if (targetIsDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}

	// Set the theme for Expressive Code based on current mode
	if (needsCodeThemeUpdate) {
		document.documentElement.setAttribute("data-theme", expectedTheme);
	}
}

// 系统主题监听器引用
let systemThemeListener:
	| ((e: MediaQueryListEvent | MediaQueryList) => void)
	| null = null;

export function setTheme(theme: LIGHT_DARK_MODE): void {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}

	// 先应用主题
	applyThemeToDocument(theme);

	// 保存到localStorage
	localStorage.setItem("theme", theme);

	// 如果切换到 system 模式，需要监听系统主题变化
	if (theme === SYSTEM_MODE) {
		setupSystemThemeListener();
	} else {
		// 如果切换其他模式，移除系统主题监听
		cleanupSystemThemeListener();
	}
}

// 设置系统主题监听器
export function setupSystemThemeListener(): void {
	// 先清理之前的监听器
	cleanupSystemThemeListener();

	if (typeof window === "undefined") {
		return;
	}

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	// 处理系统主题变化的回调
	const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
		const isDark = e.matches;
		const currentIsDark = document.documentElement.classList.contains("dark");

		// 如果主题状态没有变化，直接返回
		if (currentIsDark === isDark) {
			return;
		}

		// 直接应用系统主题，不使用过渡保护类以避免大量重绘
		if (isDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}

		// Set the theme for Expressive Code
		const expressiveTheme = isDark
			? expressiveCodeConfig.darkTheme
			: expressiveCodeConfig.lightTheme;
		document.documentElement.setAttribute("data-theme", expressiveTheme);

		// 触发自定义事件通知其他组件（仅在真正切换时触发）
		window.dispatchEvent(new CustomEvent("theme-change"));
	};

	// 立即调用一次以设置初始状态
	handleSystemThemeChange(mediaQuery);

	// 监听系统主题变化（现代浏览器）
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener("change", handleSystemThemeChange);
	} else {
		// 兼容旧浏览器
		mediaQuery.addListener(handleSystemThemeChange);
	}

	systemThemeListener = handleSystemThemeChange;
}

// 清理系统主题监听器
function cleanupSystemThemeListener() {
	if (typeof window === "undefined" || !systemThemeListener) {
		return;
	}

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	if (mediaQuery.removeEventListener) {
		mediaQuery.removeEventListener("change", systemThemeListener);
	} else {
		// 兼容旧浏览器
		mediaQuery.removeListener(systemThemeListener);
	}

	systemThemeListener = null;
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	// 检查是否在浏览器环境中
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return getDefaultTheme();
	}
	return (
		(localStorage.getItem("theme") as LIGHT_DARK_MODE) || getDefaultTheme()
	);
}

// 初始化主题监听器（用于页面加载后）
export function initThemeListener(): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.getItem !== "function"
	) {
		return;
	}

	const theme = getStoredTheme();

	// 如果主题是 system 模式，需要监听系统主题变化
	if (theme === SYSTEM_MODE) {
		setupSystemThemeListener();
	}
}


export function setBannerTitleEnabled(enabled: boolean): void {
	if (
		typeof localStorage === "undefined" ||
		typeof localStorage.setItem !== "function"
	) {
		return;
	}
	localStorage.setItem("bannerTitleEnabled", String(enabled));
	applyBannerTitleEnabledToDocument(enabled);
}

export function applyBannerTitleEnabledToDocument(enabled: boolean): void {
	if (typeof document === "undefined") {
		return;
	}
	// 更新 html 属性，CSS 会立即生效
	document.documentElement.setAttribute(
		"data-banner-title-enabled",
		String(enabled),
	);
	// 同时更新元素样式（兼容性）
	const bannerTextOverlay = document.querySelector(
		".banner-home-text-overlay",
	) as HTMLElement;
	if (bannerTextOverlay) {
		if (enabled) {
			bannerTextOverlay.classList.remove("user-hidden");
		} else {
			bannerTextOverlay.classList.add("user-hidden");
		}
	}
}
