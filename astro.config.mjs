import cloudflare from "@astrojs/cloudflare";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import "katex/dist/contrib/mhchem.mjs"; // 加载 mhchem 扩展（全局副作用，必须保留）
import mdx from "@astrojs/mdx";
import { pluginCollapsible } from "expressive-code-collapsible"; /* Collapsible */
import { pluginLanguageBadge } from "expressive-code-language-badge"; /* Language Badge */
import { expressiveCodeConfig, siteConfig } from "./src/config";
import { rehypePlugins, remarkPlugins } from "./src/config/markdown";
import { rehypeMermaid } from "./src/plugins/rehype-mermaid.mjs";
import { remarkMermaid } from "./src/plugins/remark-mermaid.js";
import I18nKey from "./src/i18n/i18nKey";
import { i18n } from "./src/i18n/translation";

import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Starlight 内部用 `import yaml from "js-yaml"`（需要 4.x 的 default 导出），
// 而本项目根依赖 js-yaml 5.x（仅有具名导出）。Astro 会把 js-yaml 外部化，
// prerender 产物从 dist/ 解析时命中根的 5.x，导致构建报
// "does not provide an export named 'default'"。
// 这里把 js-yaml 显式指向 Starlight 自带的 4.x，使其被内联进产物。
const starlightRequire = createRequire(
	join(
		dirname(createRequire(import.meta.url).resolve("@astrojs/starlight")),
		"package.json",
	),
);
const starlightJsYaml = join(
	dirname(starlightRequire.resolve("js-yaml/package.json")),
	"dist/js-yaml.mjs",
);

