---
version: "v1.46.2"
date: 2026-09-29
time: "12:10"
type: improvement
description: 导航栏下拉菜单换成参考站样式（深色实边框 + 45° 小角），并修掉高亮块上的下划线与深色文字
---

## 导航栏下拉菜单对齐参考站 + 修掉高亮块上的两处残留样式

### 一、下拉菜单换成参考站样式

`src/styles/components/dropdown.css`：

- 卡片从「1px 淡边框 + 85% 半透明底 + 毛玻璃」改成 **1.5px `--deep-text` 实边框 + `--float-panel-bg` 纯色底**，去掉 `backdrop-filter` 与阴影。
- 新增 **45° 小角**（`::before`，0.75rem、`top: -0.45rem`、`left: 1.25rem`，带同色边框、用卡片底色盖住接缝），贴在触发器下沿。
- 菜单项去掉常驻的透明边框与 hover 边框，改为纯底色反馈；字号收到 0.8125rem、内边距 0.5/0.75rem、圆角 0.375rem，颜色直接用 `--deep-text`。

这一段连踩三个覆盖坑（都写进注释了）：

1. `DropdownPanel` 的根元素同时带 `.float-panel`，而 `.float-panel` 的规则在本文件更靠后、同优先级会盖掉 `.dropdown-content` → 选择器改用 `.float-panel.dropdown-content` 提高优先级。
2. `.float-panel` 带 `overflow: hidden`，会把小角裁掉 → 显式 `overflow: visible`。
3. `.float-panel` 还带 `top: 5.25rem`，原来卡片是 static 不生效；改成 `relative` 给小角当定位基准后会把卡片整个顶下去 → 显式 `top: auto`。

### 二、高亮块上的两处残留样式

- **触发器文字在悬停时又变深色**：`.navbar-link-text`（触发器内层 span）自带 `:hover { color: var(--primary) }`，只覆盖 `> a` 会被它压住 —— 反色规则现在连 `.navbar-link-text` 一起覆盖，悬停与展开态都是白字。
- **黑底上的渐变下划线**：导航项原有的「悬停/当前项出现主题色下划线」压在纯黑高亮块上很脏（参考站也没有），高亮块命中时把下划线 `scaleX(0)`。

> 验证：`pnpm check` 0 错误；浏览器实测（1725×965，悬停"文章"）卡片边框为 `--deep-text` 实色、背景纯色、无毛玻璃与阴影、`overflow: visible`；小角 12×12、45°、`top: -7.2px`；菜单项字号 13px；触发器文字 `oklch(1 0 0)`、下划线 `scaleX(0)`。
