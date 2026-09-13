#!/usr/bin/env node
/**
 * 代码结构审计脚本 — 为重构生成「可供 AI 读取的结构化清单表单」
 *
 * 核心思路：
 *   1. 只扫描 src/ 下的「代码目录」：components / pages / config / utils / types /
 *      styles / layouts / constants / i18n / plugins。
 *      （忽略 content/ 的内容 md 数据、scripts/ 工具脚本与构建产物——本次代码结构重构
 *      不涉及这些。）
 *   2. 统计每个代码域的文件数、总/单文件行数，标出超大文件（重构候选）。
 *   3. 解析 import 引用，输出「页面 ⇄ 组件域」依赖表 与「跨域组件引用」清单（耦合信号）。
 *   4. 动态解析《博客使用指南.md》的「页面路径一览」「Content Schema 概览」
 *      附录表格，生成「指南声明 ⇄ 代码现状」对照，暴露文档滞后与缺失路由等重构信号。
 *
 * 用法:
 *   node scripts/audit-code-structure.mjs [--out=输出路径] [--guide=博客使用指南.md路径]
 *
 * 产物: 默认写入项目根 REFACTOR-代码结构清单.md（只读扫描，不改任何源码）
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src");

// ---- 参数 ----
const args = process.argv.slice(2);
const getFlag = (key) => {
  const hit = args.find((a) => a.startsWith(`--${key}=`));
  return hit ? hit.slice(key.length + 3) : null;
};
const OUT = getFlag("out") || join(ROOT, "REFACTOR-代码结构清单.md");

// 只审计的代码目录（排除 content 数据, 以及 scripts 工具脚本）
const CODE_DIRS = [
  "components", "pages", "config", "utils", "types",
  "styles", "layouts", "constants", "i18n", "plugins",
];

const CODE_EXTENS = new Set([".astro", ".svelte", ".ts", ".tsx", ".js", ".mjs", ".css"]);

const BIG_THRESHOLD = 400; // 超大文件阈值（重构候选）

// ---- 工具函数 ----
function walk(dir) {
  const out = [];
  const relDir = dir.replace(SRC + "\\", "").replaceAll("\\", "/");
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = `${relDir}/${entry}`.replace(/^\//, "");
    const st = statSync(abs);
    if (st.isDirectory()) {
      out.push(...walk(abs));
    } else if (CODE_EXTENS.has(extname(entry).toLowerCase())) {
      out.push(rel);
    }
  }
  return out;
}

function countLines(abs) {
  try {
    const s = readFileSync(abs, "utf8");
    return s.split(/\r?\n/).length;
  } catch {
    return 0;
  }
}

/** 形如 "components/<域>/<子>/文件" → 返回 <域> */
function componentDomain(rel) {
  const parts = rel.split("/");
  if (parts[0] !== "components") return null;
  return parts[1] ?? null;
}

