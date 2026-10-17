import type { ScheduleRecord } from "./my-source";

// 阶段 7：日程数据迁 D1，条目形态由 my-source 定义（对齐旧 schedules 集合条目）
export type ScheduleEntry = ScheduleRecord;

function toDateKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export function groupSchedulesByDay(
	entries: ScheduleEntry[],
): Map<string, ScheduleEntry[]> {
	const map = new Map<string, ScheduleEntry[]>();
	const sorted = [...entries].sort((a, b) => {
		const da = a.data.date as Date | undefined;
		const db = b.data.date as Date | undefined;
		if (!da && !db) return 0;
		if (!da) return 1;
		if (!db) return -1;
		return da.getTime() - db.getTime();
	});
	for (const e of sorted) {
		const d = e.data.date as Date | undefined;
		if (!d) continue;
		const k = toDateKey(d);
		if (!map.has(k)) map.set(k, []);
		map.get(k)?.push(e);
	}
	return map;
}

export function calendarMarks(
	entries: ScheduleEntry[],
	year: number,
	month: number,
): Set<string> {
	// month 1-12
	const set = new Set<string>();
	for (const e of entries) {
		const d = e.data.date as Date | undefined;
		if (!d) continue;
		if (d.getFullYear() === year && d.getMonth() + 1 === month)
			set.add(toDateKey(d));
	}
	return set;
}

export function eventsByDate(
	entries: ScheduleEntry[],
): Map<string, ScheduleEntry[]> {
	return groupSchedulesByDay(entries);
}

export function isHolidayOrBirthday(entry: ScheduleEntry): boolean {
	return (
		entry.data.category === "birthday" ||
		entry.data.category === "anniversary" ||
		entry.data.category === "holiday"
	);
}

export function todaySchedules(
	entries: ScheduleEntry[],
	dateKey: string,
): ScheduleEntry[] {
	return entries.filter((e) => {
		const d = e.data.date as Date | undefined;
		return d
			? toDateKey(d) === dateKey && e.data.category === "schedule"
			: false;
	});
}

export function todayFestivals(
	entries: ScheduleEntry[],
	dateKey: string,
): ScheduleEntry[] {
	return entries.filter((e) => {
		const d = e.data.date as Date | undefined;
		return d ? toDateKey(d) === dateKey && isHolidayOrBirthday(e) : false;
	});
}
