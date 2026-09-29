---
title: Git的命令学习记录
published: 2026-08-15
tags:
  - git
description: 记录Git的命令使用的学习日常
image: https://img.tsh520.cn/file/blog/post-covers/tips-git-commands.webp
---
## 本地文件夹上传 GitHub

本地进入你的文件夹执行：
```bash
git init -b main
git add .
git commit -m "初始化项目"
#替换成你复制的仓库地址
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```
## 后续修改文件后上传

```bash
git add .
git commit -m "写本次修改说明"
git push
```

..