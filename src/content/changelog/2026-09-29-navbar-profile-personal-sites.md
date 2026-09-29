---
version: "v1.47.1"
date: 2026-09-29
time: "13:20"
type: feature
description: 资料面板补上「其他站点」——左栏按钮切换右栏为站点列表
---

## 资料面板补上「其他站点」

补齐 v1.47.0 里说明「暂未做」的那块：参考站左栏社交行右端有「其他站点」按钮，点一下右栏就切换成站点列表。

- **配置**：`NavBarConfig` 新增 `personalSites: NavBarLink[]`，在 `src/config/navBarConfig.ts` 里维护。当前填的是导航页 `/projects/` 的「我的网站」分类里那 9 个站点（个人博客 / 团子的图床 / 团子的邮箱 / 评论管理后台 / AstrBot / NapCat / PagesCMS / COC 阵型库 / ZeppLife 刷步数）—— 那边改了记得同步这份列表；跨站链接要标 `external: true`，列表项右侧才会出现外链图标。
- **图标两种写法都支持**：iconify 名（`material-symbols:xxx`）渲染成 svg，图片 URL（各站点的 favicon）渲染成 1rem 见方的 `<img>`。
- **交互**：点「其他站点」按钮 → 右栏从「倒计时 + 事件进度」切换为站点列表，再点一次切回；按钮按下时会变色，`aria-pressed` 同步；每次悬浮打开面板都回到默认态。
- **实现**：右栏用 `data-view` 属性 + `.nav-profile__view--default / --site` 两态类名切换（不重建 DOM，倒计时与进度条不必重算）。
- 新增 i18n 键 `otherSites`（其他站点 / 其他站點 / Other sites / その他のサイト / Другие сайты），5 个语言文件已同步。
- 仍未做：参考站的「点热力图格子看当月文章列表」。

> 验证：`pnpm check` 0 错误；浏览器实测（1725×965，悬浮站点名并点「其他站点」）默认态 `data-view="default"`、站点列表 `display: none`、倒计时 `display: flex`；点击后 `data-view="site"`、`aria-pressed="true"`、列表 `display: flex`，9 个站点全部列出、9 个 favicon 图标均加载成功、每项带外链图标且 `target="_blank"`，面板高度自适应到 345px。
