import type { WalineComment, WalineRootComment } from "@waline/api";
import type {
	GuestbookChatMessage,
	GuestbookEmojiPack,
	GuestbookImageAttachment,
} from "@/types/guestbook-chat";

const REPLY_MARKER = /^<!--guestbook-reply:(\d+):([^>]*)-->\s*/u;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^\s)]+(?:\s+"[^"]*")?\)/gu;
export const WALINE_INLINE_IMAGE_SIZE_LIMIT = 128_000;

export function hasGuestbookReplyMarker(value: string): boolean {
	return REPLY_MARKER.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildEmojiAssetURL(
	folder: string,
	item: string,
	type: string,
): string {
	if (/^https?:\/\//u.test(item)) return item;
	const filename = item.endsWith(`.${type}`) ? item : `${item}.${type}`;
	return new URL(filename, `${folder.replace(/\/+$/u, "")}/`).href;
}

function applyEmojiAssetPrefix(item: string, prefix: string): string {
	if (/^https?:\/\//u.test(item) || !prefix || item.startsWith(prefix)) {
		return item;
	}
	return `${prefix}${item}`;
}

async function loadGuestbookEmojiPack(
	source: string,
): Promise<GuestbookEmojiPack> {
	const folder = source.replace(/\/+$/u, "");
	const response = await fetch(`${folder}/info.json`);
	if (!response.ok) throw new Error(`表情包加载失败 (${response.status})`);

	const manifest: unknown = await response.json();
	if (!isRecord(manifest) || !Array.isArray(manifest.items)) {
		throw new Error("表情包配置格式不正确");
	}

	const items = manifest.items.filter(
		(item): item is string => typeof item === "string" && item.length > 0,
	);
	if (items.length === 0) throw new Error("表情包没有可用内容");

	const type =
		typeof manifest.type === "string" && manifest.type ? manifest.type : "png";
	const prefix = typeof manifest.prefix === "string" ? manifest.prefix : "";
	const iconName =
		typeof manifest.icon === "string" && manifest.icon
			? manifest.icon
			: items[0];

	return {
		name:
			typeof manifest.name === "string" && manifest.name
				? manifest.name
				: "Waline",
		icon: buildEmojiAssetURL(
			folder,
			applyEmojiAssetPrefix(iconName, prefix),
			type,
		),
		items: items.map((item) => ({
			key: `${prefix}${item}`,
			url: buildEmojiAssetURL(
				folder,
				applyEmojiAssetPrefix(item, prefix),
				type,
			),
		})),
	};
}

export async function loadGuestbookEmojiPacks(
	sources: string[],
): Promise<GuestbookEmojiPack[]> {
	const settled = await Promise.allSettled(
		sources.filter(Boolean).map(loadGuestbookEmojiPack),
	);
	const packs = settled.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : [],
	);
	if (packs.length === 0) throw new Error("Waline 表情加载失败，请稍后重试");
	return packs;
}

function resolveImgbedSrc(payload: unknown, uploadURL: string): string {
	if (!Array.isArray(payload)) return "";
	for (const item of payload) {
		if (isRecord(item) && typeof item.src === "string" && item.src) {
			if (/^https?:\/\//u.test(item.src)) return item.src;
			try {
				const origin = new URL(uploadURL).origin;
				return `${origin}${item.src.startsWith("/") ? item.src : `/${item.src}`}`;
			} catch {
				return item.src;
			}
		}
	}
	return "";
}

export async function uploadGuestbookImage(
	file: File,
	uploadURL: string,
): Promise<string> {
	if (!uploadURL) {
		if (file.size > WALINE_INLINE_IMAGE_SIZE_LIMIT) {
			throw new Error("Waline 原生图片不能超过 128 KB");
		}
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.addEventListener("load", () => {
				if (typeof reader.result === "string") resolve(reader.result);
				else reject(new Error("图片读取失败，请重新选择"));
			});
			reader.addEventListener("error", () =>
				reject(new Error("图片读取失败，请重新选择")),
			);
			reader.readAsDataURL(file);
		});
	}
	const formData = new FormData();
	formData.append("file", file);
	formData.append("name", file.name);

	// 图床渠道、渠道名称与上传目录从环境变量读取，拼进 query 参数
	const channel = import.meta.env.PUBLIC_IMAGEBED_CHANNEL?.trim();
	const channelName = import.meta.env.PUBLIC_IMAGEBED_CHANNEL_NAME?.trim();
	const folder = import.meta.env.PUBLIC_IMAGEBED_UPLOAD_FOLDER?.trim();
	let targetURL = uploadURL;
	if (channel || channelName || folder) {
		const url = new URL(uploadURL);
		if (channel) url.searchParams.set("uploadChannel", channel);
		if (channelName) url.searchParams.set("channelName", channelName);
		if (folder) url.searchParams.set("uploadFolder", folder);
		targetURL = url.toString();
	}

	// CloudFlare ImgBed 上传鉴权：Bearer API Token + AUTH_CODE 作为 password
	const apiToken = import.meta.env.PUBLIC_IMAGEBED_API_TOKEN ?? "";
	const authCode = import.meta.env.PUBLIC_IMAGEBED_AUTH_CODE ?? "";
	if (authCode) formData.append("password", authCode);
	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

	const response = await fetch(targetURL, {
		method: "POST",
		headers,
		body: formData,
	});
	const payload: unknown = await response.json().catch(() => null);
	const imgbedUrl = resolveImgbedSrc(payload, uploadURL);

	// Waline 兼容：{data:{links:{url}}} / {data:{url}} / {url}
	const data =
		isRecord(payload) && isRecord(payload.data) ? payload.data : null;
	const links = data && isRecord(data.links) ? data.links : null;
	const url =
		imgbedUrl ||
		(links && typeof links.url === "string" ? links.url : "") ||
		(data && typeof data.url === "string" ? data.url : "") ||
		(isRecord(payload) && typeof payload.url === "string" ? payload.url : "");

	if (!response.ok || !url) {
		const message =
			isRecord(payload) && typeof payload.message === "string"
				? payload.message
				: "图片上传失败，请稍后重试";
		throw new Error(message);
	}

	return url;
}

