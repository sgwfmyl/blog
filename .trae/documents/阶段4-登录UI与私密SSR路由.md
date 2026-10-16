# 阶段 4（定稿）：私有内容 SSG 预渲染 + KV 存储 + 运行时鉴权

分支：`lh_SSR`（领先基线 4 个 commit：阶段 1-3）。

> **定稿版本（2026-10-16）**：本计划已从「运行时 SSR 渲染」全面改为「**SSG 构建期预渲染 + KV 存储 + 运行时鉴权**」。
> 变更原因：M0 实测发现运行时 `createMarkdownProcessor` 会把 shiki 全量语言打包进 worker（60MB，超 Workers 10MB 限制）。
> 核心思想：**「渲染」与「鉴权」解耦**——markdown 渲染搬到构建期（Node 环境，无体积限制，保留 shiki 高亮），
> worker 运行时只做「D1 鉴权 + 读 KV 返回预渲染 HTML」，体积从 60MB 降到几 MB。

## 一、问题与结论

原计划问题：私有内容统一放在 `/private/` 与 `/private/<slug>/` 下，相当于把所有私有页面集中在一个独立空间：
- URL 与公开文章不在同一前缀
- 不会出现在归档、目录、标签池、最近更新中
- 与最初目标「程序上像静态内容一样点击、退出登录即卸载」不一致

**定稿结论：采用「路由映射 + SSG 预渲染 + KV 存储 + 运行时鉴权」**：
- 私有仓库元数据声明每篇内容的访问路由（`route` 字段），`/private/` 仅保留为管理入口；
- 构建期（Node）拉私有仓库 markdown → 完整管线渲染成 HTML → 存 KV；
- 运行时（workerd）只做「D1 鉴权 → 登录才从 KV 读 HTML 返回，未登录 404」。

## 二、核心理念：存储位置、访问路由、渲染时机三者解耦

| 含义 | 现状 | 定稿后 |
|---|---|---|
| 存储位置（源码） | 文件在私有仓库中的路径（`private/pages/<slug>.md`） | 已有，保持不变 |
| 访问路由（URL） | 浏览器地址栏的 URL，固定 `/private/<slug>/` | 由元数据的 `route` 字段决定（独立前缀如 `/diary/`） |
| 渲染时机 | 运行时（workerd）渲染 markdown | **构建期（Node）渲染，产物存 KV** |
| 运行时职责 | 鉴权 + 渲染 | **只鉴权 + 读 KV 返回** |

**关键认知**：「SSR」在你方案里真正需要的是「按登录态控制访问（鉴权）」，不是「运行时渲染 markdown」。
两者可解耦：渲染构建期做，鉴权运行时做。安全本质 =「私有内容存服务端私有存储（KV）+ 运行时 D1 鉴权挡住未登录」，
与「渲染时机」无关。

## 三、元数据格式

私有仓库 `private/meta.json` 是**数组**（每条记录一个元素），每条记录增加 `route`：

```json
[
  {
    "slug": "hello-post",
    "type": "post",
    "title": "私密文章示例",
    "date": "2026-10-14",
    "tags": ["示例", "私密"],
    "category": "私密",
    "route": "/diary/hello-post/"
  },
  {
    "slug": "私密/观影记录",
    "type": "bangumi",
    "title": "私密观影记录",
    "date": "2026-10-15",
    "tags": ["观影"],
    "category": "私密",
    "route": "/diary/观影记录/"
  }
]
```

> 实测确认（2026-10-16）：当前私有仓库 `sgwfmyl/blog-private` 的 `private/meta.json` 是**数组**（非 `{items:[...]}` 包裹），
> 现有 3 条记录（hello / 私密·观影记录 / 私密·服务评测）。上面的 `route` 字段是本阶段**新增**的（当前仓库尚无）。

- `route` 缺省值为 `/private/<slug>/`（等于现状），现在就加上字段，避免后续改数据格式
- 元数据经构建期脚本读取 + 渲染，正文 HTML 存 KV（无 TTL，随每次构建覆盖更新）
- **映射前缀调整说明**：审查示例中的 `/posts/hello-post/` 无法落地——`src/pages/posts/[...slug].astro` 已占用 posts 前缀（公开文章静态路由），Astro 不允许同前缀双路由模式；本阶段白名单前缀从独立前缀开始（如 `/diary/`），落在公开前缀（posts 等）的 route 条目按「公开优先」规则丢弃告警（见四.4）

## 四、路由规则（必须执行）

1. **前缀白名单**：`route` 只允许落在配置的前缀下（初始 `PRIVATE_ROUTE_PREFIXES = ["diary"]`，每个前缀一个 SSR rest 路由文件，可扩展），禁止覆盖 `/api/`、`/_astro/` 等系统路径
2. **规范化**：拒绝 `..`、`//`、查询串、空路径段、控制字符；百分号编码解码后再校验；统一尾部斜杠
3. **公开优先**：`route` 与公开静态页面冲突时公开页面胜出，该条目记录告警并丢弃
4. **路由唯一**：两条记录 `route` 重复时拒绝并记录日志
5. **slug 校验**：拒绝空段、首尾斜杠、`..`；字符范围按实际文件名确定（`\u4e00-\u9fa5` 仅覆盖基础汉字，假名/扩展汉字按实际调整）；请求 GitHub 前统一规范化
6. **未授权统一 404**：映射不存在、未登录、私有源故障，对映射路由的响应形态一致（404）

