---
title: AI摘要实现原理解析
published: 2026-06-05
description: 从零拆解博客AI摘要功能的完整实现：构建时调用千问API批量生成摘要、前端打字机动画组件、IntersectionObserver懒触发、以及标点停顿节奏控制，附全部源码。
image: https://img.tsh520.cn/file/blog/post-covers/blogguide-ai-summary.webp
tags:
  - 使用文档
  - Astro
  - AI
descriptionSource: manual
---


这篇文章会把我博客里「AI 摘要」功能的完整实现拆开来讲。整个功能由两部分组成：一个**构建时脚本**负责调用 AI 生成摘要写入文章 frontmatter，一个**前端组件**负责把摘要以打字机动画的形式展示给读者。

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   构建时 (Build Time)                 │
│                                                     │
│  scripts/fill-descriptions.ts                       │
│  ├── 扫描 src/content/posts/ 下所有 .md/.mdx         │
│  ├── 跳过已有 description 的文章                      │
│  ├── 调用千问 API 生成摘要                            │
│  └── 写回 frontmatter (description + descriptionSource) │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                   运行时 (Runtime)                    │
│                                                     │
│  src/components/widget/AiSummary.astro               │
│  ├── 读取 description 和 descriptionSource            │
│  ├── IntersectionObserver 监听滚动进入视口             │
│  └── 逐字打字机动画，标点处自动停顿                    │
└─────────────────────────────────────────────────────┘
```

## 第一部分：构建时摘要生成脚本

### 脚本入口与配置

脚本位于 `scripts/fill-descriptions.ts`，使用 `npx tsx` 直接运行：

```bash
npx tsx scripts/fill-descriptions.ts
```

核心配置：

```typescript
// 千问 API 配置（DashScope 兼容 OpenAI 格式）
const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = "qwen-plus";

// 每篇文章最多取前 2600 字作为上下文
const MAX_CONTEXT_CHARS = 2600;

// API 失败最多重试 2 次
const MAX_RETRIES = 2;
```

API 密钥直接写在脚本里，但这个文件已加入 `.gitignore`，不会被推送到 GitHub。

### 扫描与过滤逻辑

脚本会递归扫描 `src/content/posts/` 目录下所有 `.md` 和 `.mdx` 文件，然后用 `gray-matter` 解析 frontmatter：

```typescript
const POSTS_DIR = path.resolve("src/content/posts");

