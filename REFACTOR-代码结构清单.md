# 代码结构审计表单（供 AI 重构参考）

> 生成时间：2026-09-13 · 扫描范围：`src/` 下 components / pages / config / utils / types / styles / layouts / constants / i18n / plugins
> 说明：本表由 `scripts/audit-code-structure.mjs` 只读扫描生成，不含 `content/` 内容数据、`scripts/` 工具脚本与构建产物。仅用于展示**代码结构重构方向**。

## 一、顶层代码目录总览
| 目录 | 文件数 | 总行数 | 最大文件(行) |
|---|---|---|---|
| `components/` | 144 | 37649 | components/comment/NotebookCommentModal.svelte (1793) |
| `styles/` | 73 | 19952 | styles/components/guestbook-chat.css (2108) |
| `pages/` | 39 | 9879 | pages/movies-games/index.astro (831) |
| `utils/` | 41 | 7385 | utils/tag-graph-controller.ts (1015) |
| `i18n/` | 7 | 2399 | i18n/languages/ru.ts (399) |
| `config/` | 25 | 1927 | config/sidebarConfig.ts (282) |
| `types/` | 5 | 1051 | types/config.ts (900) |
| `layouts/` | 2 | 888 | layouts/Layout.astro (582) |
| `plugins/` | 10 | 872 | plugins/mermaid-render-script.js (345) |
| `constants/` | 4 | 370 | constants/icons.ts (232) |

## 二、组件功能域（components/）规模
| 域 | 文件数 | 总行数 | 最大文件(行) |
|---|---|---|---|
| `features/` | 25 | 8249 | GuestbookChat.svelte (1414) |
| `layout/` | 19 | 6866 | HomeHero.astro (1346) |
| `widget/` | 25 | 4722 | PostDirectoryList.astro (624) |
| `comment/` | 11 | 4335 | NotebookCommentModal.svelte (1793) |
| `controls/` | 8 | 2763 | CategoryTools.astro (613) |
| `moments/` | 3 | 2552 | MomentCommentChat.svelte (1751) |
| `pages/` | 10 | 2513 | ArticleVirtualList.svelte (691) |
| `common/` | 17 | 1867 | CoverImage.astro (348) |
| `schedules/` | 3 | 829 | SchedulesView.svelte (664) |
| `misc/` | 3 | 827 | SharePoster.svelte (567) |
| `bills/` | 8 | 816 | MonthlyFlowCard.astro (199) |
| `about/` | 6 | 781 | ChangelogGraph.astro (365) |
| `security/` | 2 | 406 | PasswordGate.svelte (287) |
| `seo/` | 1 | 76 | SiteStructuredData.astro (76) |
| `analytics/` | 3 | 47 | GoogleAnalytics.astro (20) |

## 三、超大 / 复杂文件 TOP（≥ 400 行，重构候选）
| 文件 | 行数 | 类型 |
|---|---|---|
| `styles/components/guestbook-chat.css` | 2108 | css |
| `components/comment/NotebookCommentModal.svelte` | 1793 | svelte |
| `components/moments/MomentCommentChat.svelte` | 1751 | svelte |
| `components/features/GuestbookChat.svelte` | 1414 | svelte |
| `styles/pages/music-visualizer.css` | 1347 | css |
| `components/layout/HomeHero.astro` | 1346 | astro |
| `styles/pages/article-list.css` | 1254 | css |
| `components/comment/NotebookComment.svelte` | 1095 | svelte |
| `utils/tag-graph-controller.ts` | 1015 | ts |
| `styles/components/home-data-layer.css` | 949 | css |
| `types/config.ts` | 900 | ts |
| `components/layout/HomeDisplayLayer.astro` | 894 | astro |
| `styles/pages/notebooks.css` | 892 | css |
| `pages/movies-games/index.astro` | 831 | astro |
| `components/features/GuestbookChatComposer.svelte` | 796 | svelte |
| `components/features/music-visualizer/ThreeScene.svelte` | 786 | svelte |
| `styles/components/home-hero.css` | 771 | css |
| `components/features/MusicPlayer.astro` | 756 | astro |
| `pages/projects.astro` | 748 | astro |
| `components/comment/CommentModal.svelte` | 742 | svelte |
| `styles/layout/layout-styles.css` | 711 | css |
| `pages/album/index.astro` | 699 | astro |
| `components/pages/ArticleVirtualList.svelte` | 691 | svelte |
| `components/schedules/SchedulesView.svelte` | 664 | svelte |
| `styles/pages/categories.css` | 652 | css |
| `components/moments/MomentCard.astro` | 625 | astro |
| `components/widget/PostDirectoryList.astro` | 624 | astro |
| `components/layout/HomeDataLayer.astro` | 620 | astro |
| `components/controls/CategoryTools.astro` | 613 | astro |
| `styles/components/about-changelog.css` | 586 | css |
| `layouts/Layout.astro` | 582 | astro |
| `components/controls/ArchivePanel.svelte` | 574 | svelte |
| `components/misc/SharePoster.svelte` | 567 | svelte |
| `pages/album/[...slug].astro` | 547 | astro |
| `components/features/MusicManager.astro` | 541 | astro |
| `styles/features/widget-responsive.css` | 533 | css |
| `components/controls/SearchModal.svelte` | 529 | svelte |
| `utils/swup-lifecycle-controller.ts` | 524 | ts |
| `components/widget/Calendar.astro` | 509 | astro |
| `pages/friends.astro` | 508 | astro |
| `components/layout/UnifiedDock.astro` | 502 | astro |
| `pages/life/notebooks/[...slug].astro` | 500 | astro |
| `components/features/Live2DWidget.astro` | 459 | astro |
| `utils/tocUtils.ts` | 458 | ts |
| `styles/features/circle.css` | 456 | css |
| `styles/components/post-hero.css` | 442 | css |
| `pages/life/notebooks/index.astro` | 436 | astro |
| `pages/life/guestbook.astro` | 431 | astro |
| `components/layout/HomePortfolioShutterLayer.astro` | 426 | astro |
| `pages/moments.astro` | 425 | astro |
| `components/features/music-visualizer/VisualizerControls.svelte` | 418 | svelte |
| `components/controls/FloatingDock.astro` | 415 | astro |
| `styles/components/mobile-dock.css` | 415 | css |
| `styles/layout/nav-menu-panel.css` | 415 | css |
| `components/features/SpineModel.astro` | 406 | astro |
| `components/layout/PostPage.astro` | 405 | astro |
| `utils/notebook-chat.ts` | 403 | ts |
| `utils/moment-chat.ts` | 401 | ts |

