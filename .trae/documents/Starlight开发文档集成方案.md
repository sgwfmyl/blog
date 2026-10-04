# Starlight 开发文档集成方案

## Context（为什么做）

站长需要一个用 Astro Starlight 写「博客开发文档」的地方。当前仓库是高度定制的生产博客（Astro 7.1.6 + Swup 全站 SPA + 自研 expressive-code 配置 + 15 个 Content Collections），直接 `astro add starlight` 会与现有架构产生三处真实冲突，必须一并处理，否则会破坏生产站点。

**已确认的决策**（用户选择）：
1. **同项目子路径**：装进现有 Astro 项目，文档路由挂在 `/docs/…`，随 `pnpm build` 一起构建。
2. **公开但不收录**：可访问，但不进 sitemap、排除出站内 Pagefind 搜索、加 `noindex`。
3. **不迁移**：根目录 `docs/` 现有 Markdown 保持不动，Starlight 只放新写的开发文档。

**Starlight ≥ 0.41 才支持 Astro 7**（本项目 Astro 7.1.6），需安装最新版。

## 需要解决的冲突

| 冲突 | 说明 | 处理方式 |
|---|---|---|
| Swup 全站接管 | 点击 `/docs/` 链接会被 Swup 拦截并尝试替换 `#swup-container`，而 Starlight 页面没有该容器 → 白屏/报错 | 文档链接标记 `data-no-swup` 让 Swup 放行（Swup 原生识别该属性）；同时 Starlight 页面不含 Swup 脚本，从文档页回博客本就是整页跳转 |
| Expressive Code 重复 | 项目已注册 `astro-expressive-code` 集成（4 插件 + styleOverrides），Starlight 内置同一集成 | 设 `starlight({ expressiveCode: false })`，让文档代码块复用现有集成，博客侧零改动 |
| 404 路由冲突 | Starlight 默认自带 404 页，会和 [404.astro](file:///e:/_Server/blog/src/pages/404.astro) 冲突 | `starlight({ disable404Route: true })` |
| Pagefind 索引 | 构建末尾 `pagefind --site dist` 会把文档页也索引进博客搜索 | docs schema 默认 `pagefind: false`（Starlight 渲染 `data-pagefind-ignore`，[pagefind.yml](file:///e:/_Server/blog/pagefind.yml) 已排除该选择器） |
| Sitemap 收录 | `@astrojs/sitemap` 会把 `/docs/` 收进去 | 在 sitemap `filter` 中排除 `/docs/` |
| 搜索引擎收录 | 公开但不希望被收录 | Starlight 全局 `head` 注入 `<meta name="robots" content="noindex, nofollow">` |

## 变更清单

### 1. 安装依赖
```
pnpm add @astrojs/starlight
```
（不用 `pnpm astro add`，避免 CLI 覆写手工调优的 `astro.config.mjs`。）

### 2. [astro.config.mjs](file:///e:/_Server/blog/astro.config.mjs)
- 顶部 `import starlight from "@astrojs/starlight";`
- 在 `integrations` 中加入（放在 `sitemap()` 之前）：
```js
starlight({
  title: "Firefly 开发文档",
  description: "团子和蛋糕的博客开发文档",
  defaultLocale: "root",                                  // 不产生 /zh-cn/ 前缀
  locales: { root: { label: "简体中文", lang: "zh-CN" } },
  disable404Route: true,                                  // 保留自研 404 页
  pagefind: false,                                        // 关闭 Starlight 自带搜索 UI
  expressiveCode: false,                                  // 复用现有 astro-expressive-code 集成
  head: [{ tag: "meta", attrs: { name: "robots", content: "noindex, nofollow" } }],
  sidebar: [{ label: "开发文档", items: [{ autogenerate: { directory: "docs" } }] }],
}),
```
- 在 `sitemap({ filter })` 里追加：
```js
if (pathname.startsWith("/docs/")) return false;
```

> ⚠️ 路由前缀由**内容子目录名**决定：内容放 `src/content/docs/docs/` → 路由 `/docs/…`（目录名与 URL 段一致是 Starlight 的既定机制）。

### 3. [src/content.config.ts](file:///e:/_Server/blog/src/content.config.ts)
新增第 16 个集合，并加入末尾 `collections` 导出：
```ts
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const docsCollection = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    // 所有文档页默认不进 Pagefind 索引
    extend: z.object({ pagefind: z.boolean().default(false) }),
  }),
});
```

### 4. Swup 放行文档链接
- 在 [Layout.astro](file:///e:/_Server/blog/src/layouts/Layout.astro) 的全局脚本中，用一个 `window.__docsLinkGuard` guard 注册一次**捕获阶段** click 监听：命中 `pathname` 以 `/docs` 开头的 `<a>` 时给其加 `data-no-swup`（不阻断其它监听，Swup 在冒泡阶段自会忽略）。
- 符合 CLAUDE.md §9.1 全局单例 guard 规范；不修改 `swup-lifecycle-controller.ts`（§11.4）。

### 5. 初始内容
- 新建 `src/content/docs/docs/index.md`（`/docs/` 首页，带 `title`/`description` frontmatter）。
- 新建 1 篇示例页 `src/content/docs/docs/getting-started.md`，用于验证侧栏、代码高亮、目录、上下页导航。

### 6. 文档同步（经用户确认跳过）
按用户要求**跳过**以下内容：
- CLAUDE.md §2 目录结构、§3.5/§16 集合与技术栈更新
- §21 新增 `src/content/changelog/` 条目

> ⚠️ 此选择与仓库 [CLAUDE.md](file:///e:/_Server/blog/CLAUDE.md) §20/§21 的「强制同步」规定不一致，属用户明确决定的偏离；后续如需补齐可随时追加。

## 验证

1. `pnpm build`（生成图标 → astro build → pagefind）必须通过，无 Starlight/EC 重复集成告警。
2. 产物检查：
   - `dist/docs/index.html` 存在且渲染正常
   - `dist/sitemap-*.xml` 不含 `/docs/`
   - 用文档独有词搜索 Pagefind 索引（`dist/pagefind/`），应无结果
   - `dist/docs/index.html` 的 `<head>` 含 `noindex`
3. `pnpm check` + `pnpm type-check` + `pnpm exec biome ci ./src --reporter=github` 全绿。
4. 浏览器实测（`pnpm dev`）：
   - 直接访问 `/docs/`：侧栏、代码高亮、明暗主题、上下页正常
   - 从博客页点 `/docs/` 链接：整页跳转，不白屏（Swup 放行生效）
   - 回归：首页、任一篇含代码块的文章、站内搜索均与改动前一致

## 待实现期确认的未知项（有兜底）
- Starlight 与独立 `astro-expressive-code` 集成是否被判定重复；预期 `expressiveCode: false` 解决，否则需把 EC 配置迁移进 `starlight({ expressiveCode })`。
- Starlight 是否强制要求 `src/content/docs/index.md`；若报错则补一个仅用于占位的根 index 并排除路由。
- `pagefind: false` 通过 schema 默认值是否生效；若否，退回逐页 frontmatter 显式声明。
