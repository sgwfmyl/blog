# Cloudflare Workers 部署指南（Workers Static Assets）

> 博客生产部署方案：**Cloudflare Workers Static Assets**。日常由 GitHub Actions 自动部署：push main/`lh` 分支 → `pnpm build` 产出 `dist/` → `wrangler deploy` 上传到 Workers 边缘托管，线上地址 `https://blog.5484826.xyz/`。
> 本文档是操作手册（2026-10 由 EdgeOne Pages 手册改写而来，EdgeOne 迁移记录见第四节）。

## 一、部署架构

```text
GitHub Actions（.github/workflows/deploy.yml，push 分支自动触发）：
    1. 读取仓库 Actions Secrets（构建期 PUBLIC_* 变量，见第三节）
    2. pnpm build → dist/（生成图标 → astro build → pagefind）
    3. pnpm prerender:private（拉私有仓库 markdown → 渲染 → 写 KV，见「私有内容预渲染」节）
    4. wrangler deploy（用 CLOUDFLARE_API_TOKEN 上传 dist/ 为 Workers 静态资源）
        ↓
Cloudflare Workers Static Assets（wrangler.toml 的 assets.directory 指向 dist/）
    ↓ 自定义域名绑定（blog.5484826.xyz）
用户浏览器
```

- **自动部署**：push 到 `lh` 分支自动触发构建+上线，无需手动 `wrangler deploy`（流程见 `.github/workflows/deploy.yml`）
- **构建与托管分离**：Astro 是构建期静态生成（`import.meta.env.PUBLIC_*` 在构建时注入），所以必须先构建再上传；Workers 运行时只是把 `dist/` 作为静态资源分发，不参与渲染
- **私有内容 SSG 预渲染**：私有文章在构建期渲染成 HTML 写入 KV（`private:html:<slug>` + `private:meta`），运行时（SSR 路由）只做 D1 鉴权 + 读 KV，见「私有内容预渲染」节
- 边缘分发：Workers 本身即全球边缘网络，无需额外 CDN 层
- GitHub Actions 的 `build.yml` 仍保留作 CI 质量门（`astro check` + `pnpm build`，与线上构建一致）；`biome.yml` 作代码质量门
- 手动回滚/临时部署仍可用本地 `wrangler deploy` 或 `wrangler rollback`（见第四节）
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
binding = "ASSETS"                    # 必须显式声明，否则 Worker 内 env.ASSETS 为 undefined（详情见下方坑点）
not_found_handling = "404-page"     # 使用 Astro 自研的 dist/404.html（wrangler 4.x 合法值，旧值 "404.html" 已不被识别）
```

> 本项目 `trailingSlash: "always"`，产物是 `xxx/index.html` 结构；Workers 静态资产对 `/xxx/` 请求自动命中 `xxx/index.html`，天然兼容，无需 SPA 回退。
> 纯静态时可不写 `main`（wrangler.toml 只有 name + assets 即可）；日后若需边缘逻辑（重定向、自定义响应头），再补 `main` + `src/worker.js`。
> 如需安全响应头/重定向规则，可把 `_headers`、`_redirects` 文件放进 `dist/` 根目录随构建产物一起上传，Workers 静态资产会像 Pages 一样自动识别。

## 三、环境变量（构建期注入，非运行时）

这些是 **Astro 构建期变量**（代码里 `import.meta.env.PUBLIC_*`，构建时被替换进产物），必须在 `pnpm build` 时存在。**不要**把它们配成 Workers 的 runtime secrets——Workers 运行时对已经静态化输出的页面不起作用：

- 本地构建：照抄 `.env.example` 生成 `.env` 填齐（已 gitignore，不会误提交）
- CI 构建（自动部署）：放到 GitHub 仓库 **Settings → Secrets and variables → Actions**。除下表构建期变量外，还需两个部署凭据：

  | Secret 名 | 用途 |
  |---|---|
  | `CLOUDFLARE_API_TOKEN` | Cloudflare（Dashboard → My Profile → API Tokens），`wrangler deploy` 与 `wrangler kv key put --remote` 认证。**权限须含 `Workers KV Storage: Edit`**（私有内容预渲染写 KV 需要），仅有 `Workers Scripts: Edit` 会在预渲染步骤报 403 |
  | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers & Pages 页面右侧的 Account ID |
  | `GH_PAT` | 访问私有内容仓库的 GitHub Personal Access Token（`repo` 权限），私有内容预渲染拉取 markdown 用 |
  | `GH_OWNER` | 私有内容仓库 owner（本仓库为 `sgwfmyl`） |
  | `GH_REPO` | 私有内容仓库名（本仓库为 `blog-private`） |

  > 修改变量值时，`.env` 与 GitHub Secrets **需两处同步改**，否则线上仍用旧值（CI 是独立于本地的数据源）。

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

### 2. 私有内容预渲染（SSG 方案）

私有文章在**构建期**渲染成 HTML 写入 KV，运行时（`/private/`、映射路由）只做 D1 鉴权 + 读 KV。这一步由 `deploy.yml` 在 `pnpm build` 之后、`wrangler deploy` 之前自动执行：

```bash
pnpm prerender:private    # tsx scripts/私有预渲染/index.ts
```

脚本职责：拉私有仓库 `private/meta.json` + 各 `private/pages/<slug>.md` → 完整管线渲染（shiki 高亮 + katex + callouts）→ sanitize-html 白名单清洗 → 写 KV（`private:html:<slug>` + `private:meta`）。

- **依赖环境变量**：`GH_PAT`/`GH_OWNER`/`GH_REPO`（拉私有仓库）+ `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`（写 KV）
- **fail-fast**：写 KV 失败会 `exit 1` 阻止部署，避免「meta 已删除但 KV 未同步」导致已删私有内容仍可访问
- **本地验证**：设 `KV_MODE=local` 写本地模拟 KV（配合 `wrangler dev` 本地验证），默认 `--remote` 写线上

### 3. 本地预览产物（可选）

```bash
pnpm preview      # astro preview，验证 dist/ 行为（尾斜杠路由、404、pagefind 搜索）
```

### 4. 部署

**方式一：自动部署（日常，推荐）**

push 到 `lh` 分支即触发 GitHub Actions（`.github/workflows/deploy.yml`）自动 `pnpm build` + `wrangler deploy`，无需本地操作。查看与回滚：

```bash
wrangler deployments list          # 查看历史部署
wrangler rollback                  # 线上回滚到上一个部署版本（秒级）
```

**方式二：手动部署（本地/CI，备用）**

```bash
wrangler deploy   # 用 .env 本地构建后上传 → 自动分配 *.workers.dev 子域，用预览域验证
```

> 注意：本地手动部署用的是 `.env` 变量，自动部署用的是 GitHub Secrets——两者需保持一致，避免线上线下行为差异。

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
- **2026-10**：EdgeOne Pages → **Cloudflare Workers Static Assets**（本手册改写；先手动部署，后启用 GitHub Actions 自动部署）

注意事项：

- 友链状态检测每日 5:17 自动 commit `public/friends-status.json`、友链截图在 friends 内容变化时自动提交，会触发 GitHub Actions + **自动上线**（push 到 `lh` 即触发 `deploy.yml`）
- PagesCMS 后台在后台编辑保存也会 push main/lh，属正常；同样会自动上线
- 回滚：`wrangler rollback` 回退到上一个部署版本（秒级）；或本地重新构建后 `wrangler deploy`
- 若审计/定格需求不想某次改动立刻上线，可在 GitHub Actions → `deploy.yml` → Run workflow 手动控制，或临时暂停该 workflow

## 七、运行时 Worker Secrets / KV / 私密内容源（管理员认证模块，2026-10-14 新增）

站点现有一个 main Worker（`worker/index.ts`）：路径以 `/api/` 开头走认证 / 私密内容 API，其余路径 `env.ASSETS.fetch()` 回退托管静态产物（现有公开页面行为零改变）。

### 1. 运行时 Secrets（配到 Worker，非构建期变量）

这些是 **Worker 运行时**读取的密钥。**不要**放进第三节的构建期变量表、也不要配成构建环境变量——静态页面在构建时就定稿，运行时 Secret 只对 `/api/*` 请求生效：

| Secret        | 用途                                                          |
| ------------- | ----------------------------------------------------------- |
| `ADMIN_PASSWORD` | 管理员登录密码（仅密码登录）                                              |
| `AUTH_SECRET` | Cookie HMAC 签名密钥（随机 ≥32 字节，生成一次永久保存，更换后全部会话失效）               |
| `GH_PAT`      | GitHub 私有仓库只读 fine-grained PAT（仅授予内容仓库 Contents 读取权限）          |
| `GH_OWNER`    | 私有仓库归属，如 `sgwfmyl`                                          |
| `GH_REPO`     | 私有仓库名，如 `blog-private`                                     |

配置位置：
- **线上**：GitHub 仓库 Settings → Secrets 新增同名 5 项，`deploy.yml` 的 wrangler-action `secrets` 输入 + `env` 已声明自动注入；也可在 Cloudflare Dashboard → Workers → blog → Settings → Variables and Secrets 手工配置
- **本地调试**：复制 `.dev.vars.example` 为 `.dev.vars`（已 gitignore，不会误提交）填入

### 2. KV Namespace（登录限流 + 私密内容缓存）

`wrangler.toml` 已声明 `[[kv_namespaces]] binding = "ADMIN_KV"`。首次部署前创建并回填 id：

```bash
pnpm wrangler kv namespace create ADMIN_KV   # 输出 {"id": "..."}，填入 wrangler.toml
```

用途：登录失败限流（按客户端 IP 计数，连续 5 次失败冷却 30s）+ GitHub 内容缓存（TTL 300s，规避 GitHub API 限流）。

### 3. GitHub 私有仓库内容源

隐藏内容存放在**私有仓库**（如 `blog-private`），**绝不能放进博客公开仓库**（否则等于公开）。仓库内结构：

```text
private/
├── nav.json            # 隐藏导航条目（数组，字段对齐 daohang：name/url/icon/description/tags/category）
├── meta.json            # 可选：登录后合并归档/统计视图的私密元数据
├── pages/index.json    # 私密文章索引 [{slug, title, date}]
└── pages/<slug>.md     # 私密文章（frontmatter title/date/description + markdown 正文）
```

Worker 用 `GH_PAT` 通过 GitHub Contents API 按需拉取；`/api/private/*` 未登录一律 401，前端游客态也不发请求——隐藏内容永远不出现在部署产物与抓包结果中。

### 3.1 同路径私密镜像（推荐）

若希望私密内容的 URL、目录与放在博客项目中的效果一致，不要再把正文放到 `private/pages/`；在私有仓库保留主仓库同样的 `src/content/` 目录，并额外维护仅含路由与展示元数据的 `private/routes.json`：

```json
{
  "routes": [
    {
      "pathname": "/posts/私密/日记/",
      "source": "src/content/posts/私密/日记.md",
      "type": "post",
      "title": "私密日记",
      "date": "2026-10-15",
      "category": "私密",
      "tags": ["日记"]
    }
  ]
}
```

- `pathname` 必须是最终公开访问路径，并以 `/` 开头；`source` 只允许指向私有仓库的 `src/content/` 或兼容的 `private/pages/` 下的 Markdown 文件。
- Worker 在服务端查清单、命中后返回同一私密页面壳；壳只在管理员登录后调用 `/api/private/route?path=...` 拉取正文。游客看到登录门，响应不包含标题、URL 映射或 Markdown。
- 清单与正文均使用 `ADMIN_KV` 缓存五分钟。正文可保留与公开 Content Collection 相同的 YAML frontmatter；动态渲染时会自动隐藏 frontmatter，并自动读取单行 `title`、`date`/`published`、`category`、`tags: [..]`。路由条目填写同名字段时优先，用于覆盖展示值。
- 当前镜像复用公开文章的标题、正文、目录与主题排版。集合专属的构建期组件（例如相册墙、账单图表、笔记本卡片）仍需单独提供客户端数据适配，不能仅靠 Markdown 自动复刻。

### 4. 前端认证与私密页

- 登录入口：右下角坞站 / 移动菜单「管理」按钮 → 密码弹窗；成功后 7 天免输（HttpOnly 签名 Cookie `blog_admin`）
- `/private/` 私密文章索引；`/private/<slug>` 私密文章：游客看到登录门，管理员动态拉取渲染
- `/projects/` 网站导航：登录后自动合并注入远端 `nav.json` 条目（参与搜索 / 标签 / 分类筛选）
- sitemap 已排除 `/private`，私密页 head 带 `noindex, nofollow`（防收录）

### 5. 本地 wrangler dev 调试

```bash
pnpm build && pnpm wrangler dev
```

wrangler 读取 `.dev.vars` 的 5 个 Secret，托管 `dist/` + 运行 worker，可完整调试登录 / 限流 / 私密页 / 导航注入链路。日常写公开内容仍用 `pnpm dev`。

### 6. 故障排查

| 现象 | 排查 |
|---|---|
| 登录返回 401 | 密码错误，或 `ADMIN_PASSWORD` 未配置到 Worker secrets（本地看 `.dev.vars`，线上看 GitHub Secrets / Dashboard） |
| 连续登录失败提示冷却 | 正常限流：连续 5 次失败冷却 30s（按 IP），等待后重试 |
| 私密内容 502 `fetch_failed` | `GH_PAT / GH_OWNER / GH_REPO` 配置错误、PAT 权限不足（需 Contents 只读）或仓库路径不对 |
| 游客访问 `/private/` 或私密镜像 URL 只见登录门 | 正常设计：未登录不发内容请求，登录后自动加载 |
| 登录态突然失效 | Cookie 7 天过期，或 `AUTH_SECRET` 被更换（换密钥会使全部会话失效） |
| 登录后导航页无远端条目 | 确认私有仓库 `private/nav.json` 存在且 JSON 为数组；Worker 日志看是否 502 |

## 八、常见问题

| 问题              | 排查                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 构建失败            | 先看 Node 版本是否 ≥ 22、pnpm 是否 9.14.x、构建命令是否为 `pnpm build`；与 `build.yml` 的 CI 行为对照                                                                              |
| 功能静默缺失（评论/统计空白） | 检查构建时 `.env` / CI secrets 是否逐项填齐（见第三节表）；确认不是配到了 Workers runtime 而非构建期                                                                                      |
| 上线了但线上没变化       | 检查 GitHub Actions → `deploy.yml` 是否跑绿（`wrangler deployments list` 看最新一次带新内容）；若红，看是否构建期 Secrets 缺失；回滚用 `wrangler rollback` |
| 需要换域名           | 改 `src/config/siteConfig.ts` 的 `site_url`（sitemap/robots/RSS/canonical 自动跟随）+ Dashboard 重新绑定域名；注意 `src/config/musicConfig.ts` 等硬编码的 `*.5484826.xyz` 子域不受影响 |
| 404 页不生效        | 确认 `wrangler.toml` 里 `[assets] not_found_handling = "404-page"`（Astro 自研 404 页输出为 `dist/404.html`，wrangler 4.x 不再识别 `"404.html"` 这个旧取值）                    |

