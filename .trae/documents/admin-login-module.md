# 管理员登录模块与动态隐藏内容 设计方案

## 一、结论先行：这是否有成熟方案？

**有，且与当前部署栈（Cloudflare Workers Static Assets）天然契合。** 成熟做法是三步组合：

1. **运行时鉴权**：在现有 Workers 项目上加一个 `main` Worker（当前 wrangler.toml 只有 `[assets]`，全站纯静态），由 Worker 处理 `/api/*` 路由、校验密码、签发 HttpOnly 签名 Cookie。静态页面仍由 `env.ASSETS.fetch()` 原样托管，现有行为零改变。
2. **内容源隔离**：隐藏内容存到**新建的 GitHub 私有仓库**，Worker 用只读 PAT 通过 GitHub Contents API 按需拉取，并缓存到 Cloudflare KV（TTL 300s，规避 API 限流）。**隐藏内容永远不进入博客仓库 / 构建产物**——游客抓取 dist 也拿不到。
3. **前端按态增强**：登录态存模块级 Svelte store（跨 Swup 导航持久）。登录后：`/private/*` 私密页面动态拉取渲染；网站导航页 `projects.astro` 动态注入远端隐藏导航条目并与本地条目合并展示。

> 备选方案对比：
>
> * **Cloudflare Access**：免代码保护整条路由，但无法做"页内合并展示"、无法与登录态联动 UI，且与本项目"输入密码即可"的轻量诉求不符 → 不采用。
>
> * **恢复旧 EncryptGate（构建期 AES-GCM 加密）**：2026-09-16 已按站长要求移除。它把密文**内联进页面**，属于"全站统一密码的页面加密门"，不是"管理员 vs 游客"的区分，且内容仍存在于部署产物中，不满足"动态加载、保护数据安全"的诉求 → 不恢复，但旧代码（git 历史 `src/components/security/`）的登录门交互/冷却逻辑可作 UI 参考。
>
> * **全站 Astro SSR（@astrojs/cloudflare）**：改动面过大，为几个私密页把整个静态站改 SSR，得不偿失 → 不采用。

## 二、现状分析（Phase 1 探索结论）

* 部署：`wrangler.toml` 只有 `[assets]`，无 `main` worker；`pnpm build`（图标→astro build→pagefind）后 `wrangler deploy`；CI 由 `.github/workflows/deploy.yml` 在 push lh 时自动构建+部署。

* 已存在但**已废弃**的配置：`deploy.yml` 第 59 行 `GATE_PASSWORD`（旧加密门残留，无任何代码读取）→ 本次顺手清理。

* 前端约束：Swup SPA 导航（容器外组件持久化、跨导航单例用 `window.__xxx` guard）、Svelte 5 runes（`$state`）、i18n 5 个语言文件（`src/i18n/languages/{en,ja,ru,zh_CN,zh_TW}.ts` + `i18nKey.ts`）、样式经 `src/styles/main.css` 导入、页面交互脚本必须放 Swup 容器内。

