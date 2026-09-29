---
title: Cloudflare Worker 反代 TMDB：国内服务器也能稳定获取影视封面
published: 2026-08-23
tags:
  - 使用文档
  - Cloudflare
  - 影视
updated: 2026-08-23
descriptionSource: manual
description: 腾讯云服务器直连 TMDB API 超时连不上，用 Cloudflare Worker 搭一个带缓存的反向代理，绑定自己的域名后五分钟恢复访问，微信机器人从此能稳定获取影视封面。
image: https://img.tsh520.cn/file/blog/post-covers/blogguide-cf-worker.webp
---

## 背景

我的微信机器人插件（AstrBot BlogWriter）新增了影视记录功能：发一句 `/影视 侏罗纪世界`，插件就去 TMDB（The Movie Database，全球最全的影视元数据库）搜索中文片名、下载海报封面、传图床、写 Markdown，一条龙发布到博客的影视收藏页。

本地开发一切正常，部署到腾讯云服务器后傻眼了——**API 请求石沉大海**：

```bash
curl -s -G --connect-timeout 8 --max-time 15 \
  "https://api.themoviedb.org/3/search/multi" \
  --data-urlencode "api_key=你的key" \
  --data-urlencode "query=侏罗纪世界" \
  --data-urlencode "language=zh-CN"
# 输出：空的，什么都没有
```

有意思的是，进一步测试发现是"半通"状态：

| 域名 | 作用 | 实测结果 |
|---|---|---|
| `api.themoviedb.org` | 搜索/详情 API | ❌ 连接超时，无任何响应 |
| `image.tmdb.org` | 海报图片 CDN | ✅ HTTP 200，正常下载 |

API 被卡、图片能通——这种"半通"在国内服务器上很常见，两个域名走的线路不一样。既然如此，只需要给 API 找一条能走的路，图片继续直连就行。

## 方案：Cloudflare Worker 反代

原理很简单：Cloudflare 的边缘节点国内可达（我的图床 img.tsh520.cn 就跑在 CloudFlare-ImgBed 上，跑了很久一直很稳），让 Worker 把请求原样转发给 TMDB：

```
腾讯云服务器 → tmdb.0824.uk（Cloudflare 边缘节点）→ api.themoviedb.org
                                              ↘ image.tmdb.org
```

服务器访问的是自己的域名，"出国"这一段由 Cloudflare 完成。顺便还能加一层缓存——同一部片、同一张海报，第二次请求直接从边缘节点返回，不回源。

## 第一步：创建 Worker

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，登录 Cloudflare 账号
2. 左侧菜单 **Workers 和 Pages** → **创建** → 选 **从 Hello World 开始**（就是个空 Worker 模板）
3. 名字随便填（比如 `tmdb-proxy`），点 **部署**
4. 部署成功后点 **编辑代码**，把默认代码全选删掉，换成下面这段：

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // /t/p/* 开头 → 转发到图片CDN；其他 → 转发到 TMDB API
    const target = url.pathname.startsWith("/t/p/")
      ? "https://image.tmdb.org" + url.pathname + url.search
      : "https://api.themoviedb.org" + url.pathname + url.search;
    const resp = await fetch(target, {
      headers: { "User-Agent": "tmdb-proxy/1.0" },
    });
    const headers = new Headers(resp.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=86400"); // 缓存一天
    return new Response(resp.body, { status: resp.status, headers });
  },
};
```

5. 点右上角 **部署**

代码逻辑就一句话：看路径分流——`/t/p/` 开头的是海报图片请求，转发给 `image.tmdb.org`；其他都是 API 请求，转发给 `api.themoviedb.org`。API 和图片共用一个代理域名，管理起来省事。

## 第二步：绑定自己的域名

Worker 默认的 `xxx.workers.dev` 域名在国内同样是时通时不通，**必须绑自定义域名**：

1. 进入刚创建的 Worker 页面 → **设置** → **域和路由**
2. **添加** → **自定义域** → 填 `tmdb.0824.uk`（换成你的域名）
3. 等 1-2 分钟，状态显示"活动"即可

> **踩坑提醒**：自定义域名要求这个域名的 DNS **托管在 Cloudflare**。我的主域名 tsh520.cn 的 DNS 在宝塔面板管理，绑不了；好在我还有一个直接在 Cloudflare 注册的域名 `0824.uk`，直接用它开个子域。如果你所有域名都不在 Cloudflare，需要先把某个域名的 DNS 迁过来（NS 记录指过去，宝塔那边就不解析了，迁移前想清楚）。

## 第三步：服务器上验证

```bash
curl -s -G --connect-timeout 8 --max-time 15 \
  "https://tmdb.0824.uk/3/search/multi" \
  --data-urlencode "api_key=你的key" \
  --data-urlencode "query=侏罗纪世界" \
  --data-urlencode "language=zh-CN" | head -c 300
```

吐出这样一截 JSON 就成了：

```json
{"page":1,"results":[{"adult":false,"backdrop_path":"/zNriRTr0kWwyaXPzdg1EIxf0BWk.jpg","id":1234821,"title":"侏罗纪世界：重生",...
```

**结果判读**（很重要，别被 `curl -s` 骗了）：

- 返回 JSON（哪怕 key 错了也会返回 401 的 JSON）→ 链路通了
- **空输出** → 请求根本没成功，`curl -s` 会把超时、重置等错误全部静默，看起来像"没输出"，其实是"没连上"。排查时去掉 `-s` 加 `-v` 就能看到真实错误
- 顺手也测一下图片：`curl -s -o /dev/null -w "%{http_code}\n" "https://tmdb.0824.uk/t/p/w500/任意海报路径.jpg"`，返回 200 即通

## 第四步：应用到自己项目

我的插件当初设计时就把 API 地址做成了配置项，所以这一步只改配置不改代码：

```bash
tmdb_api_base   = https://tmdb.0824.uk            # 原来是 https://api.themoviedb.org
tmdb_image_base = https://tmdb.0824.uk/t/p        # 原来是 https://image.tmdb.org/t/p
```

写代码时的教训：**凡是调用国外 API 的地方，把 base URL 做成配置项**。平时用官方地址，被墙的那天改一行配置就能切反代，不用重新发版。

其他项目同理：把代码里硬编码的 `api.themoviedb.org` 换成你的反代域名就行。

## 经验总结

1. **先诊断再动手**：用 curl 分域名逐个测，搞清楚是全不通还是半通。我这台服务器图片 CDN 本来就是通的，反代只做 API 也可以，两个都代理是为了统一走缓存
2. **`curl -s` 会吞错误**：测试连通性时务必看有没有输出，空输出 = 没连上，别误判成"接口返回空"
3. **workers.dev 别直接用**：国内基本不可达，绑自定义域名是必须的
4. **自定义域名要在 CF 托管**：DNS 在别处（宝塔/阿里云）的域名绑不了 Worker
5. **缓存白送性能**：TMDB 的海报和搜索结果基本不变，Worker 加一行 `Cache-Control` 一天缓存，热门内容第二次起毫秒级响应
6. **成本为零**：Worker 免费额度每天 10 万次请求，个人项目根本用不完；域名要求一个托管在 CF 的域名即可
7. **反代其他被墙 API**：把代码里的 `target` 换成目标 API 域名，就是一套通用方案——比如各种 AI API、图片服务，同样的套路

至此，微信里发 `/影视 片名`，封面秒回，博客影视页自动更新，全链路不再看墙的脸色。
