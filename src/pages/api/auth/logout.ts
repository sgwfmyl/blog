import { jsonResponse } from "@utils/api-response";
import { AUTH_COOKIE_NAME, destroySession } from "@utils/auth-session";
import type { APIContext } from "astro";

export const prerender = false;

export async function POST({ cookies }: APIContext): Promise<Response> {
	const token = cookies.get(AUTH_COOKIE_NAME)?.value;
	await destroySession(token);
	cookies.delete(AUTH_COOKIE_NAME, { path: "/" });
	return jsonResponse({ ok: true });
}
