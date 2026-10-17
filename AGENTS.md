# AGENTS.md

**回复语言：必须全程使用中文回答用户，禁止使用英文**（用户看不懂英文）。

**先读 CLAUDE.md**：本仓库唯一权威工程规范（23 节 §0-22：命令、目录结构、样式/组件规范、i18n、Swup 生命周期、反模式清单、技术栈版本、PagesCMS 后台、更新日志与收尾规范）。所有开发行为必须遵守。修改项目后必须同步更新 CLAUDE.md（第 20 节）。

**勿把 CLAUDE.md 内容复制进本文件**（CLAUDE.md §17 规定 AGENTS.md 只是入口，避免双重维护）。本文件仅保留最高频的启动事实，细节一律以 CLAUDE.md 为准。

## 项目概览

- lh的博客，Fork 自 CuteLeaf/Firefly 并深度定制
- 部署：**生产为 Cloudflare Workers Static Assets**（手动部署：push main 不自动上线，需本地/CI 执行 `pnpm build` + `wrangler deploy` 托管 blog.5484826.xyz，见 `docs/deploy-cloudeflare-workers.md`）；GitHub Actions 的 `build.yml` 仅作 CI 质量门（GitHub Pages 的遗留配置 `.github/workflows/pages.yml` + `public/CNAME` 已于 2026-09-21 删除，不再随 push 触发）；后台 PagesCMS 自托管（cms.5484826.xyz，配置在根目录 `.pages.yml`，字段必须与 `src/content.config.ts` 的 zod 对齐，未声明字段保存时被丢弃）
- 13 个 Astro Content Collections（`src/content.config.ts` + `src/content/`：posts/spec/moments/bangumi/music/life/album/daohang/ziyuan/friends/tombstones/changelog/docs；原 notebooks/apps/bills/schedules 已迁 D1 私有化——「我的」分组整体登录后可见、页面 SSR + 未登录 404，见 CLAUDE.md §3.6，数据同步 `pnpm sync:my`）
- category 写入已废弃（分类=文件夹路径），现只做新建文章的模板属性补全。**改它的规范见该目录的 AGENTS.md**——完成后必须 `pnpm build`+ `pnpm test` + commit & push GitHub&#x20;
- 主要目录：`src/components/`（按功能域 15 子目录：about/analytics/bills/comment/common/controls/features/layout/security/misc/moments/pages/schedules/seo/widget，禁止根目录平铺；security/ 为管理员认证 2026-10-14 新增） / `src/pages/`（40 路由，admin 已删；含 /private/ 私密空间） / `src/styles/main.css`（唯一入口） / `src/config/`（27 配置 + index.ts barrel） / `src/utils/`（44 个工具与控制器，含 category-tree.ts、tts-text.ts、auth-store.ts） / `worker/`（main Worker：/api/* 管理员认证 + 私密内容代理） / `scripts/`（10 个中文命名脚本目录 + cli.js 与 5 个英文 .mjs 脚本，含 TTS服务/ 朗读服务）

## 快速上手

- 包管理器仅限 pnpm 9.14（preinstall 强制）；Node >= 22；主仓库无测试框架（验证 = build + check；Obsidian 插件子仓库例外）
- 本地 dev/build 前先备 `.env`（照抄 `.env.example`）：缺失 `PUBLIC_*` 变量不会报错，但对应功能静默降级（评论无后端、统计空白）
- `pnpm dev` 开发；提交前必跑 `pnpm build`（生成图标 → astro build → pagefind 索引）
- 提交信息格式 `<type>(<scope>): <描述>`（feat|fix|refactor|style|docs|chore|perf，见 CLAUDE.md §18）
- 验证手段 = `pnpm build` + `pnpm check`（astro check）+ `pnpm type-check`（tsc --noEmit --isolatedDeclarations）
- GitHub Actions：build.yml（main/PR）跑 `astro check`（Node 22+23）+ `pnpm build`（Node 22）；biome.yml 跑 `biome ci ./src --reporter=github`；CI 若红优先看 astro check 类型错误
- `pnpm lint` / `pnpm format` = Biome（唯一 linter/formatter，作用域 ./src；CI 自动读 package.json 固定版本 2.5.7，勿在 workflow 里写 `latest`）
- 每完成一个模块/功能：立即写 `src/content/changelog/` 条目（§21，feature→minor、fix→patch 递增 version，勿攒批）+ 按 §22 收尾（清临时脚本、`pnpm exec biome ci ./src --reporter=github` 全绿、浏览器实测关键路径，边界不清就问站长）

## 最易踩坑（详见 CLAUDE.md §15）

- Astro 7 + Svelte 5 + Tailwind v4：无 tailwind.config.js，勿按 Astro 6 / Tailwind 3 文档操作
- 样式必须经 `src/styles/main.css` 导入；禁止新建 `!important`、硬编码 `#000/#fff`、Stylus 文件；暗色选择器统一 `:root.dark`
- Svelte 5 runes：响应式变量（含 DOM ref）必须 `$state`；非 void 标签禁止自闭合
- Swup SPA 导航：容器内组件避免 `client:load`；监听器用 AbortController 清理；跨导航单例用 `window.__xxx` guard（§8-9）
- 新 i18n 键必须同时加进全部 5 个语言文件（§7）
- 新增 Swup 功能禁止改 `swup-lifecycle-controller.ts`，用 `swup:content:replaced` 事件自注册（§11.4）
- 页面交互脚本必须放在 Swup 容器内（MainGridLayout slot 里），否则 SPA 导航进入页面时不执行（§15）
- dev 下组件卡初始状态（"加载中…"、按钮无反应）先查浏览器控制台是否报 `504 Outdated Optimize Dep`：删 `node_modules/.vite` 重启 dev（§15）
- 禁止用 Python 脚本操作/修改文件，一律用 Node 脚本（§15）

