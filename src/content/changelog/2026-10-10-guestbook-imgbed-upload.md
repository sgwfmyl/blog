---
version: "v1.59.0"
date: 2026-10-10
time: "16:20"
type: feature
description: 留言板图片改为直传 CloudFlare ImgBed 图床（Bearer + AUTH_CODE 鉴权，返回绝对 URL 存入评论），未配置图床时回落 Waline 原生 128KB base64 内联
---

## 留言板图片直传图床

留言板（Waline 评论）发图此前默认走 Waline 原生 **base64 内联**：图片以 128KB 上限的 data URL 直接写进评论 Markdown，二进制塞进 Waline 的 SQLite，体积大且每处重复占用。本次接入已部署的 CloudFlare ImgBed（`img.5484826.xyz`），评论图片改为**上传图床、存外链 URL**。

- **配置**：`commentConfig.waline` 新增 `imageUploadURL`，由 `PUBLIC_IMAGEBED_URL` 推导为 `…/upload`；未配置该变量时回落为原本的 base64 内联路径（128KB 上限逻辑保留）。
- **鉴权**：`uploadGuestbookImage` 上传时携带 `Authorization: Bearer <PUBLIC_IMAGEBED_API_TOKEN>`，并把 `PUBLIC_IMAGEBED_AUTH_CODE` 作为 `password` 表单字段，与图床的 AUTH_CODE 校验对齐。
- **返回解析**：新增 `resolveImgbedSrc`，兼容 ImgBed 的数组返回 `[{ "src": "/file/xxx" }]`，将相对 `src` 拼上 `origin` 得到绝对外链；同时保留 Waline 的 `{data:{links:{url}}}` / `{data:{url}}` / `{url}` 兼容分支。
- **大小上限**：配置了图床后，留言图片上传上限从 128KB 提升到 5MB。
- **约束**：ImgBed 当前走 Telegram 渠道，上传文件落根目录（`dir` 字段被服务端忽略），故过大的评论图片体积转移到图床而非 SQLite。