export function appendGuestbookImage(
	content: string,
	attachment?: GuestbookImageAttachment | null,
): string {
	if (!attachment) return content;
	const alt = attachment.name.replace(/[[\]]/gu, "").trim() || "图片";
	const image = `![${alt}](${attachment.url})`;
	return content ? `${content}\n\n${image}` : image;
}

export function hasGuestbookImage(content: string): boolean {
	MARKDOWN_IMAGE.lastIndex = 0;
	return MARKDOWN_IMAGE.test(content);
}

export function getGuestbookTextLength(content: string): number {
	MARKDOWN_IMAGE.lastIndex = 0;
	return Array.from(content.replace(MARKDOWN_IMAGE, "").trim()).length;
}

export function normalizeGuestbookTimestamp(value: number): number {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return Date.now();
	return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function decodeReplyNick(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function parseGuestbookMessageBody(raw: string): {
	body: string;
	replyToId?: string;
	replyToNick?: string;
} {
	const match = raw.match(REPLY_MARKER);
	if (!match) return { body: raw.trim() };

	return {
		body: raw.replace(REPLY_MARKER, "").trim(),
		replyToId: match[1],
		replyToNick: decodeReplyNick(match[2]),
	};
}

export function htmlToPlainText(value: string): string {
	if (typeof DOMParser === "undefined") return value;
	return (
		new DOMParser()
			.parseFromString(value, "text/html")
			.body.textContent?.trim() ?? ""
	);
}

function normalizeGuestbookLink(
	value: string | null | undefined,
): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:"
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}

function isAdminNick(nick: string, adminNicknames?: Set<string>): boolean {
	if (!adminNicknames || adminNicknames.size === 0) return false;
	if (adminNicknames.has(nick)) return true;
	const normalized = nick.trim().toLocaleLowerCase();
	for (const admin of adminNicknames) {
		if (admin.trim().toLocaleLowerCase() === normalized) return true;
	}
	return false;
}

export function normalizeGuestbookComment(
	comment: WalineComment,
	adminNicknames?: Set<string>,
): GuestbookChatMessage {
	const parsed = parseGuestbookMessageBody(comment.orig || comment.comment);

	const nick = comment.nick || "匿名访客";
	const isAdmin =
		comment.type === "administrator" || isAdminNick(nick, adminNicknames);

	return {
		id: String(comment.objectId),
		objectId: comment.objectId,
		userId: comment.user_id,
		nick,
		avatar: comment.avatar || "",
		link: normalizeGuestbookLink(comment.link),
		body: parsed.body,
		createdAt: normalizeGuestbookTimestamp(comment.time),
		browser: comment.browser,
		os: comment.os,
		addr: comment.addr,
		label: comment.label,
		isAdmin,
		replyToId: parsed.replyToId,
		replyToNick: parsed.replyToNick,
		status: comment.status,
	};
}

export function flattenGuestbookComments(
	roots: WalineRootComment[],
	adminNicknames?: Set<string>,
): GuestbookChatMessage[] {
	return roots
		.flatMap((root) => [
			normalizeGuestbookComment(root, adminNicknames),
			...root.children.map((c) => normalizeGuestbookComment(c, adminNicknames)),
		])
		.sort((left, right) => left.createdAt - right.createdAt);
}

export function mergeGuestbookMessages(
	current: GuestbookChatMessage[],
	incoming: GuestbookChatMessage[],
): GuestbookChatMessage[] {
	const localMessages = current.filter((message) => message.localState);
	const serverMessages = new Map(
		current
			.filter((message) => !message.localState)
			.map((message) => [message.id, message]),
	);

	for (const message of incoming) {
		const existing = serverMessages.get(message.id);
		if (existing?.isAdmin && !message.isAdmin) {
			serverMessages.set(message.id, { ...message, isAdmin: true });
		} else {
			serverMessages.set(message.id, message);
		}
	}

	return [...serverMessages.values(), ...localMessages].sort(
		(left, right) => left.createdAt - right.createdAt,
	);
}

export function buildGuestbookMessageBody(
	content: string,
	target: GuestbookChatMessage | null,
): string {
	if (!target?.objectId) return content;
	const marker = `<!--guestbook-reply:${target.objectId}:${encodeURIComponent(target.nick)}-->`;
	return `${marker}\n@${target.nick} ${content}`;
}

export function buildGuestbookEditedMessageBody(
	content: string,
	message: GuestbookChatMessage,
): string {
	if (!message.replyToId) return content;
	const marker = `<!--guestbook-reply:${message.replyToId}:${encodeURIComponent(message.replyToNick || "访客")}-->`;
	return `${marker}\n${content}`;
}

export function getGuestbookErrorMessage(error: unknown): string {
	if (error instanceof DOMException && error.name === "AbortError") return "";
	if (error instanceof Error) {
		const message = error.message;
		if (/failed to fetch|networkerror|network request/iu.test(message)) {
			return "无法连接到留言服务，请检查网络后重试";
		}
		if (/(401|403|unauthorized|forbidden|token|登录)/iu.test(message)) {
			return "登录状态已失效，请重新登录";
		}
		if (/(429|too many|too fast|rate limit|频繁|太快)/iu.test(message)) {
			return "游客留言有频率限制，请稍后再试";
		}
		if (/(required|word|length|content|字数|内容)/iu.test(message)) {
			return "消息内容不符合留言服务要求，请检查后重试";
		}
	}
	return "留言服务暂时不可用，请稍后重试";
}

export function isGuestbookAuthError(error: unknown): boolean {
	return (
		error instanceof Error &&
		/(401|403|unauthorized|forbidden|token|登录)/iu.test(error.message)
	);
}

export function getGuestbookInitials(name: string): string {
	return Array.from(name.trim() || "访")
		.slice(0, 2)
		.join("")
		.toUpperCase();
}
