---
version: "v1.46.1"
date: 2026-09-29
time: "11:45"
type: fix
description: 修复导航栏当前项黑底上看不见文字，并移除导航栏的滚动自动收起
---

## 修复导航栏反色文字 + 移除滚动自动收起

### 一、当前栏目在黑底上看不见字（fix）

v1.46.0 把滑动高亮块改成纯黑之后，反色规则写成了 `.dropdown-container.is-highlighted` —— 那是**参考实现的 class 名**，本项目 JS 打的是 **`nav-item-active`**，选择器不匹配，于是文字保持深色直接压在黑底上。已改用正确的 class，并补上「鼠标悬停的那一项也反色」：悬停时高亮块会滑到该项上，同样需要白字。

**再补一个边界情况**：鼠标悬停到**别的**导航项时，高亮块会跟着滑过去，当前项落回浅灰底 —— 此时它的反色必须撤销，否则白字压在浅底上同样看不见（实测截图里出现过「网站导航」在悬停「文章」时整项变白）。规则用 `.navbar-nav:hover .dropdown-container.nav-item-active:not(:hover)` 把当前项的文字改回 `--deep-text`。

### 二、移除导航栏自动收起（removal）

- `src/utils/scroll-handler.ts`：删掉按滚动方向隐藏/显示的逻辑（原来向下滚超过 50px 收走、向上滚放回），导航栏现在常驻；只保留滚动 20px 后的 `scrolled` 标记（收缩成球），并且滚回顶部时会正确移除该标记（原实现只在顶部清一次，逻辑一并理顺）。
- `src/utils/swup-lifecycle-controller.ts`：删掉 Swup 导航开始时「滚过阈值就给导航栏加 `navbar-hidden`」的那段，改为只清理可能残留的 `navbar-hidden`。
- 顺带清掉因此不再使用的变量与 import（`bannerEnabled`、`BANNER_HEIGHT_HOME`）。

> 验证：`pnpm check` 0 错误 0 警告；浏览器实测（1725×965）当前项「文章」文字为 `oklch(1 0 0)`（白）配 `oklch(0 0 0)`（黑）高亮块，悬停任意一项文字同样转白；**在 /projects/ 页（当前项是「网站导航」）悬停「文章」时，当前项文字为 `oklch(0.1 0 0)`（深色、可见）、悬停项为 `oklch(1 0 0)`（白）**；滚动到 2000px 时导航栏 class 仍是 `navbar-visible navbar-scrolled`、transform 为单位矩阵、top 0，不存在 `navbar-hidden`。
