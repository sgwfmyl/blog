---
title: Docker项目部署与DockerCompose
published: 2026-09-29
description: 把第 20 章的"项目部署"这一块走完——服务端六步（准备 MySQL 容器与库表、准备应用镜像跑通测试、改数据库地址与 logback 日志路径后打 jar、写 Dockerfile、构建镜像、部署容器），前端用一个 nginx 容器加两个目录映射把静态资源和 nginx.conf 挂进去，再用 docker-compose.yml 把 mysql、服务端、前端三个服务一次拉起；文里有本机 Compose 实测的 up、ps、logs、down 真实输出，还从课程那份成品 tlias.jar 里翻出了 application.yml 与 logback.xml，把"改哪两个地址"落到了实处
tags:
  - JavaWeb
  - Docker
  - 部署
image: https://img.tsh520.cn/file/blog/post-covers/javaweb-113-docker-deploy-compose.webp
order: 113
---

[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)把"自己的项目怎么变成镜像"这件事讲透了：`FROM` 定底座 → 一层层 `COPY`/`RUN`/`ENV` 搭起来 → `docker build` 出镜像 → `docker run` 跑成容器；还讲了容器默认挂在 bridge 网桥上、**只有加入同一个自定义网络的容器才能用容器名互相访问**。

这一篇（PPT 第 46～56 页）就是把这套东西**落到 tlias 项目上**：服务端打成镜像跑起来、前端交给一个 nginx 容器、最后用 **Docker Compose** 把一整套服务用一个 yml 文件管起来。它也是第 20 章的收官——[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)讲的"为什么要 Docker"、[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)讲的"日常命令和数据卷"、[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)讲的"自定义镜像和网络"，都在这一篇里各就各位。

> [!IMPORTANT]
> **这一篇的实测边界（先说清楚）**：
> - **Docker Compose 那一半做了本机实测**——用两个 `alpine` 服务把 `docker compose up -d` / `ps` / `logs` / `down` 全过了一遍，真实输出在下面专门有一节（本机 Docker Desktop，CLI 29.1.3 / Compose v2.40.3）。
> - **"真实 tlias 项目打包成镜像部署"（PPT 第 47 页那六步）没有在本机做**——它要 JDK17 的 Linux 版安装包（180 MB+）、要拉 `mysql:8` 这个几百 MB 的大镜像、还要真起 MySQL 容器，成本太高；本篇按 **PPT 写**，同时把课程资料里的原文件（Dockerfile、容器命令、nginx.conf、docker-compose.yml）一条条读过，和 PPT 对得上。
> - 有一处是"第一手"的：课程那份成品 **`tlias.jar` 解开看得到里面的配置**（`BOOT-INF/classes/application.yml` 与 `logback.xml`）——PPT 第 47 页第 3 步说的"修改数据库服务地址及 logback 日志文件存放地址"，改成了什么样，下面有原文为证。

| PPT 页 | 内容 | 本篇对应小节 |
| --- | --- | --- |
| 46 | 小节页——项目部署 03（服务端部署 / 前端部署 / DockerCompose） | 开篇 |
| 47 | **部署服务端**——把 tlias-web-management 打包为镜像并部署的六步 | 服务端部署六步 |
| 48 | 同一张小节页（服务端讲完，进入前端） | 前端部署 |
| 49 | **部署前端**——新建 nginx 容器 + 两条 `-v` 目录映射 + 上传资源与配置 | 前端部署 |
| 50 | 项目部署——`mysql`、`nginx`、`tlias-server`、`redis`、`mq`…… 手动一个个起的繁琐 | 手动部署的痛点 |
| 51 | 同一张小节页（前端讲完，进入 DockerCompose） | Docker Compose |
| 52 | **DockerCompose** 是什么 + yml 结构 + 项目（Project）与服务（Service） | Docker Compose |
| 53 | 同一个 nginx 容器——`docker run` 写法与 compose 写法对照 | compose 与 docker run 的对照 |
| 54 | 基于 DockerCompose 快速部署 tlias 系统（准备资源 → 写 yml → 快速构建） | 用 Compose 部署整套 tlias |
| 55 | DockerCompose 命令（`docker compose [OPTIONS] [COMMAND]` 与常用子命令表） | Compose 的命令 |
| 56 | 空白页——第 20 章收官 | 第 20 章到此结束 |

## 项目部署分三块（PPT 第 46 / 48 / 51 页）

第 46 页是小节页，把"项目部署"拆成三块：

> **项目部署** → **服务端部署** / **前端部署** / **DockerCompose**

这张页在后面又出现了两次（第 48 页、第 51 页）——**每讲完一块就回到它，指向下一块**，是这一节的"进度条"：

| 出现位置 | 意味着 | 本篇对应小节 |
| --- | --- | --- |
| 第 46 页 | 项目部署开始，三块都还没讲 | 本节 |
| 第 48 页 | **服务端部署讲完了**，接下来是前端 | 前端部署 |
| 第 51 页 | **前端部署讲完了**，接下来是 DockerCompose | Docker Compose |

三块的分工和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)在 Linux 上手动部署时是**一模一样**的：**服务端**（Java 应用 + 数据库）归"镜像 + 容器"，**前端**（静态资源 + nginx 配置）归"nginx 容器"，**DockerCompose** 是把上面这一堆从"一个个手敲"变成"一个文件管起来"。区别只有一个——109 篇里这些是"装在服务器上的软件"，这一篇里它们**全变成容器**。

## 服务端部署六步（PPT 第 47 页）

第 47 页把任务和步骤都写清楚了：

> **需求**：将我们开发的 `tlias-web-management` 项目打包为镜像，并部署。
>
> **步骤**：
> 1. 准备 MySQL 容器，并创建 tlias 数据库及表结构。**（已完成）**
> 2. 准备 java 应用（tlias 项目）镜像，部署 Docker 容器，运行测试。
> 3. 修改 tlias 项目的配置文件，修改**数据库服务地址**及 **logback 日志文件存放地址**，打 jar 包。
> 4. 编写 Dockerfile 文件。
> 5. 构建 Docker 镜像。
> 6. 部署 Docker 容器。

六步里第 1 步带着"**（已完成）**"三个字——因为 MySQL 容器在 [110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)就起好了（`docker run -d --name mysql -p 3307:3306 -e MYSQL_ROOT_PASSWORD=123 mysql:8`，[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)又用三个 `-v` 把 data / init / conf 挂到了本地目录）。这里只补一句：**课程资料里那份 `tlias.sql`**（`资料/02. mysql/init/tlias.sql`）就是**建库建表**用的脚本，它挂在初始化目录上，容器第一次启动时会自动执行——所以这一步才敢写"已完成"。

下面按顺序把 2～6 步讲开。

### 第 2 步：准备应用镜像、部署容器、跑起来测试（"先验证环境"）

这一步在 PPT 里排在"改配置、打 jar"前面，读起来有点绕。**把它当成"先把环境验证一遍"就顺了**：课程资料里另外给了一份很小的样例应用（`资料/03. jdk & jar包/`：一个 `app.jar`、一个 `Dockerfile`、一份 `测试url.txt`），先用它走一遍"镜像 → 容器 → 浏览器能访问"这条路，确认 Docker 这边没问题；确认完，第 3～6 步再把主角换成 tlias 项目本体（`资料/04. 项目部署/服务端项目/`：`tlias.jar` + `Dockerfile` + 那条容器命令）。

那份 `测试url.txt` 里就两行，正是"跑起来测试"的落点：

```text
http://192.168.100.128:8080/emps
http://192.168.100.128:8080/depts
```

容器把 8080 映射到宿主机 8080（[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)的端口映射），所以在**宿主机**（或者局域网里任何一台机器）上访问 `http://192.168.100.128:8080/depts` 能拿到数据，就说明"应用在容器里活得好好的"。

### 第 3 步：改两个地址，再打 jar

这一步是六步里**最容易被跳过、又最容易出事**的一步：**改配置文件**，然后打包。PPT 点名要改两处——**数据库服务地址**和 **logback 日志文件存放地址**。

为什么必须改？[109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)讲过同一条道理：**jar 里打进去的是"打包那一刻"的配置**。上个项目是在 Windows 上开发的，配置里写的是本机的数据库地址和 Windows 的日志路径；现在程序要跑在 **Linux 容器**里，这两样都不成立了。

那到底改成了什么？课程资料里那份成品 `tlias.jar` 里有答案（把它解开就能看到 `BOOT-INF/classes/` 下的两个文件）：

```yaml
# tlias.jar 里的 BOOT-INF/classes/application.yml（节选）
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/tlias      # ← 数据库服务地址：主机名是"容器名"，端口是"容器内的端口"
    username: root
    password: 123
```

```xml
<!-- tlias.jar 里的 BOOT-INF/classes/logback.xml（节选） -->
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
        <!-- 日志文件输出的文件名 -->
        <FileNamePattern>/tlias/tlias-%d{yyyy-MM-dd}-%i.log</FileNamePattern>   <!-- ← 日志存放地址 -->
        <MaxHistory>30</MaxHistory>
        <maxFileSize>10MB</maxFileSize>
    </rollingPolicy>
</appender>
```

两个地址都很有意思，值得逐字读：

| 改的地方 | 改成了什么 | 为什么是这个值 |
| --- | --- | --- |
| **数据库服务地址** | `jdbc:mysql://mysql:3306/tlias` | 主机名写的是 **`mysql`——容器名**（不是 IP、也不是 `localhost`）：程序自己也在容器里，它要走的是 Docker 网络找到数据库容器（[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)那句话又来了：加入自定义网络的容器才能用容器名互访）；端口写 **3306 是"容器内"的端口**，不是宿主机上映射出去的 3307；密码 `123` 正是前面起 MySQL 容器时 `-e MYSQL_ROOT_PASSWORD=123` 设的那个（[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)） |
| **logback 日志文件存放地址** | `/tlias/tlias-%d{yyyy-MM-dd}-%i.log` | 日志要往**容器里的 `/tlias` 目录**写。为什么是 `/tlias`？看下面第 4 步的 Dockerfile 就懂了——它在镜像里 `RUN mkdir -p /tlias` 并 `WORKDIR /tlias`，应用的工作目录就是 `/tlias`，日志正好落在应用目录里（想留痕的话，还可以在起容器时把 `/tlias` 挂到宿主机上，[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)的目录挂载） |

