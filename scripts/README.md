# Scripts 工具箱

所有脚本通过统一入口 `cli.js` 调用，只需记住一个命令：

```bash
pnpm cli
```

## 目录结构

```
scripts/
├── cli.js                    # 统一入口
├── 新建文章/                  # 创建新文章
│   └── index.js
├── 生成图标/                  # 图标预处理（构建时自动执行）
│   └── index.js
├── 下载影视/                  # 影视封面下载（TMDB）
│   ├── index.py
│   └── img-anime/
├── 生成摘要/                  # AI 摘要生成
│   └── index.ts
├── 添加导航/                  # 导航链接管理
│   └── index.js
└── 转WebP/                   # 图片转 WebP 格式
    └── convert-to-webp.mjs
```

## 可用命令

| 命令 | 说明 | 脚本 |
|------|------|------|
| `new` | 创建新文章 | `新建文章/index.js` |
| `media` | 下载影视封面 + 生成 md（TMDB） | `下载影视/index.py` |
| `desc` | AI 批量生成文章摘要（千问 API） | `生成摘要/index.ts` |
| `nav` | 添加网站导航条目 | `添加导航/index.js` |
| `dev` | 启动本地开发服务器 | `pnpm dev` |
| `build` | 构建生产站点 | `pnpm build` |

## 使用方式

```bash
# 交互菜单（推荐）
pnpm cli

# 子命令直达
pnpm cli new "文章名"
pnpm cli media "片名" [--type=movie|tv] [-y]
pnpm cli desc
pnpm cli dev
pnpm cli build
```

所有子命令的额外参数会原样转发给对应的脚本。

## 各脚本详情

### 新建文章/index.js — 创建新文章

创建新文章模板，自动填充 frontmatter。

### 下载影视/index.py — 影视封面下载

从 TMDB 搜索影视并生成 bangumi md 文件。封面输出到 `下载影视/img-anime/`，md 输出到 `src/content/bangumi/anime/`。

### 生成摘要/index.ts — 文章摘要生成

调用千问 API 批量为缺少 description 的文章自动生成摘要。
