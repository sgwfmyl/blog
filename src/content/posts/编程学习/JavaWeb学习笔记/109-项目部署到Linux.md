---
title: 项目部署到Linux
published: 2026-09-29
description: 把 Tlias 真正搬上 Linux 服务器——前端那份打包好的静态资源传进 nginx 的 html 目录，conf/nginx.conf 里配好 listen 80、location / 的 root/index/try_files 和 location ^~ /api/ 的 rewrite 加 proxy_pass（和第 7 章 Windows 上那套一个道理），后端在 /usr/local/tlias-app 放好 jar 并用 nohup 后台跑起来，最后把浏览器到 8080 的整条链路与排查思路串一遍
tags:
  - JavaWeb
  - Linux
  - 部署
order: 109
---

[108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)把 JDK、MySQL、Nginx 三样装进了服务器，环境齐了。这一篇（PPT 第 63～70 页）是**第 19 章的收官**：把 Tlias 这个项目真正**搬到服务器上跑起来**——前端那段静态页面交给 nginx，后端那个 jar 在服务器上跑起来，再让 nginx 把两者合成"一个入口"。

> [!WARNING]
> **这一篇没有在本机实测**——跑通它需要一台真实的 Linux 服务器（还要先按 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)把 JDK / MySQL / Nginx 装好、把 tlias 库导进去），本轮没有这样的环境。好在**里面的关键一步是"见过"的**：nginx 的静态托管 + `/api` 反向代理这一整套，[第 7 章](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)在 **Windows** 上做过并且实测过（那份配置监听 90 端口、把 `/api/depts` 转给 8080 的 Tomcat）——**Linux 上这一套和它是一个道理**，只是换成 nginx 装在服务器上、监听 80、后端也换成服务器上的 jar。下面按 **PPT 第 63～70 页**写。

| PPT 页 | 内容 | 本篇对应小节 |
| --- | --- | --- |
| 63 | 章节目录页（Linux 概述 / 常用命令 / 软件安装 / 项目部署） | 开篇——第一章最后一张卡片 |
| 64 | 小节目录页——"项目部署 04"（前端项目部署 / 后端项目部署） | 部署分两件事 |
| 65 | 前端项目部署（传静态资源 + 改 `conf/nginx.conf` + `sbin/nginx` / `-s reload`） | 前端项目部署 |
| 66 | 问答页——nginx 启动 / 停止 / 重新加载 | nginx 的三条命令 |
| 67 | 同一张目录页（讲完前端回到这里） | 前端项目部署末尾 |
| 68 | 后端项目部署（package 打包 → 传 jar → `java -jar` → nohup 后台；特殊符号 `\|`、`>`、`>>`） | 后端项目部署 |
| 69 | 问答页——后台运行 / 查看进程 / 杀死进程 | 后端的查看与重启 |
| 70 | 空白页——第 19 章收尾 | 本章到此结束 |

## 这一篇在第一章里的位置（PPT 第 63～64 页）

第 63 页是第一章的目录页：**Linux 概述 / Linux 常用命令 / Linux 软件安装 / 项目部署**——前三张卡片在 [106](/posts/编程学习/javaweb学习笔记/106-linux概述与系统安装/)、[107](/posts/编程学习/javaweb学习笔记/107-linux常用命令/)、[108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)已经点亮，本篇点亮**最后一张**。第 64 页把"项目部署"拆成两件事：

> **项目部署** → **前端项目部署** / **后端项目部署**

这两件事对应的就是我们手里那两个工程（[57 篇](/posts/编程学习/javaweb学习笔记/57-tlias项目准备与开发规范/)起就一直是这么分的）：

| 部署哪一半 | 工程里的东西 | 在服务器上谁来管 |
| --- | --- | --- |
| **前端** | [105 篇](/posts/编程学习/javaweb学习笔记/105-前端打包部署/)打包出来的**静态资源**（`index.html` + `assets/` + `favicon.ico`） | **nginx**：一份当静态 Web 服务器发页面，一份当反向代理把 `/api` 转给后端 |
| **后端** | 打出来的 **jar 包**（`tlias-web-management.jar`） | 服务器上的 **JDK**（`java -jar` 跑起来），连服务器上的 **MySQL** |

一句话概括这一篇要干的事：**前端静态资源放进 nginx 的 html 目录、nginx 配一段反向代理；后端 jar 传到服务器上用 nohup 后台跑起来**——两边各就各位之后，用户只访问服务器的那一个地址（80 端口），页面和数据就都有了。

## 前端项目部署（PPT 第 65 页）

第 65 页把前端部署写成三步：

> 1. 将 `资料\06.项目部署\前端\页面资源` 文件夹下的**打包好的静态资源，上传到 nginx 的 html 目录中**。
> 2. **配置 nginx 的配置文件**，在 `conf/nginx.conf` 中配置**反向代理服务器及路径重写规则**。
> 3. 在 nginx 的安装目录中，执行 `sbin` 目录下的 nginx 命令启动 nginx 服务：`sbin/nginx` 或 `sbin/nginx -s reload`。

### ① 静态资源传到哪（PPT 第 65 页第 1 步）

课程资料 `资料/06. 项目部署/前端/页面资源/` 里就是一份**打包好的前端产物**：`index.html`、`assets/`（`index.xxx.js`、`index.xxx.css` 这些）、`favicon.ico`——和 [105 篇](/posts/编程学习/javaweb学习笔记/105-前端打包部署/)里 `npm run build` 出来的 `dist` 是**同一种东西**（那一份是老师提前打好的）。

落点是**nginx 的 html 目录**——具体路径跟着 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)的安装位置走：nginx 是用 `./configure --prefix=/usr/local/nginx` 装的，所以 nginx 的"家"就是 `/usr/local/nginx`，它的 html 目录就是：

```
/usr/local/nginx/html/          ← 前端静态资源放这儿（index.html 直接在这一层）
/usr/local/nginx/conf/nginx.conf ← 下面要改的配置文件
/usr/local/nginx/logs/           ← 访问日志、错误日志
/usr/local/nginx/sbin/nginx      ← 启动用的可执行文件
```

两个和 [105 篇](/posts/编程学习/javaweb学习笔记/105-前端打包部署/)一模一样的注意点，这里再强调一次：

- 传进去的是**页面资源里的文件**（`index.html`、`assets/`、`favicon.ico`），**不是把"页面资源"这个文件夹整个放进 html**——否则访问地址就得带一层目录名，和 PPT 上"访问服务器 IP 就能看到页面"对不上；
- 原来的 `html/index.html` 是 nginx 的默认欢迎页（[108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)里验证安装看到的那张「Welcome to nginx!」），传上去之后它就是**被覆盖/替换**的那一个——所以传完再访问，看到的就是 Tlias 的页面了。

### ② 改 `conf/nginx.conf`（PPT 第 65 页第 2 步，逐行讲）

第 65 页把要配的那段贴了出来（它就是 `conf/nginx.conf` 里 `http { … }` 里的**一个 `server` 块**）：

