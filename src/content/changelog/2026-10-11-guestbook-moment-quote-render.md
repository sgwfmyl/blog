---
version: "v1.60.1"
date: 2026-10-11
time: "00:40"
type: fix
description: 修复留言板拉取评论时不解析 MOMENT 引用前缀，导致动态引用以原始协议文本显示的问题
---

## 留言板动态引用渲染修复

留言板（GuestbookChat）从服务器拉取评论时，消息构造只解析了回复标记，**没有解析说说的 `>>MOMENT>>…<<MOMENT<<` 引用前缀**，导致带动态引用的评论在正文里以原始协议文本显示（登录后因本地构造消息带了 `momentQuote` 而正常，退出登录重新拉取后即复现）。

- **修复**：`normalizeGuestbookComment` 增加 MOMENT 前缀解析——剥离协议文本并设置 `momentQuote`，渲染时复用已有的「引用动态」卡片样式。
- **HTML 兼容**：游客请求不返回原始 markdown（`orig` 字段缺失），评论正文是 Waline 渲染后的 HTML（前缀被 blockquote 语法吞掉开头 `>>` 且 `>`/`<` 被实体转义）。新增 `parseMomentQuoteFromHtml`，在原始形态匹配不到时从 HTML 中提取引用并剥离协议文本，`parseMomentMessageBody`（说说明细）同步接入。
- **类型**：`GuestbookChatMessage` 补充可选 `momentQuote` 字段（与 `MomentChatMessage` / `NotebookChatMessage` 对齐）。
- 说说明细（`normalizeMomentComment`）本就正确解析，不受影响。
