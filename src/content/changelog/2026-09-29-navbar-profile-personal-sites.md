---
version: "v1.47.1"
date: 2026-09-29
time: "13:20"
type: feature
description: 资料面板补上「其他站点」——左栏按钮切换右栏为站点列表
---

## 资料面板补上「其他站点」

补齐 v1.47.0 里说明「暂未做」的那块：参考站左栏社交行右端有「其他站点」按钮，点一下右栏就切换成站点列表。

- **配置**：`NavBarConfig` 新增 `personalSites: NavBarLink[]`，在 `src/config/navBarConfig.ts` 里维护。当前填了四个站内页面（网站导航 / 归档 / 关于我 / 更新日志）当示例 —— 换成你自己的其他站点即可；跨站链接记得标 `external: true`，列表项右侧才会出现外链图标。
- **交互**：点「其他站点」按钮 → 右栏从「倒计时 + 事件进度」切换为站点列表，再点一次切回；按钮按下时会变色，`aria-pressed` 同步；每次悬浮打开面板都回到默认态。
- **实现**：右栏用 `data-view` 属性 + `.nav-profile__view--default / --site` 两态类名切换（不重建 DOM，倒计时与进度条不必重算）。
- 新增 i18n 键 `otherSites`（其他站点 / 其他站點 / Other sites / その他のサイト / Другие сайты），5 个语言文件已同步。
- 仍未做：参考站的「点热力图格子看当月文章列表」。

> 验证：`pnpm check` 0 错误；浏览器实测（1725×965，悬浮站点名）「其他站点」按钮存在且文案正确；默认态 `data-view="default"`、站点列表 `display: none`、倒计时 `display: flex`；点击后 `data-view="site"`、`aria-pressed="true"`、列表 `display: flex` 且列出 4 项、倒计时隐藏。
