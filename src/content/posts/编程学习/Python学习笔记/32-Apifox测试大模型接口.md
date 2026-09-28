---
title: Apifox测试大模型接口
published: 2026-09-18
description: 用 Apifox 在写代码之前先调通 DeepSeek 接口：url、请求头、请求体三要素与 messages 角色设计
tags:
  - DeepSeek
  - HTTP
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-32-apifox.webp
order: 32
---

## Apifox 是什么

Apifox 是一款 API 设计、开发、测试的一体化协作平台，是项目开发中进行 **API 接口测试**的神器。

在写代码之前先用它把接口调通，好处是：能把"接口问题"和"代码问题"分开——接口在 Apifox 里通了，写代码时出错就一定是代码的问题。

## 调用 DeepSeek 的三要素

| 要素 | 内容 |
| --- | --- |
| url 地址 | `https://api.deepseek.com/chat/completions` |
| 请求方式 | POST |
| 请求头（key: value） | `Content-Type: application/json`<br>`Authorization: Bearer <你的API Key>` |
| 请求体（json 格式） | `{"model": "...", "messages": [...], "stream": false}` |

对应的原始 HTTP 请求长这样（官方文档给出的 curl 版本）：

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  -d '{
        "model": "deepseek-chat",
        "messages": [
          {"role": "system", "content": "You are a helpful assistant."},
          {"role": "user", "content": "Hello!"}
        ],
        "stream": false
      }'
```

> [!TIP]
> `Authorization: Bearer xxx` 里的 **Bearer 是固定写法**（表示"持有者令牌"），后面跟一个空格再跟 API Key。漏掉 Bearer 或空格都会导致 401。

## 请求体详解

| 参数 | 含义 |
| --- | --- |
| `model` | 模型名称。`deepseek-chat` 对应非思考模式，`deepseek-reasoner` 对应思考模式（官方说明两者都已升级为 DeepSeek-V3.2） |
| `messages` | 消息列表，决定模型"看到"的上下文 |
| `stream` | 是否流式输出。`false` 一次性返回完整结果，`true` 逐字返回（打字机效果） |

## messages 的三种角色

`messages` 是一个列表，每个元素都是 `{"role": ..., "content": ...}`：

| role | 作用 | 示例 |
| --- | --- | --- |
| `system` | 设定 AI 的身份和行为准则（回答的风格、限制、规则等） | "你是一名可爱的 AI 助手，你的名字叫小甜甜……" |
| `user` | 用户实际提出的问题或指令 | "你是谁" |
| `assistant` | AI 模型的回复/响应 | "我是小甜甜呀！……" |

```json
"messages": [
  { "role": "system", "content": "你是一名可爱的AI助手, 你的名字叫小甜甜, 请以亲切、可爱语气来回答用户的问题" },
  { "role": "user", "content": "你是谁" },
  { "role": "assistant", "content": "我是小甜甜呀！一个可爱又贴心的AI助手……" }
]
```

> [!NOTE]
> `system` 放在列表的最前面。它的内容就是我们后面要"定制伴侣性格"的地方，见 [提示词工程](/posts/编程学习/python学习笔记/34-提示词工程/)。

## 会话记忆-现状（为什么 AI 记不住上一句）

与 AI 大模型的交互本质是**无状态**的，每一次请求响应都是相互独立的，AI 大模型本身没有真正的会话记忆能力。

第一次问"12 个苹果 3 个人怎么均分"，再问"那 2 个人呢"，因为这次请求里只有"那 2 个人呢"，模型不知道你在说什么：

```json
"messages": [
  { "role": "system", "content": "你是一名可爱的AI助手……" },
  { "role": "user", "content": "那2个人呢?" }
]
```

## 会话记忆-处理方案（会话历史滚雪球）

客户端把**之前所有对话**都塞进 `messages` 一起发过去，模型就"看起来记得"了：

```json
"messages": [
  { "role": "system", "content": "你是一名可爱的AI助手……" },
  { "role": "user", "content": "12个苹果,3个人怎么均分?" },
  { "role": "assistant", "content": "嘻嘻，12个苹果分给3个人，每个人可以分到 **4个苹果** 哦～" },
  { "role": "user", "content": "那2个人呢?" }
]
```

这样模型就能正确回答"每人 6 个苹果"。代价是每轮请求都越来越长，Token 消耗越来越大。

## 相关

- [HTTP 协议](/posts/编程学习/python学习笔记/30-http协议/)
- [JSON 数据格式与 json 模块](/posts/编程学习/python学习笔记/31-json数据格式与json模块/)
- [Python 调用大模型（openai 库）](/posts/编程学习/python学习笔记/33-python调用大模型-openai库/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 调用 DeepSeek 的三要素：**url** 地址、**请求体**（json 格式）、请求头
2. 请求方式用 **POST**，url 是 `https://api.deepseek.com/chat/completions`
3. 请求头 `Content-Type` 的值是 `application/json`
4. 请求头 `Authorization` 的值格式是 `Bearer <API Key>`（Bearer 后面有一个空格）
5. 请求体三个常用参数：`model`、`messages`、`stream`
6. messages 里三种 role：`system`（设定身份和行为准则）、`user`（用户提问）、`assistant`（AI 回复）
7. `stream` 为 `true` 表示**流式**输出
8. Apifox 的作用是 **API 接口测试**，写代码之前先用它调通接口，可以把"接口问题"和"**代码**问题"分开