```nginx
server {
    listen       80;
    server_name  localhost;
    client_max_body_size 10m;

    location / {
        root   html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location ^~ /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:8080;
    }
}
```

逐行拆开（和第 7 章那套对照着看，会发现只有"端口"和"部署位置"变了）：

| 配置 | 它在干什么 |
| --- | --- |
| `server { … }` | 一个服务的配置块：里面写的规则，管的是"发到本机某个端口的请求" |
| `listen 80;` | **监听 80 端口**。80 是浏览器默认的 HTTP 端口（地址里不写端口时走的就是它），所以这里面**必须放"给用户访问的那一个服务"**——用户敲 `http://192.168.100.128` 就等于敲 80 |
| `server_name localhost;` | 匹配**域名**。这里写 `localhost` 表示"认这个名字"的请求归它管；实际用 IP 访问也能进——因为这台机器这个端口上只有这一个 `server` 块，它就是**默认服务** |
| `client_max_body_size 10m;` | 允许的**请求体最大 10MB**（上传文件、提交大表单时不被 nginx 直接拦掉，超了会返回 413） |
| `location / { … }` | **其它所有请求**（不在 `/api/` 里的）都走这条：去 `html` 目录里找文件返回——也就是第 ① 步上传的**前端页面** |
| `root html;` | 静态文件的根目录，`html` 是**相对路径**，相对的是 nginx 的安装目录（`--prefix` 定的 `/usr/local/nginx`）——所以实际找的是 `/usr/local/nginx/html` |
| `index index.html index.htm;` | 访问"目录"时默认返回哪个文件（所以访问 `/` 就是 `html/index.html`） |
| `try_files $uri $uri/ /index.html;` | **前端路由兜底**：先按请求的路径找文件，找不到就交回 `index.html` 让页面脚本去处理。单页应用（[95 篇](/posts/编程学习/javaweb学习笔记/95-前端工程化与vue项目/)那套 Vue 工程）切菜单改的是 URL 而不是真文件，刷新页面就靠这一行不至于 404 |
| `location ^~ /api/ { … }` | **只处理 `/api/` 开头的请求**（`^~` 是前缀匹配、命中后不再试正则）。页面上所有接口请求都带 `/api` 前缀（[99 篇](/posts/编程学习/javaweb学习笔记/99-部门管理-列表查询/)在 `request.js` 里配的 `baseURL: '/api'`），所以能被这条规则一眼挑出来 |
| `rewrite ^/api/(.*)$ /$1 break;` | **路径重写**：把 `/api` 这段前缀摘掉——`/api/depts` → `/depts`。因为后端接口自己的路径里**没有** `/api`（[58 篇](/posts/编程学习/javaweb学习笔记/58-部门管理-查询部门/)是 `@GetMapping("/depts")`） |
| `proxy_pass http://localhost:8080;` | **代理转发**：把（重写后的）请求转给 **8080**——也就是下面要部署的那个**后端 jar**。这里写 `localhost` 不是"本机开发环境"的意思，而是"**nginx 所在的这台服务器**"——jar 也跑在同一台机器上，所以转发地址还是 `localhost:8080`，和 [第 7 章](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)那份配置一字不差 |

把这一串按一次真实的点击串起来就是：

**浏览器敲 `http://192.168.100.128` → 落到 80 的 nginx → 匹配 `location /`，从 `/usr/local/nginx/html` 取出 `index.html`（页面回来了）→ 页面脚本发 `/api/depts` 给同一个 80 → 匹配 `location ^~ /api/` → `rewrite` 成 `/depts` → `proxy_pass` 转给 `localhost:8080` → 后端 jar 处理 → JSON 原路返回 → 页面渲染出表格。**

> [!TIP]
> 和 [第 7 章 Windows 上那套](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)对比着看——**配置本身一字未改，变的只是"东西放在哪台机器上"**：
> | 对比项 | 第 7 章（Windows 联调） | 本篇（Linux 服务器） |
> | --- | --- | --- |
> | nginx 在哪、听哪个端口 | Windows 上那份绿色版 nginx，`listen 90` | 服务器上装的 nginx，`listen 80` |
> | 后端在哪 | 开发机上的 IDEA 跑 SpringBoot（8080） | 服务器上的 `java -jar`（8080） |
> | 配置本身 | `location /` + `location ^~ /api/` 那几行 | **一模一样**（`rewrite`、`proxy_pass` 一字未改） |
> 为什么能一字不改？因为 `proxy_pass http://localhost:8080` 里的 `localhost` 永远指"**nginx 自己所在的那台机器**"——两套环境里，后端都恰好跑在同一台机器上。**"静态托管 + 反向代理"这两件事的道理是同一个。**

课程资料里给了一份完整的 `conf/nginx.conf`（`资料/06. 项目部署/前端/配置文件/nginx.conf`），就是在**默认配置的基础上改出来的**——`worker_processes`、`events`、`http` 那几层是原样保留的，改的是 `http` 里的 `server` 块：

```nginx
#user  nobody;
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen       80;
        server_name  localhost;
        client_max_body_size 10m;

        location / {
           root   html;
           index  index.html index.htm;
           try_files $uri $uri/ /index.html;
        }

        location ^~ /api/ {
           rewrite ^/api/(.*)$ /$1 break;
           proxy_pass http://localhost:8080;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
           root   html;
        }
    }
}
```

（要比对的话：默认的 `nginx.conf` 里 `server` 块只有 `location /` 那几行，`client_max_body_size`、`try_files`、整段 `location ^~ /api/` 都是这套部署**多加进去**的；`error_page` / `50x.html` 那两行是 nginx 自带的错误页配置，原样留着。）

### ③ 启动 / 重载 nginx（PPT 第 65 页第 3 步）

在 **nginx 的安装目录**里执行：

```bash
cd /usr/local/nginx
sbin/nginx              # 启动（第一次起服务时用）
sbin/nginx -s reload    # 重载（nginx 已经在跑、改了配置时用）
```

两条命令按场景二选一：**第一次部署**是启动；**以后改了 `nginx.conf` 或换了 html 里的文件**，用重载让 nginx 重新读配置——**改完配置不重载等于没改**（这一点在 [105 篇](/posts/编程学习/javaweb学习笔记/105-前端打包部署/)的 Windows 版上就强调过，Linux 上完全一样）。

第 67 页是**同一张目录页又出现**（"项目部署 04"回到前端/后端两个入口）——前端这一半讲完了，接下来轮到后端。

## nginx 的启动、停止、重新加载（PPT 第 66 页）

第 66 页把三条命令单拎出来问了一遍（这是最常被问到的一页）：

| 操作 | 命令 | 什么时候用 |
| --- | --- | --- |
| **启动** | `sbin/nginx` | 第一次把服务跑起来（装完 nginx 之后；或停掉之后重新起） |
| **停止** | `sbin/nginx -s quit` | 不想让它继续跑、要腾出 80 端口的时候（`quit` 是**优雅停止**：把手上正在处理的请求处理完再退出） |
| **重新加载** | `sbin/nginx -s reload` | **改了 `conf/nginx.conf` 之后必须执行**；换了 html 里的页面文件后顺手 reload 一下最稳 |

