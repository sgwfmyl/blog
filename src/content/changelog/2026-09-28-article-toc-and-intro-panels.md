---
version: "v1.44.0"
date: 2026-09-28
time: "19:40"
type: feature
description: 文章页新增信息面板组（过期提示/AI摘要/封面图），右侧文章目录换成带手风琴与思维导图的完整版
---

## 文章页信息面板组 + 新版文章目录

复刻参考博客（MMZMING）文章详情页的两个区块。

### 一、信息面板组（标题下方）

原来那张单张「AI 摘要」卡，升级为**三个可折叠面板共用一张浅灰卡**（`post-intro-card`，结构在 `src/pages/posts/[...slug].astro`，样式在 `post-hero.css`）：

- **① 过期提示**：`最后更新于 YYYY-MM-DD，距今已过 N 天，部分内容可能已过时`。服务端只输出骨架（ISO 日期 + 阈值），客户端按当前日期算天数；没超过 `siteConfig.outdatedThreshold`（30 天）时整行连带下方分隔线一起隐藏。此前这张卡在正文之后，现已迁到标题下方（正文后不再重复显示）。
- **② AI 摘要**：内容即 frontmatter 的 `description`（参考站也是这个字段，并没有真的调用 AI，模型名是写死的），用原生 `<details>` 展开/收起，箭头 0.2s 旋转。
- **③ 封面图**：把文章封面收进可折叠面板（此前详情页根本不显示封面），展开后最大高度 480px（≥768px 为 560px）。
- 三个面板的底板用新变量 `--intro-surface-bg`（亮 `oklch(0.965 0 0)` / 暗 `oklch(0.14 0 0)`）——项目的 `--card-bg` 是 transparent（极简风），不能直接复用。
- 面板组上方顺带收紧了留白：面包屑 `margin-bottom` 1rem→0.5rem、hero 内容区 `padding-top` 桌面 2rem→1.25rem（移动 1.25rem→1rem），面包屑到文章标题的间距由 48px 收到 28px。

### 二、右侧文章目录（完整复刻）

旧实现（`tocUtils.ts` 的 `TOCManager` 往 `#sidebar-toc-content` 写扁平列表）已从侧栏停用，换成照参考博客完整复刻的面板，拆成四个文件：

- `src/components/widget/SidebarTOC.astro` —— 骨架（工具栏 + 树容器 + 思维导图弹窗）
- `src/utils/article-toc-tree.ts` —— 标题采集与层级归一化（纯数据）
- `src/utils/article-toc.ts` —— 控制器（树渲染、折叠、scrollspy、连线、导图）
- `src/styles/features/article-toc-panel.css` —— 样式

几何与配色逐值照搬参考实现：灰底卡片（亮 `#dedede` / 暗 `#161616`、圆角 0.75rem、`max-height: min(40rem, calc(100vh - 10rem))`）、工具栏 `0.5rem 0.75rem`、节点字号 0.82rem、每级缩进 0.95rem、圆点 0.55/0.45/0.38rem、**SVG 肘形连线 1.5px**（活动链青色、悬停链青色 55%）、进度 0.78rem 等宽数字。

功能：根节点＝文章标题、分组折叠（行尾箭头）、**自动收缩手风琴**（开关 + 手动覆盖，阅读位置滚出子树区间后解除）、**全部展开/收起**、**阅读进度百分比**、scrollspy（活动项染色 + 活动链连线染色 + 自动滚入面板可视区）、**思维导图弹窗**（滚轮以光标为锚点缩放、拖拽平移、重置、全屏，markmap 同款共享主干连线，悬停整条链高亮）、工具按钮 tooltip。

差异说明：面板放在右侧栏内（容器自身 sticky），因此不含参考实现「fixed 贴正文右缘 + 面板底边触正文卡底后随文档滚走」的停靠逻辑，宽度填满侧栏而不是固定 18rem。图标沿用参考站的 `mingcute` / `ri`（为此新增 `@iconify-json/mingcute`、`@iconify-json/ri` 两个 devDependency）。

**性能修复**（打开思维导图原本要 1.2 秒）：

- 根因是连线绘制的**布局抖动**：原来是「读一个圆点坐标 → 建一条 path → 再读下一个坐标」，而写 path 会让布局失效，于是每次 `getBoundingClientRect()` 都触发一轮完整的同步布局。本项目页面元素约 1.3 万个，单轮布局很贵，24 个节点就吃掉 446ms。
- 改为**坐标一次读完再批量写 path**（`drawLines` 与 `drawMindmapLines` 都是），滚轮缩放**按帧合并**（em 缩放要重排整棵树，一帧内做多次纯属浪费），并给导图面板加 `contain: layout paint style` 把重排圈在面板内。
- 实测：打开耗时 1528ms → 539ms（其中 `getBoundingClientRect` 446ms → 20.6ms，长任务消失），第二次打开 177ms。

### 三、左侧栏「全部文章」关闭

按站长要求，`sidebarConfig` 里的 `postDirectory`（左侧栏「全部文章」全站文章目录）改为 `enable: false`，任何页面都不再显示；配置保留便于日后恢复。

### 四、新增 i18n 键

`tocExpandAll` / `tocCollapseAll` / `readingProgress` / `tocAccordionAuto` / `tocMindMap` / `tocMindMapZoomIn` / `tocMindMapZoomOut` / `tocMindMapReset` / `tocMindMapFullscreen`，已同步 5 个语言文件（zh_CN / en / ja / ru / zh_TW）。

> 验证：`pnpm check` 0 错误；浏览器实测——面板组三个面板结构、灰底、封面图与过期提示（2026-03-01 的文章显示「距今已过 211 天」）正常；新目录渲染根节点 + 24 节点、工具栏 3 个按钮（自动手风琴/展开收起/思维导图）、活动链青色连线、悬停链、进度随滚动更新（10%）、点击跳转写 hash、导图 24 胶囊 + 23 条连线且缩放/重置/关闭正常、Swup 切到另一篇文章后面板重建（29 节点、3 按钮）。