/** 从源码里提取形如 ".../components/<域>..." 的所有被引用组件域 */
function collectComps(src) {
  const set = new Set();
  const re = /(?:from\s+|import\s*\()?\s*["'][^"']*components\/([^/"']+)\/[^"']*["']/g;
  let m;
  while ((m = re.exec(src))) {
    const dom = m[1];
    if (dom && dom !== "components") set.add(dom);
  }
  return [...set];
}

// ---- 扫描 ----
const rows = []; // { rel, abs, root, domain, lines, type }
for (const dir of CODE_DIRS) {
  const base = join(SRC, dir);
  if (!existsSync(base)) continue;
  for (const rel of walk(base)) {
    const abs = join(SRC, rel);
    const root = rel.split("/")[0];
    rows.push({
      rel,
      abs,
      root,
      domain: root === "components" ? componentDomain(rel) : null,
      lines: countLines(abs),
      type: extname(rel).slice(1).toLowerCase(),
    });
  }
}

// ---- 顶层目录聚合 ----
const rootStats = new Map();
for (const r of rows) {
  const s = rootStats.get(r.root) || { files: 0, lines: 0, maxLines: 0, maxFile: "" };
  s.files += 1;
  s.lines += r.lines;
  if (r.lines > s.maxLines) {
    s.maxLines = r.lines;
    s.maxFile = r.rel;
  }
  rootStats.set(r.root, s);
}

// ---- 组件功能域聚合 ----
const domStats = new Map();
for (const r of rows) {
  if (!r.domain) continue;
  const s = domStats.get(r.domain) || { files: 0, lines: 0, maxLines: 0, maxFile: "" };
  s.files += 1;
  s.lines += r.lines;
  if (r.lines > s.maxLines) {
    s.maxLines = r.lines;
    s.maxFile = r.rel.split("/").slice(2).join("/");
  }
  domStats.set(r.domain, s);
}

// ---- 超大文件（重构候选）----
const bigFiles = rows
  .filter((r) => r.lines >= BIG_THRESHOLD)
  .sort((a, b) => b.lines - a.lines);

// ---- 页面 ⇄ 组件域 依赖 ----
const pageFiles = rows.filter(
  (r) => r.root === "pages" && (r.type === "astro" || r.type === "ts"),
);
const pageDeps = pageFiles.map((p) => {
  const src = readFileSync(p.abs, "utf8");
  const domains = collectComps(src);
  return { path: p.rel.replace("pages/", ""), domains, count: domains.length };
});

// ---- 跨域组件引用（components 内部跨域 import）----
const compFiles = rows.filter((r) => r.root === "components");
const crossRefs = []; // { from, toDomain }
for (const f of compFiles) {
  if (!f.domain) continue;
  const src = readFileSync(f.abs, "utf8");
  for (const d of collectComps(src)) {
    if (d !== f.domain) crossRefs.push({ from: f.rel, toDomain: d });
  }
}
// 按被引用域聚合（common 为共享基础域，单独统计；其余作为耦合热点）
const income = new Map(); // 非 common 的跨域引用（耦合热点）
const commonReuse = []; // 指向 common 的复用引用
for (const r of crossRefs) {
  if (r.toDomain === "common") {
    commonReuse.push(r);
    continue;
  }
  const s = income.get(r.toDomain) || { count: 0, fromDomains: new Set() };
  s.count += 1;
  s.fromDomains.add(r.from.split("/")[1]); // components/<域>/...
  income.set(r.toDomain, s);
}


// 结合《博客使用指南.md》—— 动态解析指南附录表格，生成「指南声明 ⇄ 代码落地」对照
const GUIDE_PATH = getFlag("guide") || join(ROOT, "src/content/posts/博客指南/博客使用指南.md");

/** 解析指南 Markdown 中给定的附录表格（分隔行后紧跟数据行）：返回 {header, rows} */
function readGuideTable(mdPath, tableTitle) {
  if (!existsSync(mdPath)) return null;
  const txt = readFileSync(mdPath, "utf8");
  const lines = txt.split(/\r?\n/);
  // 仅匹配「## 标题」行，避免命中目录锚点（如 #附录页面路径一览）
  const titleIdx = lines.findIndex((l) => /^#{2,}\s*/.test(l) && l.includes(tableTitle));
  if (titleIdx < 0) return null;
  let headerIdx = -1;
  for (let i = titleIdx + 1; i < lines.length; i++) {
    if (/^\s*\|[\s\-\|:]+\|?\s*$/.test(lines[i])) { headerIdx = i - 1; break; }
  }
  if (headerIdx < 0) return null;
  const rows = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) break;
    if (/^\s*\|[\s\-\|:]+\|?\s*$/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim().replace(/`/g, "")).filter(Boolean);
    if (cells.length && cells[0]) rows.push(cells);
  }
  return rows;
}

// A) 指南「页面路径一览」→ 声明的路由（功能 | 路径 | 说明）
const guideRoutes = (readGuideTable(GUIDE_PATH, "页面路径一览") || []).map(
  (r) => ({ 功能: r[0], 路径: r[1] || "", 说明: r[2] || "" }),
);
// B) 指南「Content Schema 概览」→ 集合 | 路径 | 用途
const guideContent = (readGuideTable(GUIDE_PATH, "Content Schema 概览") || []).map(
  (r) => ({ collection: r[0], 路径: r[1] || "", 用途: r[2] || "" }),
);

// C) 指南声明路由在代码 pages/ 中是否已落地
// 归一化对称处理：Astro 的 [...slug] 与指南的 [slug] 都视为通配参数
const slugKeys = [
  ...new Set(
    pageDeps.flatMap((p) => {
      const clean = p.path.replace(/\.(astro|ts)$/, "");
      return [clean, clean.split("/").slice(0, 2).join("/"), clean.split("/")[0]];
    }),
  ),
];
const normSlug = (raw) =>
  raw.replace(/^\/+|\/+$/g, "").replace(/\[\.\.\.[^\]]+\]/g, "x").replace(/\[[^\]]+\]/g, "x");
const guideRouteRows = guideRoutes.map((r) => {
  const raw = r.路径;
  // 首页"/"由 [...page].astro catch-all 兜底
  if (/^\/+$/.test(raw) || raw === "/" || raw === "/index") {
    const hasRootCatchAll = slugKeys.some((k) => k === "[...page]" || k === "[...page]/");
    return { ...r, 落地: hasRootCatchAll ? "✅" : "—" };
  }
  const n = normSlug(raw);
  const hit = slugKeys.some((k) => {
    const kn = normSlug(k);
    return kn === n || kn.startsWith(n + "/") || (n && n.startsWith(kn));
  });
  return { ...r, 落地: hit ? "✅" : "—" };
});

// D) 指南「Content Schema」集合是否已在 src/content.config.ts 中声明
const contentMain = existsSync(join(ROOT, "src/content.config.ts"))
  ? readFileSync(join(ROOT, "src/content.config.ts"), "utf8")
  : "";
const guideContentRows = guideContent.map((c) => {
  const inConfig = new RegExp(`(^|\\n)\\s*${c.collection}\\s*:`).test(contentMain) ||
    new RegExp(`\\t${c.collection}\\s*:`).test(contentMain);
  return { ...c, 落地: inConfig ? "✅" : "—" };
});

// E) 功能模块语义 → 期望组件域（指南未给出，由代码人工标注，供后续修订）
const GUIDE_MODULES = [
  { module: "文章 (posts)", compDomains: ["pages", "common", "widget"] },
  { module: "日常动态 (moments)", compDomains: ["moments"] },
  { module: "相册 (album)", compDomains: [] },
  { module: "导航 (daohang)", compDomains: [] },
  { module: "番组计划 (bangumi)", compDomains: ["pages", "features"] },
  { module: "特殊页面 (spec)", compDomains: ["about"] },
  { module: "生活记录 (life)", compDomains: [] },
  { module: "笔记本 (notebooks)", compDomains: ["comment", "pages"] },
  { module: "账单/资金 (bills)", compDomains: ["bills"] },
  { module: "日程 (schedules)", compDomains: ["schedules"] },
  { module: "留言板 (danmu)", compDomains: ["features"] },
];
const moduleRows = GUIDE_MODULES.map((m) => ({
  ...m,
  compHit: (m.compDomains || []).filter((d) => domStats.has(d.split("/")[0])),
}));
// ---- 渲染 Markdown ----
let md = "";
const p = (s) => {
  md += s + "\n";
};
p("# 代码结构审计表单（供 AI 重构参考）");
p("");
p(`> 生成时间：${new Date().toISOString().slice(0, 10)} · 扫描范围：\`src/\` 下 ${CODE_DIRS.join(" / ")}`);
p(`> 说明：本表由 \`scripts/audit-code-structure.mjs\` 只读扫描生成，不含 \`content/\` 内容数据、\`scripts/\` 工具脚本与构建产物。仅用于展示**代码结构重构方向**。`);
p("");
p("## 一、顶层代码目录总览");
p("| 目录 | 文件数 | 总行数 | 最大文件(行) |");
p("|---|---|---|---|");
for (const [root, s] of [...rootStats].sort((a,b)=>b[1].lines-a[1].lines)) {
  p(`| \`${root}/\` | ${s.files} | ${s.lines} | ${s.maxFile} (${s.maxLines}) |`);
}
p("");
p("## 二、组件功能域（components/）规模");
p("| 域 | 文件数 | 总行数 | 最大文件(行) |");
p("|---|---|---|---|");
for (const [dom, s] of [...domStats].sort((a,b)=>b[1].lines-a[1].lines)) {
  p(`| \`${dom}/\` | ${s.files} | ${s.lines} | ${s.maxFile} (${s.maxLines}) |`);
}
p("");
p(`## 三、超大 / 复杂文件 TOP（≥ ${BIG_THRESHOLD} 行，重构候选）`);
p("| 文件 | 行数 | 类型 |");
p("|---|---|---|");
for (const f of bigFiles) {
  p(`| \`${f.rel}\` | ${f.lines} | ${f.type} |`);
}
p("");
p("## 四、页面 ⇄ 组件域 依赖表");
p("| 页面 | 引用的组件域 | 数量 |");
p("|---|---|---|");
for (const d of pageDeps.sort((a,b)=>b.count-a.count)) {
  p(`| ${d.path} | ${d.domains.join(", ") || "—"} | ${d.count} |`);
}
p("");
p("## 五、跨域组件引用（耦合 / 复用信号）");
p("> 排除共享基础域 `common/` 后，其余跨域引用即真实的**耦合热点**——被引用越多越接近公共层或高耦合。");
p("| 被引用目标域 | 被引用次数 | 来源域 |");
p("|---|---|---|");
for (const [dom, s] of [...income].sort((a,b)=>b[1].count-a[1].count)) {
  p(`| \`${dom}/\` | ${s.count} | ${[...s.fromDomains].join(", ")} |`);
}
p("");
p("#### 共享基础域复用（→ components/common/，预期内）");
p(`共 ${commonReuse.length} 处引用，来源域：${[...new Set(commonReuse.map(r=>r.from.split("/")[1]))].join(", ")}。`);
p("");
p("#### 跨域引用明细（from → to，已排除 common）");
p("```");
for (const r of crossRefs.filter(r=>r.toDomain!=="common").sort((a,b)=>a.from.localeCompare(b.from))) {
  p(`  ${r.from}  →  components/${r.toDomain}/`);
}
p("```");
p("");
p("## 六、对照《博客使用指南.md》（动态解析附录表格）");
p("");
p("### 6.1 指南「页面路径一览」声明 ⇄ 代码 pages/ 落地");
p("| 功能 | 指南路径 | 代码已落地 |");
p("|---|---|---|");
for (const r of guideRouteRows) {
  p(`| ${r.功能} | ${r.路径} | ${r.落地} |`);
}
p("");
p("### 6.2 指南「Content Schema 概览」集合 ⇄ 代码 content.config 声明");
p("| Collection | 指南路径 | 已声明 |");
p("|---|---|---|");
for (const c of guideContentRows) {
  p(`| ${c.collection} | ${c.路径} | ${c.落地} |`);
}
p("");
p("### 6.3 功能模块语义 → 代码组件域（供人工复核重构归属）");
p("> 指南未给组件域，下表为脚本依据代码结构标注的**期望归属**，并标注该域是否真实存在。");
p("| 功能模块 | 期望组件域 | 已存在 |");
p("|---|---|---|");
for (const m of moduleRows) {
  const existing = (m.compDomains || []).map((d) => domStats.has(d.split("/")[0]) ? `${d} ✅` : `${d} ❌`);
  p(`| ${m.module} | ${existing.join("<br>") || "—"} | ${m.compHit.length}/${(m.compDomains||[]).length} |`);
}

// 七、重构方向建议：由规则自动归纳的「下一步候选」
const missingRoutes = guideRouteRows.filter((r) => r.落地 === "—");
const missingSets = guideContentRows.filter((c) => c.落地 === "—");
const hotCross = [...income].sort((a, b) => b[1].count - a[1].count);
const topBig = bigFiles.slice(0, 6);

p("## 七、重构方向建议（规则自动归纳）");
p("");
p("> 以下结论由脚本按客观信号推断，仅作**切入点候选**，是否重构由你来定夺。");
p("");
p("### 7.1 优先拆分超大 / 复杂文件（按行数降序）");
p("| 建议 | 依据 |");
p("|---|---|");
for (const f of topBig) {
  p(`| 拆分/审计 \`${f.rel}\`（${f.lines} 行） | 超过 ${BIG_THRESHOLD} 行，体量过大，宜按职责拆分，避免牵一发动全身 |`);
}
p("");
p("### 7.2 跨域耦合热点（组件域被引用多，考虑是否下沉 common）");
if (hotCross.length) {
  p("| 目标域 | 被引用次数 | 建议 |");
  p("|---|---|---|");
  for (const [dom, s] of hotCross.slice(0, 5)) {
    p(`| \`${dom}/\` | ${s.count} | 被 ${[...s.fromDomains].join(", ")} 引用，评估抽到 \`common/\` 或收敛依赖 |`);
  }
} else {
  p("无显著的跨域耦合热点（common 外的跨域引用较少或不存在）。");
}
p("");
p("### 7.3 指南声明但代码缺失/滞后（文档 ⇄ 代码对齐项）");
if (missingRoutes.length) {
  p("| 缺失路由 | 说明 |");
  p("|---|---|");
  for (const r of missingRoutes.slice(0, 10)) {
    p(`| \`${r.路径}\`（${r.功能}） | 指南已声明，但 \`pages/\` 下无对应文件——需确认是删除还是补建 |`);
  }
} else {
  p("- 指南「页面路径一览」的路由均已落地。");
}
if (missingSets.length) {
  for (const c of missingSets) {
    p(`- 指南声明集合 \`${c.collection}\`（${c.路径}）在 \`src/content.config.ts\` 中未找到——命名不一致或已迁移。`);
  }
} else {
  p("- 指南声明的 Content 集合均已声明。");
}
p("");
p("---");
p("*注：以上为静态规模与引用关系统计，重构方向需结合业务语义最终由人来定夺——本脚本只提供客观候选。*");
p("");
writeFileSync(OUT, md, "utf8");

// ---- 终端摘要 ----
const totalLines = [...rootStats.values()].reduce((a, s) => a + s.lines, 0);
console.log(`✔ 已生成：${OUT}`);
console.log(`已扫描代码文件：${rows.length} 个，总行数 ${totalLines}`);
console.log(`超大文件（≥${BIG_THRESHOLD}行）共 ${bigFiles.length} 个：`);
for (const f of bigFiles.slice(0, 15)) console.log(`  - ${f.rel} (${f.lines})`);
console.log(`跨域引用：common 复用 ${commonReuse.length} 处，非 common 耦合热点 ${crossRefs.length - commonReuse.length} 处`);