async function main() {
  const mdFiles = collectMarkdownFiles(POSTS_DIR);
  const missing: MissingItem[] = [];
  let skipped = 0;

  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const gm = matter(raw);
    if (gm.data.description) {
      skipped++;  // 已有 description，跳过
      continue;
    }
    missing.push({
      filePath,
      title: gm.data.title || path.basename(filePath, path.extname(filePath)),
      raw,
    });
  }
}
```

关键设计：**只处理没有 `description` 字段的文章**，已经写了 description 的文章（不管是手动写的还是之前生成的）完全不动，不会覆盖。

### 上下文提取

在发送给 AI 之前，需要把 Markdown 正文清理成纯文本：

```typescript
function extractContext(body: string, maxChars: number): string {
  const cleaned = body
    .replace(/^---[\s\S]*?---\n?/, "")       // 去掉 frontmatter
    .replace(/#{1,6}\s+/g, "")                // 去掉标题标记
    .replace(/```[\s\S]*?```/g, "[代码块]")    // 代码块替换为占位符
    .replace(/`[^`]+`/g, "[代码]")             // 行内代码替换
    .replace(/!\[.*?\]\(.*?\)/g, "")           // 去掉图片
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")    // 保留链接文字，去掉 URL
    .replace(/\n{3,}/g, "\n\n")               // 压缩多余空行
    .trim();

  return cleaned.length > maxChars
    ? `${cleaned.slice(0, maxChars)}...`       // 截断到 2600 字
    : cleaned;
}
```

为什么要截断？因为摘要只需要理解文章大意，没必要把整篇长文都发给 API，2600 字足够捕捉核心内容，同时节省 token 开销。

### 提示词设计

这是整个功能里最值得讲的部分。提示词的目标是让 AI 生成的摘要**像人写的**，而不是像机器总结的：

```typescript
const SYSTEM_PROMPT = `你是一个以第一视角写作的个人博客作者。你的博客记录技术学习、日常生活和真实感悟。

你的任务是：读完一篇博客文章后，为它写一段友好、自然、像博客导语一样的"文章摘要"。

核心规则：
1. 输出只要一段摘要文字，不要标题、不要列表、不要"本文""这篇文章""总之"之类的套话。
2. 表达要自然、口语化，像一个真实的博主在跟读者打招呼或做开场铺垫，有一点"人味"。
3. 不要堆砌概念、不要写得像说明书或提纲总结。
4. 贴近原文真实内容，保留原作者的情绪和语气。
5. 技术文章保持清晰但不要生硬，生活/感悟类文章语气柔和一些。
6. 字数控制在 60～120 字左右，越短、越准越好，不要啰嗦。
7. 纯正文内容输出（不带任何前缀或说明）。`;
```

效果对比：

| AI 生成（优化后） | AI 生成（未优化） |
|---|---|
| 折腾了两天终于把Nginx反代配通了，中间踩了三个莫名其妙的坑，趁热记下来免得下次再掉进去 😤 | 本文主要介绍了Nginx反向代理的配置方法，包括常见的错误排查和解决方案。 |

### API 调用与重试

```typescript
async function generateDescription(title: string, content: string): Promise<string | null> {
  const context = extractContext(content, MAX_CONTEXT_CHARS);
  const userMsg = `文章标题：${title}\n\n文章内容（节选）：\n${context}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${QWEN_API_KEY}`,
        },
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
          temperature: 0.75,
          max_tokens: 256,
        }),
      });

      if (!resp.ok) {
        // 失败时递增等待后重试
        if (attempt < MAX_RETRIES) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        return null;
      }

      const json = await resp.json();
      const text = json?.choices?.[0]?.message?.content?.trim() ?? "";

      // 清理 AI 可能加上的前缀
      const cleaned = text
        .replace(/^(摘要|简介|内容简介|文章摘要|本文|这篇文章|总的来说|总之|概括).{0,8}[：:]\s*/i, "")
        .replace(/\s*---\s*$/, "")
        .trim();

      return cleaned || null;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}
```

几个设计细节：

- **temperature: 0.75** — 略高于默认值，让生成的摘要更有个性，不会太死板
- **max_tokens: 256** — 摘要本身不长，256 token 绑绑有余
- **重试间隔递增** — `1500ms * (attempt + 1)`，避免频繁请求触发限流
- **前缀清理** — AI 有时候会自作主张加上"摘要："之类的前缀，用正则干掉

### 写回 Frontmatter

生成的摘要需要写入文章的 YAML frontmatter：

```typescript
function writeFrontmatter(filePath: string, raw: string, description: string, source: "ai" | "manual"): void {
  let fm = raw;
  const hasDesc = /^description\s*:\s*/m.test(fm);
  const hasSource = /^descriptionSource\s*:\s*/m.test(fm);

  if (!hasDesc) {
    // 找到 frontmatter 的结束标记 ---，在它前面插入 description
    const closingIdx = fm.indexOf("---", 4);
    const beforeClose = fm.slice(0, closingIdx);
    const afterClose = fm.slice(closingIdx);

    const safeDesc = description.includes('"')
      ? `"${description.replace(/"/g, '\\"')}"`
      : `"${description}"`;

    fm = `${beforeClose.trimEnd()}\ndescription: ${safeDesc}\n\n${afterClose.trimStart()}`;
  }

  if (!hasSource) {
    // 同样方式插入 descriptionSource
    const closingIdx = fm.indexOf("---", 4);
    const beforeClose = fm.slice(0, closingIdx);
    const afterClose = fm.slice(closingIdx);
    fm = `${beforeClose.trimEnd()}\ndescriptionSource: ${source}\n\n${afterClose.trimStart()}`;
  }

  fs.writeFileSync(filePath, fm, "utf-8");
}
```

写入后，文章的 frontmatter 会变成这样：

```yaml
---
title: 折腾Nginx反代记录
published: 2026-04-15
description: "折腾了两天终于把Nginx反代配通了，中间踩了三个莫名其妙的坑……"
descriptionSource: ai
---
```

### 主流程与限流

```typescript
for (const item of missing) {
  const desc = await generateDescription(item.title, item.raw);
  if (!desc) {
    failed++;
    continue;
  }

  writeFrontmatter(item.filePath, item.raw, desc, "ai");
  success++;

  await sleep(600);  // 每次请求间隔 600ms，避免限流
}
```

每篇文章处理完后等待 600ms，对千问 API 表示友好。

## 第二部分：前端打字机组件

组件位于 `src/components/widget/AiSummary.astro`，是一个纯 Astro 组件，没有框架运行时开销。

### Props 定义

```typescript
interface Props {
  description: string;
  descriptionSource?: "manual" | "ai" | string;
}
```

- `description` — 摘要文本
- `descriptionSource` — 来源标记，`"manual"` 显示「人工编写」，其他值（包括 `"ai"`）显示「AI 摘要」

### 模板结构

```astro
<div id="ai-summary" class="ai-summary card-base rounded-xl mb-6 onload-animation">
  <div class="ai-summary-inner">
    <div class="ai-summary-header">
      <div class="ai-summary-icon">
        <Icon name={iconName} class="text-lg" />
      </div>
      <span class="ai-summary-label">{sourceLabel}</span>
    </div>
    <p id="ai-summary-text" class="ai-summary-text" data-full-text={description}>
    </p>
  </div>
