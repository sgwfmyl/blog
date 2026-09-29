---
version: "v1.47.3"
date: 2026-09-29
time: "20:31"
type: improvement
description: 首页背景图桌面/移动各留一张，首页背景资源从 2.1MB 降到 476KB
---

## 首页背景图精简为各一张

`src/assets/images/backgrounds/` 下的 `desktop/` 与 `mobile/` 是被 `backgroundWallpaper.ts` **自动扫描**的（不写死在代码里），里面放几张就随机显示几张：

- `desktop/`：原来 2 张（`home1.webp` 272KB + `【哲风壁纸】二次元-冷冽的战斗.jpg` 568KB），现在只留 **`home1.webp`**。
- `mobile/`：原来 4 张（`1.webp` 211KB / `2.webp` 520KB / `5.png` 365KB / `6.webp` 164KB），现在只留 **`1.webp`**。

合计 **2.1MB → 476KB**，减少约 77%。这些背景图是原图直出（`?url` 导入不走 Astro 压缩），随机命中大图时首页首屏要完整下载，所以这一步同时也是**首页加载优化**。

- 想换图：把新图丢进对应文件夹、删掉旧图即可；照片叫什么都行，但**别用 `d1–d6` / `m1–m6` 这类示例名**（上游换示例图时可能被覆盖）。
- 被删的 4 张都是 git 跟踪过的文件，需要时可以从历史恢复。

> 验证：两个目录各只剩 1 个文件（`du -sh` 分别为 268K / 208K）；`backgroundWallpaper.ts` 的 glob 会自动适配，无需改代码。
