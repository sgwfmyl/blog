---
version: "v1.65.0"
date: 2026-10-17
time: "18:25"
type: removal
description: 导航菜单归类调整——「笔记本」移入「我的」、「音乐」移入「关于」，并移除 QQ群入口
---

## 导航菜单归类调整

入口归类更贴合页面属性，桌面端顶部导航与移动端菜单抽屉同步调整。

### 笔记本 → 我的

- 「动态」下拉中不再显示笔记本入口。
- 笔记本入口移到「我的」分组**最后一项**（在应用展示之后），指向 `/life/notebooks/`。
- 桌面端 `src/config/navBarConfig.ts:130`、移动端 `src/components/layout/MobileMenuSheet.astro:81`。

### 音乐 → 关于

- 「我的」下拉中不再显示音乐入口。
- 音乐入口移到「关于」分组**最后一项**，仍受 `siteConfig.pages.musicPage` 开关控制，外链图标保留。
- 桌面端 `src/config/navBarConfig.ts:154`、移动端 `src/components/layout/MobileMenuSheet.astro:119`。

### 移除 QQ群入口

- 移动端菜单「关于」分组中的「QQ群」外链入口已移除（`src/components/layout/MobileMenuSheet.astro:113`），桌面端「关于」下拉原本就没有该入口，无需改动。
- 个人资料卡片里的 QQ 社交图标（`src/config/profileConfig.ts:32`）不在导航内，保持原样。

### 附带修正

- 「记录」分组的默认落地 URL 兜底不再指向 `/music/`（音乐已不属于该分组），改为 `/changelog/`，最后兜底 `/life/places/`（`src/config/navBarConfig.ts:93`）。
