---
title: 快速上手
description: 本地开发环境准备与常用命令
---

## 环境要求

- Node.js >= 22
- pnpm 9.14（`preinstall` 会强制校验，其他包管理器无法安装依赖）

## 安装依赖

```bash
pnpm install
```

## 本地开发

```bash
pnpm dev
```

本地 dev / build 前请先按 `.env.example` 准备 `.env`，缺失 `PUBLIC_*` 变量不会报错，但对应功能会静默降级。

## 构建与校验

```bash
pnpm build
```

`pnpm build` 会依次执行：生成图标 → `astro build` → Pagefind 索引。

提交前建议一并跑通：

```bash
pnpm check
pnpm type-check
pnpm exec biome ci ./src --reporter=github
```