三个使用细节：

1. **命令要在 nginx 的安装目录里执行**（`/usr/local/nginx`）——`sbin/nginx` 是"当前目录下的相对路径"，换个目录就找不到它了；
2. 想确认它到底在不在跑，用 [107 篇](/posts/编程学习/javaweb学习笔记/107-linux常用命令/)的 `ps -ef | grep nginx` 看进程，或者直接访问 80 端口；
3. 顺带和 [105 篇](/posts/编程学习/javaweb学习笔记/105-前端打包部署/)的 Windows 版对上：那边是 `nginx.exe` / `nginx.exe -s reload` / `nginx.exe -s stop`——**参数写法一样，只是可执行文件从 `nginx.exe` 换成了 `sbin/nginx`**（Windows 用 `stop` 立即停，Linux 这里课程给的是 `quit` 优雅停）。

## 后端项目部署（PPT 第 68 页）

第 68 页把后端部署写成一条链路，顺便把两个 Linux 特殊符号也讲了：

> 1. 执行 maven 的父工程中的 **package 生命周期**，对项目进行打包【打包之前，**先连接上服务器数据库，先测试通过**】。
> 2. 在 linux 服务器的 `/usr/local` 目录下，创建一个目录 **tlias-app**，将 jar 包上传到服务器的 `/usr/local/tlias-app` 目录中。
> 3. 然后在命令行执行命令，运行 jar 包：`java -jar xxxxxx.jar`
> 4. 上述执行运行 jar 包之后，会占用前台窗口，窗口关闭服务也就停了。可以使用 **nohup** 指令，后台运行服务：`nohup java -jar xxxxxx.jar &> tlias.log &`
> 5. 查看进程：`ps -ef | grep xxxx`

### ① 打包（注意"先连服务器数据库测通"）

在后端工程的 **maven 父工程**上执行 `package`（IDEA 右侧 Maven 面板双击 `package`，或命令行 `mvn package`），产出可执行的 **jar 包**（课程资料里那份叫 `tlias-web-management.jar`，在 `资料/06. 项目部署/` 下）。

PPT 括号里的那句提醒是这一节最容易被跳过的地方：**"打包之前，先连接上服务器数据库，先测试通过"**。意思是：

1. 把工程配置文件里的**数据源改成服务器上那个 MySQL**（`spring.datasource.url` 指向 `192.168.100.128:3306`、用户名密码用 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)改过的 `root/1234`），并把课程给的 `tlias.sql` 在服务器 MySQL 上执行、建好库表；
2. **先在本地把它跑通**（[56 篇](/posts/编程学习/javaweb学习笔记/56-springboot配置文件/)的配置写法、[57 篇](/posts/编程学习/javaweb学习笔记/57-tlias项目准备与开发规范/)的工程结构都还是原样，只是连的库换了）；
3. 确认能正常查数据了，**再**执行 `package`。

为什么非要按这个顺序？因为 **jar 里打进去的就是打包那一刻的配置**——先打包再改数据库地址，等于抱着一份连不上库的 jar 上服务器（启动就报连接失败）。先测通、再打包，jar 到了服务器上才"开箱即跑"。

### ② 上传 jar 到 `/usr/local/tlias-app`

```bash
mkdir /usr/local/tlias-app
```

在服务器的 `/usr/local` 下建一个 **`tlias-app`** 目录，把 jar 传进去（FinalShell 上传）。为什么单独建目录：服务器的 `/usr/local` 是"额外安装的应用程序放的位置"（[106 篇](/posts/编程学习/javaweb学习笔记/106-linux概述与系统安装/)的目录结构），把项目的 jar 和自己的日志归到一个目录里，比丢在家目录下清楚——**好处在重启服务时能看见**：目录里除了 jar 还会躺着 `nohup` 生成的日志。

### ③ 前台跑一次：`java -jar`

```bash
cd /usr/local/tlias-app
java -jar tlias-web-management.jar
```

JRE/JDK 是 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)装好的，所以 `java` 命令能直接敲。这条命令会把 SpringBoot 应用**跑在当前窗口的前台**：日志一行行刷在屏幕上、**不能关窗口**——PPT 说得很直白："会占用前台窗口，窗口关闭服务也就停了"。第一次部署先用它跑一遍，确认能起来（看到 `Tomcat started on port 8080` / `Started ...Application`），按 `Ctrl+C` 停掉，再换成下面的后台方式。

### ④ 后台运行：`nohup java -jar xxxxxx.jar &> tlias.log &`

```bash
nohup java -jar tlias-web-management.jar &> tlias.log &
```

一行命令里三个符号，拆开看：

| 片段 | 作用 |
| --- | --- |
| `nohup` | "no hang up"：**让命令不受终端挂断的影响**——关掉 FinalShell 窗口、断开 SSH 连接，进程照跑（前台直接跑的话，窗口一关进程就跟着没了） |
| `&> tlias.log` | **把输出（标准输出 + 标准错误）都写进 `tlias.log`** 这个文件里。前台跑时日志刷在屏幕上，后台跑看不见屏幕，就靠这个文件留痕——它相当于项目的运行日志（[107 篇](/posts/编程学习/javaweb学习笔记/107-linux常用命令/)的 `tail -f tlias.log` 就是为它准备的） |
| 末尾的 `&` | **放到后台执行**：命令立刻返回，窗口还能继续敲别的命令 |

所以这一行的读法就是："**忽略挂断、日志进文件、后台跑**"。服务起来后，浏览器/接口工具访问 `http://192.168.100.128:8080/…` 就能验证（8080 通常**不用**对外放行——nginx 在服务器内部访问它，这也是反向代理"安全"的体现）。

### ⑤ 查看进程：`ps -ef | grep xxx`

```bash
ps -ef | grep tlias
ps -ef | grep java
```

`ps -ef` 列出系统里所有进程，`| grep` 把关心的那几行筛出来（下面要讲的管道符）——能看见 `java -jar tlias-web-management.jar` 这一行，就说明服务在跑。

### Linux 里的两个特殊符号（PPT 第 68 页）

PPT 在这页末尾专门讲了这两个符号，因为这一节里到处在用：

| 符号 | 名字 | 作用 | 例子 |
| --- | --- | --- | --- |
| `\|` | **管道符** | 把**前面命令的输出**，作为**后面命令的输入** | `ps -ef \| grep java`——`ps -ef` 的输出被 `grep` 筛了一遍 |
| `>` | **重定向符（覆盖）** | 把前面的内容输出到后面的文件里，**覆盖**原内容 | `echo 'Hello Linux' > 1.log`——1.log 里只剩这一行 |
| `>>` | **重定向符（追加）** | 同上，但**追加**在文件末尾 | `echo 'Hello Linux' >> 1.log`——1.log 里多一行 |

对号入座一下：`nohup … &> tlias.log` 里的 `&>` 就是"标准输出 + 标准错误一起**重定向**"；`ps -ef | grep` 用的是**管道符**。

