---
version: "v1.43.0"
date: 2026-09-22
time: "17:40"
type: feature
description: 文章列表/导航站/归档/说说/留言板/更新日志/友链页面隐藏左右侧栏，内容区放宽到约 4/3
---

## 部分页面去掉侧栏、内容区放宽

- 以下页面不再显示左右侧栏小组件，中间内容区相应放宽到约「原中间列宽 × 4/3」，避免去掉侧栏后两侧留下大片空白：
  **文章列表 `/posts/`、导航站 `/projects/`、归档 `/archive/`、说说 `/moments/`、留言板 `/guestbook/`、更新日志 `/changelog/`、友链 `/friends/`**。
  （音乐页 `/music/` 本就不用主布局、没有侧栏，不在此列；分类页与文章详情页等仍保留侧栏。）
- 实现方式：`MainGridLayout.astro` 按页面类型给 `#content-wrapper` 加 `data-no-sidebar` 标记，`src/styles/features/no-sidebar-pages.css` 用 `:has()` 隐藏侧栏容器、把主网格改成单列并放宽内容宽度。因为标记元素在 Swup 容器内、导航时会随内容替换，**纯 CSS 就能跟随页面切换自动生效**，不依赖 JS，也没有切换闪烁。
- 内容宽度公式是 `calc((100% - 35rem) * 4 / 3)`（35rem = 两侧栏 17.5rem × 2），想调宽窄只改这个系数。实测 1280 视口下：原 640px → 现在约 897px（1.40 倍）。
- 增删页面改 `MainGridLayout.astro` 里的 `NO_SIDEBAR_PAGE_TYPES` 数组即可（用的是统一的页面类型分类器，与侧栏组件的 `showOnPages` / `hideOnPages` 同一套）。

> 验证：`pnpm check` 0 错误、构建通过；浏览器实测 7 个页面侧栏均隐藏、内容区变宽，分类页等仍正常显示侧栏；并用 Swup 客户端导航（归档 → 分类 → 归档）确认侧栏的隐藏与恢复即时生效。