改完配置，在 **maven 父工程**上执行 **package** 生命周期打出 jar（和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)第 68 页那一步一样，只是这次数据源指向的是**容器**而不是服务器上的 MySQL）。

> [!TIP]
> 这两处为什么"必须改"，可以反过来想一遍：如果不改会怎样？
> - 数据库地址还是 `localhost:3306`——容器里的 `localhost` 指的是**容器自己**，那里根本没有数据库，应用启动就报连不上；
> - 日志路径还是 Windows 上的 `D:/tlias/log` 一类——容器（Linux）里没有 `D:` 盘，日志写不出去。
> 所以这两处不是"顺手优化"，是"不改就跑不起来"。

### 第 4 步：写 Dockerfile（就是课程资料里那一份）

这一步在 [112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)已经把每一行都拆过了，这里贴的是**课程资料里服务端项目那份**（`资料/04. 项目部署/服务端项目/Dockerfile`），它比 PPT 第 39 页的通用示例多了三小块东西：

```dockerfile
# 使用 CentOS 7 作为基础镜像
FROM centos:7

# 添加 JDK 到镜像中
COPY jdk17.tar.gz /usr/local/
RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ &&  rm /usr/local/jdk17.tar.gz

# 设置环境变量
ENV JAVA_HOME=/usr/local/jdk-17.0.10
ENV PATH=$JAVA_HOME/bin:$PATH

# 阿里云 OSS 的访问凭证（值换成你自己的）
ENV OSS_ACCESS_KEY_ID=你的AccessKeyId
ENV OSS_ACCESS_KEY_SECRET=你的AccessKeySecret

# 统一编码（避免容器里中文乱码）
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# 创建应用目录
RUN mkdir -p /tlias
WORKDIR /tlias

# 复制应用 JAR 文件到容器
COPY  tlias.jar  tlias.jar

# 暴露端口
EXPOSE 8080

# 运行命令
ENTRYPOINT ["java","-jar","/tlias/tlias.jar"]
```

多出来的三块，以及和 PPT 第 39 页那份的区别：

| 多出来的部分 | 作用 |
| --- | --- |
| `ENV OSS_ACCESS_KEY_ID` / `ENV OSS_ACCESS_KEY_SECRET` | tlias 项目要用阿里云 OSS 传文件（[73 篇](/posts/编程学习/javaweb学习笔记/73-阿里云oss与参数配置化/)那套），而**密钥不能打进 jar**，所以放在 Dockerfile 的 `ENV` 里、由镜像带进容器（课程资料里写的是老师自己的 AK/SK，这里用占位符代替——**密钥写在 Dockerfile 里等于公开**，往公开仓库推之前一定要换成 `docker run -e` 传或者别的注入方式） |
| `ENV LANG` / `ENV LANGUAGE` / `ENV LC_ALL` | **统一编码为 UTF-8**。基础镜像是 CentOS 7，默认编码不是 UTF-8 时，应用里的中文在日志、接口里会变成乱码（课程资料里还专门附了一份"解决中文乱码问题"的说明） |
| 应用目录从 `/app` 换成 **`/tlias`**，jar 名从 `app.jar` 换成 **`tlias.jar`** | 目录名只是习惯，但要注意**上面第 3 步 logback 的日志路径 `/tlias/...` 必须和这里的目录一致**——两处是配套的 |

（课程另外还给了一份 **JDK 21 版**的 Dockerfile（`资料/06. JDK21版本的Dockerfile/Dockerfile`）：`FROM centos:7` 一样，只是把 jdk 包换成 `jdk21.tar.gz`、`JAVA_HOME` 指向 `jdk-21.0.1`，并且多了一行 `LABEL maintainer="..."` 标记维护者。**换 JDK 版本就是换这两处**，其余结构一字不变。）

### 第 5 步：构建镜像

```bash
docker build -t tlias:1.0 .
```

和 [112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)讲的一模一样：`-t tlias:1.0` 给镜像起名（repository:tag，不写 tag 默认 latest），末尾的 `.` 是 Dockerfile 所在目录、同时是**构建上下文**——所以 `Dockerfile`、`jdk17.tar.gz`、`tlias.jar` 必须放在同一个目录里（课程资料就是这么放的）。构建完 `docker images` 里就能看到 `tlias` 这个镜像。

### 第 6 步：部署容器（注意 `--network`）

课程资料里给的那条命令（`资料/04. 项目部署/服务端项目/tlias-server容器命令.txt`）是：

```bash
docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0
```

拆开看，多出来的那一个参数正是 [112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)网络那一节的落点：

| 参数 | 作用 |
| --- | --- |
| `-d` | 后台运行（[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)） |
| `--name tlias-server` | 容器名——**这个名字后面要当"域名"用**（nginx 转发就找它） |
| `--network itheima` | **把容器加进 `itheima` 这个自定义网络**——因为第 3 步的数据库地址写的是容器名 `mysql`、下面 nginx 又要用容器名 `tlias-server` 找到它，**不加进来这些名字都解析不了** |
| `-p 8080:8080` | 端口映射：宿主机 8080 → 容器 8080（容器内部的 8080 不用改，这就是 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)里那个端口） |
| `tlias:1.0` | 用第 5 步构建出来的镜像 |

起来之后验证三处：`docker ps --filter name=tlias-server` 看状态与端口映射；`docker logs tlias-server` 看应用启动日志（连上数据库没有、有没有报 `UnknownHostException: mysql`）；在浏览器/接口工具里访问 `http://192.168.100.128:8080/depts` 看数据出不出来。服务端的 8080 只是"调试用"地开着——真正对外的入口是下面那个 80（和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)的分工一致）。

## 前端部署（PPT 第 49 页）

第 49 页给的做法和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)在 Linux 上装 nginx 时是同一个思路，只是**这次 nginx 本身就是个容器**：

> **需求**：创建一个新的 nginx 容器，将资料中提供的前端项目的静态资源部署到 nginx 中。
>
> **步骤**：
> 1. **部署 nginx 容器（设置目录映射）**
>    - `-v /root/tlias-nginx/html:/usr/share/nginx/html`
>    - `-v /root/tlias-nginx/conf/nginx.conf:/etc/nginx/nginx.conf`
> 2. 将部署的**前端资源文件及配置文件上传**至服务器，执行命令创建 nginx 容器。

课程资料里那条完整的命令（`资料/04. 项目部署/前端项目/nginx容器命令.txt`）：

```bash
docker run -d \
 --name nginx-tlias \
 -v /root/tlias-nginx/html:/usr/share/nginx/html \
 -v /root/tlias-nginx/conf/nginx.conf:/etc/nginx/nginx.conf \
 --network itheima \
 -p 80:80 \
nginx:1.20.2
```

逐项读：

| 参数 | 作用 | 为什么这么写 |
| --- | --- | --- |
| `--name nginx-tlias` | 容器名 | 和上面的 `tlias-server` 区分开 |
| `-v /root/tlias-nginx/html:/usr/share/nginx/html` | **目录映射**：宿主机的 `/root/tlias-nginx/html` ↔ 容器里的 `/usr/share/nginx/html` | 容器里那个路径是**官方 nginx 镜像放网页的目录**（不是 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)里源码安装的 `/usr/local/nginx/html`——容器里的 nginx 是"装好的成品"，路径由镜像定）。把静态资源放到**宿主机**这个目录，容器里的 nginx 就直接对外发它 |
| `-v /root/tlias-nginx/conf/nginx.conf:/etc/nginx/nginx.conf` | **文件映射**：把自己写的 `nginx.conf` 盖到容器里的 `/etc/nginx/nginx.conf` | 注意左边是个**具体文件**（不是目录）——只换配置文件这一份，其余 nginx 自带的东西不动。为什么要从外面盖进去？因为容器的文件系统是"用完即弃"的（[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)），进容器里改配置一重建就没了；映射出来改宿主机上的文件，容器重启也还在 |
| `--network itheima` | 加进 `itheima` 网络 | **这一条是必须的**——见下面 `proxy_pass` |
| `-p 80:80` | 宿主机 80 → 容器 80 | 用户的访问入口（浏览器不写端口就是 80，[109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)） |
| `nginx:1.20.2` | 镜像名**写全版本** | 这就是 [110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)里 `[repository]:[tag]` 的用法——写死版本，行为稳定 |

两个映射的规则细节（[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)讲过）：**左边（宿主机那一侧）必须以 `/` 或 `./` 开头**，否则会被当成"数据卷名"；课程这里左右都是绝对路径，属于**本地目录/文件挂载**。用目录映射还有一个附带好处——**传资源不用进容器**：本地把页面文件往 `/root/tlias-nginx/html` 一传，容器里的 nginx 立刻就能发（这条路在 [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)用 nginx 容器实测过）。

### 那份 `nginx.conf` 长什么样

要映射进去的配置文件就是课程资料里那份（`资料/04. 项目部署/前端项目/conf/nginx.conf`）：

```nginx
server {
    listen       80;
    server_name  localhost;
    client_max_body_size 10m;

    location / {
        root   /usr/share/nginx/html;         # ← 容器里的路径（不是 109 篇那种相对路径）
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location ^~ /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://tlias-server:8080;  # ← 容器名:容器内端口
    }
}
```

和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)那份逐项对照，只有两处变了，而且原因都很明确：

| 配置 | 109 篇（Linux 上装的 nginx） | 本篇（nginx 容器） | 为什么变 |
| --- | --- | --- | --- |
| `root` | `html`（相对 nginx 安装目录，实际是 `/usr/local/nginx/html`） | `/usr/share/nginx/html`（**容器里的绝对路径**） | 容器里的 nginx 是官方镜像装的，网页目录就在 `/usr/share/nginx/html`，直接写绝对路径最清楚 |
| `proxy_pass` | `http://localhost:8080`（后端跑在同一台机器上） | `http://tlias-server:8080`（**容器名**） | 现在是"nginx 容器 → 另一个容器"，`localhost` 指的是 nginx 容器自己，那里没有后端；要转发给**另一个容器**，就得用它的**容器名**——而且两个容器必须在同一个自定义网络里（`--network itheima`，[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)） |
| `listen 80` / `location /` / `try_files` / `rewrite` | 一样 | 一样 | 这一套是 nginx 自己的事，和"装在哪"无关 |

到这儿，一次访问的路线就完整了（和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)那张链路图是同一个结构，只是三种东西都变成了容器）：

