---
version: "v1.64.0"
date: 2026-10-15
time: "12:00"
type: feature
description: 私密内容全面融合公开视图：登录后私密条目自然出现在归档、最近更新、分类与标签中
---

## 私密内容与公开内容融合

- **统一元数据源**：私有仓库新增 `private/meta.json`（`[{slug,type,title,date,tags,category?,url?}]`），Worker 新增 `/api/private/meta` 认证端点返回全部私密条目元数据，正文仍按需经 `/api/private/pages/<slug>` 拉取，内容不进部署产物（`worker/index.ts`）。
- **路径式 slug**：私密详情标识支持子目录路径（如 `私密/观影记录`），对应 `private/pages/<slug>.md`，`/private/<slug>/` 打开即渲染；Worker 放宽 slug 校验（含中文/斜杠，仍拦截 `..` 路径穿越）（`src/pages/private/[...slug].astro`）。
- **私密元数据 store**：新增 `src/utils/private-meta-store.ts`（与 auth-store 同构的 pub-sub 单例），内部订阅登录态——登录自动拉取 meta、退出自动清空，`window.__fireflyPrivateMetaStore` 门面供内联脚本读取。
- **归档页融合**：`/archive/` 的 ArchivePanel 登录后把私密条目并入统一筛选/分组/排序（年份、类型 Tab、分类、标签过滤全部生效），私密条目显示「密」徽标（`src/components/controls/ArchivePanel.svelte`）。
- **最近更新融合**：侧边栏「最近更新」改为客户端渲染（`RecentItemsList.svelte`），登录后私密条目按日期并入 Top10，徽标显示「私密」。
- **分类/标签融合**：侧边栏分类（`CategoriesList.svelte`）与标签（`TagsList.svelte`）登录后合并私密分类/标签计数；私密分类链接指向归档页筛选（`/archive/?category=xx`），与归档页的私密条目联动。
- **分类树融合**：分类页文件夹视图（`CategoryFoldersTree.svelte`）登录后按私密条目 category 重建私密分类树注入，私密节点主色显示并带「密」徽标。
- **数据约定**：私密条目的 `category` 建议使用与公开分类不冲突的独立命名（如「私密」），避免同名分类计数混淆。
