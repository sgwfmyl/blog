---
version: "v1.43.0"
date: 2026-09-22
time: "18:00"
type: feature
description: 文章列表/导航站/归档/说说/留言板/更新日志/友链页面隐藏左右侧栏，内容区居中留白
---

## 部分页面去掉侧栏、内容区居中留白

- 以下页面不再显示左右侧栏小组件，中间内容区居中并留出左右留白：
  **文章列表 `/posts/`、导航站 `/projects/`、归档 `/archive/`、说说 `/moments/`、留言板 `/guestbook/`、更新日志 `/changelog/`、友链 `/friends/`**。
  （音乐页 `/music/` 本就不用主布局、没有侧栏，不在此列；分类页与文章详情页等仍保留侧栏。）
- 内容宽度统一取 **932px**，与网格列表自身的上限 `calc(3 * 300px + 2 * 1rem)`（`.article-list-masonry`）保持一致——这样「置顶区 / 标题栏 / 网格列表」的左右边缘才会对齐；此前内容容器比网格宽，置顶区看起来比下方列表突出。
- **宽度逐页一条规则、互不影响**（`src/styles/features/no-sidebar-pages.css` 下半部分），要单独调某个页面的左右距离，只改那一行的数值即可（数值越大留白越少）。
- 实现方式：`MainGridLayout.astro` 按页面类型给 `#content-wrapper` 加 `data-no-sidebar="<页面类型>"`，CSS 用 `:has()` 隐藏侧栏容器、把主网格改成单列并居中内容区。因为标记元素在 Swup 容器内、导航时会随内容替换，**纯 CSS 就能跟随页面切换自动生效**，不依赖 JS，也没有切换闪烁。
- 增删页面改 `MainGridLayout.astro` 里的 `NO_SIDEBAR_PAGE_TYPES` 数组（用的是统一的页面类型分类器，与侧栏组件的 `showOnPages` / `hideOnPages` 同一套）。

> 验证：`pnpm check` 0 错误、构建通过；浏览器实测 7 个页面侧栏均隐藏、内容区 932px 居中，置顶区 / 标题栏 / 网格列表左右边界一致（396 / 1304），分类页等仍正常显示侧栏；并用 Swup 客户端导航（归档 → 分类 → 归档）确认侧栏的隐藏与恢复即时生效。
