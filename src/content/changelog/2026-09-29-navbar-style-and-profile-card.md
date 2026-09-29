---
version: "v1.46.0"
date: 2026-09-29
time: "11:20"
type: feature
description: 导航栏换成参考博客配色（实色胶囊 + 黑底反色当前项），站点名弹个人资料面板
---

## 导航栏配色对齐参考站 + 站点名资料面板

### 一、导航栏配色与样式

- 三段椭圆（左/中/右）的底色从「92% 半透明白」改成**实色 `--navbar-bg`** —— 亮色 `oklch(0.925 0 0)`（≈ 参考站的 `#E7E7E7`）、暗色 `oklch(0.19 0 0)`，同时去掉 `box-shadow`（参考站的胶囊是纯实色、无投影）。
- 滑动高亮块（`--navbar-highlight-bg`）从「8% / 12% 淡灰」改成**纯黑**（暗色下反过来是纯白）；当前项与悬停项共用这一块，并新增规则让落在块上的文字用 `--navbar-highlight-text` 反色 —— 否则深色字压在黑底上看不见。
- 三个变量定义在 `src/styles/tokens/colors.css`（亮/暗各一套）。

### 二、站点名 → 个人资料面板

新组件 `src/components/layout/NavbarProfileCard.astro`（样式 `src/styles/components/navbar-profile-card.css`），挂在 `Navbar.astro` 的 `#navbar` 内：

- **触发器是左侧站点名按钮**（`data-nav-profile-trigger`，与参考站的交互一致），面板展开时站点名反色成黑底白字；Logo 本身仍是回首页的链接。
- 面板是 fixed 浮层，左缘对齐站点名、上沿带 45° 小角，设计语言与面包屑下拉一致（1.5px 深色实边框 + 纯色底 + 无阴影）。
- 内容：头像 + 昵称 + 职位（取自 `profileConfig`）、社交按钮（`profileConfig.links`）、三个倒计时（**距周末 = 下一个周五 / 距月底 / 距年底**，纯前端计算，单位文案走 i18n）。
- 交互：点面板外、点遮罩、Esc、Swup 导航都会收起；窗口尺寸变化时重新定位。
- 新增 i18n 键 `profileCountdownWeek` / `profileCountdownMonth` / `profileCountdownYear` / `dayShort`，5 个语言文件已同步。
- **没有做的部分**：参考站的面板里还有「文章热力图（12 个月 × 4 周格子看发文量）／点格子看当月文章列表／节假日与纪念日进度条／个人站点列表」四块，它们依赖参考站自己的 `/api/holidays.json` 与 `/api/allPostMeta.json`（本项目没有这两个接口），所以这次只做了身份卡 + 社交 + 倒计时；要补齐得先做数据源。

> 验证：`pnpm check` 0 错误；浏览器实测 1725×965 —— 胶囊底 `oklch(0.925 0 0)`、阴影 none、高亮块纯黑且当前项「文章」呈黑底白字、站点名展开后为白字；面板宽 272px、左缘 111px（对齐站点名）；倒计时 week=3天 / month=1天 / year=93天（9 月 29 日测算，与参考站同一算法）。
