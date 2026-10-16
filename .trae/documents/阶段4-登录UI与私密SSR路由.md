# 阶段 4（修订稿）：私有内容路由映射 + SSR 闭环

分支：`lh_SSR`（领先基线 4 个 commit：阶段 1-3）。本计划完整采纳站长审查意见，将原「独立 /private/ 空间」方案改为「私有仓库元数据声明路由、SSR 在映射位置按登录态渲染」。

## 一、问题与结论

原计划问题：私有内容统一放在 `/private/` 与 `/private/<slug>/` 下，相当于把所有私有页面集中在一个独立空间：
- URL 与公开文章不在同一前缀
- 不会出现在归档、目录、标签池、最近更新中
- 与最初目标「程序上像静态内容一样点击、退出登录即卸载」不一致

**修订结论：采用「路由映射」**——私有仓库元数据声明每篇内容的访问路由，SSR 在该路由上按登录态渲染。`/private/` 仅保留为管理入口。

## 二、核心理念：存储位置与访问路由解耦

| 含义 | 现状 | 修订后 |
|---|---|---|
| 存储位置 | 文件在私有仓库中的路径（`private/pages/<slug>.md`） | 已有，保持不变 |
| 访问路由 | 浏览器地址栏的 URL，固定 `/private/<slug>/` | 由元数据的 `route` 字段决定 |
| 连接 | — | 映射表：内容文件统一存储，路由散布在允许前缀下 |

## 三、元数据格式

私有仓库 `private/meta.json` 每条记录增加 `route`：

```json
{
  "items": [
    { "slug": "hello-post", "route": "/diary/hello-post/", "title": "...", "date": "...", "category": "...", "tags": ["..."] },
    { "slug": "私密/观影记录", "route": "/diary/观影记录/" }
  ]
}
```

- `route` 缺省值为 `/private/<slug>/`（等于现状），现在就加上字段，避免后续改数据格式
- 元数据读取经 KV 缓存（TTL 300 秒，沿用 `ADMIN_KV`）
- **映射前缀调整说明**：审查示例中的 `/posts/hello-post/` 无法落地——`src/pages/posts/[...slug].astro` 已占用 posts 前缀（公开文章静态路由），Astro 不允许同前缀双路由模式；本阶段白名单前缀从独立前缀开始（如 `/diary/`），落在公开前缀（posts 等）的 route 条目按「公开优先」规则丢弃告警（见四.4）

## 四、路由规则（必须执行）

1. **前缀白名单**：`route` 只允许落在配置的前缀下（初始 `PRIVATE_ROUTE_PREFIXES = ["diary"]`，每个前缀一个 SSR rest 路由文件，可扩展），禁止覆盖 `/api/`、`/_astro/` 等系统路径
2. **规范化**：拒绝 `..`、`//`、查询串、空路径段、控制字符；百分号编码解码后再校验；统一尾部斜杠
3. **公开优先**：`route` 与公开静态页面冲突时公开页面胜出，该条目记录告警并丢弃
4. **路由唯一**：两条记录 `route` 重复时拒绝并记录日志
5. **slug 校验**：拒绝空段、首尾斜杠、`..`；字符范围按实际文件名确定（`\u4e00-\u9fa5` 仅覆盖基础汉字，假名/扩展汉字按实际调整）；请求 GitHub 前统一规范化
6. **未授权统一 404**：映射不存在、未登录、私有源故障，对映射路由的响应形态一致（404）

## 五、请求流程

**映射路由（如 `/diary/hello-post/`）**
1. 公开静态页面未命中，落到 SSR 兜底路由（需 `not_found_handling = "none"`，见 M0）
2. 读取（带缓存的）`meta.json`，按 `route` 查找条目
3. 未找到或未登录 → **404**，不显示登录门（路由本身是私有的）
4. 已登录 → 拉取 slug 对应正文并服务端渲染，走公开文章页同款排版（post-hero + `#post-container` + `.markdown-content prose` + TOC 浮层）
5. 退出登录后第 3 步对该路由自然生效，即「卸载」

