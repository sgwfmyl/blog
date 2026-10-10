---
version: "v1.60.0"
date: 2026-10-10
time: "17:10"
type: feature
description: 留言图片上传渠道与目录改为环境变量配置（PUBLIC_IMAGEBED_CHANNEL / PUBLIC_IMAGEBED_UPLOAD_FOLDER），上传时以 query 参数下发
---

## 留言图片上传渠道与目录可配置化

继续完善留言板图床直传：把原先在图床侧/代码里写死的**上传渠道**与**上传目录**抽成环境变量，上传时作为 query 参数随请求下发，切换渠道（如 Telegram → R2）或归档目录不再需要改代码。

- **配置**：`.env` 新增 `PUBLIC_IMAGEBED_CHANNEL`（`telegram`/`cfr2`/`s3`/`discord`/`huggingface`/…，空则用图床默认渠道）、`PUBLIC_IMAGEBED_CHANNEL_NAME`（多渠道场景下指定渠道名，空则不传）与 `PUBLIC_IMAGEBED_UPLOAD_FOLDER`（相对目录如 `blog/comment`，空则传根目录）。
- **逻辑**：`uploadGuestbookImage` 读取这几个变量，若非空则构造 URL 的 `uploadChannel`、`channelName`、`uploadFolder` query 参数再发请求。
- **兼容**：变量均可留空，留空行为与改动前一致。
- **废弃**：删除无人使用的 `PUBLIC_IMAGEBED_FOLDER`（相册照片墙目录实际来自各相册 frontmatter 的 `imgbedFolder`，不读该环境变量），部署文档同步移除。