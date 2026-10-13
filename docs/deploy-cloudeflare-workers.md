# Cloudflare Workers 部署指南（Workers Static Assets）

> 博客生产部署方案：**Cloudflare Workers Static Assets**。本地/CI 执行 `pnpm build` 产出 `dist/`，再用 `wrangler deploy` 把静态资源上传到 Workers 边缘托管，线上地址 `https://blog.5484826.xyz/`。
> 本文档是操作手册（2026-10 由 EdgeOne Pages 手册改写而来，EdgeOne 迁移记录见第四节）。

## 一、部署架构

```text
本地（或 CI）：
    1. 准备 .env（13+ 个构建期 PUBLIC_* 变量）
    2. pnpm build → dist/（生成图标 → astro build → pagefind）
    3. wrangler deploy（上传 dist/ 为 Workers 静态资源）
        ↓
Cloudflare Workers Static Assets（wrangler.toml 的 assets.directory 指向 dist/）
    ↓ 自定义域名绑定（blog.5484826.xyz）
用户浏览器
```

- **构建与托管分离**：Astro 是构建期静态生成（`import.meta.env.PUBLIC_*` 在构建时注入），所以必须先构建再上传；Workers 运行时只是把 `dist/` 作为静态资源分发，不参与渲染
- **无自动构建**：push main 不会自动触发上线。每次内容/代码更新后，需手动（或自建 CI）重新 `pnpm build` + `wrangler deploy`——这是与旧 EdgeOne Pages 集成最大的区别
- 边缘分发：Workers 本身即全球边缘网络，无需额外 CDN 层
- GitHub Actions 的 `build.yml` 仍保留作 CI 质量门（`astro check` + `pnpm build`，与线上构建一致）
- 后台 PagesCMS 独立部署在 Vercel（`cms.5484826.xyz`），只写 git 仓库，与博客托管无关（见 `deploy-pagescms-vercel.md`）

## 二、前置准备（首次一次性）

### 1. 环境

- Node.js ≥ 22（与 `build.yml` 的 CI 一致）
- Cloudflare 账号；博客域名 `5484826.xyz`（或其子域 `blog.5484826.xyz`）已接入 Cloudflare DNS（Workers 自定义域要求域名由 Cloudflare 托管，见第三节）

### 2. 安装 wrangler 并登录

```bash
pnpm add -D wrangler        # 或 pnpm dlx wrangler 直接调用
wrangler login              # 浏览器 OAuth 授权本机
```

CI/自动化的替代认证：在 Cloudflare Dashboard → My Profile → API Tokens 创建 `Edit Cloudflare Workers` 权限的 Token，写入环境变量 `CLOUDFLARE_API_TOKEN`（+ `CLOUDFLARE_ACCOUNT_ID`）。

### 3. wrangler 配置（仓库根目录新建 `wrangler.toml`）

```toml
name = "blog"                         # Workers 项目名（全局唯一）
main = "src/worker.js"                # 可选：无边缘逻辑可整段省略（纯静态 assets）
compatibility_date = "2026-10-13"

[assets]
directory = "./dist"                  # pnpm build 的产物目录
not_found_handling = "404-page"     # 使用 Astro 自研的 dist/404.html（wrangler 4.x 合法值，旧值 "404.html" 已不被识别）
```

> 本项目 `trailingSlash: "always"`，产物是 `xxx/index.html` 结构；Workers 静态资产对 `/xxx/` 请求自动命中 `xxx/index.html`，天然兼容，无需 SPA 回退。
> 纯静态时可不写 `main`（wrangler.toml 只有 name + assets 即可）；日后若需边缘逻辑（重定向、自定义响应头），再补 `main` + `src/worker.js`。
> 如需安全响应头/重定向规则，可把 `_headers`、`_redirects` 文件放进 `dist/` 根目录随构建产物一起上传，Workers 静态资产会像 Pages 一样自动识别。

## 三、环境变量（构建期注入，非运行时）

这些是 **Astro 构建期变量**（代码里 `import.meta.env.PUBLIC_*`，构建时被替换进产物），必须在 `pnpm build` 时存在。**不要**把它们配成 Workers 的 runtime secrets——Workers 运行时对已经静态化输出的页面不起作用：

- 本地构建：照抄 `.env.example` 生成 `.env` 填齐（已 gitignore，不会误提交）
- CI 构建：放到 GitHub 仓库 **Settings → Secrets and variables → Actions**

