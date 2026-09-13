---
version: "v1.28.0"
date: 2026-09-09
type: removal
description: 清理已废弃的 categoryBar 分类导航栏开关与 CategoryBar 组件，消除死代码
---

## 清理废弃的 categoryBar 分类导航栏

- 移除 `siteConfig.categoryBar` 配置开关（`src/config/siteConfig.ts:181`）及 `SiteConfig.categoryBar` 类型声明（`src/types/config.ts:110`）：该开关早已无任何代码读取，改动无效
- 删除无人引用的 `CategoryBar.astro` 分类栏组件（`src/components/layout/`）：已于 2026-06 被 `CategoryTools` 组件替代，仅剩死文件
- 移除 `guestbook-chat.css` 中针对旧 wrapper 的 `#category-bar-wrapper { display: none }` 残留规则（`src/styles/components/guestbook-chat.css:10`）：此 id 由已删组件使用，命中不到任何元素
- 同步更新 `src/components/README.md` 组件清单与 `CLAUDE.md` layout 组件计数（19→18）