**浏览器 → 宿主机 80 → `nginx-tlias` 容器的 80 → `location /` 发出静态页面 → 页面请求 `/api/xxx` 再到 80 → `location ^~ /api/` 摘掉 `/api` 后 `proxy_pass` → `tlias-server` 容器的 8080 → 应用连 `mysql` 容器的 3306 → JSON 原路返回。**

## 手动部署的痛点（PPT 第 50 页）

第 50 页把"手动部署"的问题画成了一张图：图上的方框是 `mysql`、`nginx`、`tlias-server`、`redis`、`mq`、`order-server`、`admin-server`，旁边标着 ①～⑦——**一个一个起**。页面上两行结论：

> **手动部署 - 繁琐**
> **不便于统一管理**

这个"繁琐"是真真切切的，把前面几条命令摊开看就知道：

| 麻烦 | 具体表现 |
| --- | --- |
| **每条命令都很长** | `docker run -d --name nginx-tlias -v ... -v ... --network itheima -p 80:80 nginx:1.20.2`——参数一多，抄错一个字母就是一个坑 |
| **有先后顺序** | 数据库要先起、应用再起、nginx 最后起（谁先谁后还得自己记） |
| **要起的不止三个** | 一个真正的项目往往是"数据库 + 缓存 + 消息队列 + 好几个应用 + 前端"，图上列了七个——**七个容器七条 `docker run`** |
| **不便于统一管理** | 想看日志得一个个 `docker logs`、想停掉得一个个 `docker stop`、想改配置得挨个找命令改；哪天要换台机器重来一遍，等于把这七条命令再抄一次 |

所以才有下一节的 Docker Compose——**把"这一串命令"变成一个文件**。

## Docker Compose（PPT 第 51～52 页）

第 52 页是这一节的定义：

> **Docker Compose 通过一个单独的 `docker-compose.yml` 模板文件（YAML 格式）来定义一组相关联的应用容器，帮助我们实现多个相互关联的 Docker 容器的快速部署。**

PPT 上给的 yml 结构骨架（注意最外层的 `services:`，里面每一个都是"一个容器"）：

```yaml
services:
  containerA:
    image: A
    container_name: A
    ports:
      - "11:11"
  containerB:
    image: B
    container_name: B
    ports:
      - "22:22"
  containerC:
    image: C
    container_name: C
    ports:
      - "33:33"
```

这一页同时给了两个概念——**它们的关系是"一个文件 vs 文件里的一项"**：

| 概念 | 含义 | 对应到 yml 里 |
| --- | --- | --- |
| **项目（Project）** | **这一整套服务**（由这一个 compose 文件定义的一组容器），是 Compose 管理的最小整体 | 整个 `docker-compose.yml` 文件（默认用"文件所在目录名"当项目名，也可以用 `-p` 指定） |
| **服务（Service）** | 项目里的**一个容器**（用它用哪个镜像、叫什么名字、映射哪些端口、挂什么卷……） | `services:` 下面的 `containerA` / `containerB` / `containerC` 每一项 |

![Docker 吉祥物托着几个集装箱](assets/113-Docker项目部署与DockerCompose/52-Compose管理的一组容器.jpg)
*图：Docker 的吉祥物手里托着几个"集装箱"——Compose 要管的就是这样一组互相协作的容器（PPT 第 52 页的配图）*

一句话记住这套东西的价值：**"一整套项目"从"一串命令"变成了"一个文件"**——文件能存进 Git、能评审、能一份改一处、能一次全起（也能一次全停）。

## compose 与 docker run 的对照（PPT 第 53 页）

第 53 页用**同一个 nginx 容器**做了对照——左边是 `docker run`，右边是等价的 compose 写法：

```bash
docker run -d \
--name nginx-tlias \
-v /usr/local/app/html:/usr/share/nginx/html \
-v /usr/local/app/conf/nginx.conf:/etc/nginx/nginx.conf \
--network itheima \
-p 80:80 \
nginx:1.20.2
```

```yaml
services:
  nginx-tlias:
    image: "nginx:1.20.2"
    container_name: nginx-tlias
    volumes:
      - "/usr/local/app/html:/usr/share/nginx/html"
      - "/usr/local/app/conf/nginx.conf:/etc/nginx/nginx.conf"
    networks:
      - itheima
    ports:
      - "80:80"
networks:
  itheima:
    name: itheima
```

一一对上：

| `docker run` 的参数 | yml 里写在哪儿 | 备注 |
| --- | --- | --- |
| `nginx:1.20.2`（镜像） | `image: "nginx:1.20.2"` | 服务名（`nginx-tlias`）和镜像名是两回事，别混 |
| `--name nginx-tlias` | `container_name: nginx-tlias` | 不写这一行时，容器名会由**项目名和服务名**自动组合出来（不再是你手写的那个名字） |
| `-v 宿主机:容器` | `volumes:` 下的每一条 | 写法和 `-v` **完全一样**（左宿主机、右容器）；左边是绝对路径 → 本地目录/文件挂载（[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)的规则） |
| `--network itheima` | `networks:` 下写 `itheima`，再在**文件顶层**声明 `networks: itheima: name: itheima` | 服务里写的是"**网络的 key**"，顶层再把 key 对上真实网络名 |
| `-p 80:80` | `ports:` 下的 `- "80:80"` | 同样是"宿主机:容器" |
| `-d`（后台） | **不用写** | `docker compose up -d` 里的 `-d` 就是这个意思 |

顶层那段 `networks: itheima: name: itheima` 为什么要写两遍？因为 **Compose 会给网络自动加项目名前缀**——不写 `name:` 时，网络会叫"项目名_itheima"（本机实测里那个自动网络就叫 `compose-demo_default`，项目名取的正是 compose 文件所在目录名 `compose-demo`）。课程想要的就是干净利落的 `itheima`（[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)里那些容器也都在这个网络里），所以用 `name:` 把真实名字钉死。

> [!TIP]
> 那 yml 里的路径，到底传哪儿去？PPT 第 53 页的例子里是 `/usr/local/app/html` 和 `/usr/local/app/conf/nginx.conf`，课程资料里那份 yml 用的是 `/usr/local/app/nginx/html` 和 `/usr/local/app/nginx/conf/nginx.conf`——**两者只是"把文件传到哪个目录"的习惯不同**，谈不上谁对谁错。真正要保证的是一件事：**yml 里 `volumes:` 左边写的路径，就是你实际上传前端资源和 `nginx.conf` 的那个目录**；左右对不上，容器里就什么也挂不到（nginx 起来还是默认欢迎页）。

## 用 Compose 部署整套 tlias（PPT 第 54 页）

第 54 页把"基于 DockerCompose 快速部署 tlias 系统"写成三步：

> **涉及到的服务**：MySQL 数据库、服务端、前端 nginx。
>
> **步骤**：
> 1. 准备资源（`tlias.sql`，服务端的 `jdk17`、`jar` 包、`Dockerfile`，前端项目打包文件、`nginx.conf`）
> 2. 准备 `docker-compose.yml` 配置文件
> 3. 基于 DockerCompose 快速构建项目

第 1 步是"清点东西"——把前面几节里散落在各处的东西归拢到一个目录（课程资料 `资料/05. Docker Compose/` 就是这么放的）：

| 资源 | 谁用 | 作用 |
| --- | --- | --- |
| `tlias.sql` | mysql 服务 | 建库建表（挂在初始化目录 `/docker-entrypoint-initdb.d` 上，容器第一次启动时自动执行） |
| `jdk17.tar.gz` + `tlias.jar` + `Dockerfile` | tlias 服务 | `docker build` 的三样原料（[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)说的"构建上下文"里必须有这三样） |
| 前端打包好的静态资源（`html/`）+ `nginx.conf` | nginx 服务 | 挂到 nginx 容器里对外发页面、做 `/api` 反向代理 |

第 2 步就是写那个 yml。课程资料里那份 `docker-compose.yml`（`资料/05. Docker Compose/docker-compose.yml`）是**最完整的一版**——三个服务全在里面：

```yaml
services:
  mysql:                                     # 服务一：数据库
    image: mysql:8                           # 用官方 mysql:8 镜像
    container_name: mysql                    # 容器名叫 mysql —— 应用配置里的 jdbc:mysql://mysql:3306/tlias 找的就是它
    ports:
      - "3307:3306"                          # 宿主机 3307 → 容器 3306
    environment:                             # 相当于 docker run 的 -e
      TZ: Asia/Shanghai
      MYSQL_ROOT_PASSWORD: 123
    volumes:                                 # 相当于 docker run 的 -v（三个本地目录挂载）
      - "/usr/local/app/mysql/conf:/etc/mysql/conf.d"
      - "/usr/local/app/mysql/data:/var/lib/mysql"
      - "/usr/local/app/mysql/init:/docker-entrypoint-initdb.d"
    networks:
      - tlias-net
  tlias:                                     # 服务二：服务端（自己构建的镜像）
    build:                                   # 不用现成镜像，而是现场构建
      context: .                             # 构建上下文：compose 文件所在的当前目录
      dockerfile: Dockerfile                 # 用这个目录下的 Dockerfile
    container_name: tlias-server             # 容器名 —— nginx 配置里的 proxy_pass http://tlias-server:8080 找的就是它
    ports:
      - "8080:8080"
    networks:
      - tlias-net
    depends_on:                              # 启动顺序：先 mysql，再 tlias
      - mysql
  nginx:                                     # 服务三：前端
    image: nginx:1.20.2
    container_name: nginx-tlias
    ports:
      - "80:80"
    volumes:                                 # 静态资源目录 + nginx.conf，都是本地目录/文件挂载
      - "/usr/local/app/nginx/conf/nginx.conf:/etc/nginx/nginx.conf"
      - "/usr/local/app/nginx/html:/usr/share/nginx/html"
    depends_on:                              # 启动顺序：先 tlias，再 nginx
      - tlias
    networks:
      - tlias-net
networks:                                    # 顶层声明网络
  tlias-net:
    name: itheima                            # 真实网络名就叫 itheima（不加项目名前缀）
```

几个只在 compose 里才有的写法，单独拎出来：

