---
version: "v1.65.2"
date: 2026-10-15
time: "17:10"
type: feature
description: 私密仓库支持同路径内容镜像，登录后可按公开 URL 动态加载并复用文章页排版
---

## 私密内容同路径镜像

- **同路径访问**：私有仓库新增 `private/routes.json` 路由清单，可把公开 URL 映射到私有仓库中同样的 `src/content/...` Markdown；登录后直接访问对应文章路径，无需先进入 `/private/`（`worker/index.ts`）。
- **安全壳与缓存**：Worker 在服务端查询并缓存清单与正文，命中私密路径时只返回不含内容的 `noindex` 页面壳；管理员确认身份后才请求受保护正文，游客不会得到标题、映射或 Markdown（`src/pages/private/[...slug].astro`）。
- **内容兼容**：私密 Markdown 可保留公开 Content Collection 的 YAML frontmatter；动态渲染会自动剥离该段并复用公开文章的标题、正文、目录及主题排版（`src/utils/private-renderer.ts`）。
