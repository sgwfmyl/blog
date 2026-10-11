---
version: "v1.60.2"
date: 2026-10-11
time: "16:30"
type: fix
description: 修复书籍书架卡片封面只显示半张、被裁切拉伸的问题（组件类名与全局 notebooks.css 冲突）
---

## 书架卡片封面显示修复

书架页（`/books/`）书本卡片的封面图此前只显示上半部分、且被拉伸变形。排查发现根因是 **BookCard 组件作用域样式与全局 `src/styles/pages/notebooks.css` 的同名 `.nb-book-*` 类冲突**：

- Astro 7 的作用域样式用 `:where(.astro-xxx)` 包裹，**特异性为零**（`.nb-book-inner:where(.astro-xxx)` 与全局 `.nb-book-inner` 同为 0,1,0），二者平级时后加载的全局样式胜出。
- 于是卡片实际生效的是笔记本页的全局样式：`aspect-ratio: 49/60` + 插画区 `flex: 0 0 56%`，封面被压进上半部 56% 的盒子里，`object-fit: cover` 把竖版封面按宽度撑开裁切 → 「半张图 + 拉伸变形」。

- **修复**：BookCard 的全部卡片类由 `nb-book-*` 改名为 books 专用前缀 `bk-card-*`（`bk-card` / `bk-card-inner` / `bk-card-cover` / `bk-card-illustration` / `bk-card-illustration-img` / `bk-card-bind` / `bk-card-pages` / `bk-card-back`），彻底解除与 notebooks.css 全局同名类的级联冲突；卡片视觉不变（`aspect-ratio: 25/36` 整铺封面，微信读书封面 250×360 实测比例）。
- 桌面 5 列与移动端 3 列布局均已实测：封面完整显示、无裁切无拉伸，深色模式正常。
