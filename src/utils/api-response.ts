/** JSON 响应辅助（统一 content-type 与序列化，供 SSR endpoint 复用）。 */
export function jsonResponse(
	body: unknown,
	status = 200,
	headers?: HeadersInit,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			...(headers ?? {}),
		},
	});
}
