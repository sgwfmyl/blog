---
version: "v1.61.0"
date: 2026-10-12
time: "18:00"
type: removal
description: 移除文章封面生成工具（pnpm cli cover 命令与 scripts/生成封面 脚本）
---

## 移除文章封面生成工具

- 移除 `pnpm cli cover` 命令（`scripts/cli.js`）与 `scripts/生成封面/index.ts` 脚本，「黑板粉笔手绘风」AI 封面自动生成功能下线。
- 同步清理 `CLAUDE.md` 第 0/2 节相关引用（命令表、脚本清单、图片目录表 `post-covers/`、功能说明段落）。
- 不影响文章封面本身：frontmatter 的 `image:` 字段、随机封面池 `public/assets/images/covers/`（62 张）与 `coverImageConfig` 均保留，封面仍可手动指定或走随机池。
- 文章封面改为在其他环节人工准备（图床 `post-covers/` 目录仍在使用，历史封面 URL 不受影响）。