| 写法 | 什么时候用 | 说明 |
| --- | --- | --- |
| `build: { context: ., dockerfile: Dockerfile }` | 服务的镜像是**自己构建的**（服务端就是） | 相当于在 `context` 这个目录里执行了一条 `docker build`。所以 `docker-compose.yml` 要和 `Dockerfile`、`jdk17.tar.gz`、`tlias.jar` 放在**同一个目录**——`context: .` 指的就是它所在的那个目录 |
| `depends_on: - mysql` | 有启动先后要求时（应用要等数据库） | 控制**启动顺序**：先起 `mysql`，再起 `tlias`，最后起 `nginx`。**注意它的边界**：它只保证"先启动"，不保证"mysql 已经初始化到能连"——应用启动太早仍可能连不上库（生产上要配健康检查 `healthcheck`） |
| `environment:` / `volumes:` / `networks:` / `ports:` | 分别对应 `-e` / `-v` / `--network` / `-p` | 写成**列表**（每项一个 `-`）或**键值对**都行——上面 mysql 的 `environment` 用的是键值对、`volumes` 用的是列表 |
| 顶层 `networks:` + `name:` | 想让网络有个固定的名字 | 见上一节的说明（不加 `name` 会带上项目名前缀） |

第 3 步"快速构建项目"就一条命令：

```bash
docker compose up -d
```

它会**按顺序**做三件事：给 `tlias` 服务构建镜像（`build` 那段）、创建网络 `itheima`、把三个容器依次拉起来（顺序按 `depends_on`）。起来之后浏览器访问 `http://192.168.100.128`，"页面出来 + 数据出来"就全通了（[109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)的验收标准）。要收工就 `docker compose down`——**容器和网络一起清掉**（下面实测里有输出）。

> [!WARNING]
> 两个容易踩的地方：
> ① **`mysql`、`tlias-server` 这两个名字不能随手改**。应用配置里的 `jdbc:mysql://mysql:3306/tlias`、nginx 配置里的 `proxy_pass http://tlias-server:8080`，用的都是**容器名**——把 yml 里的 `container_name` 改了，这两个配置就找不到目标了（要改就两边一起改）。
> ② **三个服务必须在同一个网络里**（这份 yml 里都写了 `networks: - tlias-net`，顶层又把它映射成 `itheima`）。少写一个，那个容器就"掉队"了：能跑，但谁也找不到谁。

## Compose 的命令（PPT 第 55 页）

命令格式和常用子命令（PPT 的表）：

```bash
docker compose [OPTIONS] [COMMAND]
```

| 类型 | 参数或指令 | 说明 |
| --- | --- | --- |
| Options | `-f` | 指定 compose 文件的**路径和名称**（文件名不叫 `docker-compose.yml`、或者不在当前目录时用） |
| Options | `-p` | 指定 **project 名称**（默认取目录名，用于给容器/网络起名前缀） |
| Commands | `up` | **创建并启动所有 service 容器** |
| Commands | `down` | **停止并移除所有容器、网络** |
| Commands | `ps` | 列出所有启动的容器 |
| Commands | `logs` | 查看指定容器的日志 |
| Commands | `stop` | 停止容器 |
| Commands | `start` | 启动容器 |
| Commands | `restart` | 重启容器 |
| Commands | `top` | 查看运行的进程 |

和 [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)那套"容器命令"对照着记最顺：

| 想干什么 | 单个容器（[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)） | 一整套（compose） |
| --- | --- | --- |
| 起 | `docker run -d ...`（一个容器一条） | `docker compose up -d`（所有服务一起） |
| 看 | `docker ps` | `docker compose ps` |
| 看日志 | `docker logs 容器名` | `docker compose logs`（一组一起看） |
| 停 / 起 | `docker stop` / `docker start` | `docker compose stop` / `docker compose start`（或 `restart`） |
| 删 | `docker rm -f 容器名`（还得自己删网络） | `docker compose down`（**容器 + 网络一起清**） |
| 换台机器重来 | 把命令再抄一遍 | 把 yml 拷过去，`docker compose up -d` |

## 本机实测：Compose 的 up / ps / logs / down

课程里的三个服务（mysql / tlias / nginx）本机没有跑（原因见开头的实测边界），但**Compose 这一整套动作**用两个 `alpine` 服务在本机过了一遍——`docker-compose.yml`：

```yaml
services:
  svc-a:
    image: docker.m.daocloud.io/library/alpine
    container_name: ch20-svc-a
    command: sh -c "echo '[svc-a] 我是服务 A'; sleep 300"
  svc-b:
    image: docker.m.daocloud.io/library/alpine
    container_name: ch20-svc-b
    command: sh -c "echo '[svc-b] 我是服务 B'; sleep 300"
```

（少了 `ports`/`volumes`/`networks` 这些，是因为这个实验只想把"一套容器一起起、一起停"这件事看清楚；有那些配置的写法就是上面 tlias 那份 yml。）

**① 一条命令把一组容器拉起来**（`up`）：

```
$ docker compose up -d
  → Creating → Created → Starting → Started（两个容器一起拉起）
```

这一行等于把两条 `docker run` 一次性做完了——**"繁琐"就是在这一步被消掉的**。

**② 看这一组容器的状态**（`ps`，本机实测）：

```
$ docker compose ps
NAME         IMAGE                                 STATUS
ch20-svc-a   docker.m.daocloud.io/library/alpine   Up About a minute
ch20-svc-b   docker.m.daocloud.io/library/alpine   Up About a minute
```

**③ 一组日志一起看**（`logs`，本机实测）：

```
$ docker compose logs
ch20-svc-a  | [svc-a] 我是服务 A
ch20-svc-b  | [svc-b] 我是服务 B
```

注意每行前面那截 `ch20-svc-a |`——**是哪个服务的日志一目了然**，不用像 [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)那样一个个 `docker logs`。

**④ 一键收工**（`down`，本机实测）：

```
$ docker compose down
 Container ch20-svc-b  Stopped
 Container ch20-svc-b  Removing
 Container ch20-svc-b  Removed
 Network compose-demo_default  Removing
 Network compose-demo_default  Removed
```

这段输出把 `down` 干的事说得很清楚：**停容器 → 删容器 → 删网络**。最后那个网络名 `compose-demo_default` 就是前面提过的"Compose 自动建的网络带上项目名前缀"——项目名取自 compose 文件所在的目录名（`compose-demo`），网络是默认网络（`_default`）；课程里用 `name: itheima` 就是为了不让它变成 `项目名_itheima` 那种名字。

| PPT 里的说法 | 本机实测里对上的输出 |
| --- | --- |
| `up` 创建并启动所有 service 容器 | `Creating → Created → Starting → Started`，两个容器一起起来 |
| `ps` 列出所有启动的容器 | `ch20-svc-a` / `ch20-svc-b` 都是 `Up` |
| `logs` 查看容器的日志 | 两行日志分别带 `ch20-svc-a \|` / `ch20-svc-b \|` 前缀 |
| `down` 停止并移除所有容器、**网络** | `Stopped → Removing → Removed`，连 `Network compose-demo_default` 一起删掉 |

## 第 20 章到此结束（PPT 第 56 页）

第 56 页是一张**空白页**——第 20 章（Docker）到这里收官。回头看这一章的四个入口，正好是四篇笔记：

| Docker 这一章 | 讲了什么 | 在哪一篇 |
| --- | --- | --- |
| 快速入门 | Docker 是什么、一条 `docker run` 装 MySQL、镜像与容器、镜像命名、`run` 的四个常见参数 | [110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/) |
| Docker 核心 · 常见命令 | 镜像 / 容器命令全图、Nginx 练习八步 | [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/) |
| Docker 核心 · 数据卷 | 数据卷是容器与宿主机之间的桥梁、挂载语法、本地目录挂载 | [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/) |
| Docker 核心 · 自定义镜像 | 镜像结构（BaseImage / Layer / Entrypoint）、Dockerfile 六指令、`docker build` | [112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/) |
| Docker 核心 · 网络 | 默认 bridge 网桥、七个网络命令、"加入自定义网络才能用容器名互访" | [112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/) |
| 项目部署 | 服务端六步、前端 nginx 容器、Docker Compose 一套拉起 | **本篇** |

到这里，"[109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)那种一步步在服务器上装软件"的部署方式，和"这一篇把每一步都做成镜像、用一个 yml 管起来"的部署方式，就算各走过一遍了。**两者要解决的问题是同一个（让项目在服务器上跑起来），差别在于"装一遍"还是"打包一次、到处跑"**——这也是 Docker 这一章最想让人记住的一句话。

## 小结

