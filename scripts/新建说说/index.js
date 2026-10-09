#!/usr/bin/env node

/**
 * 创建一条说说（moments）
 * 用法: pnpm cli moment [可选正文]
 * 文件名 = 当前系统时间（年月日 + 时分），如 2026-10-10-1530.md，当天多条不会重名
 * Frontmatter 展示全部默认字段
 */

import fs from "node:fs";
import path from "node:path";

function pad(n) {
  return String(n).padStart(2, "0");
}

function nowParts() {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: pad(d.getMonth() + 1),
    day: pad(d.getDate()),
    hour: pad(d.getHours()),
    minute: pad(d.getMinutes()),
    second: pad(d.getSeconds()),
  };
}

const args = process.argv.slice(2);
const { year, month, day, hour, minute, second } = nowParts();

const fileName = `${year}-${month}-${day}-${hour}${minute}.md`;
const id = `${year}${month}${day}${hour}${minute}`;
const targetDir = "./src/content/moments/";
const fullPath = path.join(targetDir, fileName);

if (fs.existsSync(fullPath)) {
  console.error(`Error: File ${fullPath} already exists`);
  process.exit(1);
}

const content = `---
published: ${year}-${month}-${day} ${hour}:${minute}:${second}
id: "${id}"
author: lh
avatar: /assets/ziyuan/avatar01.webp
pinned: false
images: []
tags: []
location: ""
device: ""
---

${args.join(" ")}
`;

fs.writeFileSync(fullPath, content);
console.log(`说说已创建: ${fullPath}`);