## 五、请求流程（定稿：运行时只鉴权 + 读 KV）

**映射路由（如 `/diary/hello-post/`）**
1. 公开静态页面未命中，落到 SSR 路由（`prerender=false`；M0 已实测**无需改 `not_found_handling`**）
2. `isAdminRequest(request)` 查 D1 session（强一致）
3. 未登录 → **404**，不显示登录门（路由本身是私有的）
4. 已登录 → 按 `route` 从 KV 读预渲染 HTML → 走公开文章页同款排版（post-hero + `#post-container` + `.markdown-content prose` + TOC 浮层）
5. 退出登录后第 3 步对该路由自然生效，即「卸载」

**`/private/` 固定入口**
- 路由本身公开存在，未登录显示登录门，不拉任何私有数据
- 已登录显示列表，链接直接使用每条记录的 `route`
- 与「未授权统一 404」的区别记入决策表：`/private/` 对所有请求返回一致内容，不泄露具体文章是否存在
- `/private/<slug>/` 详情路由**过渡期保留**（兼容旧书签），与映射路由共用同一套渲染骨架

**构建期流程（新增，SSG 的核心）**
1. `astro build` 之后（或独立脚本），Node 环境拉私有仓库 `meta.json` + 各 `private/pages/<slug>.md`
2. 完整 markdown 管线渲染（shiki 高亮 + katex + callouts，与公开文章一致）
3. sanitize-html 白名单清洗
4. 渲染结果（HTML + headings）写入 KV（`wrangler kv key put --remote`，见 M1）

> **关键差异**：运行时不再调用 `createMarkdownProcessor`，因此 worker 里没有 shiki 全量语言包，
> 体积从 60MB 降到几 MB。私有内容更新需重新构建（GitHub Actions 自动部署）。

## 六、变更清单

### M0 前置验证（新增，必须先做，go/no-go 闸门）

这两项的结果决定后面是否需要换实现，先在 preview Worker 上验证：

**✅ M0 已实测（2026-10-16），结论如下（修正了原方案的两处假设）：**

**M0-1 Markdown 管线在 workerd 运行：**
- ✅ **katex、callouts、headings 提取在 workerd 完整跑通**（`syntaxHighlight: false` 时 HTTP 200，`<span class="katex">` 正常、callout 正常、headings 提取 2 个）。
- ❌ **shiki 主题在 workerd 运行时无法按名字符串加载**：`createMarkdownProcessor` 在 `prerender=false` 的 SSR 页面里，无论传 `github-dark`/`github-light` 还是默认主题，运行时都抛 `ShikiError: Theme X is not included in this bundle`。根因：Astro 构建期的 markdown 渲染走 Node + expressive-code，主题在构建期消费后，运行时 worker 里 shiki 主题资源未被打包；shiki 4.x 主题在 `@shikijs/themes`（**非项目直接依赖**），需显式 `import` 才能进 bundle，但直接 import 报「Cannot find package」。
- ⚠️ **体积严重超限**：worker 总模块 2084 个、**60.16 MB**（含 shiki oniguruma wasm 455KB、`_astro_data-layer-content` 4.2MB）。Workers 免费版限制是压缩后 10MB，**60MB 未压缩大概率超限**，必须处理。
- ⏱️ **冷启动 10.8s / 热请求 20-27ms**（本地 workerd 实测，冷启动主要来自 60MB 模块加载）。

**M0-2 兜底路由（重大发现，修正方案假设）：**
- ✅ **无需改 `not_found_handling`**：当前 `"404-page"` 下，`prerender=false` 的 SSR 路由（如 `/m0-markdown-test/`）**已经能正常命中并返回 200**，真不存在的路径（`/definitely-not-exist/`）仍返回 404 页。说明 `@astrojs/cloudflare` 适配器会自动注册 SSR 路由，静态 assets 未命中时先走 SSR 路由匹配，匹配不到才落 404-page。
- 原方案 M0.2「必须改 `not_found_handling = "none"` 才能让静态未命中进入 Worker」的假设**不成立**，无需改动，减少一处变更风险。
- ⚠️ 待验证：映射路由是 `[...slug]` rest 动态路由（如 `/diary/xxx/`），其匹配行为与固定路径是否一致，需在 M1/M3 实际建 `/diary/[...slug].astro` 后确认。

**M0 结论（go/no-go）：Go，采用「SSG 构建期渲染 + KV」方案。**
- 运行时渲染会触发 shiki 全量打包（60MB 超限），故**放弃运行时渲染**，改为**构建期渲染 + KV 存储 + 运行时只鉴权读 KV**。
- 该方案下 shiki 高亮**保留**（构建期 Node 环境无体积限制），worker 体积降到几 MB。
- 原「失败回退 = marked + sanitize-html」不再需要（shiki 在构建期正常用）。

