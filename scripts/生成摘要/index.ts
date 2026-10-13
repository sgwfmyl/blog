/**
 * AI 摘要补全脚本 — 调用自建 AI 中转站（new-api）为缺失 description 的文章批量生成摘要
 *
 * 用法：
 *   pnpm cli desc（内部等价于 npx tsx --env-file=.env scripts/生成摘要/index.ts）
 *
 * 只补全新文章（没有 description 的），已有 description 的跳过，不覆盖。
 *
 * 调用链路（2026-10 起经自建 new-api 中转站，OpenAI 兼容）：
 *   本脚本 → new-api（ai.5484826.xyz/v1）→ 渠道（如 Cloudflare Workers AI 免费模型）
 *   中转地址/令牌/模型名读自 .env 的 AI_RELAY_URL / AI_RELAY_TOKEN / AI_MODEL（均已 gitignore）。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

// ============================================================
// 配置：自建 new-api 中转站（OpenAI 兼容端点，本脚本不持有任何厂商密钥）。
// 中转站部署与渠道配置见文档「服务专项：new-api（AI 中转站）」。
// ============================================================
// AI_RELAY_URL：中转站 OpenAI 兼容端点（如 https://ai.5484826.xyz/v1，不含尾斜杠）
const RELAY_URL = (process.env.AI_RELAY_URL ?? "").replace(/\/+$/, "");
// AI_RELAY_TOKEN：new-api 后台「令牌」页签创建的分发令牌
const RELAY_TOKEN = process.env.AI_RELAY_TOKEN ?? "";
// AI_MODEL：必须与 new-api 渠道「模型」填写的完整模型 ID 逐字一致
// （如 Cloudflare Workers AI 免费模型 @cf/zai-org/glm-4.7-flash）
const AI_MODEL = process.env.AI_MODEL ?? "";

if (!RELAY_URL) {
  console.error(
    "❌  缺少 AI_RELAY_URL 环境变量：请在项目根目录 .env 中配置中转地址后再运行本脚本",
  );
  process.exit(1);
}

if (!RELAY_TOKEN) {
  console.error(
    "❌  缺少 AI_RELAY_TOKEN 环境变量：请在 new-api 后台创建令牌后填入 .env",
  );
  process.exit(1);
}

if (!AI_MODEL) {
  console.error(
    "❌  缺少 AI_MODEL 环境变量：请填入与 new-api 渠道「模型」一致的完整模型 ID（如 @cf/zai-org/glm-4.7-flash）",
  );
  process.exit(1);
}

// 每篇文章最大字符数（传输给 AI 作为上下文）
const MAX_CONTEXT_CHARS = 2600;

// API 请求失败最大重试次数
const MAX_RETRIES = 2;

// ============================================================
// 摘要系统提示词 — 生成"像人写的"博客摘要
// ============================================================
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

// ============================================================
// 工具函数
// ============================================================
function log(emoji: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${emoji}  ${msg}`);
}

/** 将文章的 frontmatter 写回文件 */
function writeFrontmatter(
  filePath: string,
  raw: string,
  description: string,
  source: "ai" | "manual",
): void {
  let fm = raw;
  // 只把「有实际内容」的 description 视为已存在；空字符串占位仍需要补全
  const parsedData = matter(fm).data as Record<string, unknown>;
  const hasDesc =
    typeof parsedData.description === "string" &&
    parsedData.description.trim().length > 0;
  const hasSource = /^descriptionSource\s*:\s*/m.test(fm);

  if (!hasDesc) {
    const safeDesc = description.includes('"')
      ? `"${description.replace(/"/g, '\\"')}"`
      : `"${description}"`;

    const descLine = /^description\s*:.*$/m;
    if (descLine.test(fm)) {
      // 已有 description 占位（含空字符串）→ 整行替换，避免重复行
      fm = fm.replace(descLine, `description: ${safeDesc}`);
    } else {
      const closingIdx = fm.indexOf("---", 4);
      if (closingIdx === -1) {
        log("⚠️", `无法定位 frontmatter 结束位置: ${filePath}`);
        return;
      }
      const beforeClose = fm.slice(0, closingIdx);
      const afterClose = fm.slice(closingIdx);
      fm = `${beforeClose.trimEnd()}\ndescription: ${safeDesc}\n\n${afterClose.trimStart()}`;
    }
  }

  if (!hasSource) {
    const closingIdx = fm.indexOf("---", 4);
    if (closingIdx === -1) {
      log("⚠️", `无法定位 frontmatter 结束位置: ${filePath}`);
      return;
    }
    const beforeClose = fm.slice(0, closingIdx);
    const afterClose = fm.slice(closingIdx);
    fm = `${beforeClose.trimEnd()}\ndescriptionSource: ${source}\n\n${afterClose.trimStart()}`;
  }

  fs.writeFileSync(filePath, fm, "utf-8");
}

