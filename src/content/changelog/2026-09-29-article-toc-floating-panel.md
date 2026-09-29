---
version: "v1.45.0"
date: 2026-09-29
time: "10:05"
type: feature
description: 文章目录改为正文右侧固定浮层（对齐参考博客），文章页随之隐藏左右侧栏
---

## 文章目录搬到正文右侧浮层

参考博客的目录不是侧栏组件，而是固定在正文右缘外侧的浮层，顶部与信息面板组对齐。这次把目录面板改成同一形态：

- **定位**：`position: fixed; top: 8rem; left: calc(50% + 31.5rem + 1rem); width: 18rem`，只在 `min-width: 101rem` 且精确指针（`hover:hover` + `pointer:fine`）下显示 —— 门槛按「正文半宽 + 1rem 间距 + 面板 18rem 不溢出视口」反算得来（正文卡宽 63rem）。窄屏不显示这个面板。
- **顶部与底边跟随**（控制器新增的 `syncDock()`）：页面在顶部时面板顶与 `.post-intro-card`（AI 摘要那张卡）顶部**对齐**；信息卡上移越过 8rem 停靠线后，面板钳制在 8rem 悬停跟随；面板底边触到正文卡底后随文档滚走，不会悬浮在评论区上。
- **文章页隐藏左右侧栏**（`MainGridLayout` 的 `NO_SIDEBAR_PAGE_TYPES` 增加 `"post"`）：浮层要占的位置正是侧栏所在，两者会重叠。侧栏组件配置都还留着，只是文章页不再渲染 —— 恋爱计时器、统计等组件目前在文章页看不到，想恢复随时改。
- **正文宽度锁回 1008px**（`no-sidebar-pages.css` 新增一条）：这个宽度原先由网格列算出，改成单列后会撑满整行、把浮层的位置挤没。
- 组件改由 `MainGridLayout` 在 `#swup-container` 内渲染（`{isPostPage && <SidebarTOC />}`，与参考实现的挂载点一致）；`sidebarConfig` 里的 `sidebarToc` 同时置为 `enable: false`，避免渲染两份。

> 验证：`pnpm check` 0 错误；浏览器实测 1725×965 —— 面板 left 1382.5 / 正文右缘 1367（正好 16px 间距）、滚动 0 时面板顶与信息卡顶差值 0px、滚动 1500 后钳制在 top 128px；首页 / 文章列表 / 归档 / 导航站的侧栏与正文宽度均与改动前一致，未受影响。