## 查看与停止后端服务（PPT 第 69 页）

第 69 页把后端运维的三件事问了一遍，答案就是这些命令：

| PPT 的问题 | 答案 |
| --- | --- |
| 如何让 linux 中的命令在后台运行，不占用前台窗口？ | `nohup … &>xxx.log &` |
| 查看系统进程的命令？ | `ps -ef`（全部进程）；`ps -ef \| grep java`（只看 java 相关的那几行） |
| 杀死系统进程的命令？ | `kill -9 xxxx`（xxxx 是 `ps` 查出来的进程号 PID） |

**完整的"重启服务"动作**就是把上面几条串起来（以后改了代码重新打包上服务器，走的就是这一套）：

```bash
ps -ef | grep java                     # ① 先找到旧进程的 PID（第二列就是）
kill -9 12345                          # ② 把它杀掉（-9 强制杀）
java -jar tlias-web-management.jar     # ③ 或者直接用 nohup 重新后台起来：
nohup java -jar tlias-web-management.jar &> tlias.log &   # ④ 再确认一次在跑
ps -ef | grep java
```

`-9` 是"强制杀死"的信号（进程来不及做收尾，但对这种"停掉重起"的场景正合适）。顺带一个和前端同样的道理：**nginx 那边改了配置要 reload，这边改了代码要重打包、重上传、重起 jar**——两个服务都不存在"改完自动生效"。

## 整条链路串一遍（部署完长什么样）

到这里两半都部署好了，把一次访问完整走一遍：

| 步骤 | 发生了什么 | 归谁管 |
| --- | --- | --- |
| ① | 浏览器访问 `http://192.168.100.128`（不写端口就是 80） | — |
| ② | nginx 匹配 `location /`，从 `/usr/local/nginx/html` 取出 `index.html` 返回 | **前端**（[105 篇](/posts/编程学习/javaweb学习笔记/105-前端打包部署/)打包出来的静态页面） |
| ③ | 页面加载 `assets/` 下的 js、css，同样是 nginx 发的 | 前端 |
| ④ | 页面脚本发 `GET /api/depts` 一类的请求，**还是发给 80 的 nginx** | 前端（`baseURL: '/api'`，[99 篇](/posts/编程学习/javaweb学习笔记/99-部门管理-列表查询/)） |
| ⑤ | nginx 匹配 `location ^~ /api/` → `rewrite` 摘掉 `/api` → `proxy_pass` 转给 `localhost:8080` | **反向代理**（同一套道理：[59 篇](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)） |
| ⑥ | 8080 上的 SpringBoot（`java -jar` 起的那个）处理请求 → 查服务器上的 MySQL → 返回 JSON | **后端**（本篇后半段部署的 jar） |
| ⑦ | JSON 原路回到页面，渲染成表格 | 前端 |

三个"对不上就白干"的细节（照着排查就行）：

| 现象 | 最可能的原因 |
| --- | --- |
| 页面**打不开**（浏览器一直转圈/超时） | 80 端口没在防火墙放行（[108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)的四步），或 nginx 没起来（`ps -ef \| grep nginx`） |
| 页面**能打开、数据是空的** | `location ^~ /api/` 那段没配（`/api/depts` 被当成静态文件找不到 → 404），或者忘记 `sbin/nginx -s reload` |
| 页面能打开、接口报 **502 Bad Gateway** | 反向代理那一刻**后端没人接**——jar 没跑起来、或 `proxy_pass` 的端口和 jar 实际监听的端口（8080）对不上 |
| 接口报 **404**（转发出去之后） | `rewrite` 那一行没写/写错，后端收到的是带 `/api` 的路径（后端接口没有这个前缀） |

## 第 19 章到此结束（PPT 第 70 页）

第 70 页是一张**空白页**——第 19 章（Linux）到这里收官：从[装系统、连远程](/posts/编程学习/javaweb学习笔记/106-linux概述与系统安装/)、[敲命令](/posts/编程学习/javaweb学习笔记/107-linux常用命令/)、[装软件](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)，到本篇把项目部署上线，一条完整的"上线之路"走完了。

不过这一路看下来也有个感受值得说一下：**装 MySQL 那一长串命令、装 JDK 那几个包、配置一项项改**——步骤多、容易错、换台机器还得重来一遍。下一章 [Docker](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)要解决的正是这个痛点：同一个 MySQL，用 Docker 一条命令就能跑起来。

## 小结

| 问题 | 答案 |
| --- | --- |
| 项目部署分哪两件事？ | **前端项目部署**（静态资源 → nginx 的 html 目录 + 配反向代理）与**后端项目部署**（jar → 上传 → 跑起来），两边都部署完用户才能从 80 端口访问到完整系统 |
| 前端静态资源传到哪？ | nginx 的 **html 目录**——按 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)的安装位置就是 **`/usr/local/nginx/html`**；传的是资源里的文件（`index.html`、`assets/`、`favicon.ico`），不嵌套文件夹 |
| `conf/nginx.conf` 里那段配置每行干什么？ | `listen 80`（浏览器默认端口，用户访问入口）；`server_name localhost`（域名匹配，单 server 块时按默认服务处理）；`client_max_body_size 10m`（请求体上限）；`location /` + `root html/index/try_files`（发前端页面、前端路由兜底）；`location ^~ /api/` + `rewrite`（摘掉 `/api` 前缀）+ `proxy_pass http://localhost:8080`（转发给后端） |
| 和第 7 章 Windows 那套什么关系？ | **一个道理、一套配置**：都是"静态托管 + `/api` 反向代理"，只是 nginx 从 Windows 版换成服务器上装的（90 → 80）、后端从 IDEA 里的工程换成服务器上的 jar（都还在 8080） |
| nginx 三条命令？ | **启动** `sbin/nginx`、**停止** `sbin/nginx -s quit`、**重新加载** `sbin/nginx -s reload`；在 nginx 安装目录里执行；**改了配置必须 reload** |
| 后端怎么打包、为什么先连数据库测通？ | 在 maven **父工程**执行 **package** 打出 jar；**先**把数据源改成服务器的 MySQL 并跑通、**再**打包——因为 jar 里带的是打包那一刻的配置 |
| jar 放哪、怎么跑？ | 在 `/usr/local` 下建 **`tlias-app`** 目录、把 jar 传进去；`java -jar xxxxxx.jar`（前台跑，关窗口就停）；`nohup java -jar xxxxxx.jar &> tlias.log &`（后台跑） |
| `nohup … &> tlias.log &` 怎么读？ | `nohup` 不受挂断影响（关窗口也不停）、`&>` 把输出重定向进 `tlias.log`、末尾 `&` 放到后台执行 |
| 怎么查进程、杀进程、重启？ | `ps -ef \| grep java` 找 PID → `kill -9 PID` 杀 → 再 `nohup … &` 重新起；这就是"重启服务"的完整动作 |
| `\|`、`>`、`>>` 分别是什么？ | `\|` 管道符（前一个命令的输出给后一个用）；`>` 覆盖重定向；`>>` 追加重定向 |
| 页面能开但数据空 / 502 分别查什么？ | 数据空 → `/api` 那段没配或没 reload（404）；502 → 后端没起或 `proxy_pass` 端口不对；页面打不开 → 80 没放行或 nginx 没起 |
| 这一篇的实测情况？ | **没有实测**（需要真实 Linux 服务器 + 装好的环境）；其中反向代理那一套在 [第 7 章](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)的 Windows 环境实测过，道理相同 |

