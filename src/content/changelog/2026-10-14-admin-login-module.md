---
version: "v1.63.0"
date: 2026-10-14
time: "11:00"
type: feature
description: 新增管理员登录模块：密码登录后解锁私密空间与导航页远端隐藏条目
---

## 管理员登录与私密内容

- **管理员认证**：右下角坞站 / 移动菜单新增「管理」按钮，输入密码登录后 7 天免输（HttpOnly 签名 Cookie）。登录失败连续 5 次冷却 30 秒（`src/utils/auth-store.ts`、`src/components/security/`）。
- **私密空间**：新增 `/private/`（私密文章索引）与 `/private/<slug>`（私密文章）页面。游客看到登录门，不发任何内容请求；管理员登录后动态拉取渲染（`src/pages/private/[...slug].astro`）。
- **导航页合并注入**：网站导航 `/projects/` 登录后自动合并显示远端隐藏条目（按分类注入、参与搜索/标签筛选），未登录零请求零注入（`src/pages/projects.astro`）。
- **内容源隔离**：隐藏内容存放在 GitHub **私有仓库**（`blog-private`），Worker 用只读 PAT 按需拉取 + KV 缓存（TTL 300s），**不进入部署产物**，游客抓取 dist 也拿不到（`worker/index.ts`）。
- **安全细节**：密码常量时间比较、Cookie HMAC 防篡改、登录限流、私密页 `noindex` + sitemap 排除；未登录访问 `/api/private/*` 返回 401。
- **部署要求**：Worker 需配置 5 个运行时 Secrets（`ADMIN_PASSWORD/AUTH_SECRET/GH_PAT/GH_OWNER/GH_REPO`）与 KV Namespace，详见 `docs/deploy-cloudeflare-workers.md` 第七节。