/** 提取文章正文核心内容 */
function extractContext(body: string, maxChars: number): string {
  const cleaned = body
    .replace(/^---[\s\S]*?---\n?/, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/```[\s\S]*?```/g, "[代码块]")
    .replace(/`[^`]+`/g, "[代码]")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned.length > maxChars
    ? `${cleaned.slice(0, maxChars)}...`
    : cleaned;
}

/** 调用中转站生成摘要（带重试） */
async function generateDescription(
  title: string,
  content: string,
): Promise<string | null> {
  const context = extractContext(content, MAX_CONTEXT_CHARS);
  const userMsg = `文章标题：${title}\n\n文章内容（节选）：\n${context}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(`${RELAY_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RELAY_TOKEN}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
          temperature: 0.75,
          // 1024：兼容推理型模型（如 @cf/zai-org/glm-4.7-flash）——思考会先消耗输出额度，
          // 256 会被推理过程占满导致 content 为空、finish_reason=length
          max_tokens: 1024,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        log(
          "❌",
          `API ${resp.status} ${resp.statusText} (尝试 ${attempt + 1}/${MAX_RETRIES + 1})${errBody ? `: ${errBody.slice(0, 200)}` : ""}`,
        );
        if (attempt < MAX_RETRIES) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        return null;
      }

      const json = (await resp.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json?.choices?.[0]?.message?.content?.trim() ?? "";

      if (!text) {
        log("⚠️", "API 返回了空摘要");
        return null;
      }

      const cleaned = text
        .replace(
          /^(摘要|简介|内容简介|文章摘要|本文|这篇文章|总的来说|总之|概括).{0,8}[：:]\s*/i,
          "",
        )
        .replace(/\s*---\s*$/, "")
        .trim();

      return cleaned || null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("❌", `网络/请求异常 (尝试 ${attempt + 1}/${MAX_RETRIES + 1}): ${msg}`);
      if (attempt < MAX_RETRIES) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// 主流程
// ============================================================
const POSTS_DIR = path.resolve("src/content/posts");

async function main() {
  log("🚀", `AI 摘要补全脚本启动`);
  log("📡", `模型: ${AI_MODEL}`);
  log("📂", `文章目录: ${POSTS_DIR}`);

  const mdFiles = collectMarkdownFiles(POSTS_DIR);
  log("📊", `扫描到 ${mdFiles.length} 篇文章`);

  interface MissingItem {
    filePath: string;
    title: string;
    raw: string;
  }
  const missing: MissingItem[] = [];
  let skipped = 0;

  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const gm = matter(raw);
    if (gm.data.description) {
      skipped++;
      continue;
    }
    missing.push({
      filePath,
      title: gm.data.title || path.basename(filePath, path.extname(filePath)),
      raw,
    });
  }

  log("📋", `${skipped} 篇已有描述 -> 跳过`);
  log("📝", `${missing.length} 篇缺少描述 -> 准备补全`);

  if (missing.length === 0) {
    log("✅", `完成！所有文章都已有 description`);
    return;
  }

  let success = 0;
  let failed = 0;

  for (const item of missing) {
    const shortName = path.relative(POSTS_DIR, item.filePath);
    log("⏳", `正在生成: ${shortName}`);

    const desc = await generateDescription(item.title, item.raw);
    if (!desc) {
      log("❌", `生成失败: ${shortName}`);
      failed++;
      continue;
    }

    writeFrontmatter(item.filePath, item.raw, desc, "ai");
    log("✅", `补全完成: ${shortName}`);
    log("   ", `→ ${desc}`);
    success++;

    await sleep(600);
  }

  log("", "");
  log("🏁", `执行完毕`);
  log("   ", `跳过（已有描述）: ${skipped} 篇`);
  log("   ", `需要补全: ${missing.length} 篇`);
  log("   ", `✅ 成功: ${success} 篇`);
  log("   ", `❌ 失败: ${failed} 篇`);

  if (failed > 0) {
    log("💡", `提示: 失败的文章可再次运行本脚本重试`);
  }
}

/** 递归收集目录下所有 .md / .mdx 文件 */
function collectMarkdownFiles(dir: string): string[] {
  const result: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectMarkdownFiles(fullPath));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

main().catch((err) => {
  console.error("脚本异常终止:", err);
  process.exit(1);
});