## 相关

- [上一篇：Linux软件安装](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)
- [下一篇：Docker快速入门](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. **部署分两件事**（PPT 第 64 页）：**前端项目部署**（打包好的静态资源交给 nginx）与**后端项目部署**（jar 在服务器上跑起来）——用户只访问服务器的一个入口（80）
2. **前端部署三步**（PPT 第 65 页）：① 把 `资料/06.项目部署/前端/页面资源` 里的静态资源**上传到 nginx 的 html 目录** ② 改 `conf/nginx.conf` 配**反向代理与路径重写** ③ 在 nginx 安装目录执行 `sbin/nginx`（或改过配置用 `sbin/nginx -s reload`）
3. **落点是哪个目录**：`/usr/local/nginx/html`（nginx 是用 `--prefix=/usr/local/nginx` 装的）；传进去的是 `index.html`、`assets/`、`favicon.ico` 这些**文件本身**，不是把整个文件夹塞进去
4. **配置里每行的意思**：`listen 80`（用户访问入口）、`server_name localhost`（域名匹配）、`client_max_body_size 10m`（请求体上限）、`location / { root html; index index.html index.htm; try_files $uri $uri/ /index.html; }`（发静态页面 + 前端路由兜底）、`location ^~ /api/ { rewrite ^/api/(.*)$ /$1 break; proxy_pass http://localhost:8080; }`（摘掉 `/api` 前缀再转给后端）
5. **`rewrite` 与 `proxy_pass` 的关系**：`/api/depts` 被 `rewrite` 改成 `/depts`（后端接口路径本来就没有 `/api`），再经 `proxy_pass` 转发到 `http://localhost:8080/depts`
6. **和 [第 7 章](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)的关系**：同一个道理、同一套配置——Windows 上那份 `listen 90`，服务器上这份 `listen 80`；后端一个在 IDEA 里跑、一个用 `java -jar` 跑，都在 8080；`localhost` 始终指"nginx 所在的那台机器"
7. **nginx 三条命令**（PPT 第 66 页）：启动 `sbin/nginx`、停止 `sbin/nginx -s quit`、重新加载 `sbin/nginx -s reload`；都在 **nginx 安装目录**里执行；**改配置必须 reload**
8. **后端打包**（PPT 第 68 页）：在 maven **父工程**执行 **package** 生命周期；**打包之前先把数据源连上服务器数据库、先测试通过**（jar 里带的是打包那一刻的配置）
9. **jar 放到哪**：服务器 `/usr/local` 下建目录 **`tlias-app`**，把 jar 上传到 `/usr/local/tlias-app`
10. **前台 vs 后台运行**：`java -jar xxxxxx.jar` 占前台窗口（窗口关了服务就停）；`nohup java -jar xxxxxx.jar &> tlias.log &` 后台运行（`nohup` 不受挂断影响、`&>` 输出进日志、末尾 `&` 放后台）
11. **查看 / 杀死进程**（PPT 第 69 页）：`ps -ef`、`ps -ef | grep java` 看进程，`kill -9 xxxx` 杀进程；**重启服务 = 杀掉旧进程 + 重新 nohup 起**
12. **Linux 特殊符号**：`|` 管道符（前面命令的输出作为后面命令的输入，如 `ps -ef | grep java`）；`>` 覆盖重定向、`>>` 追加重定向（如 `echo 'Hello Linux' > 1.log`）
13. **一次访问的完整链路**：浏览器 → 80 的 nginx → `location /` 从 html 目录取页面 → 页面发 `/api/xxx` 给 80 → `location ^~ /api/` + `rewrite` + `proxy_pass` → 8080 的 jar → MySQL → JSON 回页面
14. **本轮实测边界**：**这一篇没有实测**（需要真实 Linux 服务器与装好的环境）；反向代理那一套在 [第 7 章](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)的 Windows 环境实测过，属于同一个道理

### 二、裸写题

- [ ] **2-1 把前端产物放到服务器上，让它能被浏览器访问**
  需求：服务器上已经装好了 nginx（装的时候指定了安装位置 `/usr/local/nginx`）。现在你手上有前端打包好的产物（`index.html`、`assets/`、`favicon.ico`）。请写出：① 这些东西该放到哪个目录（写全路径）；② 为什么是那个目录（从 nginx 的安装方式解释）；③ 放的时候要注意什么"层次问题"；④ 放完之后浏览器该访问什么地址、看到什么算成功。
  素材：`conf/nginx.conf` 的 `server` 块里有 `location / { root html; index index.html index.htm; }`；服务器 IP 是 `192.168.100.128`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：nginx 是"静态服务器"，它发页面时是**拿某个目录当根**去找文件的——那个目录写在配置里（`root html`），而 `html` 是相对 nginx **安装目录**的路径
  > **二级 · 方法**：安装位置是 `/usr/local/nginx`（`./configure --prefix` 定的），所以 html 目录就是 `/usr/local/nginx/html`；`root html` 找的就是它；传的是 **dist/页面资源里面的文件**，不能多套一层文件夹；访问 `http://192.168.100.128`（80 可省），看到 Tlias 页面算成功
  > **三级 · 骨架**：① 目录：`____/html`；② 因为配置里写的是 `root ____`，它是相对 nginx 的 `____` 目录；③ 放的是产物**里面的文件**（不带产物文件夹这一层）；④ 访问 `http://____`，看到 `____` 页面

  > [!TIP]- 参考答案（做完再点开）
  > ```
  > ① 放的目录：/usr/local/nginx/html
  >
  > ② 为什么是这个目录：
  >    nginx 装的时候用了 ./configure --prefix=/usr/local/nginx，
  >    所以 nginx 的"家"是 /usr/local/nginx；
  >    配置里 location / 那段的 root 写的是 html（相对路径），
  >    相对的正是 nginx 的安装目录 → 实际找的是 /usr/local/nginx/html。
  >
  > ③ 层次问题：
  >    传进去的必须是页面资源"里面的文件"——index.html、assets/、favicon.ico；
  >    不能把整个文件夹塞进 html（那会变成 html/页面资源/index.html，
  >    访问地址就得跟着带一层目录，和 http://192.168.100.128 对不上）。
  >    另外它会替换掉 nginx 自带的欢迎页 index.html。
  >
  > ④ 访问与判定：
  >    http://192.168.100.128     （80 是浏览器默认端口，可以不写）
  >    看到 Tlias 的页面（不再是「Welcome to nginx!」）就成功。
  >    打不开先查：nginx 起了没有（ps -ef | grep nginx）、80 放行了没有。
  > ```
  > 检查点：① 路径写的是 `/usr/local/nginx/html`；② 能说清 `root html` 相对的是 nginx 安装目录；③ 知道是"产物里的文件"而不是整个文件夹；④ 访问地址是服务器 IP（80 可省）。

- [ ] **2-2 补全 `conf/nginx.conf` 里这个 `server` 块**
  需求：下面是一个 `server` 块的骨架。要求你补全它，让**同一个入口**既能发前端页面、又能把接口请求转给后端：
  - 用户访问服务器 IP（80 端口）打开页面；
  - 静态资源在 nginx 安装目录的 `html` 目录下，访问目录默认给 `index.html`，前端路由刷新时不 404；
  - 页面里的请求形如 `/api/depts`，后端服务跑在**同一台服务器**的 `8080`，接口路径**不带** `/api`；
  - 上传文件较大，请求体上限给 10m。
  请写出完整的 `server` 块，并给每行加注释说明在干什么。
  （练习文件 `test_109_项目部署.md` 的题目2-2 里给了 `nginx.conf` 片段写作区。）

  ```nginx
  server {
      # 在这里补全

  }
  ```

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：一个 `server` 块里写**两条 location**——一条管"其余所有请求"（发静态页面），一条管"`/api/` 开头的请求"（改路径 + 转发）
  > **二级 · 方法**：端口是 `listen 80;`、请求体上限 `client_max_body_size 10m;`；静态那条是 `location / { root html; index index.html index.htm; try_files $uri $uri/ /index.html; }`；接口那条是 `location ^~ /api/ { rewrite ^/api/(.*)$ /$1 break; proxy_pass http://localhost:8080; }`
  > **三级 · 骨架**：`listen ____;` ↳ `server_name localhost;` ↳ `client_max_body_size ____;` ↳ `location ____ { root ____; index index.html index.htm; try_files $uri $uri/ /____; }` ↳ `location ^~ ____ { rewrite ^/api/(.*)$ ____$1 break; proxy_pass http://____:____; }`

  > [!TIP]- 参考答案（做完再点开）
  > ```nginx
  > server {
  >     listen       80;                    # 浏览器默认端口，用户的访问入口
  >     server_name  localhost;             # 域名匹配（单 server 块时按默认服务处理）
  >     client_max_body_size 10m;           # 允许的请求体最大 10MB（上传文件用）
  >
  >     # 其余所有请求：从 html 目录取静态页面返回（前端页面）
  >     location / {
  >         root   html;                    # 静态根目录（相对 nginx 安装目录）
  >         index  index.html index.htm;    # 访问目录时默认返回的文件
  >         try_files $uri $uri/ /index.html;   # 找不到就回 index.html（前端路由兜底）
  >     }
  >
  >     # /api/ 开头的请求：摘掉前缀后转发给本机 8080 的后端
  >     location ^~ /api/ {
  >         rewrite ^/api/(.*)$ /$1 break;      # /api/depts → /depts
  >         proxy_pass http://localhost:8080;   # 转给同机 8080 上的后端服务
  >     }
  > }
  > ```
  > 自查四点：① 是**两条** location（`/` 与 `^~ /api/`），别写成一条；② `rewrite` 的替换目标是 `/$1`（以 `/` 开头），这样 `/api/depts` 才会变成 `/depts`；③ `proxy_pass` 只写到主机端口、不追加路径；④ 改完这个文件**必须 `sbin/nginx -s reload`** 才生效。

- [ ] **2-3 逐行解释这个 `server` 块（并说清少一行会怎样）**
  需求：请逐行说明下面这段配置每一行在干什么，并回答：① 用户访问 `http://192.168.100.128` 时走到哪一条 location、页面从哪个目录取；② 页面里的 `/api/depts` 最终变成什么请求、发给谁；③ 把 `rewrite` 那一行注释掉会怎样；④ 后端没启动会怎样。
  （练习文件 `test_109_项目部署.md` 的题目2-3 里给了写作区。）

  ```nginx
  listen       80;
  location / {
      root   html;
      index  index.html index.htm;
      try_files $uri $uri/ /index.html;
  }
  location ^~ /api/ {
      rewrite ^/api/(.*)$ /$1 break;
      proxy_pass http://localhost:8080;
  }
  ```

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：分三层读——"服务听在哪个端口""哪些请求归哪条 location 管""对请求做了什么"（做的一般是两步：改路径、换目的地）
  > **二级 · 方法**：`listen` 是端口；`location /` + `root html` 决定页面从 `/usr/local/nginx/html` 取、`try_files` 是前端路由兜底；`location ^~ /api/` 是前缀匹配；`rewrite` 用正则把 `/api` 摘掉（`(.*)` 捕获、`$1` 引用）；`proxy_pass` 把请求交给 `localhost:8080`
  > **三级 · 骨架**：① 访问 IP → 匹配 `location ____` → 从 `____` 目录取 `____`；② `/api/depts` → `rewrite` 成 `____` → 转给 `http://____:____`；③ 没有 rewrite → 后端收到 `____`，返回 `____`；④ 后端没起 → 转发没人接，nginx 返回 `____`

  > [!TIP]- 参考答案（做完再点开）
  > **逐行**：
  > - `listen 80;`——这个服务监听 **80 端口**（浏览器默认 HTTP 端口），也就是用户访问的入口；
  > - `location / { … }`——**其余所有请求**（不是 `/api/` 开头的）走这条；
  >   - `root html;`——静态根目录，`html` 相对 nginx 安装目录，实际是 `/usr/local/nginx/html`；
  >   - `index index.html index.htm;`——访问目录时默认返回 `index.html`；
  >   - `try_files $uri $uri/ /index.html;`——先按路径找文件，找不到就回 `index.html`（**前端路由兜底**，刷新页面不 404）；
  > - `location ^~ /api/ { … }`——**`/api/` 开头的请求**走这条（`^~` 前缀匹配，命中后不再试正则）；
  >   - `rewrite ^/api/(.*)$ /$1 break;`——把 `/api` 前缀**重写掉**：`/api/depts` → `/depts`；
  >   - `proxy_pass http://localhost:8080;`——把（重写后的）请求**转发**给本机 8080 的后端服务。
  > **四个回答**：
  > ① 访问 `http://192.168.100.128` → 匹配 `location /` → nginx 从 **`/usr/local/nginx/html`** 取出 `index.html` 返回；
  > ② `/api/depts` → 匹配 `location ^~ /api/` → `rewrite` 成 **`/depts`** → `proxy_pass` 转给 **`http://localhost:8080/depts`**（同机 8080 上的后端 jar）；
  > ③ 没有 `rewrite` → 转发出去还是 `/api/depts`，而后端接口是 `/depts`（没有 `/api` 前缀）→ **404**，页面数据空；
  > ④ 后端没启动 → 8080 上没人监听，代理转发失败 → nginx 返回 **502 Bad Gateway**。
  > 一句话：**页面归 nginx 自己发，`/api` 归后端——nginx 在中间当了"换门牌号 + 跑腿"的角色**。

- [ ] **2-4 把这个后端 jar 在服务器上跑起来（并让它后台运行）**
  需求：后端工程要部署到 `192.168.100.128` 这台服务器上（服务器已经装好 JDK 和 MySQL）。请写出完整过程：① 打包前必须先做什么、为什么；② 用什么命令打包、产物是什么；③ jar 传到服务器的哪个目录（怎么建目录）；④ 先怎么"前台跑一次"、会有什么现象；⑤ 怎么写才能**后台运行**（把这一行拆开解释每个部分）；⑥ 怎么确认它在跑、怎么停掉它、怎么重启它。
  素材：后端是个 SpringBoot 工程（多模块，父工程管理）；服务器上的 MySQL 是 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)装的那套（root/1234）；课程资料里那份 jar 叫 `tlias-web-management.jar`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：五站——**改配置并测通 → 打包 → 传上去 → 先前台跑一次确认能起 → 再改成后台跑**；"后台"那一行要解决三个问题：不被挂断、输出去哪、怎么立刻返回
  > **二级 · 方法**：打包用 maven 父工程的 **package**；jar 放 `/usr/local/tlias-app`（先 `mkdir`）；前台是 `java -jar xxxxxx.jar`（关窗口就停）；后台是 `nohup java -jar xxxxxx.jar &> tlias.log &`；查进程 `ps -ef | grep java`，杀进程 `kill -9 PID`
  > **三级 · 骨架**：① 先把 `application.yml` 的数据源改成 `____` 并测通；② 父工程执行 `____`；③ `mkdir /usr/local/____` → 上传 jar；④ `java -____ xxxxxx.jar`；⑤ `____ java -jar xxxxxx.jar &> ____ &`；⑥ `ps -ef | grep ____`、`kill -____ PID`

  > [!TIP]- 参考答案（做完再点开）
  > ```
  > ① 打包前必须做的事：
  >    把工程的数据源配置改成服务器上的 MySQL（192.168.100.128:3306、root/1234），
  >    并在服务器上执行 tlias.sql 建好库表，先在本地连服务器数据库跑通、测过。
  >    原因：jar 里打进去的是"打包那一刻"的配置——先打包再改，
  >    等于抱着一个连不上数据库的 jar 上服务器（启动就报错）。
  >
  > ② 打包：
  >    在 maven 父工程上执行 package 生命周期（IDEA 的 Maven 面板双击 package）。
  >    产物：可执行的 jar 包（课程资料里那份叫 tlias-web-management.jar）。
  >
  > ③ 放到哪：
  >    mkdir /usr/local/tlias-app
  >    把 jar 上传到 /usr/local/tlias-app（FinalShell 上传）
  >
  > ④ 前台跑一次：
  >    cd /usr/local/tlias-app
  >    java -jar tlias-web-management.jar
  >    现象：日志刷在屏幕上（能看到 Tomcat started on port 8080 / Started ...Application），
  >          窗口被占着、不能关——"窗口关闭服务也就停了"。确认没问题后 Ctrl+C 停掉。
  >
  > ⑤ 后台运行（推荐）：
  >    nohup java -jar tlias-web-management.jar &> tlias.log &
  >    · nohup        —— 不受终端挂断影响（关掉 FinalShell 窗口服务照跑）
  >    · &> tlias.log —— 标准输出和标准错误都重定向进 tlias.log（日志留痕）
  >    · 末尾 &       —— 放到后台执行，命令立刻返回
  >
  > ⑥ 查看 / 停止 / 重启：
  >    ps -ef | grep java                  # 找到 java 进程的 PID（第二列）
  >    kill -9 PID                         # 强制杀掉旧进程
  >    nohup java -jar tlias-web-management.jar &> tlias.log &   # 重新后台起
  >    （改了代码就是"重新打包 → 重新上传 → 杀掉旧进程 → 重新 nohup 起"）
  > ```
  > 检查点：① 说清"先改数据库配置、测通、再打包"以及为什么；② 打包命令是父工程的 package；③ 目录是 `/usr/local/tlias-app`；④ 后台那一行三个部分都能解释；⑤ 知道 `ps -ef | grep` 和 `kill -9` 的用法。

