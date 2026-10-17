# AstrBot 写入契约（bills / schedules）

> ⚠️ **2026-10-17 阶段 7 已变更**：账单/日程不再存 `src/content/{bills,schedules}`，而是迁到**私有仓库** `private-content/my/{bills,schedules}`，由 `pnpm sync:my`（`scripts/我的数据同步/index.ts`）全量灌入 D1。frontmatter 字段保持不变，仅**写入路径与生效方式**变化：改完后跑 `pnpm sync:my`（不再依赖 `pnpm build`）。AstrBot 插件侧写入路径需同步改到私有仓库。详见 CLAUDE.md §3.6。

> Phase1 为静态契约：机器人按本规范追加 Markdown，同步脚本灌 D1 后即在 `/bills` 与 `/schedules` 可见。Phase2 再补增量刷新。

## bills

- 路径：`private-content/my/bills/YYYY-MM-DD-{slug}.md`（原 `src/content/bills/`，阶段 7 迁出）
- frontmatter（与原 `src/content.config.ts:billsCollection` 对齐，现校验逻辑在 `scripts/我的数据同步/index.ts`）：
  - `title?: string`
  - `amount: number`（收入正，支出负）
  - `type: "income"|"expense"|"transfer"`（默认 expense）
  - `category: string`（默认 其他）
  - `account: string`（默认 其他，如 微信/支付宝/银行卡）
  - `date: Date`（YYYY-MM-DD 或 ISO）
  - `description?: string`
  - `tags?: string[]`

## schedules

- 路径：`src/content/schedules/YYYY-MM-DD-{slug}.md`
- frontmatter（与 `src/content.config.ts:schedulesCollection` 对齐）：
  - `title: string`
  - `date: Date`（开始时间）
  - `endDate?: Date`
  - `allDay?: boolean`（默认 false）
  - `priority?: "none"|"low"|"medium"|"high"`（默认 none）
  - `status?: "todo"|"done"|"cancelled"`（默认 todo）
  - `location?: string`
  - `repeat?: string`（如 每周）

## 触发

- 机器人完成写入后执行 `git add` + `git commit + push`，EdgeOne 重新构建即同步。