**`/private/` 固定入口**
- 路由本身公开存在，未登录显示登录门，不拉任何私有数据
- 已登录显示列表，链接直接使用每条记录的 `route`
- 与「未授权统一 404」的区别记入决策表：`/private/` 对所有请求返回一致内容，不泄露具体文章是否存在
- `/private/<slug>/` 详情路由**过渡期保留**（兼容旧书签），与映射路由共用同一套渲染骨架

## 六、变更清单

### M0 前置验证（新增，必须先做，go/no-go 闸门）

这两项的结果决定后面是否需要换实现，先在 preview Worker 上验证：

1. **Markdown 管线能否在 Workers 运行**：做一个最小 SSR 页面（`prerender = false`）渲染固定 markdown（含代码块 / katex 公式 / callouts），部署 preview Worker：
   - 检查 `createMarkdownProcessor` + shiki（WASM 动态编译限制 / 正则引擎、语法与主题资源加载）、katex、各 rehype 插件是否依赖 `node:fs`/`node:path`/构建期上下文
   - 记录打包体积（wrangler deploy 输出）与冷启动耗时（首次请求计时）
   - **失败回退**：简化渲染 = `marked` + `sanitize-html`（渲染效果打折但可用），连锁调整 M1 的 private-render.ts
2. **兜底路由能否接到静态未命中请求**：将根 `wrangler.toml` 的 `[assets] not_found_handling` 从 `"404-page"` 改为 `"none"`（允许未命中进入 Worker；改后需重新 `pnpm build` 才写入 `dist/server/wrangler.json`），验证：
   - 静态未命中（如 `/diary/xxx/`）进入 Worker SSR 路由
   - 真 404 路径仍返回 404（Astro SSR 无匹配时的行为）
   - 尾部斜杠、多级路径表现（`trailingSlash: "always"`）
   - **失败回退**：让对应前缀整体走 SSR

### M1 数据层与渲染器

