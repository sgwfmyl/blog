import { jsonResponse } from "@utils/api-response";
import {
	AUTH_COOKIE_NAME,
	AUTH_COOKIE_TTL_SECONDS,
	authenticate,
	createSession,
} from "@utils/auth-session";
import type { APIContext } from "astro";

export const prerender = false;

export async function POST({
	request,
	cookies,
}: APIContext): Promise<Response> {
	const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

	let password = "";
	try {
		const body = (await request.json()) as { password?: unknown };
		password = typeof body.password === "string" ? body.password : "";
	} catch {
		// 非 JSON body 视为空密码
	}

	const result = await authenticate(ip, password);
	if (!result.ok) {
		if (result.error === "rate_limited") {
			return jsonResponse(
				{ ok: false, error: "rate_limited", retryAfter: result.retryAfter },
				429,
			);
		}
		return jsonResponse({ ok: false, error: "invalid_password" }, 401);
	}

	const session = await createSession(ip);
	cookies.set(AUTH_COOKIE_NAME, session.token, {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: "lax",
		maxAge: AUTH_COOKIE_TTL_SECONDS,
		path: "/",
	});
	return jsonResponse({ ok: true });
}