| 问题 | 答案 |
| --- | --- |
| 项目部署分哪三块？ | **服务端部署**（Java 应用打成镜像跑容器）、**前端部署**（nginx 容器 + 静态资源）、**DockerCompose**（把一组容器用一个 yml 管起来）（PPT 第 46 页） |
| 服务端部署的六步？ | ① 准备 MySQL 容器并创建 tlias 数据库及表结构（**已完成**）② 准备 java 应用镜像、部署容器、运行测试 ③ **修改配置文件**（数据库服务地址 + logback 日志存放地址）后打 jar ④ 编写 Dockerfile ⑤ 构建镜像 ⑥ 部署容器（PPT 第 47 页） |
| 第 3 步改的两处分别改成了什么？ | 数据库地址改成 **`jdbc:mysql://mysql:3306/tlias`**（主机名是**容器名**、端口是**容器内端口**、密码就是起 MySQL 时设的 `123`）；logback 的日志路径改成 **`/tlias/tlias-%d{yyyy-MM-dd}-%i.log`**（容器里的 `/tlias` 目录，和 Dockerfile 的 `WORKDIR /tlias` 配套）。这两处都在课程那份成品 `tlias.jar` 里能看到原文 |
| 为什么这两处必须改？ | 容器里的 `localhost` 指容器自己（连不上数据库），容器里也没有 Windows 的盘符路径；不改就跑不起来 |
| 服务端 Dockerfile 比通用示例多了什么？ | `ENV` 传阿里云 OSS 的 AK/SK（密钥不能打进 jar）、三条 `ENV` 统一编码为 UTF-8（防中文乱码）、目录换成 `/tlias`、jar 名换成 `tlias.jar`；JDK21 版只是把 `jdk17.tar.gz` 换成 `jdk21.tar.gz`、`JAVA_HOME` 指向 `jdk-21.0.1`，另加一行 `LABEL` |
| 起服务端容器的命令为什么要带 `--network`？ | `docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0`——因为应用配置里用容器名 `mysql` 找数据库、后面 nginx 又要用容器名 `tlias-server` 找它；**只有加入同一个自定义网络的容器才能用容器名互访**（[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)） |
| 前端怎么部署？ | 新建一个 nginx 容器，把**静态资源目录**和 **`nginx.conf` 文件**各做一条映射（`-v`）盖进容器，再 `--network itheima -p 80:80` 起起来；资源传到宿主机那侧目录里，容器里的 nginx 直接对外服务（PPT 第 49 页） |
| 那份 `nginx.conf` 和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)的有什么不同？ | 只有两处：`root` 改成容器里的绝对路径 **`/usr/share/nginx/html`**；`proxy_pass` 改成 **`http://tlias-server:8080`**（用**容器名**，因为后端也是一个容器）——其余 `location /`、`try_files`、`rewrite` 一字未改 |
| 手动部署的痛点是什么？ | **手动部署繁琐**（一条命令一长串参数、还有先后顺序、容器一多就是一堆 `docker run`）、**不便于统一管理**（日志/启停/改配置都得一个个来，换台机器要重抄一遍）（PPT 第 50 页） |
| Docker Compose 是什么？ | 通过一个 **`docker-compose.yml`**（YAML 格式）模板文件来定义**一组相关联的应用容器**，实现多个相互关联容器的**快速部署**（PPT 第 52 页） |
| 项目（Project）与服务（Service）？ | **项目**＝这一个 compose 文件定义的一整套服务（管理的最小整体，默认以目录名命名）；**服务**＝项目里的一个容器（`services:` 下面的一项） |
| `docker run` 的参数在 yml 里怎么写？ | 镜像 → `image`；`--name` → `container_name`；`-v` → `volumes`（写法一样）；`--network` → `networks`（另在顶层声明网络，可用 `name:` 钉住真实名字）；`-p` → `ports`；`-d` → 由 `docker compose up -d` 提供（PPT 第 53 页） |
| compose 里那两个特殊写法？ | `build: { context: ., dockerfile: Dockerfile }`——镜像要**现场构建**（所以 Dockerfile 和构建原料要和 yml 放同一目录）；`depends_on`——控制**启动顺序**（不等于"依赖的服务已就绪"，生产上配 `healthcheck`） |
| Compose 常用命令？ | 格式 `docker compose [OPTIONS] [COMMAND]`；Options：`-f`（指定文件）、`-p`（指定 project 名）；Commands：`up`（创建并启动所有服务容器）、`down`（停止并移除所有容器与网络）、`ps`、`logs`、`stop`、`start`、`restart`、`top`（PPT 第 55 页） |
| 本机实测了什么？ | 用两个 `alpine` 服务实测了 Compose 的全套动作：`docker compose up -d`（两个容器一起 `Creating → Started`）、`docker compose ps`（都 `Up`）、`docker compose logs`（每行带服务名前缀）、`docker compose down`（**容器 + 网络一起删**，网络名 `compose-demo_default` 印证了"Compose 自动网络带项目名前缀"） |
| 本轮实测边界？ | **Compose 实测过**；**"真实 tlias 打包成镜像部署"（PPT 第 47 页六步）没有在本机做**（要 JDK17 的 Linux 包、要拉 `mysql:8` 大镜像、要真起 MySQL 容器），按 PPT 写；课程资料里的 Dockerfile / 容器命令 / nginx.conf / compose 文件都读了原文，`tlias.jar` 里的 `application.yml` 与 `logback.xml` 也解出来看过 |

## 相关

- [上一篇：Docker自定义镜像与网络](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. **项目部署分三块**（PPT 第 46 页）：**服务端部署**（Java 应用打成镜像）／**前端部署**（nginx 容器 + 静态资源）／**DockerCompose**（一个 yml 管住一组容器）
2. **服务端部署六步**（PPT 第 47 页）：① 准备 MySQL 容器并创建 tlias 库表（**已完成**）② 准备 java 应用镜像、部署容器、运行测试 ③ **改配置文件**（数据库服务地址、logback 日志文件存放地址）后打 jar ④ 编写 Dockerfile ⑤ 构建 Docker 镜像 ⑥ 部署 Docker 容器
3. **第 3 步改了什么**：数据库地址改成 **`jdbc:mysql://mysql:3306/tlias`**（主机名写**容器名**、端口写**容器内端口**）；logback 的日志路径改成 **`/tlias/tlias-%d{yyyy-MM-dd}-%i.log`**（容器里的 `/tlias`，和 Dockerfile 的 `WORKDIR /tlias` 配套）。**依据**——课程那份成品 `tlias.jar` 里的 `BOOT-INF/classes/application.yml` 与 `logback.xml` 就是这么写的
4. **为什么非改这两处**：容器里的 `localhost` 是容器自己（那儿没有数据库）、容器里也没有 Windows 盘符路径；不改应用根本起不来。同时记住 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)那条老规矩——**jar 里带的是"打包那一刻"的配置**
5. **服务端 Dockerfile 的关键行**：`FROM centos:7` → `COPY jdk17.tar.gz` + `RUN tar ... && rm ...` → `ENV JAVA_HOME` / `ENV PATH` → **`ENV` 传 OSS 的 AK/SK** → **`ENV LANG/LANGUAGE/LC_ALL` 统一 UTF-8 编码** → `RUN mkdir -p /tlias` + `WORKDIR /tlias` → `COPY tlias.jar tlias.jar` → `EXPOSE 8080` → `ENTRYPOINT ["java","-jar","/tlias/tlias.jar"]`
6. **构建与部署容器的命令**：构建 `docker build -t tlias:1.0 .`；部署 `docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0`——`--network itheima` 是**必须的**（应用要用容器名找 `mysql`，nginx 要用容器名找它）
7. **前端部署（PPT 第 49 页）**：新建一个 nginx 容器，设**两条目录映射**——`-v /root/tlias-nginx/html:/usr/share/nginx/html`（静态资源）与 `-v /root/tlias-nginx/conf/nginx.conf:/etc/nginx/nginx.conf`（配置文件，左边是**文件**不是目录）；资源与配置传到宿主机侧目录后再起容器；另外要 `--network itheima -p 80:80`
8. **nginx 容器里那份 `nginx.conf` 与 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)的差别**：只有两处——`root` 改成容器里的绝对路径 **`/usr/share/nginx/html`**；`proxy_pass` 改成 **`http://tlias-server:8080`**（用**容器名**，因为后端也是个容器）。`listen 80`、`location /`、`try_files`、`rewrite` 都没变
9. **一次访问的完整链路**：浏览器 → 宿主机 80 → `nginx-tlias` 容器的 80 →（`location /` 发静态页面）→ 页面请求 `/api/xxx` 回到 80 → `location ^~ /api/` 摘掉前缀后 `proxy_pass` → `tlias-server` 容器的 8080 → 应用连 `mysql` 容器的 3306 → JSON 返回
10. **手动部署的痛点**（PPT 第 50 页）：**手动部署繁琐**（命令长、有先后顺序、容器一多就是一堆 `docker run`，图上列了 `mysql`/`nginx`/`tlias-server`/`redis`/`mq`/`order-server`/`admin-server` 七个）、**不便于统一管理**（日志/启停/配置都得一个个来）
11. **Docker Compose 是什么**（PPT 第 52 页）：通过一个单独的 **`docker-compose.yml`** 模板文件（YAML 格式）来定义**一组相关联的应用容器**，实现多个相互关联的 Docker 容器的**快速部署**
12. **项目（Project）与服务（Service）**：**项目**＝这一个 compose 文件定义的一整套服务（管理的最小整体，默认以目录名当项目名）；**服务**＝项目里的一个容器（`services:` 下面的一项：用哪个 `image`、`container_name` 叫什么、`ports`/`volumes`/`networks` 怎么配）
13. **`docker run` 参数在 yml 里的对应**（PPT 第 53 页）：镜像 → `image`；`--name` → `container_name`；`-v` → `volumes`（写法完全一样）；`--network itheima` → 服务里 `networks: - itheima` + 顶层 `networks: itheima: name: itheima`；`-p` → `ports`；`-d` → 由 `docker compose up -d` 提供
14. **compose 里两个特殊写法**：`build: { context: ., dockerfile: Dockerfile }`（镜像现场构建——所以 Dockerfile 与构建原料要和 yml 同一目录）；`depends_on`（控制**启动顺序**，但不保证依赖服务"已就绪"）
15. **Compose 的命令**（PPT 第 55 页）：格式 `docker compose [OPTIONS] [COMMAND]`；Options `-f`（指定 compose 文件路径与名称）、`-p`（指定 project 名称）；Commands `up`（创建并启动所有 service 容器）、`down`（停止并移除所有容器、网络）、`ps`、`logs`、`stop`、`start`、`restart`、`top`
16. **本机实测（Compose）**：`docker compose up -d` → 两个容器 `Creating → Created → Starting → Started`；`docker compose ps` → 都 `Up`；`docker compose logs` → 每行带 `ch20-svc-a |` 前缀；`docker compose down` → `Stopped → Removing → Removed`，**连网络 `compose-demo_default` 一起删**（网络名里的项目名前缀来自 compose 文件所在目录名）
17. **本轮实测边界**：**Compose 实测过**；**"真实 tlias 打包成镜像部署"没做**（要 JDK17 的 Linux 安装包、`mysql:8` 大镜像、真实 MySQL 容器），按 PPT 写——但课程资料里的 Dockerfile、容器命令、nginx.conf、compose 文件读了原文，`tlias.jar` 里的两个配置文件也解出来看过

### 二、裸写题

