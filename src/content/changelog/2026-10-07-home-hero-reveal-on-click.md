---
version: "v1.56.0"
date: 2026-10-07
time: "21:55"
type: feature
description: 首页 Hero 内容区默认隐藏，点击屏幕后才显示并播放入场动画，停留一段时间后自动收起
---

## 首页 Hero：内容区默认隐藏，点击唤出

站长希望首页第一眼只有一张干净的全屏背景图，Hero 的一切 UI（取景框、中心对焦框、左侧名字区、galgame 对话框、右侧竖排面板）先收起来，点击屏幕后再让它们出现。

- **初始隐藏**：`<section id="home-hero">` 增加 `home-hero--content-hidden` 类（直接写在模板里，避免 JS 未执行时的 FOUC）；`.home-hero--content-hidden .home-hero__canvas-container` 统一 `opacity: 0 / visibility: hidden / pointer-events: none`，容器本身加 `0.45s` 的 opacity + visibility 过渡做淡入淡出。
- **首次点击才播放入场动画**：`init()` 不再直接调用 `initHeroOpening()`，改为唤出时再调用；原有入场时间轴（取景框 → 对焦框 → 名字 → 对话框）只播一次，之后再唤出仅做淡入。
- **延时自动收起**：从入场动画的 `onComplete` 之后才开始计时（`HERO_AUTO_HIDE_DELAY = 6000`），避免内容在入场过程中被收起；显示期间在空白处点击立即收起，再次点击重新唤出。
- **不打断对话**：点击对话框 / 按钮 / 链接 / `role="button"`（含名牌唤出按钮）时不触发整体收起，只重置自动收起计时。
- **Swup 兼容**：点击监听挂在 `AbortController` 上，`cleanup()` 里由 `destroyHeroReveal()` 统一清理计时器与监听；每次进入首页都回到「已收起」的初始态。
- 玻璃雨珠的撞击边缘无需额外处理：容器隐藏时 `isRainEdgeVisible()` 会判定为不可见，唤出后由既有的 500ms 轮询自动补齐。

> 验证：`pnpm check` 0 error（34 hints 均为既有告警）；`pnpm build` 通过。浏览器实测：初始只有背景图；点击空白处唤出并按时间轴依次入场；入场结束后停留约 6 秒自动收起；收起后再点重新唤出（只淡入）；点击对话框推进台词不会误收起。