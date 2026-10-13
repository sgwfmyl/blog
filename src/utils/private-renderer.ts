/**
 * 私密页面 markdown 渲染器（window 门面）
 *
 * AuthManager 挂载时安装 window.__fireflyPrivateRenderer，
 * 供 /private/ 页面内联脚本在管理员登录后把远端 markdown 安全渲染到容器。
 * 白名单 sanitize 模式复用 guestbook-chat-markup.ts 的思路，标签集放宽到常见 markdown 元素。
 */

import { marked } from "marked";

const SAFE_IMAGE_SOURCE =
	/^(?:https?:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/iu;
const MAX_INLINE_IMAGE_SOURCE_LENGTH = 180_000;

const ALLOWED_TAGS = new Set([
	"p",
	"br",
	"hr",
	"a",
	"img",
	"strong",
	"em",
	"del",
	"s",
	"u",
	"code",
	"pre",
	"blockquote",
	"ul",
	"ol",
	"li",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"sup",
	"sub",
	"kbd",
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
	"figure",
	"figcaption",
	"mark",
	"div",
	"span",
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
	a: new Set(["href", "title"]),
	img: new Set(["src", "alt", "title"]),
	th: new Set(["align", "colspan", "rowspan"]),
	td: new Set(["align", "colspan", "rowspan"]),
};

function sanitizePrivateHtml(rendered: string): string {
	const document = new DOMParser().parseFromString(rendered, "text/html");
	const elements = Array.from(document.body.querySelectorAll("*"));

	for (const element of elements) {
		const tag = element.tagName.toLowerCase();
		if (!ALLOWED_TAGS.has(tag)) {
			if (["script", "style", "iframe", "object", "embed"].includes(tag)) {
				element.remove();
				continue;
			}
			element.replaceWith(...Array.from(element.childNodes));
			continue;
		}

		const allowedAttributes = ALLOWED_ATTRIBUTES[tag] ?? new Set<string>();
		for (const attribute of Array.from(element.attributes)) {
			if (!allowedAttributes.has(attribute.name.toLowerCase())) {
				element.removeAttribute(attribute.name);
			}
		}

		if (tag === "a") {
			const href = element.getAttribute("href") || "";
			try {
				const url = new URL(href, window.location.origin);
				if (url.protocol !== "http:" && url.protocol !== "https:") {
					element.removeAttribute("href");
				}
			} catch {
				element.removeAttribute("href");
			}
			element.setAttribute("target", "_blank");
			element.setAttribute("rel", "nofollow noopener noreferrer");
		}

		if (tag === "img") {
			const src = element.getAttribute("src") || "";
			if (
				!SAFE_IMAGE_SOURCE.test(src) ||
				src.length > MAX_INLINE_IMAGE_SOURCE_LENGTH
			) {
				element.remove();
				continue;
			}
			element.setAttribute("loading", "lazy");
			element.setAttribute("decoding", "async");
			element.setAttribute("referrerpolicy", "no-referrer");
		}
	}

	return document.body.innerHTML;
}

export type PrivateRenderer = {
	renderMarkdown: (markdown: string, target: HTMLElement) => Promise<void>;
};

type PrivateRendererWindow = Window & {
	__fireflyPrivateRenderer?: PrivateRenderer;
	__fireflyPrivateRendererWaiters?: Array<(renderer: PrivateRenderer) => void>;
};

export function installPrivateRenderer(windowRef?: Window): void {
	const targetWindow =
		windowRef ?? (typeof window === "undefined" ? null : window);
	if (!targetWindow) return;
	const target = targetWindow as PrivateRendererWindow;
	if (target.__fireflyPrivateRenderer) return;

	const renderer: PrivateRenderer = {
		async renderMarkdown(markdown, targetEl) {
			const rendered = marked.parse(markdown, {
				async: false,
				gfm: true,
				breaks: true,
			});
			targetEl.innerHTML = sanitizePrivateHtml(String(rendered));
		},
	};

	target.__fireflyPrivateRenderer = renderer;
	const waiters = target.__fireflyPrivateRendererWaiters ?? [];
	for (const waiter of waiters) waiter(renderer);
	target.__fireflyPrivateRendererWaiters = [];
}
