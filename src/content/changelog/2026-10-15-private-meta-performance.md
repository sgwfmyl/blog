---
version: "v1.65.1"
date: 2026-10-15
time: "16:20"
type: fix
description: 私密数据展示性能优化：localStorage 缓存秒出 + 数据指纹去重，避免刷新延迟与组件重复重绘卡顿
---

## 私密数据展示性能优化

优化登录后私密数据出现的等待时间与页面刷新时的卡顿体验。

- **本地缓存秒出**：`private-meta-store` 新增 localStorage stale-while-revalidate 缓存（TTL 60s，键 `firefly:private-meta:v1`）。管理员确认登录后先同步恢复缓存数据立即渲染，再后台拉取最新并更新；缓存仅在 auth 确认管理员时读取，游客不接触缓存、不发起私密请求，避免残留标题泄露（`src/utils/private-meta-store.ts`）。
- **指纹去重**：store 数据变化才通知订阅者（`notifyIfChanged`），相同数据不再触发组件重绘；401/数据异常时清缓存降级为公开基线，网络异常时保留缓存兜底。
- **文章目录**：`PostDirectoryList` 以 slug/title/date 指纹判断私密数据是否变化，未变化时跳过移除+重建+重绑手风琴，避免刷新时展开状态被重置（`src/components/widget/PostDirectoryList.astro`）。
- **分类玫瑰图**：`CategoryRose` 合并数据 JSON 未变化时跳过列表重建与 `chart.setOption`（`src/components/widget/CategoryRose.astro`）。
- **标签图谱**：`TagGraph` 图谱数据未变化时跳过 `data-graph` 更新与图谱销毁重建（`src/components/widget/TagGraph.astro`）。