**1. [src/utils/private-source.ts](file:///e:/_Server/blog/src/utils/private-source.ts)（修改）**
- 导出 `fetchGitHubFile`（改 `export`）
- 新增 `PRIVATE_ROUTE_PREFIXES`（前缀白名单常量）、`isValidPrivateSlug`（正则 + 拒绝 `..`/空段/首尾斜杠）、`normalizeRoute`（decode → 前缀校验 → 拒绝 `..`/`//`/查询串/控制字符 → 统一尾斜杠）、`getPrivatePost(slug)`（校验后拉 `private/pages/<slug>.md`，走 KV 缓存 300s）
- `getPrivateMeta()` 返回带 `route` 的条目，并执行四.1-4 路由规则校验（前缀白名单、公开冲突丢弃、route 唯一）；`PrivateMetaItem` 类型增加 `route?: string`
- 新增 `getPrivateEntryByRoute(route)`：从元数据按规范化 route 查找

**2. [src/config/markdown.ts](file:///e:/_Server/blog/src/config/markdown.ts)（新建，共享管线配置）**
- 从 [astro.config.mjs](file:///e:/_Server/blog/astro.config.mjs#L302-L332) 抽出 remarkPlugins / rehypePlugins / shikiConfig，`astro.config.mjs` 与 `private-render.ts` 同时从它导入，避免公开与私有管线漂移
- 不启用 `remarkMermaid`/`rehypeMermaid`/`rehypeComponents` 作为**明确的已知差异**写入决策表（复杂度高，私密内容暂不需要）
- 同时从 astro.config.mjs 抽出 remarkReadingTime/remarkExcerpt（构建期 frontmatter 依赖，公开侧保留，私有侧不引入）

**3. [src/utils/private-render.ts](file:///e:/_Server/blog/src/utils/private-render.ts)（新建，服务端 markdown 渲染）**
- `createMarkdownProcessor`（`@astrojs/markdown-remark`）单例缓存（模块级 `processorPromise`，跨请求复用）
- 渲染前剥离 YAML frontmatter（复用旧 private-renderer 的 `stripFrontmatter` 正则）
- 渲染后 **sanitize-html 白名单清洗**（见七.2），返回 `{ html, headings }`（headings 供 SidebarTOC）

**4. [src/utils/auth-context.ts](file:///e:/_Server/blog/src/utils/auth-context.ts)（新建）**
- `isAdminRequest(request)`：服务端解析 cookie 头取 `blog_admin` token → `verifySession(token)`（D1 强一致）；页面内优先用 `Astro.cookies.get(AUTH_COOKIE_NAME)` 读取，不手写 split 解析（值含 `=` 或编码场景交给框架）

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
- 流程：slug 校验 → `isAdminRequest` → 查 meta 条目 → `getPrivatePost(slug)` → `renderPrivateMarkdown` → PrivatePostView
- 错误码：slug 非法 / meta 无匹配 → **404**；GitHub 上游异常（限流/网络）→ **503** + 通用提示（不渲染错误详情）
- 响应头同上

**16. 映射兜底路由（新建，每前缀一个）**
- 例：[src/pages/diary/[...slug].astro](file:///e:/_Server/blog/src/pages/diary/[...slug].astro)（`prerender = false`，省略 getStaticPaths）
- 流程：`normalizeRoute(request path)` → `getPrivateEntryByRoute` → 未找到或未登录 → **404**（不显示登录门）；已登录 → 正文渲染（PrivatePostView）
- 响应头：`Cache-Control: private, no-store`、`Vary: Cookie`、`X-Robots-Tag: noindex, nofollow`
- 真 404 与上游故障同样返回 404（响应形态一致，不泄露路由存在）；上游异常 503 仅限已登录且条目命中但正文拉取失败

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
| 上游异常 | 503 通用提示（登录后命中但正文拉取失败） | 不泄露错误详情 |
| 映射前缀 | 独立前缀（如 `/diary/`），posts 等公开前缀不映射 | posts 前缀被静态路由占用，Astro 同前缀不能双路由 |
| CSP | 本阶段验证兼容性后与站长确认 | 现有 inline 脚本多，需谨慎 |

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
2. M0：preview Worker 上记录最小 SSR 页面体积与耗时；验证兜底路由在静态未命中时被调用（not_found_handling="none"），真 404 行为不变
3. 游客请求 `/private/`：登录门、无任何私有数据；用 curl 保存响应体搜索已知私密标题应完全找不到
4. 游客请求映射路由（存在 / 不存在的 route）：均为 404 且响应一致；curl 响应体无私密标题
5. 管理员登录后：`/private/` 列表可见；映射路由正文、hero、TOC 正常
6. 登出后用旧 Cookie 重放请求：被拒绝（404，按映射规则）
7. 非法 slug / route 变体：`%2e%2e`、`%2f`、`a//b`、尾部斜杠、超长字符串、前缀白名单外 route、与公开页面重名 route
8. 私有仓库放一篇含 `<script>`、`<img onerror>`、`<svg onload>`、`javascript:` 链接的测试文章，确认渲染后全部被去除
9. 响应头检查：`Cache-Control`、`Vary: Cookie`、`X-Robots-Tag` 都已设置
10. 两个会话（管理员 + 游客）交替请求同一 URL，确认响应不串
11. Swup：游客先访问 `/private/` 再登录，应看到列表；登出后后退、预载、bfcache 都不再显示私密内容
12. 私有源故障（限流/网络）：映射路由 404（游客/未命中）或 503（已登录命中但拉取失败），页面不含错误详情
13. 确认 `/private/` 与映射路由未进入 sitemap、RSS、Pagefind
14. 部署到线上 blog 仅在 Swup 缓存处理验证完成后执行

## 十一、遗留项（不阻塞）

- 旧 WNAM D1 库（`65326a47-...`）是否删除
- AUTH_SECRET 残留 secret 是否已删
- `lh_SSR` 分支推送远程的时机（本阶段完成后统一 push）
- Server Island 加密密钥是否需要固定（阶段 5 前确认，以 7.1.6 文档为准）

## 十二、一句话总结

正文仍统一存在私有仓库，访问路由由元数据的 `route` 字段决定；登录后 SSR 在映射位置渲染，退出后该路由对游客返回 404，`/private/` 只作为管理入口；先用 M0 验证 Workers 管线与兜底路由两个前提，再落地登录 UI 与映射渲染，补齐响应头、白名单清洗与 Swup 缓存处理。
