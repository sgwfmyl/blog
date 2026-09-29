---
title: 使用 hexo-circle-of-friends 搭建博客朋友圈
published: 2026-07-13
tags:
  - 博客
  - 朋友圈
  - 友链
  - hexo-circle-of-friends
  - EdgeOne
description: 记录如何使用 hexo-circle-of-friends 项目为 Astro 博客搭建朋友圈功能，包括部署、踩坑和最终效果。
image: https://img.tsh520.cn/file/blog/post-covers/blogguide-friend-circle.webp
cover: ""
pinned: false
draft: false
---

## 前言

博客已经有了友链页面，但只能看到朋友们的博客链接，不能看到他们最近发了什么文章。于是想找一个「朋友圈」功能，能自动抓取好友的最新文章并展示。

经过调研，发现了 [hexo-circle-of-friends](https://github.com/Rock-Candy-Tea/hexo-circle-of-friends) 这个项目。虽然名字里有 "hexo"，但它实际上是一个**独立的后端服务**，不依赖 Hexo，任何博客框架都能用。

## 项目简介

hexo-circle-of-friends 的核心功能：

- 🔄 **定时抓取**：通过 RSS/Atom 或 HTML 爬虫自动获取好友的最新文章
- 📊 **统计数据**：友链总数、活跃数、文章数
- 🤖 **AI 摘要**：支持 Gemini、SiliconFlow、智谱等 AI 生成文章摘要（可选）
- 📦 **Simple Mode**：输出静态 JSON 文件，无需后端服务

### 技术栈

- 核心：Rust（爬虫 + API）
- 数据库：SQLite / MySQL / MongoDB
- 部署：GitHub Actions / Vercel / 自托管 / Docker

## 部署过程

### 1. Fork 项目

首先 Fork 项目到自己的 GitHub 仓库：

```
https://github.com/tianshihao2003/hexo-circle-of-friends
```

### 2. 配置 fc_settings.yaml

这是核心配置文件，主要修改：

```yaml
# 友链页地址 - 填写你的友链页面
LINK: [
  { link: "https://blog.tsh520.cn/friends/", theme: "firefly" },
]

# 极简模式 - 输出静态 JSON，无需后端
SIMPLE_MODE: true

# 存储方式
DATABASE: "sqlite"

# 部署方式
DEPLOY_TYPE: "github"

# 每个好友最多获取几篇文章
MAX_POSTS_NUM: 5

# 定时任务 - 每天 5 次
CRON: "0 0,6,12,18,21 * * *"
```

### 3. 自定义主题规则

因为我的博客是 Astro + 自定义主题，不在内置支持列表中，需要在 `css_rules.yaml` 中添加自定义规则：

```yaml
link_page_rules:
  {
    # ... 已有主题 ...
    firefly:
      {
        author: [{ selector: ".friend-card-name", attr: "text" }],
        link: [{ selector: ".friend-card-link", attr: "href" }],
        avatar: [{ selector: ".friend-card-avatar__img", attr: "data-src" }],
      },
  }
```

**关键点**：头像用的是 `data-src` 而不是 `src`，因为我的友链卡片用了懒加载。

### 4. 本地测试

下载预编译二进制到项目目录，运行爬虫测试：

```powershell
.\fcircle_core.exe
```

看到以下输出说明配置成功：

```
成功友链数 14，失败友链数 6
本次获取总文章数 70
```

### 5. 部署到 EdgeOne

我选择了 EdgeOne Pages 来托管生成的 `data.json`。

**踩坑记录：CORS 跨域问题**

部署后发现浏览器无法从 `blog.tsh520.cn` 请求 `cir.tsh520.cn/data.json`，控制台报错：

```
Access to fetch at 'https://cir.tsh520.cn/data.json' from origin 'http://localhost:4321'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**解决方案：使用 edgeone.json 配置 CORS**

EdgeOne Pages 不支持 `_headers` 文件（那是 Cloudflare Pages 的规范），需要使用 `edgeone.json`：

```json
{
  "headers": [
    {
      "source": "/*",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

## 前端实现

### 数据结构

`data.json` 的结构：

```json
{
  "statistical_data": {
    "friends_num": 20,
    "active_num": 14,
    "error_num": 6,
    "article_num": 70,
    "last_updated_time": "2026-07-13 10:19:17"
  },
  "article_data": [
    {
      "floor": 1,
      "title": "文章标题",
      "created": "2026-07-13",
      "updated": "2026-07-13",
      "link": "https://example.com/post/1",
      "author": "作者名",
      "avatar": "https://example.com/avatar.jpg"
    }
  ]
}
```

### 配置文件

创建 `src/config/circleConfig.ts`：

```typescript
export const circleConfig: CircleConfig = {
  dataUrl: "https://cir.tsh520.cn/data.json",
  pageSize: 20,
  showStats: true,
  showFloor: false,
  cacheTime: 5 * 60 * 1000, // 5 分钟缓存
};
```

### 页面结构

```
┌─────────────────────────────────────────────┐
│  🎣 钓鱼  🔄                    全部友链 >    │  ← 顶部导航栏
├─────────────────────────────────────────────┤
│  📢 来自友链 xxx 的文章: xxx                  │  ← 随机动态通知
├─────────────────────────────────────────────┤
│  🌊 鱼塘  好友 20 · 活跃 14 · 动态 70         │  ← 统计区域
├─────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │卡片1│ │卡片2│ │卡片3│ │卡片4│           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│              ... ∞                          │  ← 无限滚动
└─────────────────────────────────────────────┘
```

### 卡片设计

每个文章卡片包含：

- **标题**：左上角，粗体，最多 2 行截断
- **博主名称**：左下角，胶囊背景
- **头像**：右下角半透明水印，悬浮时放大变清晰
- **日期**：覆盖在头像上层

### 核心功能

1. **无限滚动**：滚到底部自动加载更多文章
2. **排序切换**：最新发布 / 最近更新
3. **随机通知**：从最新 6 篇文章中随机展示一条
4. **刷新动画**：点击刷新按钮显示「钓鱼中...」
5. **5 分钟缓存**：避免重复请求

## 遇到的问题及解决

### 问题 1：Rust 构建失败

```
error: linker `link.exe` not found
```

**原因**：Windows 上需要安装 Visual Studio Build Tools。

**解决**：下载预编译二进制代替本地构建。

### 问题 2：CORS 跨域

**原因**：`blog.tsh520.cn` 和 `cir.tsh520.cn` 是不同源。

**解决**：在 EdgeOne 配置 `edgeone.json` 添加 CORS 响应头。

### 问题 3：Astro Scoped 样式失效

**原因**：Astro 的 `<style>` 默认是 scoped 的，JavaScript 动态创建的元素没有 scoped 属性。

**解决**：将样式提取到独立的 CSS 文件并 import：

```astro
---
import "@/styles/features/circle.css";
---
```

### 问题 4：Swup 页面切换后不加载

**原因**：Swup 客户端导航时，DOMContentLoaded 不会再次触发。

**解决**：使用 `astro:page-load` 事件，并在 `astro:before-swap` 中重置初始化标记。

## 使用方法

### 添加好友

在 `src/content/friends/` 目录下创建 Markdown 文件：

```yaml
---
title: 好友博客名
imgurl: https://example.com/avatar.jpg
desc: "博客描述"
siteurl: https://example.com
tags: [Blog]
weight: 10
enabled: true
---
```

### 触发抓取

GitHub Actions 会按照 CRON 配置自动运行（每天 0/6/12/18/21 点），也可以在 Actions 页面手动触发。

### 访问页面

部署完成后访问 `/circle/` 页面即可。

## 总结

hexo-circle-of-friends 是一个非常实用的项目，虽然名字里有 "hexo"，但完全框架无关。通过 Simple Mode + EdgeOne 的方案，我实现了一个零后端、纯静态的朋友圈功能。

主要收获：
- 学会了如何为自定义主题编写 CSS 选择器规则
- 了解了 EdgeOne Pages 的 CORS 配置方式
- 掌握了 Astro 中处理动态内容的样式方案

如果你也想给博客加一个朋友圈功能，不妨试试这个方案。

## 相关链接

- [hexo-circle-of-friends 项目](https://github.com/Rock-Candy-Tea/hexo-circle-of-friends)
- [hexo-circle-of-friends 官方文档](https://fcircle-doc.yyyzyyyz.cn/)
- [EdgeOne Pages 文档](https://cloud.tencent.com/document/product/1552)