## 四、页面 ⇄ 组件域 依赖表
| 页面 | 引用的组件域 | 数量 |
|---|---|---|
| posts/[...slug].astro | comment, common, features, misc, layout | 5 |
| friends.astro | comment, common, features | 3 |
| life/notebooks/[...slug].astro | comment, security, widget | 3 |
| movies-games/index.astro | comment, common, pages | 3 |
| about.astro | common, seo | 2 |
| archive.astro | controls, widget | 2 |
| bills.astro | bills, security | 2 |
| books/index.astro | comment, pages | 2 |
| life/guestbook.astro | comment, common | 2 |
| life/notebooks/index.astro | comment, security | 2 |
| moments/pinned.astro | comment, moments | 2 |
| music/index.astro | comment, features | 2 |
| posts/[...page].astro | controls, pages | 2 |
| schedules.astro | schedules, security | 2 |
| album/index.astro | features | 1 |
| album/[...slug].astro | comment | 1 |
| apps.astro | features | 1 |
| bangumi/[...slug].astro | common | 1 |
| bangumi.astro | pages | 1 |
| books/[...slug].astro | common | 1 |
| categories/[...category].astro | pages | 1 |
| categories.astro | widget | 1 |
| changelog.astro | about | 1 |
| guestbook.astro | features | 1 |
| life/places.astro | comment | 1 |
| moments.astro | moments | 1 |
| search.astro | pages | 1 |
| [...page].astro | layout | 1 |
| 404.astro | — | 0 |
| api/calendar.json.ts | — | 0 |
| api/home-stats.json.ts | — | 0 |
| circle.astro | — | 0 |
| debug-urls.astro | — | 0 |
| og/[...slug].png.ts | — | 0 |
| projects.astro | — | 0 |
| robots.txt.ts | — | 0 |
| rss.astro | — | 0 |
| rss.xml.ts | — | 0 |
| sponsor.astro | — | 0 |

## 五、跨域组件引用（耦合 / 复用信号）
> 排除共享基础域 `common/` 后，其余跨域引用即真实的**耦合热点**——被引用越多越接近公共层或高耦合。
| 被引用目标域 | 被引用次数 | 来源域 |
|---|---|---|
| `features/` | 4 | controls, layout, widget |
| `widget/` | 4 | controls, layout |
| `controls/` | 2 | layout, pages |

#### 共享基础域复用（→ components/common/，预期内）
共 31 处引用，来源域：about, controls, features, layout, misc, moments, pages, widget。

#### 跨域引用明细（from → to，已排除 common）
```
  components/controls/FloatingDock.astro  →  components/features/
  components/controls/FloatingDock.astro  →  components/widget/
  components/layout/HomeDataLayer.astro  →  components/features/
  components/layout/MobilePostToolbar.astro  →  components/widget/
  components/layout/SideBar.astro  →  components/widget/
  components/layout/UnifiedDock.astro  →  components/controls/
  components/layout/UnifiedDock.astro  →  components/features/
  components/layout/UnifiedDock.astro  →  components/widget/
  components/pages/ArticleVirtualList.svelte  →  components/controls/
  components/widget/Music.astro  →  components/features/
```

## 六、对照《博客使用指南.md》（动态解析附录表格）

