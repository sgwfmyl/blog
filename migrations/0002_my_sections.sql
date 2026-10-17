-- 「我的」分组私有化（阶段 7）：账单 / 日程 / 应用 / 笔记本四组数据从公开仓库
-- Content Collections 迁入 D1，页面切 SSR 运行时读取（未登录 404）。
-- 数据由 scripts/我的数据同步/index.ts 从私有仓库同步（全量替换）。

-- 账单（对齐原 bills 集合 schema）
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,           -- 原 md 文件名（不含扩展名），稳定 ID
  title TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'expense',   -- income | expense
  category TEXT NOT NULL DEFAULT '其他',
  account TEXT NOT NULL DEFAULT '其他',
  date TEXT NOT NULL,            -- YYYY-MM-DD
  time TEXT NOT NULL DEFAULT '', -- HH:mm 或空
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]'         -- JSON string[]
);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills (date);

-- 日程（对齐原 schedules 集合 schema，含农历生日字段）
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,                     -- YYYY-MM-DD，农历条目可为空
  end_date TEXT,
  all_day INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'none',  -- none | low | medium | high
  status TEXT NOT NULL DEFAULT 'todo',    -- todo | done | cancelled
  location TEXT NOT NULL DEFAULT '',
  repeat TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'schedule', -- schedule | birthday | anniversary | holiday
  person TEXT NOT NULL DEFAULT '',
  is_lunar INTEGER NOT NULL DEFAULT 0,
  lunar_month INTEGER,
  lunar_day INTEGER,
  lunar_leap INTEGER NOT NULL DEFAULT 0
);

-- 应用展示（对齐原 apps 集合 schema；desc 是 SQL 关键字，列名用 description）
CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  imgurl TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  siteurl TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  weight INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

-- 笔记本（书架级：一本一行）
CREATE TABLE IF NOT EXISTS notebooks (
  folder TEXT PRIMARY KEY,       -- 文件夹名，同时是路由 slug
  name TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT ''
);

-- 笔记本条目（页面只展示原始文本，不做 markdown 渲染，故正文直接存 TEXT）
CREATE TABLE IF NOT EXISTS notebook_entries (
  id TEXT PRIMARY KEY,           -- <folder>/<slug>，对齐旧集合 entry.id 形态
  notebook TEXT NOT NULL REFERENCES notebooks(folder),
  name TEXT NOT NULL DEFAULT '',
  date TEXT,                     -- YYYY-MM-DD
  images TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  tags TEXT NOT NULL DEFAULT '[]',
  body TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_notebook_entries_notebook ON notebook_entries (notebook);
