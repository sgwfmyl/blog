# lh的博客

个人生活留存博客，Fork 自 [Firefly](https://github.com/CuteLeaf/Firefly) 主题模板并深度定制。

- ️ 在线站点：**[blog.5484826.xyz](https://blog.5484826.xyz)**
- ⚙️ 文章后台：自托管 **PagesCMS**（`cms.5484826.xyz`，配置见根目录 `.pages.yml`，字段需与 `src/content.config.ts` 的 zod 对齐）

## 技术栈

- **Astro 7** + **Tailwind CSS v4** + **Svelte 5** + **TypeScript 5.9**
- **Swup** 页面过渡、**Pagefind** 全文搜索、**Waline** 评论系统
- **Expressive Code** 增强代码块 + **KaTeX** 数学公式
- **Starlight** 二次开发文档（挂载在 `/docs/`，不收录进搜索引擎）

## 特色

- 15 个内容集合（posts / moments / bangumi / life / notebook / album / 友链 / 资源 等），文章分类 = 文件夹路径
- 说说（朋友圈风格）、留言板、番组计划、相册、音乐、书架、影游榜、更新日志等多类型页面
- 亮暗色 / 主题色 / 壁纸模式 / 看板娘 / 樱花特效等高可配置项
- i18n（简中/英文）、RSS、Sitemap、SEO 优化

## 快速开始

要求：**Node >= 22**、**pnpm**（9.14，preinstall 强制）。

```bash
pnpm install   # 安装依赖
pnpm dev       # 开发，http://localhost:4500 （端口固定为 4500）
pnpm build     # 构建到 ./dist （生成图标 → astro build → pagefind 索引）
pnpm preview   # 预览构建产物
pnpm check     # astro check
pnpm type-check  # tsc --noEmit
pnpm new-post   # 新建文章
```

## 部署

生产环境部署在 **Cloudflare Workers Static Assets**（手动流程，push main 不会自动上线）：

```bash
pnpm build && pnpm wrangler deploy
```

本地 dev/build 前需复制 `.env.example` 为 `.env`，缺失 `PUBLIC_*` 变量对应功能会静默降级。详见 [docs/deploy-cloudeflare-workers.md](docs/deploy-cloudeflare-workers.md)。

## 许可协议

本项目遵循 **MIT license**，详见 [LICENSE](./LICENSE)。

## 版权声明

- Copyright (c) 2024 [saicaca](https://github.com/saicaca) - [fuwari](https://github.com/saicaca/fuwari)
- Copyright (c) 2025 [CuteLeaf](https://github.com/CuteLeaf) - [Firefly](https://github.com/CuteLeaf/Firefly)
- Copyright (c) 2026 [lh](https://blog.5484826.xyz) - 个人博客