---
version: "v1.63.0"
date: 2026-10-16
time: "19:55"
type: feature
description: 私密内容 SSG 预渲染 + KV 存储 + 运行时鉴权，登录后可访问私密空间与映射路由
---

## 私密内容 SSG 闭环（阶段 4）

私有内容从「独立 /private/ 空间」升级为「SSG 构建期预渲染 + KV 存储 + 运行时鉴权」的完整方案：

### 核心架构

- **构建期**：`scripts/私有预渲染/index.ts` 拉取私有仓库 markdown，用完整管线（shiki 高亮 + katex + callouts）渲染成 HTML，经 sanitize-html 白名单清洗后写入 KV（`private:html:<slug>` 与 `private:meta`）。
- **运行时**：`/private/`、`/private/<slug>/`、映射路由（`/diary/<slug>/`）均为 `prerender=false`，服务端 D1 鉴权后从 KV 读预渲染正文渲染；未登录统一 404，不泄露私有内容。
- **登录 UI**：从旧方案移植 AuthModal/AuthManager，统一 `data-auth-open` 事件委托 + Swup 缓存清理 + bfcache 刷新。

### 关键决策

- 私有内容 URL 采用独立前缀（如 `/diary/`），不做 posts 同前缀（Astro 同前缀不支持部分静态部分动态）。
- 渲染与鉴权解耦：markdown 渲染搬构建期（保留 shiki 高亮、worker 体积从 60MB 降到几 MB），运行时只做鉴权 + 读 KV。
- 私有元数据（frontmatter）也不公开，归档/目录合并留待下一阶段。

### 变更文件

- 新增：`src/utils/auth-context.ts`、`auth-store.ts`、`auth-modal-controller.ts`、`private-contract.ts`
- 新增：`src/components/security/`（AuthModal/AuthManager/PrivateGate/PrivatePostView）
- 新增：`src/pages/private/`、`src/pages/diary/`、`scripts/私有预渲染/`
- 修改：`src/config/markdown.ts`（共享管线）、`astro.config.mjs`（sitemap 过滤私有路由）
