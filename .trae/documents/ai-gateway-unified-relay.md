# AI Gateway 统一中转：免费模型优先 + 多厂商 BYOK

## 摘要

将文章摘要脚本的调用链路从"自建 ai-relay Worker → DashScope"升级为 **Cloudflare 官方 AI Gateway 统一中转**：
一个网关入口承接多个模型来源 —— 默认走 **Workers AI 免费额度**（`@cf/qwen/qwen3-30b-a3b-fp8`，零成本），
DashScope qwen-plus 作为付费备选（Custom Provider + BYOK），后续可零代码加 OpenAI/DeepSeek 等厂商 key。

## 用户设想的评估结论

思路没有问题，这正是 AI Gateway 的设计场景（OpenRouter 模式：统一 API + 多 provider）。需澄清 4 点：

1. **Workers AI 不是"key"，是账号免费配额**（10,000 Neurons/天，UTC 0 点重置）。接入 AI Gateway 的 `workersai` provider 无需任何 key，走账号授权。
2. **免费额度对摘要任务完全够用**：免费模型 `@cf/qwen/qwen3-30b-a3b-fp8` 定价 4625/30475 neurons/M tokens，一次摘要约 10 neurons ≈ 1000 次/天。
3. **免费模型是开源模型**（qwen3-30b 等），摘要质量与 qwen-plus 有差距 → 默认免费优先，保留 `dashscope/qwen-plus` 备选一键切换。
4. **DashScope 需 Custom Provider 接入**（AI Gateway 原生列表无 DashScope，但有 Custom Providers 功能，base\_url 指向 `https://dashscope.aliyuncs.com/compatible-mode/v1` 即可），key 用 BYOK 存 dashboard，不落本地。

## 现状分析

