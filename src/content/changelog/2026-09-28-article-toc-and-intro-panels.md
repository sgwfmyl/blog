---
version: "v1.44.0"
date: 2026-09-28
time: "19:40"
type: feature
description: 文章页新增信息面板组（过期提示/AI摘要/封面图），右侧文章目录换成带进度与折叠的新版
---

## 文章页信息面板组 + 新版文章目录

复刻参考博客（MMZMING）文章详情页的两个区块。

### 一、信息面板组（标题下方）

原来那张单张「AI 摘要」卡，升级为**三个可折叠面板共用一张浅灰卡**（`post-intro-card`，结构在 `src/pages/posts/[...slug].astro`，样式在 `post-hero.css`）：

- **① 过期提示**：`最后更新于 YYYY-MM-DD，距今已过 N 天，部分内容可能已过时`。服务端只输出骨架（ISO 日期 + 阈值），客户端按当前日期算天数；没超过 `siteConfig.outdatedThreshold`（30 天）时整行连带下方分隔线一起隐藏。此前这张卡在正文之后，现已迁到标题下方（正文后不再重复显示）。
- **② AI 摘要**：内容即 frontmatter 的 `description`（参考站也是这个字段，并没有真的调用 AI，模型名是写死的），用原生 `<details>` 展开/收起，箭头 0.2s 旋转。
- **③ 封面图**：把文章封面收进可折叠面板（此前详情页根本不显示封面），展开后最大高度 480px（≥768px 为 560px）。
- 三个面板的底板用新变量 `--intro-surface-bg`（亮 `oklch(0.965 0 0)` / 暗 `oklch(0.14 0 0)`）——项目的 `--card-bg` 是 transparent（极简风），不能直接复用。

### 二、右侧文章目录（替换旧版）

- 旧实现（`tocUtils.ts` 的 `TOCManager` 往 `#sidebar-toc-content` 写扁平列表）已从侧栏停用，换成参照参考博客重写的新面板：`src/components/widget/SidebarTOC.astro`（骨架）+ `src/utils/article-toc.ts`（控制器）+ `src/styles/features/article-toc-panel.css`（样式）。
- 新能力：**根节点显示文章标题**、圆点 + 连接线 + 按层级缩进的树形结构、**分组折叠**（行尾箭头 + 「全部展开/收起」按钮）、**阅读进度百分比**、scrollspy 高亮（活动链连线染色）+ 活动项自动滚入面板可视区、点击平滑滚动并写 hash。
- 连接线改成 CSS 伪元素（画在每行行盒内部），折叠动画期间无需 JS 重画、滚动也没有 SVG 测量开销；裁剪掉了参考项目的 fixed 停靠、思维导图弹窗与自动收缩手风琴。
- 面板放在右侧栏内（容器自身 sticky），不需要 fixed 定位。
- 旧 `tocUtils.ts` 仍被移动端 dock 的目录抽屉复用，**未删除**。

### 三、新增 i18n 键

`tocExpandAll` / `tocCollapseAll` / `readingProgress`，已同步 5 个语言文件（zh_CN / en / ja / ru / zh_TW）。

> 验证：`pnpm check` 0 错误、构建通过；浏览器实测——面板组三个面板结构、灰底、封面图与过期提示（2026-03-01 的文章显示「距今已过 211 天」）均正常；新目录渲染出根节点 + 24 个节点 + 4 个折叠箭头，滚动到 2500px 时进度 8%、活动项跟随、活动链 3 个节点，旧容器无残留。
