// 共享 markdown 管线配置（阶段 4 引入）。
//
// 把 astro.config.mjs 里 markdown / mdx 两处重复的 remark/rehype 插件链抽到此处，
// 供「公开侧（astro.config.mjs）」与「私有侧（scripts/私有预渲染/index.ts 构建期渲染）」
// 共同引用，避免公开与私有渲染管线漂移。
//
// 注意：mermaid 插件（remarkMermaid / rehypeMermaid）**不在本文件**，因为它们依赖 Vite 的
// `?raw` 导入（rehype-mermaid.mjs 里 `import ... from "./mermaid-render-script.js?raw"`），
// 纯 Node（构建期脚本）无法解析。mermaid 由 astro.config.mjs 在「公开侧」额外拼接（见下）。
//
// 分层：
// - `remarkPlugins` / `rehypePlugins`（公开基础链，**不含 mermaid**）：astro.config.mjs 用它时
//   再自行追加 remarkMermaid / rehypeMermaid。
// - `privateRemarkPlugins` / `privateRehypePlugins`（私有精简版）：不启用 directive/readingTime/
//   excerpt/rehypeComponents/mermaid（见决策表「mermaid / rehypeComponents 私密内容暂不支持」）。

import katex from "katex";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeCallouts from "rehype-callouts";
import rehypeComponents from "rehype-components";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";

import { GithubCardComponent } from "../plugins/rehype-component-github-card.mjs";
import rehypeEmailProtection from "../plugins/rehype-email-protection.mjs";
import rehypeExternalLinks from "../plugins/rehype-external-links.mjs";
import rehypeFigure from "../plugins/rehype-figure.mjs";
import { parseDirectiveNode } from "../plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "../plugins/remark-excerpt.js";
import { remarkReadingTime } from "../plugins/remark-reading-time.mjs";

// 注意：此处**不 import siteConfig**（siteConfig.ts 内有 `import.meta.env.*`，纯 Node 构建期
// 脚本无法解析）。下面两个值是渲染管线需要的、与 siteConfig 保持同步的常量：
//   - SITE_URL       ← SITE_URL（"https://blog.5484826.xyz"）
//   - CALLOUTS_THEME ← CALLOUTS_THEME（"github"）
const SITE_URL = "https://blog.5484826.xyz";
const CALLOUTS_THEME = "github";

// 标题锚点（rehypeAutolinkHeadings）的公共配置，公开/私有共用
const autolinkHeadingsConfig = {
	behavior: "append",
	properties: {
		className: ["anchor"],
	},
	content: {
		type: "element",
		tagName: "span",
		properties: {
			className: ["anchor-icon"],
			"data-pagefind-ignore": true,
		},
		children: [
			{
				type: "text",
				value: "#",
			},
		],
	},
} as const;

// 公开侧完整 remark 插件链（**不含 remarkMermaid**，由 astro.config.mjs 追加）
// biome-ignore lint/suspicious/noExplicitAny: remark/rehype 插件链 Options 内部类型，isolatedDeclarations 下无法导出具体类型
export const remarkPlugins: any[] = [
	remarkMath,
	remarkReadingTime,
	remarkExcerpt,
	remarkDirective,
	remarkSectionize,
	parseDirectiveNode,
];

// 公开侧完整 rehype 插件链（**不含 rehypeMermaid**，由 astro.config.mjs 追加）
// 显式 any[]：避免 rehype-components 的 Options 内部类型被导出（isolatedDeclarations 下 ts(4023)）
// biome-ignore lint/suspicious/noExplicitAny: 同上，插件链 Options 内部类型不可导出
export const rehypePlugins: any[] = [
	[rehypeKatex, { katex }],
	[rehypeCallouts, { theme: CALLOUTS_THEME }],
	rehypeSlug,
	rehypeFigure,
	[rehypeExternalLinks, { siteUrl: SITE_URL }],
	[rehypeEmailProtection, { method: "base64" }],
	[rehypeComponents, { components: { github: GithubCardComponent } }],
	[rehypeAutolinkHeadings, autolinkHeadingsConfig],
];

// 私有侧精简 remark 插件链（不引入 readingTime/excerpt/directive/sectionize）
// biome-ignore lint/suspicious/noExplicitAny: 同上，插件链 Options 内部类型不可导出
export const privateRemarkPlugins: any[] = [remarkMath];

// 私有侧精简 rehype 插件链（不引入 rehypeComponents，其余与公开一致）
// biome-ignore lint/suspicious/noExplicitAny: 同上，插件链 Options 内部类型不可导出
export const privateRehypePlugins: any[] = [
	[rehypeKatex, { katex }],
	[rehypeCallouts, { theme: CALLOUTS_THEME }],
	rehypeSlug,
	rehypeFigure,
	[rehypeExternalLinks, { siteUrl: SITE_URL }],
	[rehypeEmailProtection, { method: "base64" }],
	[rehypeAutolinkHeadings, autolinkHeadingsConfig],
];
