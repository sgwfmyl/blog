---
title: OpenCode Go 接入 CC Switch：Claude Code 原生 API 格式配置教程
published: 2026-08-08
tags:
  - OpenCode
  - Claude Code
  - CC Switch
  - AI 编程
  - 教程
description: 想用 Claude Code 又不想碰官方 API 的定价？OpenCode Go 订阅自带 Anthropic 原生格式端点，配合 CC Switch 桌面端，填一个 Base URL 加 API Key 就能把 Claude Code 切到 Go 的模型上，Qwen3.8 Max、MiniMax M3 随便切。
image: https://img.tsh520.cn/file/blog/post-covers/ai-opencode-ccswitch.webp
---

> Claude Code 不一定要用官方 API。把 OpenCode Go 的端点接进 CC Switch，一套订阅就能让 Claude Code 跑在 Qwen3.8 Max 上。

---

# 背景

用 Claude Code 的都知道这两个坎：

- ❌ 官方订阅要绑定国外支付，API 按 token 计费贵得肉疼
- ❌ 第三方中转水太深，隐私没保障，随时跑路

而 OpenCode Go 订阅（首月 \$5，之后 \$10/月）本身就是「给你 API Key 的订阅制服务」，而且它**原生提供 Anthropic 格式的端点**——也就是说 Claude Code 可以直接把它当官方 API 用，不用任何格式转换。

再配合 CC Switch 这个开源桌面工具，一键切换 Provider，官方 API、Go、其他中转想用哪个用哪个。

---

# 一、准备工作

## 1. 订阅 OpenCode Go 并拿到 API Key

打开控制台：

```text
https://opencode.ai/auth
```

登录后订阅 Go（支持支付宝付款），然后在控制台里复制你的 **API Key**，先存好备用。

> 还没订阅？首月 \$5（≈35 元），订阅后模型随便用。可以用我的邀请链接注册，咱俩各得 \$5：[https://opencode.ai/go?ref=1MKPWMM7TS](https://opencode.ai/go?ref=1MKPWMM7TS)

## 2. 安装 CC Switch

去 GitHub Releases 下载安装：

- https://github.com/farion1231/cc-switch

Windows 选 `CC-Switch-v{版本}-Windows.msi`，装完打开。

---

# 二、原理：为什么能直接接

Claude Code 走的是 Anthropic 的 Messages API，而 OpenCode Go 就提供了 Anthropic 格式的端点：

```text
Base URL:  https://opencode.ai/zen/go/v1
```

走这个端点的模型（官方文档标注 `@ai-sdk/anthropic`）：

| 模型 | 模型 ID | 用量限制（每 5 小时） |
|---|---|---|
| Qwen3.8 Max | `qwen3.8-max` | 160 次 |
| Qwen3.7 Max | `qwen3.7-max` | 340 次 |
| Qwen3.7 Plus | `qwen3.7-plus` | 4,300 次 |
| Qwen3.6 Plus | `qwen3.6-plus` | 3,300 次 |
| MiniMax M3 | `minimax-m3` | 3,200 次 |
| MiniMax M2.7 | `minimax-m2.7` | 3,400 次 |

所以 Claude Code 里填这个 Base URL + 你的 API Key，协议就是原生的，不需要任何中转或转换层。

---

# 三、CC Switch 添加 Provider

打开 CC Switch，点击「添加 Provider」：

## 1. 选择工具

工具类型选 **Claude Code**。

## 2. 填写配置

| 配置项 | 填写内容 |
|---|---|
| 名称 | `OpenCode Go`（随意，方便辨认就行） |
| API Key | 你的 OpenCode Go API Key |
| Base URL | `https://opencode.ai/zen/go/v1` |
| 模型 | `qwen3.8-max`、`qwen3.7-plus`、`minimax-m3` 等，换行分隔 |
| 思考模式 | 按需开启 |

## 3. 保存并启用

保存后，在 Provider 列表里选中「OpenCode Go」，点击**启用**。

> 💡 CC Switch 对 Claude Code 支持热切换，不用重启终端就能生效。其他工具（Codex、Gemini CLI 等）切换后需要重启终端。

---

# 四、验证

打开 Claude Code，输入：

```text
/status
```

确认当前使用的模型和端点已经变成 OpenCode Go。再随便问一句，能正常回复就说明通了。

也可以直接 `/model` 切换列表里的模型，Qwen3.8 Max 写代码，MiniMax M3 量大管饱，按需切换。

---

# 五、注意事项

- ⚠️ **DeepSeek V4 Flash 用不了原生格式**：Go 的 DeepSeek 系列走的是 OpenAI 格式端点（`/chat/completions`），Claude Code 原生只认 Anthropic 格式。想用 DeepSeek 的话，需要 CC Switch 的本地代理做格式转换，属于进阶玩法，以后单独写一篇。
- ⚠️ **API Key 别泄露**：Key 在控制台里能随时查看，泄露了立刻去控制台重置。
- ⚠️ **用量是订阅制的**：Qwen3.8 Max 这类旗舰模型每 5 小时 160 次左右，日常够用；写日常小任务建议常驻 Qwen3.7 Plus（4,300 次/5 小时），完全跑不完。
- ✅ **想回官方 API**：在 CC Switch 里启用「官方登录」预设，跑一遍 Claude Code 的登录流程即可切回。

---

# 结语

一套 \$10/月的 OpenCode Go 订阅，通过 CC Switch 接到 Claude Code 上，等于用订阅价享受了「原生 API」的体验——不碰官方计费、不用中转平台、支付宝就能付款。

订阅入口（用我的链接注册，咱俩各得 \$5）：

👉 [https://opencode.ai/go?ref=1MKPWMM7TS](https://opencode.ai/go?ref=1MKPWMM7TS)