- [ ] **2-1 把后端 jar 做成镜像并跑起来，一共几步？（把整条链写出来）**
  需求：tlias 后端要部署到这台服务器上（Docker 已装好，MySQL 容器已经在跑）。请照着 PPT 第 47 页的六步，把**从"手上只有源码工程"到"容器里跑着这个应用"**这条链完整写出来：
  ① 起手先做什么检查？（MySQL 容器这边要准备好什么）
  ② 应用里有**两个配置**必须改，是哪两个、改成什么（写出改后的值）、为什么必须改；
  ③ jar 怎么来（在哪儿执行什么）；
  ④ Dockerfile 里要照顾到的几个特殊点（密钥、编码、目录）；
  ⑤ 构建镜像、部署容器的命令各是什么（**部署那条要带网络参数**，并说明为什么）；
  ⑥ 怎么验证"它真的活起来了"。
  （练习文件 `test_113_Compose与部署.md` 的题目2-1 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：按"**环境 → 配置 → 打包 → 镜像 → 容器 → 验证**"六站走；每一站的产物是下一站的输入（配置改不完，打出来的 jar 就是废的；镜像没构建出来，容器起不来）
  > **二级 · 方法**：MySQL 容器由 `docker run` 起、`tlias.sql` 挂在初始化目录上自动建库表；两处配置是 `spring.datasource.url`（用**容器名**写地址）和 logback 的日志路径（写成容器里的目录）；打包在 maven 父工程执行 `package`；Dockerfile 里用 `ENV` 传 OSS 密钥、用三条 `ENV` 统一 UTF-8 编码、目录用 `/tlias`；构建 `docker build -t tlias:1.0 .`；部署 `docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0`；验证 `docker ps` / `docker logs` / 访问 `http://IP:8080/depts`
  > **三级 · 骨架**：① MySQL 容器 + `____` 脚本建库表；② `url` 改成 `jdbc:mysql://____:____/tlias`、logback 的 `FileNamePattern` 改成 `____/tlias-....log`；③ 父工程 `____` → `tlias.jar`；④ Dockerfile：`ENV OSS_ACCESS_KEY____`、`ENV LANG=____`、`WORKDIR ____`；⑤ `docker build -t ____ .` + `docker run -d --name ____ --____ itheima -p 8080:8080 ____`；⑥ `docker ____` / `docker ____` / 浏览器 `http://____:8080/depts`

  > [!TIP]- 参考答案（做完再点开）
  > ```
  > 【0】先确认第 1 步"已完成"的部分
  >   · MySQL 容器在跑：docker ps 能看到 mysql 容器
  >     （起法：docker run -d --name mysql -p 3307:3306 -e TZ=Asia/Shanghai
  >            -e MYSQL_ROOT_PASSWORD=123 mysql:8）
  >   · 库表由 tlias.sql 建好：把 sql 挂在 /docker-entrypoint-initdb.d 目录上，
  >     容器第一次启动时自动执行（也可以是手动执行一遍）
  >
  > 【1】改配置（第 3 步，但要在打包前完成）
  >   ① 数据库服务地址（application.yml）：
  >        jdbc:mysql://mysql:3306/tlias
  >      · 主机名 mysql 是"数据库容器的容器名"（不是 IP、不是 localhost）
  >      · 3306 是"容器内的端口"（宿主机上映射出去的是 3307）
  >      · 账号密码与起容器时一致（root / 123）
  >      为什么必须改：程序跑在容器里，容器里的 localhost 是它自己，连不上数据库；
  >      而用容器名互访的前提是两个容器在同一个自定义网络里。
  >   ② logback 日志文件存放地址（logback.xml）：
  >        <FileNamePattern>/tlias/tlias-%d{yyyy-MM-dd}-%i.log</FileNamePattern>
  >      · /tlias 是"容器里的应用目录"（下面 Dockerfile 里 mkdir + WORKDIR 的就是它）
  >      为什么必须改：原来写的是 Windows 上的路径，容器（Linux）里没有那个盘
  >
  > 【2】打 jar
  >   在 maven 父工程上执行 package 生命周期 → 得到 tlias.jar
  >   （打包前先把上面两处配置改好——jar 里带的是打包那一刻的配置）
  >
  > 【3】写 Dockerfile（放到与 jdk17.tar.gz、tlias.jar 同一个目录）
  >   FROM centos:7
  >   COPY jdk17.tar.gz /usr/local/
  >   RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ && rm /usr/local/jdk17.tar.gz
  >   ENV JAVA_HOME=/usr/local/jdk-17.0.10
  >   ENV PATH=$JAVA_HOME/bin:$PATH
  >   ENV OSS_ACCESS_KEY_ID=你的AccessKeyId          # 密钥不能打进 jar
  >   ENV OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
  >   ENV LANG=en_US.UTF-8                            # 统一编码，防中文乱码
  >   ENV LANGUAGE=en_US:en
  >   ENV LC_ALL=en_US.UTF-8
  >   RUN mkdir -p /tlias
  >   WORKDIR /tlias
  >   COPY tlias.jar tlias.jar
  >   EXPOSE 8080
  >   ENTRYPOINT ["java","-jar","/tlias/tlias.jar"]
  >
  > 【4】构建镜像
  >   docker build -t tlias:1.0 .
  >   确认：docker images tlias 能看到 tlias:1.0
  >
  > 【5】部署容器（注意 --network）
  >   docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0
  >   为什么要 --network itheima：
  >     · 应用配置里用容器名 mysql 找数据库 → 必须在同一个自定义网络里才解析得了
  >     · 后面 nginx 要用容器名 tlias-server 找它 → 也得在同一个网络里
  >
  > 【6】验证
  >   docker ps --filter name=tlias-server        看状态与端口映射
  >   docker logs tlias-server                    看启动日志（连库成功没有）
  >   http://192.168.100.128:8080/depts           宿主机上直接访问，能拿到数据
  >   失败时先看：日志里是不是 UnknownHostException: mysql（网络没接上）
  > ```
  > 检查点：① 两处配置改成了"容器名 + 容器内端口"和"容器内目录"；② 说清"为什么必须改"；③ Dockerfile 有密钥与编码那两组 ENV、目录用 `/tlias`；④ 构建命令的 `-t` 与 `.` 都对；⑤ 部署命令带 `--network itheima` 并且能解释原因；⑥ 验证用了 `docker ps` + `docker logs` + 实际访问。

- [ ] **2-2 用 compose 一次拉起 mysql + 应用（写 yml）**
  需求：请写一份 `docker-compose.yml`，把下面两个服务一次拉起：
  - **mysql**：用 `mysql:8` 镜像，容器名 `mysql`，宿主机 3307 映射到容器 3306，环境变量 `TZ=Asia/Shanghai`、`MYSQL_ROOT_PASSWORD=123`，把宿主机的 `/usr/local/app/mysql/data`、`/usr/local/app/mysql/init`、`/usr/local/app/mysql/conf` 分别挂到容器里的数据目录、初始化目录、配置目录；
  - **应用**：镜像要**现场构建**（构建上下文是当前目录、用当前目录下的 `Dockerfile`），容器名 `tlias-server`，8080 映射 8080，启动顺序要在 mysql 之后；
  - 两个服务放进**同一个自定义网络**，网络真实名字就叫 **`itheima`**。
  写完后再回答两个小问题：**`build` 那段为什么要求 Dockerfile 和 yml 在同一目录**？**`depends_on` 能保证"mysql 已经能连了"吗**？
  （练习文件 `test_113_docker-compose.yml` 里给了完整的写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：把"两条 `docker run`"翻译成 yml——最外层 `services:`，每个服务一项；`-e` → `environment`、`-v` → `volumes`、`-p` → `ports`、`--name` → `container_name`、`--network` → `networks`（网络还要在**文件顶层**声明一次）
  > **二级 · 方法**：镜像用 `image:`；自己构建用 `build:` 下的 `context` 与 `dockerfile`；启动顺序用 `depends_on`；网络在顶层写 `networks: 网络key: name: itheima`；列表项用 `-` 开头
  > **三级 · 骨架**：`services:` → `mysql:`（`image: ____` / `container_name: ____` / `ports: - "____:____"` / `environment:` / `volumes: - "____:/var/lib/mysql"` / `networks: - ____`）→ `tlias:`（`build: context: ____` / `dockerfile: ____` / `container_name: ____` / `ports:` / `networks:` / `depends_on: - ____`）→ 顶层 `networks: ____: name: ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```yaml
  > services:
  >   mysql:
  >     image: mysql:8
  >     container_name: mysql
  >     ports:
  >       - "3307:3306"
  >     environment:
  >       TZ: Asia/Shanghai
  >       MYSQL_ROOT_PASSWORD: 123
  >     volumes:
  >       - "/usr/local/app/mysql/data:/var/lib/mysql"
  >       - "/usr/local/app/mysql/init:/docker-entrypoint-initdb.d"
  >       - "/usr/local/app/mysql/conf:/etc/mysql/conf.d"
  >     networks:
  >       - tlias-net
  >   tlias:
  >     build:
  >       context: .
  >       dockerfile: Dockerfile
  >     container_name: tlias-server
  >     ports:
  >       - "8080:8080"
  >     depends_on:
  >       - mysql
  >     networks:
  >       - tlias-net
  > networks:
  >   tlias-net:
  >     name: itheima
  > ```
  > **两个小问题**：
  > ① `build` 里的 `context: .` 指的是 **compose 文件所在的那个目录**，Docker 会在这个目录里执行构建；而 Dockerfile 里的 `COPY jdk17.tar.gz` / `COPY tlias.jar` 只能拷到**这个目录里**的文件——所以三样东西必须放一起。
  > ② **不能**。`depends_on` 只控制**启动顺序**（先起 mysql，再起 tlias），它不知道 mysql 里面"初始化完了没有、能不能接受连接"；应用启动太快时仍可能连不上（要可靠就配 `healthcheck` 之类的健康检查）。
  > 检查点：① 两个服务都在 `services:` 下、缩进正确；② `-v` 的三条左右两边都写全（左宿主机绝对路径）；③ `build` 用 `context` + `dockerfile`；④ `depends_on` 写在应用服务里；⑤ 网络在服务里引用 + 顶层声明 `name: itheima`；⑥ 两个小问题答对。

- [ ] **2-3 部署前端：新建一个 nginx 容器把页面发出去**
  需求：前端打包好的静态资源（`index.html`、`assets/`、`favicon.ico`）和一份改好的 `nginx.conf` 都在你本机，要部署到服务器上，让**浏览器访问服务器 IP（80）**能看到页面、并且页面里的 `/api/xxx` 请求能打到后端容器 `tlias-server`（8080）。请写出：
  ① **容器怎么起**（完整命令：容器名、两条映射分别是什么、网络、端口、镜像）；
  ② 两条映射**分别解决什么问题**（一条是目录、一条是文件，说清各自的作用与必要性）；
  ③ 资源与配置**什么时候传、传到哪**；
  ④ `nginx.conf` 里 `location /` 和 `location ^~ /api/` 两段该怎么写（重点是那两个"和 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)不一样的地方"）；⑤ 怎么验证"页面出来了"和"接口也通了"。
  （练习文件 `test_113_Compose与部署.md` 的题目2-3 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：nginx 容器要"看到"两样东西才能干活——**发给用户的页面**（静态资源目录）和**它自己的配置**（`nginx.conf`）；所以要用两条挂在容器上的映射，把它们都指向宿主机上你实际放文件的目录
  > **二级 · 方法**：起容器 `docker run -d --name nginx-tlias -v 宿主机html目录:/usr/share/nginx/html -v 宿主机nginx.conf:/etc/nginx/nginx.conf --network itheima -p 80:80 nginx:1.20.2`；资源传到宿主机侧 html 目录、配置文件放到宿主机侧那一条路径；`nginx.conf` 里 `root` 写容器里的绝对路径、`proxy_pass` 写 `http://tlias-server:8080`；验证：访问 80 看页面、点开有数据的列表看接口
  > **三级 · 骨架**：① `docker run -d --name ____ -v ____:/usr/share/nginx/html -v ____:/etc/nginx/nginx.conf --____ itheima -p ____:____ nginx:____`；② 第一条映射解决 `____`，第二条解决 `____`（文件映射，左边是文件不是目录）；③ 先传 `____`，再起容器；④ `root /usr/share/nginx/html;` + `proxy_pass http://____:____;`；⑤ 访问 `http://____` 看页面，打开一个要查数据的页面看数据出不出来

  > [!TIP]- 参考答案（做完再点开）
  > **① 起容器的命令**：
  > ```bash
  > docker run -d \
  >  --name nginx-tlias \
  >  -v /root/tlias-nginx/html:/usr/share/nginx/html \
  >  -v /root/tlias-nginx/conf/nginx.conf:/etc/nginx/nginx.conf \
  >  --network itheima \
  >  -p 80:80 \
  > nginx:1.20.2
  > ```
  > **② 两条映射各干什么**：
  > - `-v /root/tlias-nginx/html:/usr/share/nginx/html`——**目录映射**：把宿主机的 html 目录接到容器里 nginx 放网页的目录上，静态资源放宿主机这边，容器里的 nginx 直接对外发（改文件不用进容器）；
  > - `-v /root/tlias-nginx/conf/nginx.conf:/etc/nginx/nginx.conf`——**文件映射**（左边是**文件**，不是目录）：用自己写好的配置替换容器里那份默认配置，让 nginx 按我们要的规则发页面、转 `/api`；映射出来的好处是**容器删了重建配置还在**（容器自己的文件系统是即用即弃的）。
  > **③ 什么时候传、传到哪**：**起容器之后往宿主机的对应目录里传**（也可以先传好再起容器，效果一样）——资源传进 `/root/tlias-nginx/html`（注意传的是资源"里面的文件"，别多套一层文件夹），`nginx.conf` 放到 `/root/tlias-nginx/conf/nginx.conf`。传完不用重启容器，nginx 直接读；改了配置则要让它重新加载（进容器执行 `nginx -s reload`，或者 `docker restart nginx-tlias`）。
  > **④ 两段 location**：
  > ```nginx
  > location / {
  >     root   /usr/share/nginx/html;        # 容器里的绝对路径（109 篇是相对 nginx 安装目录的 html）
  >     index  index.html index.htm;
  >     try_files $uri $uri/ /index.html;
  > }
  > location ^~ /api/ {
  >     rewrite ^/api/(.*)$ /$1 break;
  >     proxy_pass http://tlias-server:8080; # 用容器名（两个容器在同一个自定义网络里）
  > }
  > ```
  > **⑤ 怎么验证**：浏览器访问 `http://192.168.100.128`（80 可省）——看到 tlias 的页面说明 `location /` 那一路通了；打开一个要查数据的页面（部门管理/员工管理），表格里有数据说明 `/api` 那一路（`rewrite` + `proxy_pass` 到 `tlias-server:8080`）也通了。页面打不开先查 80 映射与容器状态（`docker ps`）；页面能开但没数据，先查 nginx 容器和 `tlias-server` **在不在同一个网络里**、`proxy_pass` 里的容器名对不对。

