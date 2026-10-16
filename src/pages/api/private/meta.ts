import { jsonResponse } from "@utils/api-response";
import { AUTH_COOKIE_NAME, verifySession } from "@utils/auth-session";
import { getPrivateMetaFromKV } from "@utils/private-source";
import type { APIContext } from "astro";

export const prerender = false;

export async function GET({ cookies }: APIContext): Promise<Response> {
	const token = cookies.get(AUTH_COOKIE_NAME)?.value;
	if (!(await verifySession(token))) {
		return jsonResponse({ ok: false, error: "unauthorized" }, 401);
	}
	// SSG 定稿：元数据从 KV 读（构建期已写入），运行时不再拉 GitHub
	const data = await getPrivateMetaFromKV();
	return jsonResponse({ ok: true, data });
}
