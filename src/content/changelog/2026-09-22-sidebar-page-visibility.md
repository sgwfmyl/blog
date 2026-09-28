---
version: "v1.42.0"
date: 2026-09-22
time: "17:20"
type: feature
description: 侧栏小组件支持按页面类型精确控制显示，并修正文章列表页被误判为文章页的问题
---

## 侧栏小组件可指定在哪些页面显示

- 每个侧栏小组件（含移动端底部组件）现在可以在 `src/config/sidebarConfig.ts` 里写 `showOnPages`（白名单，只在这些页面显示）或 `hideOnPages`（黑名单，这些页面不显示），共 27 种页面类型可选：首页、文章列表、文章详情、分类列表/详情、归档、说说、导航站、友链、关于、留言板、朋友圈、笔记本列表/详情、足迹、相册列表/详情、账单、日程、应用、书架、影视与游戏、番剧、搜索、更新日志、赞助、其他。
- 不写这两个字段的组件行为完全不变（继续按旧的 `showOnPostPage` / `showOnNonPostPage` 走），**现有配置无需改动**。
- 判定逻辑集中在 `src/utils/page-type.ts#getSidebarPageType()`，构建期与运行期共用同一套规则，保证首屏初始状态与导航后的结果一致（不闪）。
- 实现沿用既有模式：服务端渲染全部组件并输出 `data-show-pages` / `data-hide-pages` 标记与初始 `hidden`，运行期在页面切换后重算——因为侧栏在 Swup 容器之外，导航时不会重新渲染，纯构建期过滤会让侧栏在导航后"卡住"。

## 修正：文章列表页不再被当作"文章页"

- `isCurrentPagePost()` 此前用 `pathname.includes("/posts/")`，导致 `/posts/`（文章列表）与文章详情页被归为同类，`showOnPostPage` 系列的显隐在列表页判断错误。现改为严格匹配 `/posts/<slug>/`。
- **连带变化**：配了 `showOnPostPage: false` 的组件（个人资料卡、日历、站点统计、在一起计时、今日一言、最近更新等）此前在文章列表页被误隐藏，现在会正常显示。若不希望它们在列表页出现，加 `hideOnPages: ["posts-list"]` 即可。
- 「全部文章」目录（`postDirectory`）已改用 `showOnPages: ["post", "posts-list"]`，在列表页与详情页都显示，表现与之前一致。

> 验证：`pnpm check` 0 错误、构建 512 页通过；浏览器逐页实测文章列表 / 文章详情 / 归档 / 友链四处显隐正确，并用 Swup 客户端导航（详情页 → 归档页）确认显隐即时更新、无需刷新。