// https://astro.build/config
export default defineConfig({
	site: siteConfig.site_url,

	// 输出保持 static：绝大多数页面构建期预渲染，仅个别页面（私密内容/局部聚合）
	// 用 `export const prerender = false` 切到运行时 SSR（见 src/utils/post-source.ts 顶层说明）。
	output: "static",
	// prerenderEnvironment: "node" 让构建期预渲染（prerender=true 页面）在 Node 环境执行，
	// 保留 sharp 等 Node 原生依赖（如 src/pages/og/[...slug].png.ts 的 OG 图生成依赖 sharp，
	// workerd 运行时无法加载 sharp，会报 "No such module chunks/sharp"）。
	// 运行时 SSR（prerender=false 页面）仍由 workerd 执行，不受影响。
	// imageService: "custom" 保留 Astro 默认 sharp 做构建期图片优化（与切换适配器前一致），
	// 避免默认 cloudflare-binding 导致图片静默退化为 passthrough（320kB→320kB 不压缩）。
	adapter: cloudflare({
		prerenderEnvironment: "node",
		imageService: "custom",
	}),

	base: "/",
	trailingSlash: "always",

	// 图像优化配置
	image: {
		// 全局响应式布局
		experimentalLayout: "constrained",
	},

	// 禁用 Astro 开发工具栏，避免 dev-toolbar entrypoint 504 错误
	devToolbar: {
		enabled: false,
	},

	// 开发服务器端口：默认 4321 落在 Windows 动态保留端口范围（4298-4497）内，
	// 绑定会报 EACCES，固定改用 4500
	server: {
		port: 4500,
	},

	integrations: [
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: [
				"#banner-overlay-container",
				"#banner-dim-container",
				"#swup-container",
				"#left-sidebar-dynamic",
				"#right-sidebar-dynamic",
			],
			smoothScrolling: false,
			cache: true,
			// 悬停即预载目标页（visible 保持关闭，避免首屏空闲就批量抓所有链接）；
			// 预载时 utils/swup-css-prefetch 会顺带把目标页的样式表拉进缓存，
			// 于是点击切页时样式表已就位、几乎零等待
			preload: { hover: true, visible: false },
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
			// 滚动相关配置优化
			resolveUrl: (url) => url,
			animateHistoryBrowsing: false,
			skipPopStateHandling: (event) => {
				// 跳过锚点链接的处理，让浏览器原生处理
				return event.state && event.state.url && event.state.url.includes("#");
			},
		}),
		icon({
			include: {
				"material-symbols": ["*"],
				"fa7-brands": ["*"],
				"fa7-regular": ["*"],
				"fa7-solid": ["*"],
				"simple-icons": ["*"],
				mdi: ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.darkTheme, expressiveCodeConfig.lightTheme],
			useDarkModeMediaQuery: false,
			themeCssSelector: (theme) => `[data-theme='${theme.name}']`,
			plugins: [
				pluginLanguageBadge(),
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				// pluginCollapsible 配置 - 从expressiveCodeConfig读取设置，使用i18n文本
				...(expressiveCodeConfig.pluginCollapsible?.enable === true
					? [
							pluginCollapsible({
								lineThreshold:
									expressiveCodeConfig.pluginCollapsible.lineThreshold || 15,
								previewLines:
									expressiveCodeConfig.pluginCollapsible.previewLines || 8,
								defaultCollapsed:
									expressiveCodeConfig.pluginCollapsible.defaultCollapsed ??
									true,
								expandButtonText: i18n(I18nKey.codeCollapsibleShowMore),
								collapseButtonText: i18n(I18nKey.codeCollapsibleShowLess),
								expandedAnnouncement: i18n(I18nKey.codeCollapsibleExpanded),
								collapsedAnnouncement: i18n(I18nKey.codeCollapsibleCollapsed),
							}),
						]
					: []),
			],
			defaultProps: {
				wrap: false,
				overridesByLang: {
					shellsession: {
						showLineNumbers: false,
					},
				},
			},
			// Shiki 没有 mysql 语法（只有 sql），把 ```mysql 映射到 sql 语法高亮，
			// 否则构建会刷 "language could not be found" 警告并降级成纯文本
			shiki: {
				langAlias: {
					mysql: "sql",
				},
			},
			styleOverrides: {
				borderRadius: "0.75rem",
				codeFontSize: "0.875rem",
				codeFontFamily:
					"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250,
				},
				languageBadge: {
					fontSize: "0.75rem",
					fontWeight: "bold",
					borderRadius: "0.25rem",
					opacity: "1",
					borderWidth: "0px",
					borderColor: "transparent",
				},
			},
			frames: {
				showCopyToClipboardButton: true,
			},
		}),
		svelte(),
		// 开发文档（Starlight）挂载在 /docs/：
		// 内容位于 src/content/docs/docs/**（目录名即 URL 段），随博客一起构建。
		// 与既有博客的三处冲突在此显式规避：
		//   1) expressiveCode: false —— 复用项目已注册的 astro-expressive-code 集成，避免重复处理代码块
		//   2) disable404Route —— 保留自研 src/pages/404.astro
		//   3) pagefind: false + head noindex —— 不暴露搜索 UI、不被搜索引擎收录（sitemap 侧见下方 filter）
		starlight({
			title: "二次开发文档",
			description: "lh的博客开发文档",
			defaultLocale: "root",
			locales: { root: { label: "简体中文", lang: "zh-CN" } },
			disable404Route: true,
			pagefind: false,
			expressiveCode: false,
			head: [{ tag: "meta", attrs: { name: "robots", content: "noindex, nofollow" } }],
			sidebar: [{ label: "开发文档", items: [{ autogenerate: { directory: "docs" } }] }],
		}),
		sitemap({
			filter: (page) => {
				// 根据页面开关配置过滤sitemap
				const url = new URL(page);
				const pathname = url.pathname;

				// 开发文档不收录进 sitemap（公开但不希望被搜索引擎收录）
				if (pathname === "/docs" || pathname.startsWith("/docs/")) {
					return false;
				}

				// 私密空间与映射路由不收录（纵深防御：这些路由 prerender=false 本就不进
				// 静态产物，此处显式过滤防止未来误改 prerender 后被 sitemap 收录）
				if (pathname === "/private" || pathname.startsWith("/private/")) {
					return false;
				}
				if (pathname === "/diary" || pathname.startsWith("/diary/")) {
					return false;
				}

				if (pathname === "/sponsor/" && !siteConfig.pages.sponsor) {
					return false;
				}
				if (pathname === "/guestbook/" && !siteConfig.pages.guestbook) {
					return false;
				}
				if (pathname === "/bangumi/" && !siteConfig.pages.bangumi) {
					return false;
				}

				return true;
			},
		}),
		mdx({
			processor: unified({
				gfm: true,
				smartypants: true,
				remarkPlugins: [...remarkPlugins, remarkMermaid],
				rehypePlugins: [
					...rehypePlugins.slice(0, 3), // rehypeKatex, rehypeCallouts, rehypeSlug
					rehypeMermaid,
					...rehypePlugins.slice(3),
				],
			}),
		}),
	],
	markdown: {
		processor: unified({
			gfm: true,
			smartypants: true,
			remarkPlugins: [...remarkPlugins, remarkMermaid],
			rehypePlugins: [
				...rehypePlugins.slice(0, 3), // rehypeKatex, rehypeCallouts, rehypeSlug
				rehypeMermaid,
				...rehypePlugins.slice(3),
			],
		}),
	},
	vite: {
		plugins: [tailwindcss()],
		define: {},
		// 预构建依赖，避免动态导入时出现 504 (Outdated Optimize Dep)
		optimizeDeps: {
			include: ["@fancyapps/ui", "@swup/astro"],
		},
		resolve: {
			alias: {
				"@rehype-callouts-theme": `rehype-callouts/theme/${siteConfig.rehypeCallouts.theme}`,
				// 见文件顶部说明：强制 js-yaml 内联为 Starlight 自带的 4.x
				"js-yaml": starlightJsYaml,
			},
		},
		build: {
			// 大 chunk 阈值：KaTeX 等库较大，500kB 会误报，调到 800kB
			chunkSizeWarningLimit: 800,
			// 启用资源压缩和优化
			minify: "terser",
			terserOptions: {
				compress: {
					drop_console: false, // 生产环境可改为true移除console
					drop_debugger: true,
				},
				mangle: true,
				format: {
					comments: false,
				},
			},
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
			// CSS 优化
			cssCodeSplit: true,
			cssMinify: true,
			// 资源大小限制 - 减少内联资源
			assetsInlineLimit: 4096,
			// 减少源映射大小（可选，生产环境改为false）
			sourcemap: false,
			// 并行处理构建
			workers: 4,
		},
	},
});