- [ ] **2-5 部署完的表现对不上——照现象排查**
  需求：部署完成后出现了下面四种现象，请分别说出**最可能的原因**和**先动手查什么**：
  ① 浏览器访问 `http://192.168.100.128` 完全打不开（一直转圈/超时）；
  ② 页面能打开，但列表里一条数据也没有；
  ③ 页面能打开，接口请求报 `502 Bad Gateway`；
  ④ 请求确实转发出去了，但后端返回 `404`。
  （练习文件 `test_109_项目部署.md` 的题目2-5 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：按"请求走到哪一站失败"来定位——浏览器到 nginx、nginx 到静态文件、nginx 到后端、后端到接口路径，四站四问
  > **二级 · 方法**：打不开先看 80 端口放行与 nginx 进程；数据空看 `/api` 那段配置有没有、有没有 `-s reload`；502 看后端进程与 `proxy_pass` 的端口；404 看 `rewrite` 有没有把 `/api` 前缀摘掉
  > **三级 · 骨架**：① 查 `____` 放行 + `ps -ef | grep ____`；② 查 `location ^~ ____` 是否配置/是否 `sbin/nginx -s ____`；③ 查 `ps -ef | grep ____` 与 `proxy_pass` 的 `____`；④ 查 `____` 那一行写没写对

  > [!TIP]- 参考答案（做完再点开）
  > ① **完全打不开**（连页面都没有）：最可能是 **80 端口没在防火墙放行**，或 **nginx 没起来**。先查：`firewall-cmd --zone=public --list-ports` 看 80 在不在、`ps -ef | grep nginx` 看进程（必要时 `systemctl status firewalld`）。
  > ② **页面能开、数据空**：最可能是 **`location ^~ /api/` 那段没配**（于是 `/api/depts` 被当成静态文件去找 → 404），或者配了但**没有 `sbin/nginx -s reload`**（配置没生效）。先查：`conf/nginx.conf` 里有没有那段、改完有没有 reload。
  > ③ **502 Bad Gateway**：说明 nginx **转发出去了但没人接**——后端 jar 没跑起来，或 `proxy_pass` 的端口和 jar 实际监听的端口（8080）不一致。先查：`ps -ef | grep java`、`tail -f tlias.log` 看后端启动日志。
  > ④ **转发出去之后 404**：路径对不上——**`rewrite` 那一行没写或写错**，后端收到的是带 `/api` 的路径，而它的接口是 `/depts`（没有 `/api` 前缀）。先查：配置里 `rewrite ^/api/(.*)$ /$1 break;` 在不在、`$1` 前有没有 `/`。
  > 顺带记一条顺序：**排查从外往里**（防火墙 → nginx → 静态文件 → 代理 → 后端 → 数据库），哪一站断了一目了然。

