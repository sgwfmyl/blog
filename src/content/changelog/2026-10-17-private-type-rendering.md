---
version: "v1.64.0"
date: 2026-10-17
time: "14:10"
type: feature
description: 私密内容按 type 分派渲染（post/bangumi 专属视图）
---

## 私密内容按类型渲染（阶段 6）

私密详情页不再一刀切走 post 骨架，改为按 `type` 分派专属渲染。

### 详情页按 type 分派

- 预渲染脚本改用 gray-matter 解析 frontmatter，随正文写入 KV（`private:html:<slug>` 增加 `frontmatter` 字段），供运行时分派渲染读取 type 专属字段。
- `PrivatePostView.astro` 按 `item.type` 分派：`post` 走 post-hero + 可选简介/封面；`bangumi` 走番剧详情骨架（分类/状态/评分/标签 + 封面 banner）。
- 新增 `PrivateBangumiView.astro`。frontmatter 契约：bangumi 需补 `image`（封面，绝对 URL）/`category`（book|anime|game）/`score`/`status`（可选 `name_cn`）；post 可补 `description`/`image`。

### 变更文件

- 新增：`src/components/security/PrivateBangumiView.astro`
- 修改：`src/components/security/PrivatePostView.astro`（按 type 分派）、`src/utils/private-contract.ts`（frontmatter 字段 + biome-ignore）、`scripts/私有预渲染/index.ts`（gray-matter）
