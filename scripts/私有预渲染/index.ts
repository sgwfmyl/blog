/**
 * 私有内容构建期预渲染脚本（阶段 4 SSG 方案核心）。
 *
 * 职责：在 `astro build` 之后、`wrangler deploy` 之前运行（Node 环境，非 workerd）：
 *   1. 拉私有仓库 `private/meta.json` + 各 `private/pages/<slug>.md`
 *   2. 完整 markdown 管线渲染（shiki 高亮 + katex + callouts，与公开文章一致）
 *   3. sanitize-html 白名单清洗
 *   4. 产物写入 KV：
 *      - `private:html:<slug>` → `{ html, headings }`（正文，供映射路由读）
 *      - `private:meta`       → 元数据数组（供归档/目录/`/private/` 列表读）
 *
 * 运行方式：pnpm tsx scripts/私有预渲染/index.ts
 * 环境变量（构建期用 process.env，不是 cloudflare:workers 的 env）：
 *   - GH_PAT / GH_OWNER / GH_REPO：访问私有仓库
 *   - CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID：写线上 KV（经 wrangler）
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import sanitizeHtml from "sanitize-html";

import {
	privateRehypePlugins,
	privateRemarkPlugins,
} from "../../src/config/markdown";
import {
	type PrivateMetaItem,
	isValidPrivateMetaItem,
} from "../../src/utils/private-contract";

const GH_OWNER = process.env.GH_OWNER;
const GH_REPO = process.env.GH_REPO;
const GH_PAT = process.env.GH_PAT;

if (!GH_OWNER || !GH_REPO || !GH_PAT) {
	console.error("缺少 GH_OWNER / GH_REPO / GH_PAT 环境变量");
	process.exit(1);
}

/** 拉取私有仓库指定路径的文件内容（GitHub Contents API，返回 UTF-8 文本）。 */
async function fetchGitHubFile(path: string): Promise<string> {
	const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${GH_PAT}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "blog-prerender",
		},
	});
	if (!response.ok) {
		throw new Error(`GitHub API ${response.status} for ${path}`);
	}
	const payload = (await response.json()) as {
		type?: string;
		content?: string;
	};
	if (payload.type !== "file" || typeof payload.content !== "string") {
		throw new Error(`GitHub 返回的不是文件内容：${path}`);
	}
	const binary = atob(payload.content.replace(/\s+/g, ""));
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

/** 剥离 YAML frontmatter（渲染前），返回纯 markdown 正文。 */
function stripFrontmatter(markdown: string): string {
	const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
	return match ? markdown.slice(match[0].length) : markdown;
}

/** sanitize-html 白名单配置（见方案七.2）。 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		// 基础 markdown
		"h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li",
		"blockquote", "strong", "em", "del", "code", "pre", "hr", "br",
		"img", "table", "thead", "tbody", "tr", "th", "td", "figure",
		"figcaption", "div", "span",
		// katex MathML
		"math", "annotation", "semantics", "mrow", "mi", "mo", "mn",
		"msup", "msub", "mfrac", "msqrt", "mtext", "mspace", "menclose",
		"mstyle", "mpadded", "mphantom",
		// callouts / shiki 高亮
		"section",
	],
	allowedAttributes: {
		a: ["href", "title", "target", "rel"],
		img: ["src", "alt", "title", "width", "height", "loading"],
		code: ["class"],
		span: ["class", "style"],
		div: ["class"],
		pre: ["class"],
		th: ["colspan", "rowspan", "align"],
		td: ["colspan", "rowspan", "align"],
		math: ["xmlns", "display", "class"],
		annotation: ["encoding"],
		"*": ["id"],
	},
	allowedSchemes: ["http", "https", "mailto"],
	allowedSchemesByTag: {
		img: ["http", "https", "data"],
	},
	allowedStyles: {
		"*": {
			// shiki / callouts 实际用到的内联样式
			color: [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb/],
			"background-color": [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb/],
			"font-style": [/^italic$/],
			"font-weight": [/^(bold|normal|\d{3})$/],
		},
	},
};

/** 渲染单篇私有文章，返回 { html, headings }。 */
async function renderPrivateMarkdown(markdown: string): Promise<{
	html: string;
	headings: { depth: number; text: string; slug: string }[];
}> {
	// 构建期（Node）shiki 主题能正常加载，故这里可保留 shiki 高亮（与公开文章一致）
	const processor = await createMarkdownProcessor({
		remarkPlugins: privateRemarkPlugins,
		rehypePlugins: privateRehypePlugins,
	});
	const body = stripFrontmatter(markdown);
	const { code, metadata } = await processor.render(body, {
		frontmatter: {},
	});
	const clean = sanitizeHtml(code, SANITIZE_OPTIONS);
	return {
		html: clean,
		headings: metadata.headings,
	};
}

/** 通过 wrangler CLI 写线上 KV（--remote 必须，否则写本地模拟）。 */
function putKV(key: string, value: string): void {
	// Windows 下 pnpm 是 .cmd 脚本，spawnSync 直接调 pnpm 会 ENOENT；
	// 改用 node 直接调 wrangler 的 js 入口（跨平台可靠），路径用 fileURLToPath 转换。
	const wranglerCli = fileURLToPath(
		new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
	);
	try {
		execFileSync(
			process.execPath, // 当前 node 可执行文件
			[
				wranglerCli,
				"kv", "key", "put",
				"--binding=ADMIN_KV", "--remote", key, value,
			],
			{ stdio: "inherit" },
		);
	} catch (err) {
		console.error(`写 KV 失败：${key}`, err);
		process.exit(1);
	}
}

async function main(): Promise<void> {
	console.log("开始私有内容预渲染...");

	// 1. 拉 meta.json
	const metaRaw = await fetchGitHubFile("private/meta.json");
	const metaParsed: unknown = JSON.parse(metaRaw);
	if (!Array.isArray(metaParsed)) {
		throw new Error("private/meta.json 不是数组");
	}
	const meta = metaParsed.filter(isValidPrivateMetaItem);
	console.log(`元数据条目数：${meta.length}`);

	// 2. 逐条渲染正文并写 KV
	for (const item of meta) {
		const mdPath = `private/pages/${item.slug}.md`;
		try {
			const markdown = await fetchGitHubFile(mdPath);
			const { html, headings } = await renderPrivateMarkdown(markdown);
			putKV(
				`private:html:${item.slug}`,
				JSON.stringify({ html, headings }),
			);
			console.log(`  ✓ ${item.slug}（headings ${headings.length}）`);
		} catch (err) {
			console.warn(`  ✗ ${item.slug}：${err instanceof Error ? err.message : String(err)}`);
		}
	}

	// 3. 写元数据（供归档/目录/`/private/` 列表读）
	putKV("private:meta", JSON.stringify(meta));
	console.log(`  ✓ private:meta（${meta.length} 条）`);

	console.log("私有内容预渲染完成。");
}

main().catch((err) => {
	console.error("预渲染失败：", err);
	process.exit(1);
});
