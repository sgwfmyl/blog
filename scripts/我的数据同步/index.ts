/**
 * 「我的」分组数据同步脚本（阶段 7 私有化）。
 *
 * 职责：把私有仓库里的账单 / 日程 / 应用 / 笔记本数据全量同步进 D1：
 *   1. 读本地私有仓库检出 `private-content/my/`（可用 MY_SOURCE_DIR 覆盖）：
 *      - bills/*.md            账单（frontmatter 对齐旧 bills 集合）
 *      - schedules/**​/*.md     日程（含农历生日字段）
 *      - apps/*.md             应用展示
 *      - notebooks/<本>/_index.json|md + *.md   笔记本（书架级 + 条目，正文存原始文本）
 *   2. 生成全量替换 SQL（BEGIN; DELETE; INSERT...; COMMIT;）
 *   3. 经 wrangler CLI 执行：`d1 execute blog --remote --file`（默认线上；
 *      D1_MODE=local 写本地模拟，本地 dev 验证用）
 *
 * 运行方式：pnpm sync:my
 * 环境变量：
 *   - MY_SOURCE_DIR：数据源目录（默认 private-content/my）
 *   - D1_MODE=local：写本地模拟 D1（默认 --remote 线上）
 *   - CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID：写线上 D1（经 wrangler）
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
// 数据源目录：本地（MY_SOURCE_DIR / private-content/my）；CI 模式下由 main 从 GitHub API 拉到临时目录后覆盖
let sourceDir = path.resolve(
	projectRoot,
	process.env.MY_SOURCE_DIR || "private-content/my",
);
const outFile = path.join(
	fileURLToPath(new URL(".", import.meta.url)),
	"my-sections.sql",
);

// ---------- GitHub API 拉取（CI 模式，本地无 private-content/） ----------

const GH_OWNER = process.env.GH_OWNER;
const GH_REPO = process.env.GH_REPO;
const GH_PAT = process.env.GH_PAT;

function ghHeaders(): Record<string, string> {
	return {
		Authorization: `Bearer ${GH_PAT}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "blog-my-sync",
	};
}

async function fetchGitHubFile(relPath: string): Promise<string> {
	const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${relPath}`;
	const response = await fetch(url, { headers: ghHeaders() });
	if (!response.ok) {
		throw new Error(`GitHub API ${response.status} for ${relPath}`);
	}
	const payload = (await response.json()) as {
		type?: string;
		content?: string;
	};
	if (payload.type !== "file" || typeof payload.content !== "string") {
		throw new Error(`GitHub 返回的不是文件：${relPath}`);
	}
	const binary = atob(payload.content.replace(/\s+/g, ""));
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

/** 递归下载 GitHub 仓库目录到本地（GitHub Contents API 目录返回数组）。 */
async function downloadDirFromGitHub(
	relPath: string,
	localDir: string,
): Promise<void> {
	const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${relPath}`;
	const response = await fetch(url, { headers: ghHeaders() });
	if (!response.ok) {
		throw new Error(`GitHub API ${response.status} for ${relPath}`);
	}
	const payload = (await response.json()) as unknown;
	if (!Array.isArray(payload)) {
		throw new Error(`GitHub 返回的不是目录：${relPath}`);
	}
	for (const item of payload as { type: string; path: string; name: string }[]) {
		const local = path.join(localDir, item.name);
		if (item.type === "dir") {
			fs.mkdirSync(local, { recursive: true });
			await downloadDirFromGitHub(item.path, local);
		} else if (item.type === "file") {
			const content = await fetchGitHubFile(item.path);
			fs.mkdirSync(path.dirname(local), { recursive: true });
			fs.writeFileSync(local, content, "utf8");
		}
	}
}

// ---------- 工具 ----------

/** 递归列出目录下匹配扩展名的文件（POSIX 风格相对路径）。 */
function listFiles(dir: string, exts: string[], base = dir): string[] {
	if (!fs.existsSync(dir)) return [];
	const out: string[] = [];
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		const stat = fs.statSync(full);
		if (stat.isDirectory()) {
			out.push(...listFiles(full, exts, base));
		} else if (exts.some((e) => name.toLowerCase().endsWith(e))) {
			out.push(path.relative(base, full).replace(/\\/g, "/"));
		}
	}
	return out;
}

/** SQL 字符串转义（单引号翻倍）。 */
function q(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

function sqlStr(value: unknown, fallback = ""): string {
	if (value === undefined || value === null) return q(fallback);
	return q(String(value));
}

function sqlNum(value: unknown, fallback = 0): string {
	const n = Number(value);
	return Number.isFinite(n) ? String(n) : String(fallback);
}

function sqlBool(value: unknown): string {
	return value === true || value === 1 || value === "true" ? "1" : "0";
}

/** 日期归一为 YYYY-MM-DD 文本（gray-matter/js-yaml 会把 ISO 日期解析成 Date）。 */
function dateText(value: unknown): string | null {
	if (value === undefined || value === null || value === "") return null;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
	}
	const s = String(value).trim();
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** 数组字段归一为 JSON string[] 文本（兼容逗号/分号分隔的字符串写法）。 */
function jsonArrayText(value: unknown): string {
	let arr: unknown[] = [];
	if (Array.isArray(value)) {
		arr = value;
	} else if (typeof value === "string" && value.trim()) {
		arr = value.split(/[,;，；\n]/);
	}
	return JSON.stringify(
		arr.map((s) => String(s).trim()).filter(Boolean),
	);
}

/** 解析 md 文件 frontmatter + 正文。 */
function parseMd(file: string): {
	data: Record<string, unknown>;
	body: string;
} {
	const raw = fs.readFileSync(file, "utf8");
	const { data, content } = matter(raw);
	return { data: data as Record<string, unknown>, body: content.trim() };
}

/** 文件相对路径去扩展名作为稳定 id。 */
function idOf(rel: string): string {
	return rel.replace(/\.(md|mdx|json)$/i, "");
}

// ---------- 解析各组数据 ----------

function collectBills(): string[] {
	const dir = path.join(sourceDir, "bills");
	const stmts: string[] = [];
	for (const rel of listFiles(dir, [".md", ".mdx"])) {
		const { data } = parseMd(path.join(dir, rel));
		const date = dateText(data.date);
		if (!date || data.amount === undefined) {
			console.warn(`  ✗ bills/${rel}：缺 date 或 amount，跳过`);
			continue;
		}
		stmts.push(
			`INSERT INTO bills (id, title, amount, type, category, account, date, time, description, tags) VALUES (${sqlStr(idOf(rel))}, ${sqlStr(data.title)}, ${sqlNum(data.amount)}, ${sqlStr(data.type, "expense")}, ${sqlStr(data.category, "其他")}, ${sqlStr(data.account, "其他")}, ${sqlStr(date)}, ${sqlStr(data.time)}, ${sqlStr(data.description)}, ${sqlStr(jsonArrayText(data.tags), "[]")});`,
		);
	}
	return stmts;
}

function collectSchedules(): string[] {
	const dir = path.join(sourceDir, "schedules");
	const stmts: string[] = [];
	for (const rel of listFiles(dir, [".md", ".mdx"])) {
		const { data } = parseMd(path.join(dir, rel));
		if (!data.title) {
			console.warn(`  ✗ schedules/${rel}：缺 title，跳过`);
			continue;
		}
		const isLunar = data.isLunar === true;
		const date = dateText(data.date);
		if (!isLunar && !date) {
			console.warn(`  ✗ schedules/${rel}：非农历需填 date，跳过`);
			continue;
		}
		if (isLunar && (!data.lunarMonth || !data.lunarDay)) {
			console.warn(`  ✗ schedules/${rel}：农历需填 lunarMonth/lunarDay，跳过`);
			continue;
		}
		stmts.push(
			`INSERT INTO schedules (id, title, date, end_date, all_day, priority, status, location, repeat, category, person, is_lunar, lunar_month, lunar_day, lunar_leap) VALUES (${sqlStr(idOf(rel))}, ${sqlStr(data.title)}, ${date ? sqlStr(date) : "NULL"}, ${dateText(data.endDate) ? sqlStr(dateText(data.endDate) as string) : "NULL"}, ${sqlBool(data.allDay)}, ${sqlStr(data.priority, "none")}, ${sqlStr(data.status, "todo")}, ${sqlStr(data.location)}, ${sqlStr(data.repeat)}, ${sqlStr(data.category, "schedule")}, ${sqlStr(data.person)}, ${sqlBool(isLunar)}, ${data.lunarMonth === undefined ? "NULL" : sqlNum(data.lunarMonth)}, ${data.lunarDay === undefined ? "NULL" : sqlNum(data.lunarDay)}, ${sqlBool(data.lunarLeap)});`,
		);
	}
	return stmts;
}

function collectApps(): string[] {
	const dir = path.join(sourceDir, "apps");
	const stmts: string[] = [];
	for (const rel of listFiles(dir, [".md"])) {
		const { data } = parseMd(path.join(dir, rel));
		if (!data.title) {
			console.warn(`  ✗ apps/${rel}：缺 title，跳过`);
			continue;
		}
		stmts.push(
			`INSERT INTO apps (id, title, imgurl, description, siteurl, tags, weight, enabled) VALUES (${sqlStr(idOf(rel))}, ${sqlStr(data.title)}, ${sqlStr(data.imgurl)}, ${sqlStr(data.desc)}, ${sqlStr(data.siteurl)}, ${sqlStr(jsonArrayText(data.tags), "[]")}, ${sqlNum(data.weight)}, ${data.enabled === false ? "0" : "1"});`,
		);
	}
	return stmts;
}

function collectNotebooks(): { roots: string[]; entries: string[] } {
	const dir = path.join(sourceDir, "notebooks");
	const roots: string[] = [];
	const entries: string[] = [];
	if (!fs.existsSync(dir)) return { roots, entries };

	for (const folder of fs.readdirSync(dir)) {
		const folderPath = path.join(dir, folder);
		if (!fs.statSync(folderPath).isDirectory()) continue;

		// 书架级：_index.json 或 _index.md
		let rootData: Record<string, unknown> = {};
		const jsonIndex = path.join(folderPath, "_index.json");
		const mdIndex = path.join(folderPath, "_index.md");
		if (fs.existsSync(jsonIndex)) {
			rootData = JSON.parse(fs.readFileSync(jsonIndex, "utf8")) as Record<
				string,
				unknown
			>;
		} else if (fs.existsSync(mdIndex)) {
			rootData = parseMd(mdIndex).data;
		} else {
			console.warn(`  ✗ notebooks/${folder}：缺 _index.json/_index.md，跳过整本`);
			continue;
		}
		roots.push(
			`INSERT INTO notebooks (folder, name, cover, summary) VALUES (${sqlStr(folder)}, ${sqlStr(rootData.name, "未命名日记本")}, ${sqlStr(rootData.cover)}, ${sqlStr(rootData.summary)});`,
		);

		// 条目：文件夹下其余 md（排除 _index.* 与 Readme）
		for (const name of fs.readdirSync(folderPath)) {
			if (!/\.(md|mdx)$/i.test(name)) continue;
			const lower = name.toLowerCase();
			if (lower.startsWith("_index.") || lower === "readme.md") continue;
			const { data, body } = parseMd(path.join(folderPath, name));
			const slug = name.replace(/\.(md|mdx)$/i, "");
			const date = dateText(data.date);
			entries.push(
				`INSERT INTO notebook_entries (id, notebook, name, date, images, tags, body) VALUES (${sqlStr(`${folder}/${slug}`)}, ${sqlStr(folder)}, ${sqlStr(data.name, slug)}, ${date ? sqlStr(date) : "NULL"}, ${sqlStr(jsonArrayText(data.images), "[]")}, ${sqlStr(jsonArrayText(data.tags), "[]")}, ${sqlStr(body)});`,
			);
		}
	}
	return { roots, entries };
}

// ---------- wrangler 执行 ----------

function runD1(sqlFile: string): void {
	const wranglerCli = fileURLToPath(
		new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
	);
	const remoteFlag = process.env.D1_MODE === "local" ? "--local" : "--remote";
	execFileSync(
		process.execPath,
		[wranglerCli, "d1", "execute", "blog", remoteFlag, `--file=${sqlFile}`],
		{ stdio: "inherit", cwd: projectRoot },
	);
}

async function main(): Promise<void> {
	// 数据源：默认读本地 private-content/my（或 MY_SOURCE_DIR 指定目录）；
	// 设置 GH_PAT/GH_OWNER/GH_REPO 且未指定 MY_SOURCE_DIR 时，从私有仓库 GitHub API 拉 my/ 到临时目录（CI 用）
	let tmpDir: string | null = null;
	const useGitHub =
		!!GH_PAT && !!GH_OWNER && !!GH_REPO && !process.env.MY_SOURCE_DIR;
	if (useGitHub) {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "my-sync-"));
		sourceDir = tmpDir;
		console.log(`从私有仓库 GitHub API 拉取 my/ → 临时目录`);
		await downloadDirFromGitHub("my", sourceDir);
	}

	console.log(`开始同步「我的」分组数据 → D1（源目录：${sourceDir}）`);
	if (!fs.existsSync(sourceDir)) {
		console.error(`源目录不存在：${sourceDir}`);
		process.exit(1);
	}

	const bills = collectBills();
	const schedules = collectSchedules();
	const apps = collectApps();
	const notebooks = collectNotebooks();

	const sql = [
		// 注：D1 远程执行不支持显式 BEGIN TRANSACTION/COMMIT（报错提示用 storage.transaction API），
		// 故这里不做事务包裹。全量替换 + 幂等，失败重跑一次即可。
		"DELETE FROM bills;",
		"DELETE FROM schedules;",
		"DELETE FROM apps;",
		"DELETE FROM notebook_entries;",
		"DELETE FROM notebooks;",
		...bills,
		...schedules,
		...apps,
		...notebooks.roots,
		...notebooks.entries,
	].join("\n");
	fs.writeFileSync(outFile, sql, "utf8");

	console.log(
		`解析完成：账单 ${bills.length}、日程 ${schedules.length}、应用 ${apps.length}、笔记本 ${notebooks.roots.length} 本 / ${notebooks.entries.length} 条`,
	);
	console.log(`SQL 已生成：${outFile}`);

	try {
		runD1(outFile);
	} catch (err) {
		console.error("写 D1 失败", err);
		process.exit(1);
	}
	if (tmpDir) {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
	console.log("「我的」分组数据同步完成。");
}

main().catch((err: unknown) => {
	console.error("同步失败：", err);
	process.exit(1);
});
