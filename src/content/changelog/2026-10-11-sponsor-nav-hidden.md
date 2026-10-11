---
version: "v1.60.3"
date: 2026-10-11
time: "16:36"
type: style
description: 隐藏赞助页面的导航入口（桌面端「关于」下拉与移动端菜单），直接访问 /sponsor/ 仍可打开
---

## 赞助页导航入口隐藏

- 桌面端顶部导航「关于」下拉中的「赞助」入口已注释移除（`src/config/navBarConfig.ts`）。
- 移动端菜单抽屉「关于」分组中的「赞助」入口同步注释移除（`src/components/layout/MobileMenuSheet.astro`）。
- 与此前隐藏朋友圈页面的处理方式一致：仅移除入口，不关闭页面——`siteConfig.pages.sponsor` 仍保持开启，直接访问 `/sponsor/` 可正常打开；`LinkPreset.Sponsor` 预设保留，便于后续恢复。
