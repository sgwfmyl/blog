import { env } from "cloudflare:workers";

/**
 * 「我的」分组数据源（阶段 7：私有化）。
 *
 * 账单 / 日程 / 应用 / 笔记本四组数据已迁出公开仓库 Content Collections，
 * 存 D1（表结构见 migrations/0002_my_sections.sql），由 SSR 页面在运行时读取。
 *
 * 返回形态刻意对齐旧集合条目（{ id, body?, data }），
 * 页面层与 bill-adapter / schedule-adapter 等下游逻辑零改动。
 *
 * 日期口径：旧集合 YAML `date: 2026-08-23` 经 z.coerce.date() 得 UTC 零点 Date；
 * 这里 `new Date("YYYY-MM-DD")` 同为 UTC 零点，排序/分桶行为与旧实现一致。
 */

// ---------- 类型（对齐旧集合条目的常用形态） ----------

export type BillData = {
	title: string;
	amount: number;
	type: "income" | "expense";
	category: string;
	account: string;
	date: Date;
	time: string;
	description: string;
	tags: string[];
};
export type BillRecord = { id: string; data: BillData };

export type ScheduleData = {
	title: string;
	date?: Date;
	endDate?: Date;
	allDay: boolean;
	priority: "none" | "low" | "medium" | "high";
	status: "todo" | "done" | "cancelled";
	location: string;
	repeat: string;
	category: "schedule" | "birthday" | "anniversary" | "holiday";
	person: string;
	isLunar: boolean;
	lunarMonth?: number;
	lunarDay?: number;
	lunarLeap: boolean;
};
export type ScheduleRecord = { id: string; data: ScheduleData };

export type AppData = {
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
	weight: number;
	enabled: boolean;
};
export type AppRecord = { id: string; data: AppData };

export type NotebookData = {
	name: string;
	cover: string;
	summary: string;
	images: string | string[];
	tags: string[];
	date?: Date;
};
export type NotebookRecord = { id: string; body: string; data: NotebookData };

// ---------- 工具 ----------

function parseJsonArray(raw: string | null | undefined): string[] {
	if (!raw) return [];
	try {
		const v: unknown = JSON.parse(raw);
		return Array.isArray(v)
			? v.filter((s): s is string => typeof s === "string")
			: [];
	} catch {
		return [];
	}
}

/** YYYY-MM-DD → UTC 零点 Date（对齐旧集合 z.coerce.date 的口径）。 */
function parseDate(raw: string | null | undefined): Date | undefined {
	if (!raw) return undefined;
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

// ---------- D1 行类型 ----------

type BillRow = {
	id: string;
	title: string;
	amount: number;
	type: string;
	category: string;
	account: string;
	date: string;
	time: string;
	description: string;
	tags: string;
};

type ScheduleRow = {
	id: string;
	title: string;
	date: string | null;
	end_date: string | null;
	all_day: number;
	priority: string;
	status: string;
	location: string;
	repeat: string;
	category: string;
	person: string;
	is_lunar: number;
	lunar_month: number | null;
	lunar_day: number | null;
	lunar_leap: number;
};

type AppRow = {
	id: string;
	title: string;
	imgurl: string;
	description: string;
	siteurl: string;
	tags: string;
	weight: number;
	enabled: number;
};

type NotebookRow = {
	folder: string;
	name: string;
	cover: string;
	summary: string;
};

type NotebookEntryRow = {
	id: string;
	notebook: string;
	name: string;
	date: string | null;
	images: string;
	tags: string;
	body: string;
};

// ---------- 读取 ----------

export async function getBillsFromD1(): Promise<BillRecord[]> {
	const { results } = await env.DB.prepare(
		"SELECT id, title, amount, type, category, account, date, time, description, tags FROM bills",
	).all<BillRow>();
	return (results ?? []).map((r) => ({
		id: r.id,
		data: {
			title: r.title,
			amount: r.amount,
			type: r.type === "income" ? "income" : "expense",
			category: r.category || "其他",
			account: r.account || "其他",
			date: parseDate(r.date) ?? new Date(0),
			time: r.time,
			description: r.description,
			tags: parseJsonArray(r.tags),
		},
	}));
}

export async function getSchedulesFromD1(): Promise<ScheduleRecord[]> {
	const { results } = await env.DB.prepare(
		"SELECT id, title, date, end_date, all_day, priority, status, location, repeat, category, person, is_lunar, lunar_month, lunar_day, lunar_leap FROM schedules",
	).all<ScheduleRow>();
	return (results ?? []).map((r) => ({
		id: r.id,
		data: {
			title: r.title,
			date: parseDate(r.date ?? undefined),
			endDate: parseDate(r.end_date ?? undefined),
			allDay: r.all_day === 1,
			priority: (r.priority || "none") as ScheduleData["priority"],
			status: (r.status || "todo") as ScheduleData["status"],
			location: r.location,
			repeat: r.repeat,
			category: (r.category || "schedule") as ScheduleData["category"],
			person: r.person,
			isLunar: r.is_lunar === 1,
			lunarMonth: r.lunar_month ?? undefined,
			lunarDay: r.lunar_day ?? undefined,
			lunarLeap: r.lunar_leap === 1,
		},
	}));
}

export async function getAppsFromD1(): Promise<AppRecord[]> {
	const { results } = await env.DB.prepare(
		"SELECT id, title, imgurl, description, siteurl, tags, weight, enabled FROM apps",
	).all<AppRow>();
	return (results ?? []).map((r) => ({
		id: r.id,
		data: {
			title: r.title,
			imgurl: r.imgurl,
			desc: r.description,
			siteurl: r.siteurl,
			tags: parseJsonArray(r.tags),
			weight: r.weight,
			enabled: r.enabled === 1,
		},
	}));
}

/**
 * 笔记本：拼回旧集合形态——书架根条目 id 为 `<folder>/_index`（body 为空），
 * 条目 id 为 `<folder>/<slug>`（body 为原始文本）。页面层的 id 正则无需改动。
 */
export async function getNotebooksFromD1(): Promise<NotebookRecord[]> {
	const [roots, entries] = await Promise.all([
		env.DB.prepare(
			"SELECT folder, name, cover, summary FROM notebooks",
		).all<NotebookRow>(),
		env.DB.prepare(
			"SELECT id, notebook, name, date, images, tags, body FROM notebook_entries",
		).all<NotebookEntryRow>(),
	]);

	const records: NotebookRecord[] = [];
	for (const r of roots.results ?? []) {
		records.push({
			id: `${r.folder}/_index`,
			body: "",
			data: {
				name: r.name || "未命名日记本",
				cover: r.cover,
				summary: r.summary,
				images: [],
				tags: [],
			},
		});
	}
	for (const r of entries.results ?? []) {
		records.push({
			id: r.id,
			body: r.body,
			data: {
				name: r.name,
				cover: "",
				summary: "",
				images: parseJsonArray(r.images),
				tags: parseJsonArray(r.tags),
				date: parseDate(r.date ?? undefined),
			},
		});
	}
	return records;
}