- [ ] **2-4 同一个 nginx 容器："`docker run` 写法"和"compose 写法"互译**
  需求：下面这条命令起的是一个 nginx 容器。请：
  ① 把它**改写成 compose 的写法**（服务名叫 `nginx-tlias`；网络真实名字要叫 `itheima`）；
  ② 逐项说明"`run` 的参数"分别落到了 yml 的哪一行；
  ③ 回答：为什么网络要在**文件顶层**再声明一次？不写 `name:` 会怎样？
  ④ 反过来：如果 yml 里加一个环境变量、又多加一个目录映射，对应的 `docker run` 命令会变成什么样？
  （练习文件 `test_113_docker-compose.yml` 里给了写作区。）

  ```bash
  docker run -d \
  --name nginx-tlias \
  -v /usr/local/app/html:/usr/share/nginx/html \
  -v /usr/local/app/conf/nginx.conf:/etc/nginx/nginx.conf \
  --network itheima \
  -p 80:80 \
  nginx:1.20.2
  ```

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：把 `run` 的每个"开关"当成一把钥匙，去 yml 里找对应的抽屉——**镜像、名字、卷、网络、端口**五样，一把一把对
  > **二级 · 方法**：`image:` / `container_name:` / `volumes:`（列表） / `networks:`（列表，值写网络的 key） / `ports:`（列表）；顶层 `networks:` 声明 key 对应的**真实网络名**（`name:`）；`-d` 在 yml 里不需要（由 `docker compose up -d` 提供）
  > **三级 · 骨架**：`services:` → `nginx-tlias:` → `image: "____"` / `container_name: ____` / `volumes: - "____:____"` / `networks: - ____` / `ports: - "____:____"` → 顶层 `networks: ____: name: ____`

  > [!TIP]- 参考答案（做完再点开）
  > **① compose 写法**：
  > ```yaml
  > services:
  >   nginx-tlias:
  >     image: "nginx:1.20.2"
  >     container_name: nginx-tlias
  >     volumes:
  >       - "/usr/local/app/html:/usr/share/nginx/html"
  >       - "/usr/local/app/conf/nginx.conf:/etc/nginx/nginx.conf"
  >     networks:
  >       - itheima
  >     ports:
  >       - "80:80"
  > networks:
  >   itheima:
  >     name: itheima
  > ```
  > **② 逐项对应**：
  >
  > | `docker run` 里 | yml 里 |
  > | --- | --- |
  > | `nginx:1.20.2` | `image: "nginx:1.20.2"` |
  > | `--name nginx-tlias` | `container_name: nginx-tlias`（另外服务名本身也叫 `nginx-tlias`） |
  > | `-v ...`（两条） | `volumes:` 下的两条（**写法完全一样**，左宿主机、右容器） |
  > | `--network itheima` | 服务里的 `networks: - itheima` + 顶层 `networks: itheima: name: itheima` |
  > | `-p 80:80` | `ports: - "80:80"` |
  > | `-d` | 不用写，由 `docker compose up -d` 的 `-d` 提供 |
  >
  > **③ 为什么顶层还要声明一次**：服务里写的 `itheima` 是**网络的 key**（在这个文件里引用用的名字），它到底对应 Docker 里哪个网络，要在顶层说清楚。**不写 `name:` 的话**，Compose 会自动给网络加上项目名前缀（项目名默认取 compose 文件所在目录名），实测里那个自动网络就叫 `compose-demo_default`；课程想要的就是干干净净的 `itheima`（[112 篇](/posts/编程学习/javaweb学习笔记/112-docker自定义镜像与网络/)里那些容器也都在这个网络里），所以用 `name:` 钉死。
  > **④ 反过来（yml 加环境变量 + 加一条映射）**：
  > ```bash
  > docker run -d \
  >  --name nginx-tlias \
  >  -e TZ=Asia/Shanghai \
  >  -v /usr/local/app/html:/usr/share/nginx/html \
  >  -v /usr/local/app/conf/nginx.conf:/etc/nginx/nginx.conf \
  >  -v /usr/local/app/logs:/var/log/nginx \
  >  --network itheima \
  >  -p 80:80 \
  > nginx:1.20.2
  > ```
  > （yml 那边就是多加 `environment:` 一项、`volumes:` 下多一行——**两边是一一对应的，没有魔法**。）
  > 检查点：① yml 的缩进/列表写法正确；② 五样对应关系一个不漏（含 `-d` 由 `up -d` 承担）；③ 能解释"key 与真实网络名"和"项目名前缀"；④ 反写命令时 `-e`、`-v` 的位置与写法正确。

- [ ] **2-5 手动部署 vs Docker Compose：说清"痛点"和"解法"**
  需求：一个项目要起七个容器（`mysql`、`nginx`、`tlias-server`、`redis`、`mq`、`order-server`、`admin-server`）。请回答：
  ① 用**手动方式**部署，麻烦在哪儿（至少写出三条具体表现，要能对上前面的命令）；
  ② PPT 第 50 页给那两条结论是什么；
  ③ 换成 Compose 之后，上面这些麻烦分别被什么解决（对着"项目/服务"这两个概念说）；
  ④ 写出从"第一次部署"到"全部停掉"你会用到的 Compose 命令（含格式与常用选项），并说清 `up` 和 `down` 各自把什么建起来、删掉了什么（用本机实测的输出作证）。
  （练习文件 `test_113_Compose与部署.md` 的题目2-5 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：从"**命令长、顺序要记、数量多、管理散、换机器要重来**"这几个角度说痛点；对应地，Compose 用**一个文件**把这些"命令、顺序、数量"都收进 `services` 里，用**一套命令**统一管理
  > **二级 · 方法**：手动部署的账：一条 `docker run` 一长串参数、谁先谁后自己记、七个容器七条命令、日志/启停要一个个来、换机器要重抄；Compose：`docker-compose.yml` 定义一组服务（项目 = 一整套、服务 = 一个容器），`docker compose up -d` 一键起、`down` 一键停并删容器与网络、`ps`/`logs` 统一看
  > **三级 · 骨架**：① 至少三条具体麻烦；② 两句 PPT 结论（`____` / `____`）；③ 对应到 `____`（Project）与 `____`（Service）；④ `docker compose [____] [____]`；`up` = 创建并启动所有 `____`；`down` = 停止并移除所有 `____` 和 `____`

  > [!TIP]- 参考答案（做完再点开）
  > **① 手动部署的麻烦（具体表现）**：
  > - **命令又长又多**：`docker run -d --name nginx-tlias -v ... -v ... --network itheima -p 80:80 nginx:1.20.2`——一条命令一长串参数，七个容器就是七条，抄错一个字母就是一个坑；
  > - **先后顺序要自己记**：数据库要先起、应用再起、nginx 最后起（起反了就是启动报错）；
  > - **想留痕还得自己加参数**：日志路径、目录挂载、环境变量（比如 OSS 密钥、`MYSQL_ROOT_PASSWORD`）都得在命令里带对；
  > - **管理是散的**：看日志要一个个 `docker logs`、停要一个个 `docker stop`、删还得自己记着删网络；
  > - **换台机器等于重来**：这一串命令要再抄一遍。
  > **② PPT 第 50 页的两条结论**：**"手动部署 - 繁琐"**、**"不便于统一管理"**。
  > **③ Compose 怎么解决**：
  > - **"繁琐"** → 那七条 `docker run` 变成 `docker-compose.yml` 里的**七个服务（Service）**，参数各归各的字段（`image`/`container_name`/`ports`/`volumes`/`networks`/`environment`/`depends_on`），文件能存 Git、能改一处生效一处；
  > - **"不便于统一管理"** → 它们同属一个**项目（Project）**，用**一套命令**统一操作：`docker compose up -d` 一起起（顺序按 `depends_on`）、`docker compose ps` 一起看、`docker compose logs` 一起看日志、`docker compose down` 一起停并删（连网络一起）；
  > - **"换机器"** → 把 yml 和资源拷过去，一条 `up -d` 重来一遍。
  > **④ 从部署到收工的 Compose 命令**（格式 `docker compose [OPTIONS] [COMMAND]`）：
  > ```bash
  > # 第一次部署（-f 指定文件、-p 指定项目名，默认可省）
  > docker compose up -d
  > # 看状态 / 看日志
  > docker compose ps
  > docker compose logs
  > # 停 / 起 / 重启（不动容器与网络）
  > docker compose stop
  > docker compose start
  > docker compose restart
  > # 全部收工：停止并移除所有容器、网络
  > docker compose down
  > ```
  > `up` 干的事（本机实测）：**Creating → Created → Starting → Started**——把服务逐个创建并启动（镜像要构建的顺手构建、网络不存在就建）；
  > `down` 干的事（本机实测）：**Stopped → Removing → Removed**，最后还有 **`Network compose-demo_default Removing / Removed`**——**容器和网络一起清掉**（这也是那句"删要自己记着删网络"的对比：`down` 一步全包）。
  > 检查点：① 至少三条具体麻烦且对得上命令；② 两条结论写对；③ 能落到 Project / Service 两个概念上；④ 命令格式与常用子命令齐全，`up`/`down` 各自"建什么/删什么"说得清（能引用实测输出更好）。

