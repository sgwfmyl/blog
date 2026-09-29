---
title: 使用 PagesCMS 给静态博客接入后台
published: 2026-08-07
description: 免费开源静态博客后台 PagesCMS 的完整接入指南：原理、配置文件、授权连接、踩坑记录
image: https://img.tsh520.cn/file/blog/post-covers/blogguide-pagescms.webp
tags:
  - 博客
  - 教程
  - 使用文档
updated: 2026-08-07
descriptionSource: manual
---

# 使用 PagesCMS 给静态博客接入后台

静态博客（Astro / Hexo / Hugo）最大的痛点就是**没有后台**：发一篇文章要么本地改文件再推送，要么自己写一套后台（还要管登录、安全、维护，成本不低）。

这篇文章介绍一个**零代码、零依赖**的方案——[PagesCMS](https://pagescms.org/)：只需要在仓库里放一个 YAML 配置文件，就能获得可视化编辑后台，手机上也能发文章。

<!-- 📷 插图 1：PagesCMS 后台界面截图
	图片放 images/ 目录，用 ![截图](images/xxx.png) 的格式替换本注释 -->

## 原理

PagesCMS 以 **GitHub 仓库为唯一数据源**，整个链路是：

1. 仓库根目录放一个 `.pages.yml`，声明你的内容模型（文章、友链、动态…）
2. 在 PagesCMS 云界面（或自托管）里可视化编辑内容
3. 它通过 GitHub API 把改动 **commit 写回仓库**
4. 部署平台（GitHub Pages / EdgeOne / Vercel / Cloudflare 等）检测到 push **自动重建**

CMS 本身不参与构建，也不关心你部署在哪——只要你的站点是"从 Git 仓库构建"的，它就能工作。

<!-- 📷 插图 2：工作原理示意图（仓库 → CMS 编辑 → GitHub 写回 → 平台重建） -->

**为什么适合静态博客**：官方内置 Astro 博客模板，社区大量 Astro 用户在用；对已有的内容集合（如 `src/content/` 下的 md 文件）零改造即可接入。

## 前置条件

- 博客内容是 **Git 仓库里的文件**（这本来就是静态博客的常态）
- 部署平台与 GitHub 集成（push 自动触发构建）
- 项目使用标准的 frontmatter（YAML 头）格式

## 第一步：编写 `.pages.yml`

在仓库**根目录**新建 `.pages.yml`，核心结构：

```yaml
media:
  - name: assets
    label: 站点资源
    input: public/assets
    output: /assets
    categories: [image]

content:
  - name: blog-posts
    label: 📝 博客文章
    type: group
    items:
      - name: posts
        label: 📝 博客文章
        type: collection
        path: src/content/posts
        format: yaml-frontmatter
        filename:
          template: "{year}-{month}-{day}-{primary}.md"
          field: create
        view:
          primary: title
          fields: [title, published, tags, category, draft, pinned]
          sort: ["published desc", "title asc"]
        fields:
          - name: title
            label: 标题
            type: string
            required: true
          - name: published
            label: 发布时间
            type: date
            required: true
            options:
              time: false
              format: yyyy-MM-dd
          - name: tags
            label: 标签
            type: select
            options:
              multiple: true
              creatable: true
          - name: body
            label: 正文
            type: rich-text
            required: true

settings:
  content:
    merge: false
```

<!-- 📷 插图 3：.pages.yml 配置示例截图 -->

### 几个必须注意的关键点（血泪教训）

**1. 字段必须和你的内容 schema 对齐**

Astro 用 zod 校验内容，CMS 保存的内容如果字段类型对不上，会出现"CMS 保存成功、构建却报错"。对照 `content.config.ts` 逐字段声明：

| zod 类型 | PagesCMS 字段类型 |
|---|---|
| `z.string()` | `string` / `text` |
| `z.date()` | `date`（`options.time` 控制是否含时分秒）|
| `z.boolean()` | `boolean` |
| `z.number()` | `number` |
| `z.array(z.string())` | `string` + `list: true` |

**2. 有正文的集合必须声明 `body` 字段**

正文内容在 CMS 里注入 `body` 键，不声明的话保存时会**把正文整段丢掉**（merge: false 下整文件重写）。文章、动态、日记这类集合都要加。

**3. `exclude` 只支持精确名称匹配，不支持 glob**

`exclude: ["**/images/**"]` 这种写法**永远不会生效**（名字里没有 `**/images/**` 这种东西）。要排除图片目录，写精确目录名：`exclude: ["images", "assets"]`。

**4. 文件名模板不要用 `{primary}` 生成中文名**

PagesCMS 的 slugify 会把中文字符剔除，`{primary}` 展开后是空字符串。用 `field: create` 让新建时手动输入文件名，最稳妥。

**5. 未在 schema 里但主题读取的字段要声明为 `hidden`**

比如主题自定义的 `descriptionSource`、`cover` 字段，不在 zod 里但被组件读取。不声明的话保存后被丢弃。声明为 `hidden: true` 即可无损保留：

```yaml
- name: descriptionSource
  label: 摘要来源
  type: string
  hidden: true
```

**6. 日期格式是严格解析的**

`date` 字段配置了 `format: "yyyy-MM-dd HH:mm:ss"` 后，存量文件中只有日期（`2026-05-07`）的记录会解析失败，后台显示**空白**。要么统一数据格式，要么把日期都补齐时分秒（如 `2026-05-07 00:00:00`）。

## 第二步：安装 GitHub App

打开 https://app.pagescms.org → 用 GitHub 账号登录 → 按提示安装 GitHub App：

- 选择 **"仅选定仓库"**（最小权限原则），勾选你的博客仓库即可
- 后面想加仓库，随时可以在 GitHub 的 App 设置里追加

<!-- 📷 插图 4：GitHub App 安装授权界面截图（注意选"仅选定仓库"） -->

## 第三步：连接仓库

回到 PagesCMS 首页 → **连接现有仓库**（注意：不是"从模板创建"，模板会新建一个演示仓库）→ 选择你的博客仓库 → 分支选 `main`。

之后就能在后台看到 `.pages.yml` 里声明的所有集合了。

## 踩坑记录：大目录首次加载报 500

文章比较多、目录比较大的仓库（一个目录 20+ 篇文章），首次打开集合列表可能会报：

```
Something went wrong while executing your query on ... 
Please include `B714:...` when reporting this issue.
```

**这是 GitHub GraphQL API 的服务端限制**（单次查询返回的文件全文总量有限制），不是配置问题——刷新页面即可恢复（PagesCMS 的缓存随后生效，一天内不会再触发）。可以给 [PagesCMS 提 issue](https://github.com/hunvreus/pagescms/issues) 反馈，官方修复后云端自动恢复。

<!-- 📷 插图 5（可选）：500 报错截图 -->

## 验证与回退

**冒烟测试**：改一条不重要的内容保存 → 等平台重建 → `git pull` 到本地核对文件，确认 frontmatter 无损。

**回退**：完全不需要后台了？**直接删掉 `.pages.yml` 即可**，仓库没有任何其他改动，随时回到原状。

## 总结

| 优势 | 说明 |
|---|---|
| 零代码 | 一个 YAML 文件搞定，没有 npm 依赖、没有组件 |
| 免费 | 云版免费使用，也支持自托管 |
| 不挑平台 | GitHub Pages / EdgeOne / Vercel / Cloudflare 都行 |
| 可回退 | 删配置即还原 |
| 手机可用 | 浏览器直接访问，无需安装 |

适合不想自己写后台、又想获得可视化编辑体验的静态博客用户。接入后发文章、改友链、传动态，手机上就能完成。
