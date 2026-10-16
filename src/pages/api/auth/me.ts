import { jsonResponse } from "@utils/api-response";
import { AUTH_COOKIE_NAME, verifySession } from "@utils/auth-session";
import type { APIContext } from "astro";

export const prerender = false;

export async function GET({ cookies }: APIContext): Promise<Response> {
	const token = cookies.get(AUTH_COOKIE_NAME)?.value;
	const admin = await verifySession(token);
	return jsonResponse({ ok: true, admin });
}
