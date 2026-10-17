---
version: "v1.67.0"
date: 2026-10-17
time: "22:40"
type: feature
description: 书籍 / 影视游戏 / 分类页登录后合并私有库条目——三类页面 SSR 化，登录态从 KV 读取私有条目并入列表
---

## 书籍 / 影视游戏 / 分类页登录后合并私有条目

延续归档页的「登录后合并私有」范式，把书籍（`/books/`）、影视游戏（`/movies-games/`）、分类（`/categories/` + 详情）三个公开页面改为服务端渲染，登录后自动把私有仓库里对应类型的条目合并进列表展示。未登录访客看到的仍是原有公开内容。

### 三页 SSR 化 + 登录态合并

- 四个页面改 `prerender = false`：`src/pages/books/index.astro`、`src/pages/movies-games/index.astro`、`src/pages/categories.astro`、`src/pages/categories/[...category].astro`。
- 鉴权沿用 `verifySession`，响应头统一 `Cache-Control: private, no-store` + `Vary: Cookie` + `X-Robots-Tag: noindex, nofollow`（对齐归档页）。
- 未登录不读 KV、只渲染公开内容；登录后合并私有条目（`isAdmin ? await getPrivateXxxFromKV() : []`）。

### 私有数据读取（`src/utils/private-source.ts`）

- 新增 `getPrivateBangumiFromKV()`：读私有 `type=bangumi` 条目完整展示字段（封面 / 评分 / 状态 / 子分类 / 短评），供书籍、影视游戏页用。
- 新增 `getPrivatePostsFromKV()`：读私有 `type=post` 条目（标题 / 日期 / 标签 / 分类 / 简介 / 封面），供分类页用。
- 展示字段来自 KV 正文的 `frontmatter`（`private:html:<slug>`），与公开 `bangumi` / `posts` schema 对齐；`private:meta` 只有摘要字段，故逐条读 frontmatter。
- 私有条目点击跳转 `item.route ?? /private/<slug>/`，由现有 `PrivatePostView` / `PrivateBangumiView` 渲染，详情页零改动。

### 各页合并逻辑

- **书籍**：私有 `category=book` 条目并入书架，分类 tab 归入「私密」，状态 / 评分 / 封面与公开书同构。
- **影视游戏**：私有 `anime` / `game` 条目映射为同一 `MgItem` 结构（`private: true`），参与左栏筛选与日历。
- **分类列表**：`getCategoryList` / `getCategoryTree` 接受可选私有条目参数（`category` 字段直接给定、含多级前缀链），向后兼容——侧栏 / 导航等构建期组件仍不传参、只读公开。
- **分类详情**：原 `getStaticPaths` 静态生成改为 SSR 动态路由；登录后按 `category` 过滤私有 post 并入文章列表；未登录访问纯私有分类（或不存在分类）统一 404。

### 涉及文件

- `src/utils/private-source.ts`（新增读取函数）
- `src/utils/category-tree.ts`（`buildCategoryTree` 支持 `category?` 字段）
- `src/utils/content-utils.ts`（`getCategoryList` / `getCategoryTree` 可选私有参数）
- `src/pages/books/index.astro`、`src/pages/movies-games/index.astro`、`src/pages/categories.astro`、`src/pages/categories/[...category].astro`