* "资源收集" = 网站导航页 [projects.astro](file:///e:/_Server/blog/src/pages/projects.astro)（daohang 集合），本地渲染 + 内联 JS 筛选（分类/搜索/标签/hover 浮层），卡片结构为 `.nav-card` + `data-name/data-desc/data-host/data-tags`。

* 全局持久组件挂载点：`src/layouts/Layout.astro`（Swup 容器外，MusicManager / SearchModal 同层）。

* 依赖里已有 `marked` + `sanitize-html` → 客户端渲染 markdown 无需新增依赖。

* 旧事件复用先例：EncryptGate 曾"解密注入后派发 `swup:content:replaced` 触发页面交互恢复"（changelog 2026-08-30 记录）→ 导航页合并注入后复用同一事件。

## 三、目标架构

```
浏览器
 ├─ 公开页面（现有 dist 静态，行为不变，env.ASSETS.fetch 回退）
 ├─ 登录门/管理入口（FloatingDock/UnifiedDock 按钮 + AuthModal 密码弹窗）
 ├─ /private/* 私密页壳（游客看到登录门；管理员 fetch 后动态渲染）
 └─ 导航页登录后合并远端隐藏导航条目
        │
        ▼ 同源 /api/*
Worker（新增 worker/index.ts）
 ├─ POST /api/auth/login    校验 ADMIN_PASSWORD → 签发 HttpOnly Cookie
 ├─ POST /api/auth/logout   清除 Cookie
 ├─ GET  /api/auth/me       校验 Cookie → {admin}
 ├─ GET  /api/private/nav              隐藏导航条目 JSON
 ├─ GET  /api/private/pages            私密文章索引
 ├─ GET  /api/private/pages/<slug>     私密文章 markdown
 │        （全部需有效 Cookie；未登录 401）
 └─ 其余路径 → env.ASSETS.fetch(request)（含 404-page 行为）
        │
        ▼
GitHub 私有仓库 blog-private（只读 PAT）+ Cloudflare KV 缓存（TTL 300s）
```

## 四、详细改动清单

### A. Worker 层（新增，核心）

**A1. 新建** **`worker/index.ts`**（项目根目录 `worker/`，wrangler 4.x 自动 esbuild 打包）：

* 入口：路径以 `/api/` 开头走 `handleApi`，否则 `return env.ASSETS.fetch(request)`（关键：加 `main` 后所有请求先进 Worker，必须回退到 assets，否则全站 404）。

* 认证：

  * 登录：读取 JSON body `{password}`，与 Secret `ADMIN_PASSWORD` **constant-time 比较**；失败计数写入 KV（key `rl:{CF-Connecting-IP}`），**连续 5 次失败冷却 30s**（复用旧 PasswordGate 行为）。

  * Cookie：名 `blog_admin`，值 `{exp}.{hmac}`（exp = 当前 Unix 秒 + 7×86400；hmac = HMAC-SHA256(AUTH\_SECRET, `blog_admin:{exp}`)），属性 `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`。前端 JS 永不读它，只凭请求自动携带。

  * 校验：拆值 → 检查过期 → **constant-time 比较 hmac**。

* 私密内容代理：`/api/private/*` 先校验 Cookie，再经 GitHub Contents API 拉取私有仓库：

  ```
  GET https://api.github.com/repos/{GH_OWNER}/{GH_REPO}/contents/{path}
  Authorization: Bearer {GH_PAT}
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28
  ```

  返回体 base64 解码；KV 缓存 key `gh:{path}`、TTL 300s。路径映射：

  * `/api/private/nav` → `private/nav.json`

  * `/api/private/pages` → `private/pages/index.json`

  * `/api/private/pages/<slug>` → `private/pages/<slug>.md`（raw markdown）

  * 响应统一 JSON：`{ok, data}` / 错误 `{ok:false, error}`；未登录返回 401。

* 不使用第三方库，纯标准 API（`crypto.subtle`、`WebSocket` 不需要）。

**A2. 修改** **`wrangler.toml`**：

```toml
name = "blog"
compatibility_date = "2026-10-13"
main = "worker/index.ts"

[assets]
directory = "./dist"
not_found_handling = "404-page"

[[kv_namespaces]]
binding = "ADMIN_KV"
id = "<wrangler kv namespace create 后填入>"
```

**A3. 运行时 Secrets**（非构建期变量，配到 Worker 而非 `.env`/CI 构建注入）：

| Secret           | 用途                                             |
| ---------------- | ---------------------------------------------- |
| `ADMIN_PASSWORD` | 登录密码                                           |
| `AUTH_SECRET`    | Cookie HMAC 签名密钥（随机 ≥32 字节，生成一次永久保存）           |
| `GH_PAT`         | 私有仓库只读 fine-grained PAT（仅授予 blog-private 读取权限） |
| `GH_OWNER`       | 如 `sgwfmyl`                                    |
| `GH_REPO`        | 如 `blog-private`                               |

### B. 前端层

**B1. 新建** **`src/utils/auth-store.ts`**：模块级 Svelte 5 runes 单例（模块常驻，天然跨 Swup 导航）：

* `isAdmin = $state(false)`、`initialized = $state(false)`

* `initAuth()`：调 `/api/auth/me` 初始化（仅一次）

* `login(password)` / `logout()`：调 `/api/*` 并更新状态

**B2. 新建** **`src/components/security/AuthManager.svelte`**：`client:idle` 挂载于 `src/layouts/Layout.astro`（Swup 容器外，与 MusicManager 同层），onMount 调 `initAuth()`。目录 `security/` 与旧 EncryptGate 时代命名一致。

**B3. 新建** **`src/components/security/AuthModal.svelte`**：密码输入弹窗（图标/标题/密码框/解锁/退出按钮），错误抖动 + 红字 + 冷却提示（参考旧 PasswordGate 视觉，样式经 `main.css` 引入，遵守暗色 `:root.dark` 规范，不用 `!important`）。

**B4. 管理入口**：在 `src/components/layout/FloatingDock.astro` 与 `MobileDock.astro` 的按钮区加入"管理"按钮（游客可见，点击开 AuthModal）；登录后按钮区变为"私密空间"（链接 `/private/`）+ "退出登录"。文字走 i18n。

**B5. 新建** **`src/pages/private/[...slug].astro`**（rest 参数兼容 `/private/` 与 `/private/<slug>`）：

* head：`noindex, nofollow` meta（防收录）。

* 页面壳内交互脚本放 **Swup 容器内 slot**（遵守 §15）。

* 逻辑：`initAuth()` 后若 `!isAdmin` → 展示登录门（复用 AuthModal）；若 admin：

  * `/private/` → fetch `/api/private/pages` 渲染索引列表；

  * `/private/<slug>` → fetch 详情 → `marked` 渲染 + `sanitize-html` 清洗 → 注入。渲染后派发 `swup:content:replaced` 恢复文章相关交互。

* 未登录访问时只显示登录门，**内容请求不会发出**（客户端不发 fetch），抓包/源码无内容。

**B6. 修改** **`src/pages/projects.astro`**：新增内联增强脚本（置于该页 Swup 容器 slot 内）：

* 监听 `astro:page-load` / `swup:content:replaced`，若 `authStore.isAdmin` → fetch `/api/private/nav`。

* 按条目的 `category` 找到 `[data-nav-section="{category}"]`；无则新建 section（`CATEGORY_META` 未登记的分类走 fallback 排末尾，可接受）并补左栏分类按钮与计数。

* 注入的卡片 DOM 与现有 `.nav-card` 完全一致（含 `data-name/data-desc/data-host/data-tags` 与 hover 浮层依赖属性），注入后更新各计数文本，再 `dispatchEvent(new CustomEvent("swup:content:replaced"))` 触发页面脚本 `reinit()` 重新过滤/绑定（复用 EncryptGate 已用过的模式）。

* 未登录：零请求、零注入。

**B7. i18n**：`src/i18n/i18nKey.ts` + `src/i18n/languages/{en,ja,ru,zh_CN,zh_TW}.ts` 五文件同步新增键（管理、密码占位、解锁、密码错误、冷却提示、私密空间、退出登录、登录后可见等）。

**B8.** **`astro.config.mjs`**：sitemap `filter` 增加 `/private`（含 `/private/...`）排除（仿 `/docs/` 写法）。

### C. 部署 / CI / 环境

**C1.** **`.github/workflows/deploy.yml`**：

* 删除死配置 `GATE_PASSWORD: ${{ secrets.GATE_PASSWORD }}`（第 59 行）。

* wrangler-action 增加 runtime secrets 注入（v3 的 `secrets` 输入，多行 `KEY=VALUE`，映射 5 个 GitHub Secrets：`ADMIN_PASSWORD/AUTH_SECRET/GH_PAT/GH_OWNER/GH_REPO`）。⚠️ 实施时核对 wrangler-action v3 官方 README 的 secrets 参数格式。

* GitHub Secrets 面板新增上述 5 个（非构建期，不放进 build 的 env 块）。

**C2. 本地开发**：新建 `.dev.vars.example`（模板 5 个 secret），`.gitignore` 增加 `.dev.vars`。调试私密/认证链路用 `pnpm build && pnpm wrangler dev`（wrangler 读 `.dev.vars`，托管 `dist/` + worker）；日常写公开内容仍用 `pnpm dev`。

### D. 文档与收尾规范

* **D1**：`docs/deploy-cloudeflare-workers.md` 增补"运行时 Secrets / KV / GitHub 私有仓库内容源 / 本地 wrangler dev 调试 / 故障排查（401、GitHub API 403/限流）"小节。

* **D2**：新增 `src/content/changelog/` 条目（feature → minor 版本递增，格式遵循 §21）。

* **D3**：同步更新 `CLAUDE.md`（§20 收尾规范：worker 目录、认证功能、私有仓库、部署 secrets、已废弃 `GATE_PASSWORD` 清理说明）。

## 五、手动前置条件（实施第一步，需站长操作）

1. GitHub 创建私有仓库 `blog-private`，初始化内容：

   * `private/nav.json`：`[{name, url, icon, description, tags[], category}]`（结构对齐 daohang schema）

   * `private/pages/index.json`：`[{slug, title, date}]`

   * `private/pages/<slug>.md`：frontmatter `title/date/description` + markdown 正文
2. 生成 fine-grained PAT（仅授予该仓库 Contents 只读），及随机 `AUTH_SECRET`。
3. `pnpm wrangler kv namespace create ADMIN_KV`（或 `wrangler kv namespace create ADMIN_KV` 经 pnpm），id 写入 `wrangler.toml`。
4. 本地 `.dev.vars` + GitHub Secrets 填入 5 个 secret。
5. ⚠️ **安全前提**：博客仓库 `sgwfmyl/blog` 若为公开，私有内容绝不能放入该仓库；`private/*` 只存在于 `blog-private`。

## 六、实施步骤（阶段划分）

1. **阶段一 · Worker 骨架**：`worker/index.ts` 认证 + assets 回退 → `wrangler.toml` → KV 创建 → `.dev.vars` → deploy.yml secrets。
2. **阶段二 · 前端认证**：`auth-store.ts` → `AuthManager` → `AuthModal` → 坞站入口 → i18n 五语言。
3. **阶段三 · 私密页面**：`private/[...slug].astro`（索引 + 详情 + 登录门）→ sitemap 排除。
4. **阶段四 · 导航合并**：`projects.astro` 增强脚本。
5. **阶段五 · 收尾**：清理 `GATE_PASSWORD` → 文档（deploy 文档 / CLAUDE.md / changelog）。

## 七、验证方式

* `pnpm check` + `pnpm exec biome ci ./src --reporter=github` 全绿。

* `pnpm build` 通过；`pnpm wrangler dev` 本地全链路：登录/错 5 次冷却/登出、`/api/auth/me`、私密页游客登录门 vs 管理员内容、导航页合并注入与筛选可用。

* 浏览器实测（TRAE-browseruse）：游客态无任何私密请求与入口内容；管理员态 `/private/`、`/private/<slug>` 正常、导航页隐藏条目合并、刷新与 Swup 切页后登录态保持。

* 部署后验证：`curl -I /private/` 200（壳）、`curl /api/private/nav` 未带 Cookie 返回 401；访问线上 `blog.5484826.xyz` 各关键路径回归（防 assets 回退破坏）。

* 更新 git 时确认 `.dev.vars` 未被提交。

## 八、假设与决策记录

* 单人管理员、纯密码制（按用户明确要求）；不做多用户/角色。

* 隐藏内容源 = 新建 GitHub 私有仓库（用户选定），KV 仅作缓存层。

* 呈现 = 独立私密页 + 网站导航页登录后远端合并注入（用户选定）。

* 不采用 Cloudflare Access / 全站 SSR / 恢复构建期加密（理由见第一节对比）。

* Cookie 7 天免输、登录限流 5 次/30s，均沿用旧 EncryptGate 的既有体验设计。

* 实施中发现新问题（如 wrangler-action secrets 参数差异、KV id 跨账号）按"最小改动、保持既有规范"原则就地解决并回写本文档。