### 三、综合题

- [ ] **3-1 用 Docker Compose 把 tlias 整套（mysql + 服务端 + 前端 nginx）一次拉起**
  需求：服务器上 Docker 已经装好，你手上有这几样东西：`tlias.sql`、后端的 `jdk17.tar.gz` / `tlias.jar` / `Dockerfile`、前端打包好的静态资源、改好的 `nginx.conf`。请按 PPT 第 54 页的三步，把"整套系统用 Compose 一次拉起"做完，并写成一份可照着做的清单：
  1. **准备资源**：把哪些文件放到同一个目录里（说清"为什么服务端那三样必须同目录"）；
  2. **写 `docker-compose.yml`**：三个服务（mysql / 服务端 / 前端 nginx）各自怎么写——镜像或构建、容器名、端口映射、挂载、环境变量、启动顺序、网络；
  3. **说清名字的约束**：应用配置里的数据库地址、nginx 配置里的转发地址，分别用的哪个**容器名**？改了会怎样？
  4. **一次构建**：写命令，并说清它一次性做了哪几件事（构建镜像 / 建网络 / 起容器 / 顺序）；
  5. **验证三个阶段**：后端自己能不能用（怎么直接访问）、前端页面能不能开（访问哪儿）、数据能不能出来（点开哪个页面、背后走的是哪条链路）；
  6. **收工与重来**：全停掉用什么命令、它删掉了什么；如果只想停不想删，又该用什么。
  7. **收尾复盘**：把"服务端六步"和"这份 yml"之间的对应说一遍（六步里的哪几步，被 yml 里的哪几行"一句话带过"了）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：这一题就是"**把前三节做过的事，全部折叠进一个 yml 文件**"——资源先归位（都在一个目录）、再用三个服务把 mysql / 应用 / nginx 描述出来、最后一条 `up -d` 收口；验证按"**后端 → 前端 → 数据**"三层往外走，哪层断了就查哪层
  > **二级 · 方法**：资源目录里放 `docker-compose.yml`、`Dockerfile`、`jdk17.tar.gz`、`tlias.jar`、`tlias.sql`、`nginx.conf`、静态资源目录；三个服务分别用 `image`（mysql、nginx）和 `build`（应用）；容器名 `mysql` / `tlias-server` / `nginx-tlias`；网络统一 `tlias-net`（顶层 `name: itheima`）；`depends_on` 串起"mysql → tlias → nginx"；`docker compose up -d` / `down` / `stop`
  > **三级 · 骨架**：① 目录清单（说明 `build.context` 的范围）；② yml 三段，照 2-2 与 2-3 拼起来；③ 数据库地址写容器名 `____`、nginx 转发写容器名 `____`；④ `docker compose ____ -d`；⑤ 后端 `http://____:8080/depts`、前端 `http://____`、数据看一个要查数据的页面；⑥ `docker compose ____` / `docker compose ____`；⑦ 六步 ↔ yml 对应表

  > [!TIP]- 参考答案（做完再点开）
  > ```
  > 【1】准备资源：全部放进同一个目录（比如 /usr/local/app）
  >   docker-compose.yml      ← 这一份是"总指挥"
  >   Dockerfile              ← 服务端构建用
  >   jdk17.tar.gz            ← 服务端构建用
  >   tlias.jar               ← 服务端构建用（已改好数据库地址与日志路径并打包）
  >   tlias.sql               ← 数据库初始化用
  >   nginx.conf              ← 前端配置
  >   html/                   ← 前端静态资源（index.html、assets/、favicon.ico）
  >   为什么服务端那三样必须同目录：yml 里 build.context 指的是 yml 所在目录，
  >   Dockerfile 里的 COPY 只能拷这个目录里的文件。
  >
  > 【2】docker-compose.yml（三个服务）
  >   services:
  >     mysql:
  >       image: mysql:8
  >       container_name: mysql
  >       ports: ["3307:3306"]
  >       environment:
  >         TZ: Asia/Shanghai
  >         MYSQL_ROOT_PASSWORD: 123
  >       volumes:
  >         - "/usr/local/app/mysql/data:/var/lib/mysql"
  >         - "/usr/local/app/mysql/init:/docker-entrypoint-initdb.d"   # tlias.sql 放这儿
  >         - "/usr/local/app/mysql/conf:/etc/mysql/conf.d"
  >       networks: [tlias-net]
  >     tlias:
  >       build:
  >         context: .
  >         dockerfile: Dockerfile
  >       container_name: tlias-server
  >       ports: ["8080:8080"]
  >       networks: [tlias-net]
  >       depends_on: [mysql]
  >     nginx:
  >       image: nginx:1.20.2
  >       container_name: nginx-tlias
  >       ports: ["80:80"]
  >       volumes:
  >         - "/usr/local/app/nginx/conf/nginx.conf:/etc/nginx/nginx.conf"
  >         - "/usr/local/app/nginx/html:/usr/share/nginx/html"
  >       depends_on: [tlias]
  >       networks: [tlias-net]
  >   networks:
  >     tlias-net:
  >       name: itheima
  >
  > 【3】名字的约束（不能随手改）
  >   · 应用配置里：jdbc:mysql://mysql:3306/tlias → 用容器名 mysql
  >   · nginx 配置里：proxy_pass http://tlias-server:8080 → 用容器名 tlias-server
  >   改名的后果：容器名变了，这两处配置就找不到目标
  >   （应用连不上库 / nginx 转发 502）；要改就两边一起改。
  >   前提：三个容器都在同一个自定义网络（itheima）里 —— 只有这样才能用容器名互访。
  >
  > 【4】一次构建
  >   docker compose up -d
  >   它一次做了：
  >     · 给 tlias 服务构建镜像（build 那段，等于在 context 目录里 docker build）
  >     · 创建网络 itheima（不存在才建）
  >     · 按 depends_on 的顺序依次创建并启动三个容器：mysql → tlias → nginx
  >
  > 【5】验证三个阶段
  >   · 后端自己：宿主机访问 http://192.168.100.128:8080/depts 能拿到 JSON
  >     （docker logs tlias-server 看启动日志有没有报错）
  >   · 前端页面：浏览器访问 http://192.168.100.128（80）看到 tlias 页面
  >   · 数据出来：打开部门管理/员工管理，表格有数据
  >     背后的链路：浏览器 → nginx 容器 80 → location / 发页面
  >     → 页面发 /api/depts → location ^~ /api/ rewrite 摘掉 /api
  >     → proxy_pass http://tlias-server:8080 → 应用容器
  >     → 连 mysql 容器的 3306 → 返回 JSON
  >
  > 【6】收工与重来
  >   docker compose down      → 停止并移除所有容器 + 网络（本机实测：Stopped/Removing/Removed，
  >                              最后 Network ... Removing/Removed）
  >   docker compose stop      → 只停止容器，不删（下次 docker compose start 接着用）
  >   重来：docker compose up -d（镜像/网络已存在的会复用）
  >
  > 【7】复盘：服务端六步 ↔ 这份 yml 的对应
  >   PPT 第 1 步（准备 MySQL 容器与库表）  → mysql 服务那一段（image/ports/environment/volumes）
  >   PPT 第 2 步（准备应用镜像、跑测试）    → tlias 服务的 build 段 + up 之后 up 起容器
  >   PPT 第 3 步（改配置、打 jar）         → 不在 yml 里：这是"构建前"要做的准备工作
  >   PPT 第 4 步（编写 Dockerfile）        → build.dockerfile 指向的那份文件
  >   PPT 第 5 步（构建镜像）               → up -d 时自动完成（build 段）
  >   PPT 第 6 步（部署容器）               → up -d 时自动完成（container_name/networks/ports/depends_on）
  >   前端那两段（目录映射 + nginx.conf）    → nginx 服务那一段的 volumes
  > ```
  > 检查点：① 资源清单完整、说得出"为什么服务端三样要同目录"；② yml 三个服务字段齐全、缩进正确、网络顶层声明了 `name: itheima`；③ 两个容器名（`mysql`、`tlias-server`）与两处配置对得上；④ `up -d` 做了哪几件事说得清；⑤ 验证分三层且链路说得对（尤其 `/api` 那一段）；⑥ `down` 与 `stop` 的区别清楚；⑦ 六步与 yml 的对应表能列出来。