> **测试 2 链路验证（2026-10-16 已实测通过）**：私有仓库 `sgwfmyl/blog-private` 可经 `gh api` 访问；
> `wrangler kv key put --binding=ADMIN_KV --remote` 成功写线上 KV、`get --remote` 读回正确。
> 注意：① `wrangler kv key put` 默认写 local，必须 `--remote` 才写线上；② CI 需 `CLOUDFLARE_API_TOKEN` 有 KV 写权限。

原始方案（作为历史记录保留）：

1. **Markdown 管线能否在 Workers 运行**：做一个最小 SSR 页面（`prerender = false`）渲染固定 markdown（含代码块 / katex 公式 / callouts），部署 preview Worker：
   - 检查 `createMarkdownProcessor` + shiki（WASM 动态编译限制 / 正则引擎、语法与主题资源加载）、katex、各 rehype 插件是否依赖 `node:fs`/`node:path`/构建期上下文
   - 记录打包体积（wrangler deploy 输出）与冷启动耗时（首次请求计时）
   - **失败回退**：简化渲染 = `marked` + `sanitize-html`（渲染效果打折但可用），连锁调整 M1 的 private-render.ts
2. **兜底路由能否接到静态未命中请求**：将根 `wrangler.toml` 的 `[assets] not_found_handling` 从 `"404-page"` 改为 `"none"`（允许未命中进入 Worker；改后需重新 `pnpm build` 才写入 `dist/server/wrangler.json`），验证：
   - 静态未命中（如 `/diary/xxx/`）进入 Worker SSR 路由
   - 真 404 路径仍返回 404（Astro SSR 无匹配时的行为）
   - 尾部斜杠、多级路径表现（`trailingSlash: "always"`）
   - **失败回退**：让对应前缀整体走 SSR

### M1 构建期预渲染脚本 + 数据层（定稿核心改动）

