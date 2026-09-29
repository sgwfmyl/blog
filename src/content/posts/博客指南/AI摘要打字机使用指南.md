---
title: AI摘要打字机使用指南
published: 2026-05-07
description: 详细讲解文章页AI摘要打字机组件的工作原理、配置方式和补全脚本的使用方法，帮助你快速为博客文章生成自然、人味十足的摘要。
image: https://img.tsh520.cn/file/blog/post-covers/blogguide-typewriter.webp
tags:
  - 使用文档
descriptionSource: manual
---


博客为每篇文章详情页顶部配备了一个 AI 摘要打字机组件，读者打开文章时会以打字机动画形式逐字展示文章摘要，提升阅读体验。

## 功能概览

- 文章详情页顶部自动展示一段摘要
- 摘要以打字机动画逐字显示，标点处稍作停顿，模拟真人打字节奏
- 只在首次滚动到摘要区域时播放一次，不会重复触发
- 尊重用户系统设置：开启了「减少动态效果」的设备会直接静态显示全文
- 摘要内容优先读取你手动编写的 `description` 字段，没有时才由 AI 补全

## 摘要来源

所有文章的摘要来源由 frontmatter 中的 `descriptionSource` 字段标记：

| 值 | 含义 | 页面显示 |
|---|---|---|
| `manual` | 人工编写 | 📝 人工编写 |
| `ai` | 千问 AI 生成 | 🧠 AI 摘要 |

你完全可以自己写 description 并标记 `descriptionSource: manual`，这样就不会被 AI 覆盖。

## 如何手动编写摘要

在你的文章 frontmatter 中添加 description 字段即可：

```yaml
---
title: 我的文章标题
published: 2026-04-15
description: "一段自然的、像博客导语一样的摘要文字，60~120字左右。"
descriptionSource: manual
tags:
  - 标签
category: 分类
---
```

字段说明：

- **description**：文章的摘要内容。建议长度 60～120 字，自然、口语化，像博主在给读者做开场铺垫。
- **descriptionSource**：标记来源。`manual` 表示你自己写的，`ai` 表示由脚本生成的。

## 使用 AI 补全缺失摘要

如果你的文章有 `description` 字段，脚本会直接跳过这篇文章，不会做任何改动。只有当你新增了一篇文章但没有写 description 时，补全脚本才会介入。

### 运行补全脚本

在项目根目录执行：

```bash
npx tsx scripts/fill-descriptions.ts
```

### 脚本做了什么

1. 扫描 `src/content/posts/` 下所有 `.md` 和 `.mdx` 文件
2. 找出所有 **没有** `description` 字段的文章
3. 提取文章标题和正文前 2600 字作为上下文
4. 调用千问（Qwen）API，用专门优化过的提示词生成一段「像人写的」摘要
5. 将生成的摘要写入文章 frontmatter 的 `description` 字段
6. 同时添加 `descriptionSource: ai` 标记
7. 已有 `description` 的文章 **完全不动**，不会覆盖你的手写内容

### 执行日志示例

```
[09:15:32] 🚀  AI 摘要补全脚本启动
[09:15:32] 📡  模型: qwen-plus
[09:15:32] 📂  文章目录: src/content/posts
[09:15:32] 📊  扫描到 29 篇文章
[09:15:32] 📋  27 篇已有描述 -> 跳过
[09:15:32] 📝  2 篇缺少描述 -> 准备补全
[09:15:33] ⏳  正在生成: 技术分享/新文章.md
[09:15:34] ✅  补全完成: 技术分享/新文章.md
[09:15:34]    → 折腾了两天终于把Nginx反代配通了……
[09:15:35] 🏁  执行完毕
[09:15:35]    跳过（已有描述）: 27 篇
[09:15:35]    需要补全: 2 篇
[09:15:35]    ✅ 成功: 2 篇
[09:15:35]    ❌ 失败: 0 篇
```

### 失败处理

- 单次 API 请求失败会自动重试最多 2 次，每次间隔递增等待
- 全部重试失败后，该文章会被标记为失败，不影响其他文章继续处理
- 脚本执行结束后会列出所有失败的文章，你可以修改后再次运行重试
- 请求之间间隔 600ms，避免触发 API 限流

## AI 生成的摘要是「像人写的」吗？

我们在补全脚本中内置了一套精心设计的提示词（Prompt），让千问知道：

- 不要用「本文主要讲述了」「这篇文章介绍了」这种机械开头
- 不要堆砌概念、不要写成说明书提纲
- 要自然、口语化，像一个真实的博主在给读者做开场铺垫
- 技术文章保持清晰但别冷冰冰，生活感文章语气柔和一些
- 保留原作者的情绪和语气

所以生成出来的摘要更像这样：

> 折腾了两天终于把Nginx反代配通了，中间踩了三个莫名其妙的坑，趁热记下来免得下次再掉进去 😤

而不是：

> 本文主要介绍了Nginx反向代理的配置方法，包括常见的错误排查和解决方案。

## 如何在构建前自动补全

如果你希望每次 `pnpm build` 时自动补全新文章的摘要，可以修改 `package.json` 的 `build` 脚本：

```json
{
  "scripts": {
    "build": "npx tsx scripts/fill-descriptions.ts && node scripts/generate-icons.js && astro build && pagefind --site dist"
  }
}
```

这样每次部署前都会自动检查并补全缺失的摘要，无需手动运行脚本。

## 注意事项

1. **脚本不上传 GitHub**：`scripts/fill-descriptions.ts` 已加入 `.gitignore`，因为它包含千问 API 密钥，确保不会泄露到公开仓库。
2. **只写 description 不写 content**：脚本只修改 frontmatter 中的 `description` 和 `descriptionSource`，不会触碰文章正文内容。
3. **无描述不显示摘要**：如果文章没有 `description` 且未运行过补全脚本，文章页面不会显示摘要区域，不影响正常页面渲染。
4. **千问模型选择**：当前使用 `qwen-plus`（性价比之选），如有需要可切换为 `qwen-max`（质量更好）或 `qwen-turbo`（更快更便宜）。