| 变量名                             | 用途                                            |
| ------------------------------- | --------------------------------------------- |
| `PUBLIC_AMAP_KEY`               | 高德地图                                          |
| `PUBLIC_AMAP_KEY_PLACES`        | 高德地点                                          |
| `PUBLIC_UMAMI_BASE`             | Umami 统计地址                                    |
| `PUBLIC_UMAMI_USERNAME`         | Umami 服务端代理账号                                 |
| `PUBLIC_UMAMI_PASSWORD`         | Umami 服务端代理密码                                 |
| `PUBLIC_UMAMI_WEBSITE_ID`       | Umami 站点 ID                                   |
| `PUBLIC_UMAMI_SHARE_ID`         | Umami 分享 ID（首页统计 fallback）                    |
| `PUBLIC_WALINE_SERVER`          | Waline 评论后端地址                                 |
| `PUBLIC_IMAGEBED_URL`           | 图床地址                                          |
| `PUBLIC_IMAGEBED_AUTH_CODE`     | 图床上传鉴权码                                       |
| `PUBLIC_IMAGEBED_CHANNEL`       | 留言图片上传渠道（telegram/cfr2/huggingface 等），空则用图床默认 |
| `PUBLIC_IMAGEBED_CHANNEL_NAME`  | 渠道名称（多渠道场景），空则不传                              |
| `PUBLIC_IMAGEBED_UPLOAD_FOLDER` | 留言图片上传目录，空则传根目录                               |
| `PUBLIC_IMAGEBED_API_TOKEN`     | 图床 API Token                                  |
| `PUBLIC_TTS_SERVER`             | 文章朗读 TTS 服务地址，留空降级浏览器系统语音                     |

> 缺失任何变量构建仍会成功，但对应功能静默降级（评论无后端、统计空白），务必逐项核对。

## 四、构建与部署

### 1. 构建

```bash
pnpm build        # 内部 = node scripts/生成图标/index.js → astro build → pagefind --site dist
```

### 2. 本地预览产物（可选）

```bash
pnpm preview      # astro preview，验证 dist/ 行为（尾斜杠路由、404、pagefind 搜索）
```

### 3. 部署

```bash
wrangler deploy   # 上传 dist/ → 自动分配 *.workers.dev 子域，用预览域验证
wrangler deployments list   # 查看历史部署
```

### 4. 首次部署验证清单

用分配的 workers.dev 预览域名（非正式域名）验证关键路径：

- 首页渲染、Swup 导航、主题切换
- 文章页、分类页、归档页
- 账单 `/bills/`、笔记本 `/life/notebooks/`、日程 `/schedules/`（内容直接展示）
- `/search/`（pagefind）、`sitemap.xml`、`robots.txt`、RSS
- 评论 / 首页统计 / 音乐 / 相册 / 朋友圈 /circle/ / 友链状态徽标
- 404 页、`trailingSlash` 尾斜杠路由

## 五、域名绑定与切换（零宕机）

Workers **自定义域名**要求域名的 DNS 由 Cloudflare 托管（即 `5484826.xyz` 的 NS 指向 Cloudflare）。若当前 NS 不在 Cloudflare：

1. Cloudflare Dashboard → Add a site 添加 `5484826.xyz`，按指引在域名注册商处把 NS 改为 Cloudflare 分配的两个地址，等待生效
2. Cloudflare Dashboard → Workers & Pages → 进入本项目 → Settings → Domains → 添加 `blog.5484826.xyz`，等待证书签发与校验（自动，一般分钟级）
3. 验证：`nslookup blog.5484826.xyz` 确认解析指向 Cloudflare，浏览器实测关键路径，观察 1-2 天

## 六、迁移记录

- **2026-09-04**：GitHub Pages → **EdgeOne Pages**（GitHub 集成自动构建托管；`pages.yml` 与 `public/CNAME` 于 2026-09-21 补删）
- **2026-10**：EdgeOne Pages → **Cloudflare Workers Static Assets**（本手册改写；手动/CI 构建上传，不再自动随 push 构建）

注意事项：

- 友链状态检测每日 5:17 自动 commit `public/friends-status.json`、友链截图在 friends 内容变化时自动提交，只会触发 GitHub Actions，**不会自动上线**；上线需重新 `pnpm build` + `wrangler deploy`
- PagesCMS 后台在后台编辑保存同样 push main，属正常；同样需手动部署才生效
- 回滚：`wrangler rollback` 回退到上一个部署版本（秒级）；或本地重新构建后 `wrangler deploy`

## 七、常见问题

| 问题              | 排查                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 构建失败            | 先看 Node 版本是否 ≥ 22、pnpm 是否 9.14.x、构建命令是否为 `pnpm build`；与 `build.yml` 的 CI 行为对照                                                                              |
| 功能静默缺失（评论/统计空白） | 检查构建时 `.env` / CI secrets 是否逐项填齐（见第三节表）；确认不是配到了 Workers runtime 而非构建期                                                                                      |
| 上线了但线上没变化       | Workers 无自动构建：确认执行了 `wrangler deploy` 且成功（`wrangler deployments list` 看最新一次）                                                                               |
| 需要换域名           | 改 `src/config/siteConfig.ts` 的 `site_url`（sitemap/robots/RSS/canonical 自动跟随）+ Dashboard 重新绑定域名；注意 `src/config/musicConfig.ts` 等硬编码的 `*.5484826.xyz` 子域不受影响 |
| 404 页不生效        | 确认 `wrangler.toml` 里 `[assets] not_found_handling = "404-page"`（Astro 自研 404 页输出为 `dist/404.html`，wrangler 4.x 不再识别 `"404.html"` 这个旧取值）                    |

