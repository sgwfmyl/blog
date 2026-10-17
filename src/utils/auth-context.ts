import { AUTH_COOKIE_NAME, verifySession } from "@utils/auth-session";

/**
 * 运行时鉴权上下文（阶段 4 引入）。
 *
 * 服务端判断「当前请求是否来自已登录管理员」。SSR 私有路由（/private/、映射路由、
 * 归档页合并私有）据此决定：未登录 → 404 / 登录门 / 只公开；已登录 → 读 KV 返回私有内容。
 *
 * 说明：
 * - Cookie 解析交给 Astro 框架（`Astro.cookies.get`）或原生 `request.headers`，
 *   不手写 split（cookie 值含 `=` 或编码场景交给框架处理）。
 * - 鉴权走 D1 强一致（verifySession），登出即时失效。
 */

/**
 * 从 Request 判断是否为管理员（供 API 端点 / 需要 request 对象的场景）。
 * 解析 Cookie 头取 `blog_admin` token → verifySession（D1 强一致）。
 */
export async function isAdminRequest(request: Request): Promise<boolean> {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return false;
	const token = parseCookie(cookieHeader, AUTH_COOKIE_NAME);
	return verifySession(token);
}

/**
 * 从 Astro 的 cookies 对象判断是否为管理员（供 .astro 页面组件用）。
 * 优先用框架的 Astro.cookies.get 读取，避免手写解析。
 */
export async function isAdminAstro(cookies: {
	get(name: string): { value?: string } | undefined;
}): Promise<boolean> {
	const token = cookies.get(AUTH_COOKIE_NAME)?.value;
	return verifySession(token);
}

/** 从 Cookie 头字符串解析指定名称的值（兜底，仅在无 Astro cookies 对象时用）。 */
function parseCookie(cookieHeader: string, name: string): string | undefined {
	for (const part of cookieHeader.split(";")) {
		const idx = part.indexOf("=");
		if (idx === -1) continue;
		const key = part.slice(0, idx).trim();
		if (key === name) {
			return decodeURIComponent(part.slice(idx + 1).trim());
		}
	}
	return undefined;
}