### 6.1 指南「页面路径一览」声明 ⇄ 代码 pages/ 落地
| 功能 | 指南路径 | 代码已落地 |
|---|---|---|
| 首页 | / | ✅ |
| 文章列表 | /posts/ | ✅ |
| 文章详情 | /posts/[slug]/ | ✅ |
| 归档 | /archive/ | ✅ |
| 分类 | /categories/ | ✅ |
| 标签 | /tags/ | — |
| 搜索 | /search/ | ✅ |
| 生活 | /life/ | ✅ |
| 健康 | /life/health/ | ✅ |
| 打卡 | /life/checkin/ | ✅ |
| 想法 | /life/ideas/ | ✅ |
| 日记 | /life/notebooks/ | ✅ |
| 规划 | /life/routines/ | ✅ |
| 地点 | /life/places/ | ✅ |
| 相册 | /album/ | ✅ |
| 动态 | /moments/ | ✅ |
| 番组 | /bangumi/ | ✅ |
| 番组详情 | /bangumi/[slug]/ | ✅ |
| 友链 | /friends/ | ✅ |
| 留言板 | /guestbook/ | ✅ |
| 关于 | /about/ | ✅ |
| 赞助 | /sponsor/ | ✅ |
| RSS | /rss.xml | ✅ |
| 地图 | /map/ | — |

### 6.2 指南「Content Schema 概览」集合 ⇄ 代码 content.config 声明
| Collection | 指南路径 | 已声明 |
|---|---|---|
| posts | src/content/posts/ | ✅ |
| moments | src/content/moments/ | ✅ |
| album | src/content/album/ | ✅ |
| daohang | src/content/daohang/ | ✅ |
| bangumi | src/content/bangumi/ | ✅ |
| life | src/content/life/*/ | ✅ |
| danmu | src/content/danmu/ | — |
| spec | src/content/spec/ | ✅ |
| notebooks | src/content/life/notebooks/ | ✅ |

### 6.3 功能模块语义 → 代码组件域（供人工复核重构归属）
> 指南未给组件域，下表为脚本依据代码结构标注的**期望归属**，并标注该域是否真实存在。
| 功能模块 | 期望组件域 | 已存在 |
|---|---|---|
| 文章 (posts) | pages ✅<br>common ✅<br>widget ✅ | 3/3 |
| 日常动态 (moments) | moments ✅ | 1/1 |
| 相册 (album) | — | 0/0 |
| 导航 (daohang) | — | 0/0 |
| 番组计划 (bangumi) | pages ✅<br>features ✅ | 2/2 |
| 特殊页面 (spec) | about ✅ | 1/1 |
| 生活记录 (life) | — | 0/0 |
| 笔记本 (notebooks) | comment ✅<br>pages ✅ | 2/2 |
| 账单/资金 (bills) | bills ✅ | 1/1 |
| 日程 (schedules) | schedules ✅ | 1/1 |
| 留言板 (danmu) | features ✅ | 1/1 |
## 七、重构方向建议（规则自动归纳）

> 以下结论由脚本按客观信号推断，仅作**切入点候选**，是否重构由你来定夺。

### 7.1 优先拆分超大 / 复杂文件（按行数降序）
| 建议 | 依据 |
|---|---|
| 拆分/审计 `styles/components/guestbook-chat.css`（2108 行） | 超过 400 行，体量过大，宜按职责拆分，避免牵一发动全身 |
| 拆分/审计 `components/comment/NotebookCommentModal.svelte`（1793 行） | 超过 400 行，体量过大，宜按职责拆分，避免牵一发动全身 |
| 拆分/审计 `components/moments/MomentCommentChat.svelte`（1751 行） | 超过 400 行，体量过大，宜按职责拆分，避免牵一发动全身 |
| 拆分/审计 `components/features/GuestbookChat.svelte`（1414 行） | 超过 400 行，体量过大，宜按职责拆分，避免牵一发动全身 |
| 拆分/审计 `styles/pages/music-visualizer.css`（1347 行） | 超过 400 行，体量过大，宜按职责拆分，避免牵一发动全身 |
| 拆分/审计 `components/layout/HomeHero.astro`（1346 行） | 超过 400 行，体量过大，宜按职责拆分，避免牵一发动全身 |

### 7.2 跨域耦合热点（组件域被引用多，考虑是否下沉 common）
| 目标域 | 被引用次数 | 建议 |
|---|---|---|
| `features/` | 4 | 被 controls, layout, widget 引用，评估抽到 `common/` 或收敛依赖 |
| `widget/` | 4 | 被 controls, layout 引用，评估抽到 `common/` 或收敛依赖 |
| `controls/` | 2 | 被 layout, pages 引用，评估抽到 `common/` 或收敛依赖 |

### 7.3 指南声明但代码缺失/滞后（文档 ⇄ 代码对齐项）
| 缺失路由 | 说明 |
|---|---|
| `/tags/`（标签） | 指南已声明，但 `pages/` 下无对应文件——需确认是删除还是补建 |
| `/map/`（地图） | 指南已声明，但 `pages/` 下无对应文件——需确认是删除还是补建 |
- 指南声明集合 `danmu`（src/content/danmu/）在 `src/content.config.ts` 中未找到——命名不一致或已迁移。

---
*注：以上为静态规模与引用关系统计，重构方向需结合业务语义最终由人来定夺——本脚本只提供客观候选。*