### 三、综合题

- [ ] **3-1 把 Tlias 从"本地工程"部署到"服务器上能访问"（写成一份可照着做的清单）**
  需求：服务器是 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)装好的那台（JDK/MySQL/Nginx 齐了、MySQL 里 root 可远程连）。请照着 PPT 第 63～70 页，把前端和后端**两半都部署完**，走通"浏览器访问服务器 IP 就能用这套系统"，并把整个过程写成清单——每一站写清"在哪儿、做什么、怎么确认成功"。
  1. **先梳理分工**：哪一半归 nginx、哪一半归 jar；用户最终访问的是哪个地址、哪几个端口；
  2. **准备后端**：把工程数据源改成服务器的 MySQL → 在服务器上执行 `tlias.sql` 建库表 → **本地连服务器数据库测通** → 父工程执行 `package` 打出 jar；
  3. **部署后端**：`mkdir /usr/local/tlias-app` → 上传 jar → 先 `java -jar` 前台跑一次确认能起（看到 8080 启动日志）→ 改成 `nohup … &> tlias.log &` 后台跑 → `ps -ef | grep java` 确认；
  4. **部署前端**：把页面资源（`index.html`、`assets/`、`favicon.ico`）上传到 `/usr/local/nginx/html`；
  5. **配 nginx**：改 `conf/nginx.conf` 的 `server` 块——`listen 80`、`client_max_body_size 10m`、`location /`（`root html` + `index` + `try_files`）、`location ^~ /api/`（`rewrite` + `proxy_pass http://localhost:8080`）；
  6. **放行端口 + 起服务**：防火墙放行 80（四步：查状态 → `--add-port=80/tcp --permanent` → `--reload` → `--list-ports`）；nginx 第一次 `sbin/nginx` 启动、改过配置用 `sbin/nginx -s reload`；
  7. **验证整条链路**：浏览器访问 `http://192.168.100.128` → 页面出来 → 点开有数据的页面（如员工管理）→ 表格渲染出数据（说明 `/api` 那一路也通了）；
  8. **收尾**：把"页面能开""数据能出"分别对应到哪一段配置说一遍，并想一遍四种故障（打不开 / 数据空 / 502 / 转发后 404）各自查哪里。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：整条链路是"**一个入口、两个服务**"——入口是 80 的 nginx；两个服务是 nginx 自己和 8080 的 jar。清单按"**先后端、再前端、最后入口**"的顺序做最顺（后端先起来，代理转过去才有人接）
  > **二级 · 方法**：后端 = 改数据源 + `package` + `/usr/local/tlias-app` + `nohup java -jar … &> tlias.log &`；前端 = 页面资源 → `/usr/local/nginx/html`；入口 = `conf/nginx.conf` 的 `server` 块两段 location + 防火墙放行 80 + `sbin/nginx`/`-s reload`
  > **三级 · 骨架**：① 后端打 jar（`____` 生命周期，先改 `____` 并测通）；② 后端跑起来（`nohup java -jar ____ &> ____ &`）；③ 前端传 `____/html`；④ 配 nginx（`listen ____` / `location ^~ ____` / `proxy_pass http://____:____`）；⑤ 放行 80（`--____=80/tcp --permanent` + `--reload`）；⑥ 访问 `http://____`，页面 + 数据都出来了才算成功

  > [!TIP]- 参考答案（做完再点开）
  > ```
  > 清单：Tlias 部署到 Linux 服务器（PPT 第 63～70 页）
  >
  > 【0】先画清楚分工
  >   · 浏览器 → http://192.168.100.128（80 端口）
  >   · 80 上的 nginx：自己发前端静态页面 + 把 /api 请求转给 8080
  >   · 8080 上的 jar：处理接口、连服务器上的 MySQL
  >
  > 【1】后端：准备与打包
  >   · 改工程数据源 → jdbc:mysql://192.168.100.128:3306/tlias，root/1234
  >   · 服务器 MySQL 上执行 tlias.sql 建库建表
  >   · 本地连服务器数据库跑通、测过（这一步不能跳：jar 带的是打包那刻的配置）
  >   · maven 父工程执行 package → 得到 tlias-web-management.jar
  >   · 确认成功：本地起服务能查到数据
  >
  > 【2】后端：上传并跑起来
  >   · mkdir /usr/local/tlias-app
  >   · 上传 jar 到 /usr/local/tlias-app
  >   · 先前台试一次：java -jar tlias-web-management.jar
  >     （看到 Tomcat started on port 8080 / Started ...Application）→ Ctrl+C 停掉
  >   · 后台运行：
  >       nohup java -jar tlias-web-management.jar &> tlias.log &
  >   · 确认成功：ps -ef | grep java 能看到这个进程；
  >     tail -f tlias.log 能看到启动日志
  >
  > 【3】前端：放静态资源
  >   · 把页面资源里的文件（index.html、assets/、favicon.ico）
  >     上传到 /usr/local/nginx/html
  >   · 确认成功：/usr/local/nginx/html 下直接能看到 index.html
  >
  > 【4】入口：配 nginx
  >   · 编辑 /usr/local/nginx/conf/nginx.conf，http { } 里的 server 块：
  >       server {
  >           listen       80;
  >           server_name  localhost;
  >           client_max_body_size 10m;
  >
  >           location / {
  >               root   html;
  >               index  index.html index.htm;
  >               try_files $uri $uri/ /index.html;
  >           }
  >
  >           location ^~ /api/ {
  >               rewrite ^/api/(.*)$ /$1 break;
  >               proxy_pass http://localhost:8080;
  >           }
  >       }
  >   · 确认成功：改完执行 sbin/nginx -s reload（第一次是 sbin/nginx）
  >
  > 【5】放行端口
  >   · systemctl status firewalld                （或 firewall-cmd --state）
  >   · firewall-cmd --zone=public --add-port=80/tcp --permanent
  >   · firewall-cmd --reload
  >   · firewall-cmd --zone=public --list-ports   → 看到 80/tcp
  >   · （8080 不用对外放行：nginx 在服务器内部访问它）
  >
  > 【6】验证
  >   · 浏览器 http://192.168.100.128 → Tlias 页面出来（说明 location / 那一路通）
  >   · 打开员工管理/部门管理 → 表格有数据（说明 /api 那一路也通）
  >   · 服务重启：kill -9 旧 PID + 重新 nohup（后端）；
  >     改配置后 sbin/nginx -s reload（前端）
  >
  > 【7】四种故障对号入座
  >   打不开 → 80 放行 / nginx 进程
  >   页面能开数据空 → /api 那段没配或没 reload（404）
  >   502 → 后端没起 / proxy_pass 端口不对
  >   转发后 404 → rewrite 没写对（/api 前缀没摘掉）
  > ```
  > 检查点：① 顺序是"后端先起 → 前端资源就位 → 配 nginx → 放行端口"；② 每一站都有"怎么确认成功"；③ 两段 location 一字不错，尤其 `rewrite` 的 `/$1` 与 `proxy_pass` 的 `localhost:8080`；④ 能说清"页面归 location /，数据归 location ^~ /api/"，四种故障会定位；⑤ 与 [第 7 章](/posts/编程学习/javaweb学习笔记/59-部门管理-前后端联调与反向代理/)那套 Windows 联调对得上。
