import { jsonResponse } from "@utils/api-response";
import { AUTH_COOKIE_NAME, verifySession } from "@utils/auth-session";
import { getPrivateMeta } from "@utils/private-source";
import type { APIContext } from "astro";

export const prerender = false;

export async function GET({ cookies }: APIContext): Promise<Response> {
	const token = cookies.get(AUTH_COOKIE_NAME)?.value;
	if (!(await verifySession(token))) {
		return jsonResponse({ ok: false, error: "unauthorized" }, 401);
	}
	const data = await getPrivateMeta();
	return jsonResponse({ ok: true, data });
}