**0. [scripts/私有预渲染/index.mjs](file:///e:/_Server/blog/scripts/私有预渲染/index.mjs)（新建，SSG 核心）**
- **构建期运行**（Node 环境，非 workerd），职责：
  1. 拉私有仓库 `private/meta.json` + 各 `private/pages/<slug>.md`（经 `gh api` 或 GH_PAT + Contents API）
  2. 完整 markdown 管线渲染（**shiki 高亮 + katex + callouts**，复用 `src/config/markdown.ts`，与公开文章一致）
  3. sanitize-html 白名单清洗（见七.2）
  4. 产物写入 KV（`wrangler kv key put --binding=ADMIN_KV --remote`）：
     - `private:html:<slug>` → `{ html, headings }`（正文，供映射路由读）
     - `private:meta` → 完整 `meta.json`（元数据，**frontmatter 也私有**，供归档/目录/`/private/` 列表登录态读取）
- 挂接到 `pnpm build` 流程（`astro build` 之后）或 GitHub Actions 单独 step；**必须在 `wrangler deploy` 前完成写 KV**
- 环境变量用 `process.env`（GH_PAT/GH_OWNER/GH_REPO），**不用 `cloudflare:workers` 的 env**（构建期 Node 无法解析）
- 已知差异：不启用 `remarkMermaid`/`rehypeMermaid`/`rehypeComponents`（与公开侧一致地记录在决策表）

**1. [src/utils/private-source.ts](file:///e:/_Server/blog/src/utils/private-source.ts)（修改，职责拆分）**
- **构建期**（供脚本 0 用）：`fetchGitHubFile` 改用 `process.env` 拉 GitHub（`export` 导出）；`getPrivateMeta` 拉 meta.json 并校验 `route` 字段
- **运行时**（供 SSR 路由用）：
  - `getPrivateHtmlFromKV(slug/route)` —— 从 KV 读预渲染正文 HTML（`env.ADMIN_KV.get("private:html:<slug>")`）
  - `getPrivateMetaFromKV()` —— 从 KV 读 `private:meta`（元数据，供归档/目录/`/private/` 列表登录态读取）
  - **均不再运行时拉 GitHub / 渲染**
- 保留 `PRIVATE_ROUTE_PREFIXES`、`isValidPrivateSlug`、`normalizeRoute`、`getPrivateEntryByRoute` 等校验逻辑（四.1-4 规则）
- `PrivateMetaItem` 已含 `route?: string`（阶段已改）

**2. [src/config/markdown.ts](file:///e:/_Server/blog/src/config/markdown.ts)（新建，共享管线配置）**
- 从 [astro.config.mjs](file:///e:/_Server/blog/astro.config.mjs#L302-L332) 抽出 remarkPlugins / rehypePlugins / shikiConfig，`astro.config.mjs` 与构建期脚本同时导入，避免公开与私有管线漂移
- 不启用 `remarkMermaid`/`rehypeMermaid`/`rehypeComponents` 作为**明确的已知差异**（复杂度高，私密内容暂不需要）
- remarkReadingTime/remarkExcerpt 属构建期 frontmatter 依赖，公开侧保留，私有侧不引入

**3. [src/utils/private-render.ts](file:///e:/_Server/blog/src/utils/private-render.ts)（改为「构建期渲染函数」，供脚本 0 调用）**
- 输出 `renderPrivateMarkdown(markdown): Promise<{ html, headings }>`，内部用 `createMarkdownProcessor` + sanitize-html
- **不再**是「运行时模块」，只被构建期脚本 import，因此 shiki 全量语言只进构建产物、不进 worker
- 渲染前剥离 YAML frontmatter（复用 `stripFrontmatter` 正则）

**4. [src/utils/auth-context.ts](file:///e:/_Server/blog/src/utils/auth-context.ts)（新建，运行时）**
- `isAdminRequest(request)`：服务端解析 cookie 头取 `blog_admin` token → `verifySession(token)`（D1 强一致）；页面内优先用 `Astro.cookies.get(AUTH_COOKIE_NAME)` 读取，不手写 split 解析

### M2 登录 UI（移植自 lh 分支）

**5. [src/utils/auth-store.ts](file:///e:/_Server/blog/src/utils/auth-store.ts)（新建，git 提取 lh 分支同文件）**
- 完整移植（pub-sub store + `window.__fireflyAuthStore` 门面 + `getAuthState/subscribeAuth/initAuth/login/logout/installAuthStore`）
- **新增 Swup 缓存清理**：`login` 成功与 `logout` 后执行 `window.swup?.cache?.clear()`；AuthManager 挂载时注册 `pageshow` 监听（`e.persisted` 为真 → `location.reload()`，防 bfcache 残留私密 HTML）——这是安全约束，不可推后（见七.3）
- **核对 API 契约**：`/api/auth/login`（200 `{ok:true}` / 401 `invalid_password` / 429 `rate_limited` + `retryAfter`）、`/api/auth/logout`（POST）、`/api/auth/me`（`{ok:true, admin}`）——与阶段 3 [login.ts](file:///e:/_Server/blog/src/pages/api/auth/login.ts) 等实现逐项核对，登出为 POST 并校验来源

**6. [src/utils/auth-modal-controller.ts](file:///e:/_Server/blog/src/utils/auth-modal-controller.ts)（新建，git 提取）**
- 完整移植；**补排队逻辑**：控制器未就绪时 `requestAuthModalOpen` 存入 pending，`bindAuthModalController` 就绪后执行（解决 client:idle 水合前点击丢失）

**7. [src/components/security/AuthModal.svelte](file:///e:/_Server/blog/src/components/security/AuthModal.svelte)（新建，git 提取后微调）**
- 完整移植（$state 登录态/冷却倒计时/错误文案/`firefly:auth-logged-in` 事件），scoped 样式自带；「私密空间」链接指向 `/private/`

**8. [src/components/security/AuthManager.svelte](file:///e:/_Server/blog/src/components/security/AuthManager.svelte)（新建，git 提取后精简）**
- 精简：仅 `installAuthStore(window)` + `initAuth()` + `<AuthModal />`（不移植 installPrivateRenderer/installPrivateMetaStore，本阶段无客户端渲染/聚合需求）
- **统一登录入口事件委托**：AuthManager 内注册一次 document 级 click 委托（`e.target.closest("[data-auth-open]")` → `requestAuthModalOpen()`），坞站、移动菜单、登录门三处按钮**只写 `data-auth-open` 属性**，不再各自绑定脚本与 `__xxxBound` 守卫（修订稿二.1）

**9. [src/layouts/Layout.astro](file:///e:/_Server/blog/src/layouts/Layout.astro)（修改）**
- `</body>` 前加 `import AuthManager from "@components/security/AuthManager.svelte";` + `<AuthManager client:idle />`（Swup 容器外常驻，同旧方案）

**10. 登录按钮挂载**
- [src/components/layout/UnifiedDock.astro](file:///e:/_Server/blog/src/components/layout/UnifiedDock.astro)（修改）：按钮栈加 `<button class="ud-btn" id="ud-auth-btn" type="button" aria-label="管理" data-auth-open><Icon name="material-symbols:lock-outline-rounded" is:inline /><span class="ud-tooltip">管理</span></button>`（theme 按钮后），**不加任何 click 脚本**（靠 data-auth-open 委托）
- [src/components/layout/MobileMenuSheet.astro](file:///e:/_Server/blog/src/components/layout/MobileMenuSheet.astro)（修改）：菜单加 `#menu-sheet-auth-btn` 按钮（`data-auth-open`），不加 is:inline 脚本

**11. i18n（修改 6 个文件）**
- [src/i18n/i18nKey.ts](file:///e:/_Server/blog/src/i18n/i18nKey.ts)：新增 9 个枚举键 `admin, adminPasswordPlaceholder, adminLogin, adminLogout, adminWrongPassword, adminCooldown, adminPrivateSpace, adminLoginHint, adminLoginFailed`
- [src/i18n/languages/zh_CN.ts](file:///e:/_Server/blog/src/i18n/languages/zh_CN.ts)、[zh_TW.ts](file:///e:/_Server/blog/src/i18n/languages/zh_TW.ts)、[en.ts](file:///e:/_Server/blog/src/i18n/languages/en.ts)、[ja.ts](file:///e:/_Server/blog/src/i18n/languages/ja.ts)、[ru.ts](file:///e:/_Server/blog/src/i18n/languages/ru.ts)：各加 9 条文案（照抄 lh 分支已翻译版本）

### M3 SSR 路由

**12. [src/components/security/PrivateGate.astro](file:///e:/_Server/blog/src/components/security/PrivateGate.astro)（新建）**
- 登录门（`/private/` 用）：lock 图标 + 「私密空间需要管理员身份」 + 「打开登录」按钮（`data-auth-open`），样式沿用旧壳 `.private-gate` 类；纯静态组件，无脚本

**13. [src/components/security/PrivatePostView.astro](file:///e:/_Server/blog/src/components/security/PrivatePostView.astro)（新建，共用渲染骨架）**
- 按条目渲染私有文章：post-hero（标题/日期/分类/标签）+ `#post-container` 卡 + `.markdown-content prose` 容器 + 内联正文 HTML + noindex head 片段
- `/private/<slug>/`（过渡）与映射路由共用；`MainGridLayout postSlug="private"`（文章页布局 + TOC 浮层），`headings` 传给 SidebarTOC

**14. [src/pages/private/index.astro](file:///e:/_Server/blog/src/pages/private/index.astro)（新建，`export const prerender = false`，省略 getStaticPaths）**
- `isAdminRequest` false → `<PrivateGate />`（不拉私有数据）；true → `getPrivateMeta()` → 列表（链接用 `route`）
- 响应头：`Cache-Control: private, no-store`、`Vary: Cookie`、`X-Robots-Tag: noindex, nofollow`（+ `<meta name="robots">` 双保险）
- 列表样式沿用旧壳 `.private-list`

**15. [src/pages/private/[...slug].astro](file:///e:/_Server/blog/src/pages/private/[...slug].astro)（新建，`prerender = false`，过渡期详情）**
- 流程：slug 校验 → `isAdminRequest` → 查 meta 条目 → **`getPrivateHtmlFromKV(slug)`（读 KV，不再渲染）** → PrivatePostView
- 错误码：slug 非法 / meta 无匹配 → **404**；KV 未命中（构建期未写或故障）→ **404**（响应形态一致，不泄露）；不涉及 GitHub 运行时调用（已移出运行时）
- 响应头同上

**16. 映射兜底路由（新建，每前缀一个）**
- 例：[src/pages/diary/[...slug].astro](file:///e:/_Server/blog/src/pages/diary/[...slug].astro)（`prerender = false`，省略 getStaticPaths）
- 流程：`normalizeRoute(request path)` → `getPrivateEntryByRoute` → 未找到或未登录 → **404**（不显示登录门）；已登录 → **`getPrivateHtmlFromKV`（读 KV）** → PrivatePostView
- 响应头：`Cache-Control: private, no-store`、`Vary: Cookie`、`X-Robots-Tag: noindex, nofollow`
- 真 404、KV 未命中、上游故障统一返回 404（响应形态一致，不泄露路由存在）

### M4 收尾

**17. 删除 [src/pages/ssr-verify.astro](file:///e:/_Server/blog/src/pages/ssr-verify.astro)**（阶段 3 验证页）
**18. 确认 sitemap / Pagefind 不收录**：`/private/` 与映射路由 `prerender = false` 不进静态产物，sitemap 集成（[astro.config.mjs](file:///e:/_Server/blog/astro.config.mjs#L222) filter）与 pagefind（索引 `dist/client`）默认不收录——按版本行为实测确认
**19. changelog 条目**：feature → minor 递增（先读当前最新 version）

## 七、安全要求

**1. 响应头（原计划遗漏，必须补齐）**
- 所有 `/private/` 与映射路由响应：`Cache-Control: private, no-store`、`Vary: Cookie`、`X-Robots-Tag: noindex, nofollow`（与 `<meta name="robots">` 双保险）
- 防缓存：CDN / 浏览器 / Workers 缓存任一层缓存了管理员版本游客就能拿到，`no-store` + `Vary: Cookie` 双保险
- 纵深防御：加一条限制脚本来源的 CSP（如 `default-src 'self'` + `script-src` 白名单 unpkg/jsdelivr + `object-src 'none'`），**先在本阶段验证现有站内大量 `is:inline` 脚本 / Svelte 内联样式 / 动态 import 的兼容性**，与站长确认后再上线（见决策表）

**2. 渲染后清洗：白名单（不用黑名单）**
- 黑名单（只删 script/style/iframe/on*）会漏掉 `<base>`、`<meta http-equiv="refresh">`、`<form>/formaction`、`srcset`、`data:` 链接、`<svg>/<math>` 中的 `xlink:href`、可覆盖整页的 `style` 属性
- 改用已安装的 `sanitize-html@2.17.0` 白名单：
  - `allowedTags`：基础 markdown 标签 + callouts（`div/span/pre/code/table/figure…` 及 class）+ katex MathML（`math/annotation/semantics` 等）+ shiki 高亮（`pre/code/span`）
  - `allowedAttributes`：`class/href/src/alt/title/colspan/rowspan/align` 等受限集
  - `allowedStyles`：仅放行 shiki/callouts 实际使用的属性（如 `color/background-color/font-style/font-weight`）
  - `allowedSchemes: ["http", "https"]`（拒绝 `javascript:`、`data:`）
- 实现时以真实渲染输出（callouts/katex/shiki 的标签与 class）为准调整白名单；备选 `rehype-sanitize`（管线内），如兼容性差则不用

**3. Swup 与缓存（登录 UI 落地即需处理，不可推后）**
- 登录与登出事件都清空 Swup 缓存（`window.swup.cache.clear()`）：否则登录前缓存的登录门会持续显示，登出后后退/预载可能看到缓存里的私密 HTML——安全约束
- `pageshow` 检测 `persisted` 为真时强制刷新（bfcache）
- 若实现中发现缓存处理不完整，**「部署到线上 blog」顺延**，本阶段只在 preview Worker 验证

**4. 会话**
- 会话已在 D1（强一致）中，登出即时失效；登录接口限流现有 D1 实现（5 次失败冷却 30s），后续可换 Cloudflare Rate Limiting / Turnstile（记忆：不用 KV 计数）

## 八、关键决策记录

| 决策点 | 结论 | 理由 |
|---|---|---|
| 私有内容访问路由 | 由元数据 `route` 映射，白名单前缀 | 同前缀、登录后按映射位置点击，退出即卸载 |
| 映射路由未授权响应 | 统一 404 | 不泄露路由存在 |
| `/private/` 入口未登录 | 登录门 | 路由本身公开存在，对所有请求一致 |
| 公开与映射冲突 | 公开优先，告警丢弃 | 避免私有映射覆盖公开页面 |
| Markdown 管线配置 | 抽出共享配置文件 | 避免与公开管线漂移 |
| 渲染后清洗 | sanitize-html 白名单 | 黑名单易漏、不可维护 |
| mermaid / rehypeComponents | 私密内容暂不支持（已知差异） | 复杂度高，需要时再补 |
| 登录入口点击 | `data-auth-open` + 一次事件委托 | 减少各处重复脚本与守卫 |
| 私有内容渲染时机 | **SSG 构建期渲染 + KV 存储 + 运行时只鉴权读 KV** | 运行时渲染会打包 shiki 全量（60MB 超限）；渲染与鉴权解耦，构建期渲染保留 shiki，运行时只 D1 鉴权 + 读 KV |
| 映射前缀 | 独立前缀（如 `/diary/`），posts 等公开前缀不映射 | posts 前缀被静态路由占用，Astro 同前缀不能双路由 |
| CSP | 本阶段验证兼容性后与站长确认 | 现有 inline 脚本多，需谨慎 |

### 8.1 设计决策（评审后新增，2026-10-16）

站长在评审调研报告后拍板的架构方向与字段取舍，作为阶段 4 及后续阶段的约束：

| 决策点 | 结论 | 理由 / 后续影响 |
|---|---|---|
| 岛屿 vs 页面 SSR 边界 | 判据 =「数据在哪拿」：数据在客户端拿（fetch 公开 API）→ 岛屿（`client:*`）；数据在服务端拿（D1/GitHub/KV）或依赖登录态 → 页面 SSR（`prerender=false`） | 私有合并依赖 `cloudflare:workers` env + D1 鉴权，只能服务端拿，客户端 fetch 会在未登录时暴露「这里有私有内容」，故**私有合并必须走页面 SSR，不是岛屿** |
| 取数入口统一 | 本阶段一并收敛：所有散落的 `getCollection("posts")` 统一走 `getPublicPosts()` / `getMergedPosts()` | 修 draft 泄漏点，避免后续加私有合并时漏网点重复踩坑。收敛清单见 8.2 |
| `env.d.ts` 类型 | 继续手写最小 D1/KV 接口，不切 `wrangler types` | 当前不阻塞；「未来 `wrangler types` 会与 `cloudflare:workers` 重复声明冲突」记入遗留项 |
| 归档/目录/标签合并私有 | **下阶段再做**，本阶段只交付 `/private/` + 映射路由 + 登录 UI | 本阶段先把取数入口收敛到唯一入口，为下阶段「结构统一」铺路 |
| 归档页合并的安全 vs 性能取舍 | **选安全（frontmatter 也私有）**：下阶段归档/目录/标签页改 `prerender=false`，登录后服务端合并私有（`no-store` 不缓存） | 私有数据（含元数据）不暴露给客户端是原则底线；SSG 下归档页 SSR 只「读 KV 合并列表」、无 markdown 渲染，开销极小，且 worker 体积不因归档页 SSR 变大 |
| `route` vs `url` 字段 | **`route` 取代 `url`**：`PrivateMetaItem` 的 `url?: string` 已改名 `route?: string`（缺省 `/private/<slug>/` 不变） | 两字段语义 100% 重叠，`url` 此前零消费、改名零回归；`route` 语义更贴合「路由映射」 |
| 私有 URL 前缀 | **采用独立前缀**（如 `/diary/`），不做「posts 同前缀」 | Astro 文件路由不支持「同前缀部分静态部分动态」（`prerender` 是文件级、非 slug 级）；要让私有文章拿 `/posts/<slug>/` 只能把整个 posts 前缀改成 `prerender=false`，牺牲全部公开文章的静态优势。已实测确认（Astro 7 官方 routing 文档）。「结构统一」= 数据源统一（归档/目录统一展示私有条目），≠ URL 前缀统一 |

### 8.3 架构认知澄清（避免重复踩坑）

站长在沟通中澄清过若干对 Astro 机制的误解，这里固化为共识，避免后续设计再走偏：

1. **「同一 URL 未登录静态 / 登录后动态」不存在**：一个页面的 `prerender` 是构建期定死的，不是运行时按登录态切换。同一 URL 在 CDN/Worker 层只有一个缓存条目，无法对游客给静态 HTML、对管理员给动态 HTML。
2. **「登录时缓存渲染结果、第一次卡顿之后快」不成立**：私有内容相关页面（`/private/`、映射路由、以及未来合并私有的归档页）必须 `Cache-Control: private, no-store` + `Vary: Cookie`，即**每次请求实时鉴权、根本不缓存**——这是数据安全的代价。真正缓存的是：公开静态页（CDN 长期）+ 构建期预渲染的私有 HTML（存 KV，供运行时鉴权后读取），而非登录态页面渲染结果。
3. **Server Islands 不能把静态页变动态**：`server:defer` 的 Server Islands 只能放在 `prerender=false` / `output:"server"` 的页面上，作用是「SSR 页面内延迟渲染 + 数据不下发客户端」，**不是**在 `output:"static"` 页面上打补丁。因此「静态归档页 + Server Islands 补私有」不可行，已排除。
4. **「登出即回归静态」的真实机制**：靠「清 Cookie + 清 Swup 缓存 + `pageshow` 检测 bfcache 强制刷新」三层实现（见七.3），而非「撤销缓存」。私有内容每次请求都实时查 D1，登出后同一 URL 自然回到未登录渲染。
5. **「渲染」与「鉴权」可解耦（SSG 方案的核心）**：你方案的安全本质是「按登录态控制访问（鉴权）」，不是「运行时渲染 markdown」。渲染可构建期做（Node 环境，保留 shiki），鉴权必须运行时做（D1）。安全关键 = 「正文存服务端私有存储（KV/R2）+ 运行时鉴权挡住未登录」，与渲染时机无关。切勿把「构建期渲染的 HTML」打进公开静态产物（dist/client），否则 curl 直接命中、绕过鉴权、安全形同虚设。

### 8.4 实现补强点（评审后新增，2026-10-16）

四点实现级补强，避免方案落地时踩坑：

1. **构建期脚本必须区分「异常」与「无匹配」**：构建期脚本拉 GitHub 时，`getPrivateMeta` 要能区分「仓库无数据（跳过该条）」和「GitHub 故障/限流（构建失败告警）」。运行时不再调 GitHub，所以原「503 上游异常」逻辑**移出运行时**——运行时只有「KV 命中（200）/ KV 未命中或未登录（404）」两种形态。`getPrivateMetaStrict()`（抛错版）供构建期脚本用，`getPrivateMeta()`（降级版）保留供公开聚合场景。

2. **`Vary: Cookie` 的定位是「防御性冗余」，不是替代 `no-store`**：`no-store` 已禁止所有缓存，`Vary: Cookie` 对缓存本身冗余；它真正的意义是「万一某层 CDN/中间层不认 `no-store` 时的第二道保险」。必须在文档/代码注释里写清——**不能因为加了 `Vary: Cookie` 就省略 `no-store`**，否则是安全隐患。

3. **登出接口需补 CSRF 防护，不只是「POST + 校验来源」**：仅校验 POST + 来源不够，攻击者可用 `<form>`/`img` 诱导管理员被登出。补：`SameSite=Lax`（或 Strict）的 Cookie + 登出用一次性 token / 同源校验（`Origin`/`Referer` 白名单）。当前方案第 5 条只写了「登出为 POST 并校验来源」，粒度不够。

4. **`X-Robots-Tag: noindex` 防的是「偶发 URL 泄露后被收录」，不是防 sitemap**：`prerender=false` 页面本就不进 sitemap（自动），但搜索引擎仍可能通过外链/手滑分享直接抓取到 `/private/` 与映射路由 URL，没有 `noindex` 就会被收录。验证步骤 13 应独立验证「直接抓取返回 noindex」，而非只确认「不进 sitemap」。

5. **构建期写 KV 的两个坑（测试 2 实测）**：① `wrangler kv key put` 默认写 local（本地模拟），必须加 `--remote` 才写线上 KV；② CI 里写 KV 需要 `CLOUDFLARE_API_TOKEN` 具备 KV 写权限（当前 GitHub Actions 的 token 是「Edit Cloudflare Workers」，需确认/扩权）。

### 8.2 取数入口收敛清单（本阶段执行）

把以下散落的 `getCollection("posts")` 统一收敛，消除 draft 泄漏与绕过统一入口的隐患：

**直接不过滤 draft 的泄漏点（4 处，改为走 `getPublicPosts()`）：**
- `src/pages/debug-urls.astro:5`
- `src/pages/bangumi.astro:32`
- `src/pages/og/[...slug].png.ts:29`
- `src/components/layout/NavbarProfileCard.astro:82`

**带过滤但绕过统一入口的（5 处，改为走 `getPublicPosts()`）：**
- `src/components/layout/HomeTicker.astro:25`
- `src/components/layout/MobileMenuSheet.astro:8`
- `src/components/widget/RecentItems.astro:10`
- `src/utils/tag-graph-data.ts:37`
- `src/pages/categories/[...category].astro:30`

> 说明：`content-utils.ts` 的聚合函数（`getArchiveList`/`getSortedPosts`/`getTagList`/`getCategoryList`/`getCategoryTree`）已统一走 `getPublicPosts()`，无需改动；下阶段「合并私有」时把它们的取数从 `getPublicPosts` 换成「登录态下 `getMergedPosts`」即可，收敛后只需改一处。

## 九、本阶段与后续阶段的边界

**本阶段交付**
- M0 前置验证通过（管线 + 兜底路由）
- 登录 UI 与排队点击、Swup 缓存清理、响应头、白名单清洗
- `/private/` 管理入口 + `/private/<slug>/` 过渡详情
- 映射路由渲染（单篇文章在映射位置可访问）

**不在本阶段（下一阶段）**
- 归档、目录、标签池、最近更新、统计图表与私有条目的合并（直接读取同一份 meta.json，链接用 route）
- 客户端私有 meta store / 渲染器
- Server Island 化与 fallback 设计

**已知限制**
- 私密页面不进入 sitemap、RSS 与 Pagefind，登录后私密文章不可搜索；如需搜索另列需求
- 聚合合并后，标题、数量、标签都是泄露面，必须登录后才合并

## 十、验证步骤

1. `pnpm check`、`pnpm type-check`、`pnpm build`、`pnpm exec biome ci ./src --reporter=github` 全绿
2. M0：已实测——构建期渲染 + KV 方案下 worker 体积降到几 MB（无 shiki）；SSR 路由在 `not_found_handling="404-page"` 下已能命中，无需改 `none`
3. 游客请求 `/private/`：登录门、无任何私有数据；用 curl 保存响应体搜索已知私密标题应完全找不到
4. 游客请求映射路由（存在 / 不存在的 route）：均为 404 且响应一致；curl 响应体无私密标题
5. 管理员登录后：`/private/` 列表可见；映射路由正文、hero、TOC 正常（正文从 KV 读出）
6. 登出后用旧 Cookie 重放请求：被拒绝（404，按映射规则）
7. 非法 slug / route 变体：`%2e%2e`、`%2f`、`a//b`、尾部斜杠、超长字符串、前缀白名单外 route、与公开页面重名 route
8. 私有仓库放一篇含 `<script>`、`<img onerror>`、`<svg onload>`、`javascript:` 链接的测试文章，确认构建期渲染 + sanitize 后全部被去除
9. 响应头检查：`Cache-Control`、`Vary: Cookie`、`X-Robots-Tag` 都已设置
10. 两个会话（管理员 + 游客）交替请求同一 URL，确认响应不串
11. Swup：游客先访问 `/private/` 再登录，应看到列表；登出后后退、预载、bfcache 都不再显示私密内容
12. KV 未命中（构建期未写入）：映射路由返回 404（响应形态一致，不泄露）；构建期脚本跑通后，验证 KV 里有 `private:html:<slug>` 且运行时能读回
13. 确认 `/private/` 与映射路由未进入 sitemap、RSS、Pagefind
14. 部署到线上 blog 仅在 Swup 缓存处理验证完成后执行
15. 构建期脚本端到端：改私有仓库一篇文章 → 触发重新构建 → 线上映射路由正文更新（验证「构建期渲染 + KV」闭环）

## 十一、遗留项（不阻塞）

- 旧 WNAM D1 库（`65326a47-...`）是否删除
- AUTH_SECRET 残留 secret 是否已删
- `lh_SSR` 分支推送远程的时机（本阶段完成后统一 push）
- Server Island 加密密钥是否需要固定（阶段 5 前确认，以 7.1.6 文档为准）
- **构建期脚本的 CI 写入 KV 权限**：GitHub Actions 的 `CLOUDFLARE_API_TOKEN` 需确认是否具备 KV 写权限（当前是「Edit Cloudflare Workers」），否则构建期脚本无法 `--remote` 写 KV
- **构建期脚本的 GH 访问**：CI 里拉私有仓库需要 `GH_PAT`（或 `GH_TOKEN`）secret，且要配置在 GitHub Actions 环境变量（非仅 `.dev.vars`，因 `.dev.vars` 只给 wrangler dev 用）

## 十二、一句话总结

私有内容仍存私有仓库，访问路由由元数据 `route` 字段决定（独立前缀如 `/diary/`）；**构建期（Node）用完整管线渲染 markdown 成 HTML 存入 KV，运行时（workerd）只做 D1 鉴权 + 读 KV 返回**——「渲染」与「鉴权」解耦，既保留 shiki 高亮、又让 worker 体积从 60MB 降到几 MB；退出登录后映射路由对游客返回 404，`/private/` 只作为管理入口。
