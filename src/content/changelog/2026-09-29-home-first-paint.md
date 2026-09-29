---
version: "v1.47.4"
date: 2026-09-29
time: "21:00"
type: fix
description: 首页首屏不再白等 1.2 秒——去掉等「永不触发的入场动画」的等待，内容 176ms 就位
---

## 首页首屏提前 1.2 秒出现

站长反馈「刚进首页只有背景图，要等一下内容才全部出现」。定位到 `HomeDisplayLayer.astro` 里的一段等待：

- 原来它调用 `ensureNoContentWrapperContainingBlock()` 等 `#content-wrapper` 的 **`onload-animation` 动画结束**（`animationend`）后才放行内容；但这条 class 在 `swup.css` 里早已改成 `animation: none`（即时显示、无位移）—— **`animationend` 永远不会触发**，于是每次都会落到 1200ms 的超时兜底，首屏固定空一秒多。
- 这段等待的本意其实只有一个：**清掉 `#content-wrapper` 上的 transform**（带 transform 的祖先会把 fixed / pin 定位的参照从视口换成它自己，而首页显示层依赖固定定位）。

改法：把那个 Promise 封装换成同步的 `releaseContentWrapperTransform()` —— 立即移除 class 并清掉 transform，不再等动画。媒体（图片解码 / 视频缓冲）依旧由 `hydrateLazyImages()` 在后台加载，加载完再装 ScrollTrigger，避免快速滚动时 pin 已激活而资源还没就绪。

> 验证：`pnpm check` 0 错误；浏览器实测首页 `data-display-ready` 从「至少 1200ms」变成 **176ms** 就位，`#content-wrapper` 的 transform 已清除、`onload-animation` 类已移除；截图确认 MINI 取景器、职位行、名字徽章、右侧栏、对话气泡全部在首屏就位，无报错。