* [ai-relay Worker](file:///e:/_Server/blog/workers/ai-relay/src/index.ts)：自建中转，`AUTH_TOKEN` 鉴权，硬转发 DashScope（`UPSTREAM_BASE` 固定），已部署在 `https://ai-relay.sgwfmyl.workers.dev`。

* [生成摘要脚本](file:///e:/_Server/blog/scripts/生成摘要/index.ts)：读 `.env` 的 `AI_RELAY_URL`/`AI_RELAY_TOKEN`，POST `${RELAY_URL}/chat/completions`，模型 `qwen-plus`。

* `.env` / `.env.example`：含 `AI_RELAY_URL`/`AI_RELAY_TOKEN`；`DASHSCOPE_API_KEY` 已被用户删除。

* `cli.js` 的 `desc` 命令：`pnpm exec tsx --env-file=.env scripts/生成摘要/index.ts`，无需改动。

* 工作区存在大量与本任务无关的在途改动（bangumi 删除、下载影视等），本次不触碰。

## 目标架构

```
pnpm cli desc
  → scripts/生成摘要/index.ts（本地只持 AI_GATEWAY_URL + 访问令牌）
  → https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat/chat/completions
      ├─ 默认: workersai/@cf/qwen/qwen3-30b-a3b-fp8   （Workers AI 免费额度）
      ├─ 备选: dashscope/qwen-plus                      （Custom Provider + BYOK）
      └─ 未来: openai/…  deepseek/…  openrouter/…      （原生 provider，零代码）
```

## 具体改动

### Step 1：创建 AI Gateway（云端，需用户配合或提供 API Token）

* **gateway**：slug `blog-ai`（Account ID `4b5823510fe3af8ee9cf1165e9beb510`）。

* **Custom Provider** **`dashscope`**：`base_url = https://dashscope.aliyuncs.com/compatible-mode/v1`，`enable=true`。

* **BYOK**：为 dashscope 存 `DASHSCOPE_API_KEY`（用户提供 key，或用户自行在 Dashboard 填入）。

* 两种执行方式：

  * **A（推荐给用户）**：Dashboard 手动创建（AI Gateway → Gateways → 新建 blog-ai → Custom Providers → Add DashScope；BYOK 在 Providers 里填 key）。无需导出任何 token。

  * **B（我代建）**：用户提供带 `AI Gateway:Edit` 权限的 API Token，我通过 REST API 创建 gateway + custom provider；BYOK 仍需用户填 key（或用户提供 key 由我写入）。

### Step 2：鉴权方案（默认 A，备选 B）

* **A. Authenticated Gateway**：网关启用认证，脚本请求头带 `cf-aig-authorization: Bearer <CLOUDFLARE_API_TOKEN>`。Cloudflare API Token（**最小权限：仅 AI Gateway**）存 `.env`（gitignore）。

* **B. 前置守卫 Worker（更安全变体，若用户不想在本地放 Cloudflare Token）**：保留 ai-relay Worker 只做 `AUTH_TOKEN` 校验 + 转发到 gateway（Cloudflare Token 存 Worker Secret，本地不放）。本计划默认按 A，用户可回退 B。

### Step 3：改造生成摘要脚本

[scripts/生成摘要/index.ts](file:///e:/_Server/blog/scripts/生成摘要/index.ts)：

* 环境变量：删除 `AI_RELAY_URL`/`AI_RELAY_TOKEN` 读取，改为

  * `AI_GATEWAY_URL`：`https://gateway.ai.cloudflare.com/v1/{account_id}/blog-ai`（不含尾斜杠）

  * `AI_GATEWAY_TOKEN`：Cloudflare API Token（对应 `cf-aig-authorization`）

  * `AI_MODEL`：默认 `workersai/@cf/qwen/qwen3-30b-a3b-fp8`，可被 `--model=` CLI 参数覆盖

* 请求：`POST ${AI_GATEWAY_URL}/compat/chat/completions`，headers 增加 `cf-aig-authorization`，body 的 `model` 用 `AI_MODEL`。

* 启动日志打印当前模型与来源（免费/付费），方便区分。

* 顶部注释更新调用链路说明。

### Step 4：更新环境变量文件

* `.env`：删 `AI_RELAY_URL`/`AI_RELAY_TOKEN`，新增 `AI_GATEWAY_URL`、`AI_GATEWAY_TOKEN`、`AI_MODEL`。

* `.env.example`：同步新增三个变量的空模板与注释。

### Step 5：退役 ai-relay Worker

* 删除本地目录 `workers/ai-relay/`（wrangler.toml + src）。

* `pnpm exec wrangler delete ai-relay` 删除线上 Worker（无用量零成本，删除保持干净）。

### Step 6：文档与收尾

* `CLAUDE.md`：第 0 节命令表 `pnpm cli desc` 说明更新为 AI Gateway；脚本清单若提及 ai-relay 同步更新。

* `src/content/changelog/`：更新 `2026-10-13-ai-relay-worker.md` 为最终方案（或新增 `2026-10-13-ai-gateway.md`，version `v1.62.0`→最终版；若上轮 v1.62.0 未提交，合并为一条）。

* 提交：仅暂存本任务相关文件（脚本、.env.example、CLAUDE.md、changelog、删除 ai-relay），不碰工作区其它在途改动。

## 假设与决策

* 网关名 slug 用 `blog-ai`；免费模型默认 `@cf/qwen/qwen3-30b-a3b-fp8`（当前定价最便宜的 qwen 模型，写计划时已核实）。

* 鉴权默认 Authenticated Gateway + 最小权限 Cloudflare API Token 存 `.env`（gitignore，绝不入库）。

* DashScope key 由用户在 Dashboard BYOK 填入（遵循用户"去网站上自己链接"的偏好）。

* 免费模型质量略降可接受（用户已确认"免费模型优先"）。

* 本次不做 Vectorize/AI Search 等扩展，仅在答复中盘点。

## 验证步骤

1. 用默认免费模型对一篇真实文章跑 `pnpm cli desc`（或最小 chat 请求）→ 成功生成 description。
2. `--model=dashscope/qwen-plus` 切换验证备选链路（需 BYOK key 已填）。
3. 错误令牌请求 → 401（Authenticated Gateway 生效）。
4. `pnpm exec biome ci ./src --reporter=github` 全绿（若脚本在 src 外则跳过，脚本为 scripts/ 非 src/）。
5. 浏览器/控制台无相关回归（本改动不涉及前端）。

## 其他 Cloudflare AI 工具盘点（咨询答复，本次不实施）

| 工具                                    | 作用                                                                        | 对博客的相关性        |
| ------------------------------------- | ------------------------------------------------------------------------- | -------------- |
| Workers AI                            | 免费/按量推理，模型目录含 qwen/llama/gemma/deepseek/glm                               | 本次已用（摘要）       |
| AI Gateway                            | 统一入口、缓存、限流、BYOK、Unified Billing（credits 预付费 keyless）、fallback/A-B 路由、观测日志 | 本次核心           |
| Vectorize                             | 向量数据库，RAG 站内检索                                                            | 可做站内语义搜索（可选后续） |
| AI Search                             | 可嵌入 AI 搜索组件                                                               | 博客站搜索增强（可选后续）  |
| Agents SDK                            | 有状态 agent、工具调用、记忆                                                         | 与静态博客关系小       |
| AI Lint                               | CI 中评估 prompt/模型选择                                                        | 可选，成本低         |
| Images / Realtime / Browser Rendering | 图像优化 / 实时语音 / 浏览器自动化                                                      | 与摘要脚本无关        |

## 执行前置依赖

* Step 1 需要用户决策：Dashboard 自建（A）或提供 API Token 由我代建（B）。

* Step 1/2 需要 Cloudflare API Token（Authenticated Gateway 用，最小权限）与 DashScope key（BYOK 用）。

