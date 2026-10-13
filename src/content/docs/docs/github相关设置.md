---
title: 快速上手
description: 本地开发环境准备与常用命令
---

## CI 工作流（workflows/）

| 文件 | 触发条件 | 作用 |
| --- | --- | --- |
| deploy.yml | push 到 lh / 手动 | **生产自动部署**：pnpm build（注入 Actions Secrets 构建期变量）→ wrangler deploy 上传到 Cloudflare Workers（blog.5484826.xyz），见 `docs/deploy-cloudeflare-workers.md` |
| build.yml | push 到 lh / PR | CI 质量门：在 Node 22 和 23 两个版本上跑 astro check 类型检查 + pnpm build，保证代码能正常构建 |
| biome.yml | push 到 lh / PR | 代码风格检查：跑 biome ci ./src，版本自动读 package.json（固定 2.5.7），避免规则漂移 |
| friend-status.yml | 每天凌晨 5:17 定时运行 | 友链状态检测：跑 scripts/友链状态检测/index.mjs 检查各友链站点是否可访问，把结果写入 public/friends-status.json 并自动提交 |
| friend-screenshots.yml | 每周日凌晨 3:23，或 friends 内容有变动时 | 友链站点截图：用 Playwright 给友链网站截图存档 |