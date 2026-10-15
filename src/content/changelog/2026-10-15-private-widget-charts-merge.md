---
version: "v1.65.0"
date: 2026-10-15
time: "12:30"
type: feature
description: 私密内容融合扩展到统计图表组件：站点/归档热力图、标签图谱、分类玫瑰图、文章目录、日历登录后并入私密条目
---

## 私密内容融合扩展到图表统计组件

登录后私密条目自动并入各统计与图表组件，登出即回退公开基线，统一走 `window.__fireflyPrivateMetaStore`（subscribe + getStats）合并。

- **站点热力图**：`SiteHeatmap` 登录后把私密文章发布日期叠加进最近 20 周格子（level/title/「篇更新」「天活跃」重算），`data-count` 恒为公开基线保证幂等（`src/components/widget/SiteHeatmap.astro`）。
- **归档热力图**：`ArchiveHeatmap` 单元格补充 `data-date/data-count/data-visible`，登录后按私密日期叠加计数并按新最大值重算 level（`src/components/widget/ArchiveHeatmap.astro`）。
- **标签图谱**：`TagGraph` 登录后用私密文章标签重建节点/共现边并入图谱，新增 `window.__fireflyRerenderTagGraph` 重渲染入口（`src/components/widget/TagGraph.astro`）。
- **分类玫瑰图**：`CategoryRose` 登录后私密分类并入 ECharts 数据与右侧列表/总数，私密独有分类无跳转链接（`src/components/widget/CategoryRose.astro`）。
- **文章目录**：`PostDirectoryList` 登录后以「私密」文件夹注入私密文章树（手风琴/展开逻辑复用），登出自动移除（`src/components/widget/PostDirectoryList.astro`）。
- **日历**：`Calendar` 登录后私密文章并入日期格与文章列表，链接指向 `/private/<slug>/`（`src/components/widget/Calendar.astro`）。
- **侧栏统计**：`SiteStats/PortalStats/LifeStats` 登录后叠加文章/动态/记录/分类/标签/足迹计数与最近活动日期（上一阶段随本功能分支一并提交）。
- **详情页渲染统一**：`/private/[...slug].astro` 复用公开文章页骨架（post-hero 标题/Meta + `.markdown-content` 正文卡 + 右侧 TOC 浮层），正文注入后派发 `swup:content:replaced` 重建目录。
