---
version: "v1.48.0"
date: 2026-09-29
time: "22:40"
type: improvement
description: 切页优化——进度条改 WAAPI 去掉强制重排，悬停预载时顺带预取目标页样式表
---

## 切页优化：进度条不再卡、样式表提前就位

站长反馈「切页慢且卡顿，参考站很流畅」。对比参考实现后定位到两个根因，逐条对齐。

### 一、进度条：不再强制同步重排（卡顿的主因）

原实现是「切 CSS 类 + `@keyframes` + 用 `width` 做动画」，每次切页都要：

- 摘挂 `.loading` 类后用 `void progressBar.offsetWidth` **强制同步重排**把动画「重置」掉 —— 而这恰好发生在切页最忙的时刻，长文章 DOM 上会同步重算整棵布局树；
- 收尾靠 `.finishing` → `.done` 两层嵌套 `setTimeout`（100ms + 150ms）摘类名；
- 动画改的是 `width`，每帧都要重排。

改为参考实现的 WAAPI 版本（新增 `src/utils/progress-bar.ts`）：

- 增长 / 收尾都用 `element.animate()`，改 **`transform: scaleX` + `opacity`** —— 全程跑在合成线程，不触发重排；
- 重置动画改用 `getAnimations()` + `cancel()`，完全不碰布局；
- 收尾一条带 offset 的关键帧搞定，不再需要两层 `setTimeout`；
- 增长时长沿用参考站的 8s（原为 3s），观感更从容；`prefers-reduced-motion` 下用 duration 0 复现原语义。

`swup.css` 里 `#progress-bar` 的类动画与 `@keyframes` 一并删除，只留基础样式（`transform: scaleX(0)` + `transform-origin: left`）。

### 二、悬停预载时预取目标页样式表（新增 `src/utils/swup-css-prefetch.ts`）

按页拆包后，SwupHeadPlugin（`awaitAssets: true`）首次导航到某类页面时要等新样式表下载完才播入场动画 —— 这就是「第一次点某类链接会卡一下」。参考实现把这步藏进了 hover 预载：

- 监听 swup 的 `page:preload`，从参数里取出目标页 HTML，解析其中 `<link rel="stylesheet">`；
- 以 `media="print"` 插进当前文档 —— 低优先级下载进 `/_astro/*` 的 immutable 缓存，对当前页渲染零影响；
- 点击时 SwupHeadPlugin 插入正式样式表会直接命中缓存，等待几乎为零。

移植时踩了两个坑（都写进注释了）：

1. **不能在 `initSwupLifecycle()` 里同步检查 `swup.preload`** —— `window.swup` 先被创建、各插件随后才挂上去，那时 `preload` 还是 undefined，判断会把监听整个跳过。改为等 `swup:enable` / `swup:any`，再加几帧轮询兜底。
2. **v3 版 preload 插件的参数是 `args.html`**，参考站（旧版）用的是 `args.page.html` —— 照抄旧路径取不到 HTML。现已两种写法都兼容。

`astro.config.mjs` 的 `preload` 也从布尔 `true` 改成参考站的对象写法 `{ hover: true, visible: false }`。

> 验证：`pnpm check` 0 错误、`pnpm build` 592 页通过；**dev 下看不到预取效果是正常的**（CSS 按页拆包是构建期行为，dev 下只有字体外链、被同源过滤跳过），所以用 `astro preview` 验证：悬停导航「导航」后 head 里出现目标页专属样式 `/_astro/projects.CPY4BJmA.css` 的预取链接；点击切页到 URL 变化 136ms；进度条在切页中 `getAnimations()` 有 1 个动画、时长 8000ms、元素上**没有任何类名**（不再靠切类）。
