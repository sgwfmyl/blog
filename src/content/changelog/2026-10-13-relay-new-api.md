---
version: "v1.62.0"
date: 2026-10-13
time: "18:30"
type: feature
description: 文章摘要脚本（pnpm cli desc）改经自建 new-api 中转站（ai.5484826.xyz）调用，模型与令牌均可配置
---

## 文章摘要脚本接入自建 new-api 中转站

- `scripts/生成摘要/index.ts` 不再直连任何厂商 API：模型名改为从 `.env` 的 `AI_MODEL` 读取（须与 new-api 渠道「模型」填写的完整模型 ID 逐字一致，如 Cloudflare Workers AI 免费模型 `@cf/qwen/qwen3-30b-a3b-fp8`），并新增 `AI_RELAY_TOKEN` / `AI_MODEL` 缺失校验；`max_tokens` 提升至 1024 以兼容推理型模型；空字符串 `description` 占位视为待补全（整行替换写入）。
- 中转地址 `AI_RELAY_URL` 指向自建 new-api（`https://ai.5484826.xyz/v1`，OpenAI 兼容端点），渠道可自由切换（Cloudflare Workers AI 免费模型 / 其它厂商 BYOK），本地不再持有任何厂商密钥。
- 环境变量同步：`.env`、`.env.example` 调整为 `AI_RELAY_URL` / `AI_RELAY_TOKEN` / `AI_MODEL` 三件套。
- 移除 Cloudflare `ai-relay` Worker（本地 `workers/ai-relay/` 目录与线上 Worker 一并删除，上游密钥不再存于云端）。