</div>
```

注意 `<p>` 标签本身是空的，摘要文本通过 `data-full-text` 属性传递给 JavaScript，由打字机动画逐字填充。

### 打字机动画核心

这是整个组件最精华的部分：

```javascript
(function typewriter() {
  const el = document.getElementById("ai-summary-text");
  if (!el) return;

  const fullText = el.getAttribute("data-full-text") || "";
  if (!fullText) return;

  // 无障碍：尊重"减少动态效果"设置
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) {
    el.textContent = fullText;  // 直接显示全文
    return;
  }

  let hasRun = false;
  const speed = 45; // 每个字符 45ms

  // IntersectionObserver：只在元素进入视口时触发一次
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !hasRun) {
          hasRun = true;
          observer.unobserve(el);
          startTyping();
        }
      }
    },
    { threshold: 0.3 }
  );

  observer.observe(el);

  function startTyping() {
    let i = 0;
    el.textContent = "";

    function tick() {
      if (i < fullText.length) {
        el.textContent += fullText.charAt(i);
        i++;

        // 根据标点符号调整停顿时间
        const char = fullText.charAt(i - 1);
        const delay =
          char === "。" || char === "！" || char === "？" || char === "…"
            ? speed * 3    // 句末标点：135ms
            : char === "，" || char === "、"
              ? speed * 2  // 逗号、顿号：90ms
              : speed;     // 普通字符：45ms

        setTimeout(tick, delay);
      }
    }

    tick();
  }
})();
```

这段代码有几个值得注意的设计：

**1. IntersectionObserver 懒触发**

不是页面一加载就开始打字，而是等用户滚动到摘要区域才开始。`threshold: 0.3` 表示元素有 30% 可见时才触发。`hasRun` 标志确保只播放一次。

**2. 标点停顿节奏**

普通字符间隔 45ms，逗号/顿号 90ms（2倍），句号/感叹号/问号/省略号 135ms（3倍）。这个细节让打字效果更像真人在打字——人在打完一句话后会自然地停顿一下。

**3. 无障碍支持**

`prefers-reduced-motion` 是一个 CSS 媒体查询，用户在系统设置中开启「减少动态效果」后，动画会跳过，直接显示全文。

### 样式

```css
.ai-summary {
  border: 1px solid color-mix(in srgb, var(--line-divider) 86%, transparent);
  background: color-mix(in srgb, var(--card-bg) 94%, transparent);
  overflow: hidden;
}

.ai-summary-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
}

.ai-summary-text {
  font-size: 0.925rem;
  line-height: 1.75;
  color: var(--deep-text);
  min-height: 1.75em;  /* 预留空间，避免打字时布局跳动 */
}
```

`min-height: 1.75em` 是个小细节——在打字动画开始前，摘要区域已经占好了空间，不会因为文字逐渐出现而导致页面布局抖动。

### 在文章页集成

在 `src/pages/posts/[...slug].astro` 中：

```astro
{
  entry.data.description && (
    <AiSummary
      description={entry.data.description}
      descriptionSource={entry.data.descriptionSource}
    />
  )
}
```

只有当文章有 `description` 字段时才渲染摘要组件。没有 description 的文章不会显示摘要区域，不影响正常页面。

## 第三部分：数据流与字段约定

### Frontmatter 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `description` | string | 否 | 文章摘要，60~120字 |
| `descriptionSource` | `"manual"` \| `"ai"` | 否 | 标记摘要来源 |

### 内容集合 Schema

在 `src/content.config.ts` 中，`description` 已纳入 Zod schema 验证：

```typescript
const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    description: z.string().optional().default(""),
    // ... 其他字段
  }),
});
```

`descriptionSource` 没有在 schema 中定义，但 Astro 会把 frontmatter 中的所有字段都传递给页面，所以 `entry.data.descriptionSource` 在模板中仍然可以正常访问。

### 完整数据流

```
1. 作者写文章 → frontmatter 中不写 description
2. 运行 fill-descriptions.ts → 千问 API 生成摘要 → 写入 description + descriptionSource: ai
3. pnpm build → Astro 构建 → 文章页读取 description
4. 用户访问文章页 → AiSummary 组件渲染 → IntersectionObserver 监听
5. 用户滚动到摘要区域 → 打字机动画开始 → 逐字显示摘要
```

## 总结

整个 AI 摘要功能只涉及两个文件，没有引入额外的 npm 依赖（脚本用原生 `fetch` 调用 API），没有运行时的 AI 调用（摘要在构建时就生成好了），前端组件也是纯 Astro + 原生 JS，没有框架运行时开销。

如果你也想在自己的博客里实现类似功能，核心步骤就是：

1. 写一个脚本，用你喜欢的 LLM API 生成摘要，写入 frontmatter
2. 写一个前端组件，读取摘要并用打字机动画展示
3. 在文章页面条件渲染这个组件

提示词的质量决定了摘要的「人味」程度，这是最值得花时间打磨的地方。
