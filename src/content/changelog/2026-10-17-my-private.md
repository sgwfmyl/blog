---
version: "v1.66.0"
date: 2026-10-17
time: "20:30"
type: feature
description: 「我的」分组整体私有化——导航登录后可见，日历/账单/应用/笔记本切 SSR + 未登录 404，数据迁入 D1
---

## 「我的」分组私有化（阶段 7）

导航「我的」分组（日历 / 账单 / 应用展示 / 笔记本）整体改为登录后可见，四类数据迁出公开仓库、存进 D1，页面改服务端渲染，未登录直接 404。

### 导航登录后可见（软隐藏）

- 「我的」分组在 `navBarConfig.ts` 标记 `authRequired: true`（`src/types/config.ts` 新增该字段）。
- 桌面 `DropdownMenu.astro`、移动 `NavMenuPanel.astro`、`MobileMenuSheet.astro` 据此加 `data-auth-nav` + `hidden`。
- `Navbar.astro` 内联脚本订阅 `window.__fireflyAuthStore`（AuthManager 挂载），登录后取消隐藏，登出重新隐藏。

### 页面 SSR + 未登录 404

- `/bills/`、`/schedules/`、`/apps/`、`/life/notebooks/`（列表 + `[...slug]` 详情）改 `prerender = false`，`verifySession` 校验，未登录 `Astro.redirect("/404")`（对齐私有系统惯例，不暴露路由存在）。
- 响应头统一 `Cache-Control: private, no-store` + `Vary: Cookie` + `X-Robots-Tag: noindex, nofollow`。
- 笔记本详情原 `getStaticPaths` 构建期逐本生成改为运行时按 slug 解析。
- sitemap 显式排除这四个路由（`astro.config.mjs`）。

### 数据迁 D1

- 新增表结构 `migrations/0002_my_sections.sql`：`bills` / `schedules` / `apps` / `notebooks`（书架级）/ `notebook_entries`（条目级）。
- 新增运行时读取层 `src/utils/my-source.ts`（`getBillsFromD1` / `getSchedulesFromD1` / `getAppsFromD1` / `getNotebooksFromD1`），返回形态对齐旧集合条目，下游 `bill-adapter` / `schedule-adapter` / `SchedulesView` 仅改类型来源，逻辑零改动。
- 新增同步脚本 `scripts/我的数据同步/index.ts`（`pnpm sync:my`）：从私有仓库 `private-content/my/` 全量灌 D1，`D1_MODE=local` 写本地模拟。
- 笔记本正文页面只展示原始文本、不做 markdown 渲染，故存 D1 而非走 KV 渲染管线（不撑大 worker）。
- 公开仓库 `src/content/{bills,schedules,apps,life/notebooks}` 已删除；`content.config.ts` / `.pages.yml` 同步移除对应集合。

### 侧栏与归档

- `SiteStats` / `LifeStats` / `RecentItems` 为构建期组件、读不到 D1，不再统计笔记本与账单（总字数、笔记本数、最近更新、最后活动日期口径随之调整）。
- `content-utils.ts#getArchiveList` 不再合并 notebooks（私密条目仍经 meta.json 的 type=life 通道并入归档）。

### 录入方式变化

- 账单 / 日程 / 应用 / 笔记本数据源改到私有仓库 `private-content/my/`（本地编辑 → push 私有仓库 → 跑 `pnpm sync:my`）。
- 首次迁移：数据已复制进 `private-content/my/`，D1 需先执行迁移 `wrangler d1 migrations apply blog --remote`。
