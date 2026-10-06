---
title: Meting
description: 多平台音乐 API 服务
---
> [官方教程](https://blog.mikus.ink/posts/meting)
> [参数文档](https://mus.5484826.xyz/)
> [管理后台](https://mus.5484826.xyz/admin)

[Meting-API](https://github.com/mikus-loli/Meting-API) 是一个以 `Hono` 为 Web 框架、以 `Node.js` 为运行载体的多平台音乐 API 服务。它主要面向前端音乐播放器与网页嵌入场景，提供统一的 `/api` 服务入口，用于获取网易云音乐与 QQ 音乐的歌曲信息、歌单、歌词、封面、播放链接等数据。

它的设计不是单纯“做一个第三方接口代理”，而是把“音乐数据获取、Cookie 管理、后台认证、监测通知、QQ 音乐 Cookie 自动续期”放进统一平台里，适合用于自托管的音乐服务中间层。

## 1. 主要能力

- 支持两大平台：网易云音乐（`netease`）和 QQ 音乐（`tencent`）
- 提供常见音乐 API 类型：`song`、`playlist`、`artist`、`search`、`url`、`lrc`、`pic`
- 支持通过 `MetingJS` 等前端插件接入页面播放器
- 配备完整管理后台，可做 Cookie 增删改查、在线验证、VIP 能力检测、QQ 音乐 Cookie 自动刷新
- 支持 Cookie 定时监测、Webhook 通知、2FA 双因素认证、用户角色与权限控制
- 可以部署在 Node.js、Docker、Vercel、Cloudflare Workers 等运行环境，但管理后台依赖本地文件系统，Vercel/Cloudflare Worker 仅能提供基础 API

## 2. 核心请求格式

```text
GET /api?server=netease&type=playlist&id=7326220405
GET /api?server=tencent&type=song&id=004Yi5BD3ksoAN
GET /api?server=netease&type=url&id=22704470
GET /api?server=tencent&type=lrc&id=004Yi5BD3ksoAN
```

其中：

- `server`：音乐平台，常见 `netease` / `tencent`
- `type`：API 类型，如 `song`、`playlist`、`url`、`lrc`、`pic`
- `id`：对应平台的资源 ID

## 3. 部署方式

- 手工部署：`git clone` 后执行 `npm install`，再启动 `node node.js`
- Docker 部署：通过官方镜像发布到容器环境
- Vercel 部署：支持一键导入模板，但管理后台功能受限
- Cloudflare Workers：支持基础 API 服务，但不支持管理后台文件系统依赖

环境变量中比较重要的有：

- `PORT`：服务端口，默认 `3000`
- `OVERSEAS`：部署地区模式
- `ADMIN_PATH`：管理后台路径，默认 `/admin`
- `DATA_DIR`：数据保存目录

## 4. 管理后台

后台入口默认是 `/{ADMIN_PATH}`，默认账号 `admin`，密码 `admin123`。建议更改默认密码。后台里可管理：

- Cookie 列表与验证
- Cookie 监测与 Webhook
- 用户管理与权限
- 2FA 配置
- 日志与系统配置

## 5. 安全与可运维性

作为一个自托管 API 中台，Meting-API 强调：

- 登录失败锁定
- 隐藏管理入口
- 动态修改后台路径
- 支持 2FA
- Docker 中以非 root 用户运行
- 提供基础的 Abuse 检测与恶意请求治理能力

## 6. 与项目关系

该项目和前端插件 [MetingJS](https://github.com/xizeyoupan/MetingJS) 配合度高，前端通过设置：

```html
<script>
var meting_api='http://your-domain/api?server=:server&type=:type&id=:id&auth=:auth&r=:r';
</script>
```

再引入 MetingJS，形成一个音乐播放器页面接入形式。

## 7. 总结

Meting-API 本质上是“一个轻量可自托管的音乐 API 与管理后台”，适合：

1. 自建音乐播放前端服务
2. 统一托管网易云与 QQ 音乐的访问与 Cookie
3. 管理播放数据与播放器 API 的安全和监测

如果目标是“你自行部署一个音乐资源供前端播放器调用”，这是一个比较完整、功能偏运营化的代码仓库。