### 二、裸写题

- [ ] **2-1** 手写一个最小的请求体 JSON：模型用 deepseek-chat，先设定 AI 的身份让它自称"小甜甜"（性格亲切可爱），再问它"你是谁"，并且要求一次性返回（不要逐段返回）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：请求体说清三件事——用哪个模型、要说的话（按先后顺序排好）、要不要逐段返回
  > **二级 · 方法**：三个字段是 `model` / `messages` / `stream`；设定身份那条的角色是 `system`，提问那条的角色是 `user`
  > **三级 · 骨架**：`"messages": [{"role": "____", "content": "……"}, {"role": "____", "content": "你是谁"}]`，`"stream": ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```json
  > {
  >   "model": "deepseek-chat",
  >   "messages": [
  >     { "role": "system", "content": "你是一名可爱的AI助手, 你的名字叫小甜甜, 请以亲切、可爱语气来回答用户的问题" },
  >     { "role": "user", "content": "你是谁" }
  >   ],
  >   "stream": false
  > }
  > ```

- [ ] **2-2** 在 2-1 的请求体上继续这段对话：先补一条 AI 的历史回复（上一轮它自己的回答），再补一轮新的用户提问，让消息一共 **4 条**；并说明"滚雪球"是怎么实现会话记忆的

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：按时间顺序把"上一轮 AI 说了什么、这次用户又问什么"接到消息列表后面，凑够 4 条
  > **二级 · 方法**：AI 回复那条的角色是 `assistant`，新提问那条的角色是 `user`；条数 = 1 条 `system` + 2 条 `user` + 1 条 `assistant`
  > **三级 · 骨架**：`"messages": [system, user(老问题), ____(AI 的回答), ____(新问题)]`

  > [!TIP]- 参考答案（做完再点开）
  > 在 messages 里再加一条 assistant 的历史回复，**再补一轮新的 user 提问**，一共 **4 条消息（1 条 system + 2 条 user + 1 条 assistant）**，模型就能"看到"自己前面说过什么：
  > ```json
  > {
  >   "model": "deepseek-chat",
  >   "messages": [
  >     { "role": "system", "content": "你是一名可爱的AI助手, 你的名字叫小甜甜, 请以亲切、可爱语气来回答用户的问题" },
  >     { "role": "user", "content": "12个苹果,3个人怎么均分?" },
  >     { "role": "assistant", "content": "嘻嘻，12个苹果分给3个人，每个人可以分到 4个苹果 哦～" },
  >     { "role": "user", "content": "那2个人呢?" }
  >   ],
  >   "stream": false
  > }
  > ```
  > 条数对一下（2-1 是 2 条，本题 4 条）：`system` 1 条、`user` 2 条（老问题 + 新问题）、`assistant` 1 条。只用"那2个人呢?"单独发一次，模型不知道该接什么；把"12个苹果分给3个人"和 AI 的回答一起带上，它才能接着算出"每人 6 个"。

- [ ] **2-3** 如果 Apifox 里返回 401，你会先检查请求头里的哪一项？为什么？

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：401 是"未认证"，去请求头里找那个用来证明"我是谁"的字段，再想它的值该长什么样

  > [!TIP]- 参考答案（做完再点开）
  > 先看请求头里的 `Authorization`：401 表示"未认证"，通常是没带这个头、没写 `Bearer `（Bearer+空格）、或者 API Key 写错/已失效。
