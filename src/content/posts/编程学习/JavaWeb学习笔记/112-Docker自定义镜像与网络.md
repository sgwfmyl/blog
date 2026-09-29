---
title: Docker自定义镜像与网络
published: 2026-09-29
description: 自定义镜像这一篇——先把镜像是什么讲清（应用 + 系统函数库 + 运行配置一起打包），再把镜像结构拆成基础镜像、层、入口三部分；Dockerfile 的六个指令 FROM/ENV/COPY/RUN/EXPOSE/ENTRYPOINT 逐个对号入座，课程那份从 CentOS 7 装 JDK 再拷 jar 的 Dockerfile 逐行读完，接着用本机实测的一份「模拟 Java 应用」镜像把构建、运行、看日志、端口映射整条链路的证据摆出来；最后补上默认 bridge 网桥与自定义网络那一节，说清为什么「只有加入同一个自定义网络的容器才能用容器名互访」
tags:
  - JavaWeb
  - Docker
  - 部署
order: 112
---

[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)把 Docker 的"日常操作"过了一遍：镜像怎么拉、容器怎么起停删、日志怎么翻，还顺手用数据卷把容器里的目录接到了宿主机上。但那些镜像**都是别人做好的**——要 MySQL 就 `docker pull mysql`，要 nginx 就 `docker pull nginx`。

这一篇（PPT 第 34～45 页）解决的是另外两件事：**自己的项目怎么做成镜像**（自定义镜像），以及**容器之间怎么互相找到**（网络）。这两块是同级关系——PPT 第 22 / 25 / 34 / 42 页那张目录页上，"Docker 核心"下面挂的四个入口是：**常见命令 → 数据卷 → 自定义镜像 → 网络**，[111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)点亮了前两个，**这一篇点亮后两个**。

> [!IMPORTANT]
> **这一篇的实测边界（先说清楚）**：
> - **自定义镜像这一半做了本机实测**——用一份"模拟 Java 应用"的 Dockerfile 走通了**构建 → 运行 → 看日志 → 端口映射**的全过程，证据在下面专门有一节，来自本机 Docker Desktop（CLI 29.1.3）。
> - **网络那一半没有逐个敲命令**（`docker network create/ls/connect/...` 这一组）。它按 PPT 第 43～44 页写，另外补了两处本机实测能对上的旁证：`docker inspect` 里容器的网络是 `bridge`，以及 nginx 容器的访问日志里宿主机显示为 `172.17.0.1`。
> - 为什么"模拟"着做：课程那份 Dockerfile 用的是 `FROM centos:7` + 真实 JDK 压缩包（镜像几百 MB），本机拉官方镜像又会卡在没配镜像加速上（[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)里记着这个坑）。所以本机改用一份已有的 `alpine` 镜像当底座，**指令结构（FROM/RUN/ENV/COPY/EXPOSE/ENTRYPOINT）和课程那份一模一样**，只是"装 JDK"这一步用一条命令模拟掉了。

| PPT 页 | 内容 | 本篇对应小节 |
| --- | --- | --- |
| 34 | 小节页——Docker 核心（常见命令 / 数据卷 / **自定义镜像** / 网络） | 开篇 |
| 35 | 自定义镜像——镜像是什么；"部署 Java 应用的步骤"与"构建 Java 镜像的步骤"对照 | 为什么要自定义镜像 |
| 36 | 从"准备 Linux 运行环境"到 CentOS 7 底座上一步步搭出 Java 应用的示意图 | 镜像结构 |
| 37 | **镜像结构**——基础镜像（BaseImage）/ 层（Layer）/ 入口（Entrypoint） | 镜像结构 |
| 38 | **Dockerfile** 是什么 + 六个常见指令表 | Dockerfile 与六个指令 |
| 39 | 完整的 Java 应用 Dockerfile 示例（从 `FROM centos:7` 到最后一行启动命令） | 逐行读这份 Dockerfile |
| 40 | 构建镜像的命令 `docker build -t myImage:1.0 .`（`-t` 与末尾那个点的含义） | 构建镜像 |
| 41 | 问答页——镜像结构 / Dockerfile 做什么 / 构建镜像的命令 | 三个问答 |
| 42 | 同一张小节页（自定义镜像讲完，进入**网络**） | Docker 网络 |
| 43 | 网络——默认所有容器都以 bridge 方式接在 Docker 的虚拟网桥上 | Docker 网络 |
| 44 | 网络——加入自定义网络才能用容器名互访 + 七个网络操作命令 | Docker 网络 |
| 45 | 章节目录页（快速入门 / Docker 核心 / 项目部署）——下一章要部署项目了 | 收尾 |

## 为什么要自定义镜像（PPT 第 35 页）

PPT 第 35 页先把"镜像"这个词定死：

> **镜像就是包含了应用程序、程序运行的系统函数库、运行配置等文件的文件包。构建镜像的过程其实就是把上述文件打包的过程。**

然后它把**两件事并排放在一起**——一件是我们 [109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)在 Linux 服务器上手动做过的，另一件是这一篇要学的：

| 部署一个 Java 应用的步骤（[109 篇](/posts/编程学习/javaweb学习笔记/109-项目部署到linux/)） | 构建一个 Java 镜像的步骤（本篇） | 说明 |
| --- | --- | --- |
| ① 准备一个 Linux 服务器 | ① 准备一个 Linux **运行环境** | 换台机器还要再装一遍 → **换成一个"基础镜像"**，写进 Dockerfile 就复用了 |
| ② 安装 JDK 并配置环境变量 | ② 安装 JDK 并配置环境变量 | **一模一样**（`COPY` 把安装包拷进去、`RUN` 解压、`ENV` 配 `JAVA_HOME`/`PATH`） |
| ③ 拷贝 Jar 包 | ③ 拷贝 Jar 包 | **一模一样**（`COPY` 一行） |
| ④ 运行 Jar 包 | ④ **编写运行脚本，运行 Jar 包** | 手动时是敲一行命令；镜像里要写成"启动脚本"（`ENTRYPOINT`），**容器一起来就自动执行** |

一句话读懂这个对照：**左边是"在别人的机器上装一遍"，右边是"把装的过程写成一个文件、打成包"**。左边做完只在那一台机器上有效，换台机器得从头再来一遍（[108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)那一长串 MySQL 安装命令就是这么来的）；右边做完得到一个**镜像**，这个镜像拿到任何装了 Docker 的机器上都能跑出一模一样的环境——这才是 Docker 真正想解决的问题。

> [!TIP]
> 对照 [110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)里"为什么要用 Docker"那三条痛点看：**命令太多记不住、步骤太多易出错、安装包找不到**。自定义镜像这一节，就是把"这些步骤"从"每次手敲"变成"写一次、打包、到处跑"。

## 镜像结构（PPT 第 36～37 页）

### 先看它是怎么一层层搭起来的（PPT 第 36 页）

第 36 页画的是"构建一个 Java 镜像"的过程，从下往上读：

```
        java -jar xx.jar          ← 设置启动脚本（容器启动时执行的东西）
拷贝 Jar 包                      ← COPY app.jar
配置 JDK 环境变量                 ← ENV JAVA_HOME=... / PATH=...
安装 JDK                         ← COPY jdk17.tar.gz + RUN tar -zxvf
-------------------------------  ← 分界线：下面是底座，上面是自己加的
/etc  /lib  /proc  /bin ...      ← CentOS 7（一套完整的 Linux 目录）
        BaseImage（基础镜像）
```

底座是 **CentOS 7**——注意它带的不是"一个内核"，而是 `/etc`、`/lib`、`/proc`、`/bin` 这一摞**系统函数库和文件**，也就是"一个 Linux 运行环境"该有的样子。往上一层层加：**装 JDK → 配环境变量 → 拷 Jar 包 → 设置启动脚本**，最后得到一个"能跑 Java 应用"的镜像。

### 学名：基础镜像 / 层 / 入口（PPT 第 37 页）

第 37 页给这三段起了名字：

| 组成部分 | 英文 | PPT 的定义 | 在 Java 应用镜像里对应什么 |
| --- | --- | --- | --- |
| **基础镜像** | **BaseImage** | 应用依赖的系统函数库、环境、配置、文件等 | `FROM centos:7`——第 36 页图里那一摞 `/etc`、`/lib`、`/bin` |
| **层** | **Layer** | 添加安装包、依赖、配置等，**每次操作都形成新的一层** | 装 JDK（`COPY` + `RUN` 解压）、配环境变量（`ENV`）、建目录（`RUN mkdir`）、拷 Jar 包（`COPY`）——**每一步是一层** |
| **入口** | **Entrypoint** | 镜像运行入口，一般是程序启动的脚本和参数 | `ENTRYPOINT ["java","-jar","/app/app.jar"]`——第 36 页图最上面那句 `java -jar xx.jar` |

所以"一个 Java 应用的镜像"= **一套 CentOS 7 底座 + 若干层（JDK、环境变量、jar） + 一个启动入口**。把它从下往上看，正好就是第 36 页那张图的读法；把它从上往下拆，就是第 39 页那份 Dockerfile 的写法。

> [!IMPORTANT]
> **"每次操作都形成新的一层"到底是什么意思？**
> Dockerfile 里每一条**会改动文件系统**的指令（`RUN`、`COPY`、`ADD`），都会在它下面那一层之上**再叠一个只读层**。Dockerfile 里写了多少个这样的指令，镜像就是多少层叠出来的。
>
> 带来两个好处和一个代价：
> - **好处一：层可以共享**。多个镜像都基于同一个 `centos:7` 时，底座那一层只存一份——[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)里 `docker pull` 时一行行 `Pull complete`，就是在一层层地下载（已经有的层不用再下）。
> - **好处二：构建能命中缓存**。改一行代码重新 `build` 时，前面没变的层直接用缓存，从变的那一层往后才重建（所以**把不常变的写前面、常变的写后面**）。
> - **代价：层多了镜像大、构建慢**。所以同一个"安装过程"里的几条命令习惯用 `&&` 串在**一条 RUN** 里——`RUN tar -xzf ... && rm ...` 就是"解压 + 删安装包"算**一次操作**（一层），而不是两层。
>
> 再往深一层的两个事实（知道就好）：`ENV`、`EXPOSE`、`WORKDIR`、`ENTRYPOINT` 这些**只改元数据、不改文件内容**的指令，在 `docker history` 里也能看到一行，但大小是 `0B`——真正让镜像变大的，是 `RUN` 和 `COPY` 这种往文件系统里塞东西的指令；另外，**在后面的层里删掉前面层里的文件，并不会让镜像变小**（前面那一层里它还在），所以能一次做完的事就别拖到下一次。

## Dockerfile 与六个指令（PPT 第 38 页）

第 38 页给 Dockerfile 下了定义：

> **Dockerfile 就是一个文本文件，其中包含一个个的指令（Instruction），用指令来说明要执行什么操作来构建镜像。将来 Docker 可以根据 Dockerfile 帮我们构建镜像。**

换句话说：**前面那张"底座 + 层 + 入口"的结构图，用文字写出来就是 Dockerfile**。它描述的是**镜像长什么样、怎么一层层搭起来**，而不是"运行时会干什么"。

六个常见指令（PPT 的表）：

| 指令 | 说明 | PPT 给的示例 |
| --- | --- | --- |
| `FROM` | **指定基础镜像**（后面一切都在它之上加） | `FROM centos:7` |
| `ENV` | **设置环境变量**，可在后面指令使用 | `ENV key=value` |
| `COPY` | **拷贝本地文件到镜像的指定目录** | `COPY ./jdk17.tar.gz /tmp` |
| `RUN` | **执行 Linux 的 shell 命令**，一般是安装过程的命令 | `RUN tar -zxvf /tmp/jdk17.tar.gz` |
| `EXPOSE` | **指定容器运行时监听的端口，是给镜像使用者看的** | `EXPOSE 8080` |
| `ENTRYPOINT` | **镜像中应用的启动命令，容器运行时调用** | `ENTRYPOINT java -jar xx.jar` |

对着"镜像结构三部分"看，这六个指令的分工一目了然：

| 镜像结构 | 由谁写出来 |
| --- | --- |
| 基础镜像 BaseImage | **`FROM`**（一行定底座） |
| 层 Layer | **`COPY` / `RUN` / `ENV`**（拷文件、跑安装命令、配环境变量） |
| 入口 Entrypoint | **`ENTRYPOINT`**（外加 `EXPOSE` 声明端口，方便使用者知道该映射哪个端口） |

> [!TIP]
> 两个容易看错的点先记下来，后面逐行讲的时候还会回来：
> ① `RUN` 里写的是**构建镜像时**要执行的命令（装 JDK、建目录），**不是**容器启动后要跑的东西；
> ② `ENTRYPOINT` 写的才是**容器启动时**要跑的东西——一个在"做镜像"，一个在"用镜像"。

## 逐行读这份 Dockerfile（PPT 第 39 页）

第 39 页给了一份**完整的 Java 应用 Dockerfile**——就是"基于 CentOS 7 基础镜像，用 Dockerfile 描述镜像结构"：

```dockerfile
# 使用 CentOS 7 作为基础镜像
FROM centos:7

# 添加 JDK 到镜像中
COPY jdk17.tar.gz /usr/local/
RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ &&  rm /usr/local/jdk17.tar.gz

# 设置环境变量
ENV JAVA_HOME=/usr/local/jdk-17.0.10
ENV PATH=$JAVA_HOME/bin:$PATH

# 创建应用目录
RUN mkdir -p /app
WORKDIR /app

# 复制应用 JAR 文件到容器
COPY app.jar app.jar

# 暴露端口
EXPOSE 8080

# 运行命令
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

（这份和课程资料 `资料/03. jdk & jar包/Dockerfile`、`资料/04. 项目部署/服务端项目/Dockerfile` 是同一份，只是那两个工程里 jar 包的名字不同——一个叫 `app.jar`、一个叫 `tlias.jar`。[113 篇](/posts/编程学习/javaweb学习笔记/113-docker项目部署与dockercompose/)用的是后一份，会多几行 OSS 和编码的 `ENV`。）

逐行拆开：

| 行 | 在干什么 | 为什么这么写 |
| --- | --- | --- |
| `FROM centos:7` | **定底座**——一个完整的 CentOS 7 环境（`/etc`、`/lib`、`/bin` 都在） | 这就是第 36 页图最下面那一摞。写 `centos:7` 而不是 `centos`，是为了**把版本钉死**（不写 tag 默认 `latest`，[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)的镜像命名规范）——版本一变，镜像行为跟着变，这不能接受 |
| `COPY jdk17.tar.gz /usr/local/` | **把本机的 JDK 压缩包拷进镜像**的 `/usr/local/` 目录 | `COPY 源 目标`，源是**构建时所在目录（构建上下文）里的文件**，目标是镜像里的路径。`/usr/local` 是 Linux 里"额外安装的软件放这儿"的位置（[106 篇](/posts/编程学习/javaweb学习笔记/106-linux概述与系统安装/)的目录结构）——和 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)手动装 JDK 时传到的还是同一个地方 |
| `RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ && rm /usr/local/jdk17.tar.gz` | **在镜像里执行解压**（解到 `/usr/local/`），解完顺手把压缩包删掉 | 这就是 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)里 `tar -zxvf ... -C /usr/local` 那一步，只不过现在是在**构建镜像时**自动跑。`&&` 把"解压"和"删包"串成**一条 RUN（一层）**——按上面说的"每次操作一层"，合并成一次更省 |
| `ENV JAVA_HOME=/usr/local/jdk-17.0.10` | 配 `JAVA_HOME`，指向**解压出来的那个 JDK 目录** | 目录名 `jdk-17.0.10` 是**压缩包自己解出来的名字**（不是随便起的），所以升级 JDK 时这里要跟着改。这一行就是 [108 篇](/posts/编程学习/javaweb学习笔记/108-linux软件安装/)手动改 `/etc/profile` 的动作 |
| `ENV PATH=$JAVA_HOME/bin:$PATH` | 把 JDK 的 `bin` 目录**加到 PATH 最前面**，让 `java` 命令能被找到 | `$JAVA_HOME` 用的是**上面一行刚设的变量**（PPT 说 ENV"可在后面指令使用"就是这个意思）；`:...` 后面那句 `$PATH` 是**把原来的 PATH 拼在后面**，别把系统原来的搜索路径覆盖没了。放在最前面是为了优先用这里装的 JDK |
| `RUN mkdir -p /app` | 建一个应用目录 | `-p` 的用法和 [107 篇](/posts/编程学习/javaweb学习笔记/107-linux常用命令/)一样（父目录不存在就一起建、已存在也不报错） |
| `WORKDIR /app` | **把后面指令的工作目录切到 `/app`** | 等价于先 `cd /app` 再执行后面的东西。它的效果是**持续的**：后面 `COPY app.jar app.jar` 的目标、`ENTRYPOINT` 里相对路径的起点，都跟着它走。所以得**先建目录、再 WORKDIR**（目录不存在时会自动建，但显式写出来更好读） |
| `COPY app.jar app.jar` | 把 jar 包拷进镜像——目标是相对路径，相对的就是上面 WORKDIR 定的 `/app` | 所以这一条的实际效果是 `/app/app.jar`。**这一行就是"拷贝 Jar 包"那一步**；注意 jar 必须在**构建目录旁边**（拷贝的源只能是构建上下文里的文件） |
| `EXPOSE 8080` | 声明"这个镜像里的应用会监听 8080" | PPT 说得明白：**"是给镜像使用者看的"**——它是一个**声明/文档**，本身**不会开放任何端口**。真正对外映射端口的是 `docker run -p`（[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)的端口映射）。不过有了它，别人拿到镜像就知道"该 `-p 8080:8080`" |
| `ENTRYPOINT ["java", "-jar", "/app/app.jar"]` | **容器启动时执行的命令**——跑起这个 jar | 这才是"镜像运行入口"。用的是**方括号的 exec 形式**（JSON 数组，命令和参数分开写、不经过 shell）；PPT 第 38 页的示例写成 `ENTRYPOINT java -jar xx.jar`（shell 形式）也能跑，**课程最终用的是方括号这一种**。用**绝对路径** `/app/app.jar` 最稳，不依赖当前工作目录 |

> [!WARNING]
> **这份 Dockerfile 里没有"写运行脚本"这一行显式的东西**——PPT 第 35 页把"编写运行脚本，运行 Jar 包"列成一步，落到 Dockerfile 里其实就是**最后那行 `ENTRYPOINT`**：它就是那个"运行脚本"。所以第 35 页那张对照表的四步，在这份文件里对应的是：`FROM`（准备运行环境）→ `COPY`+`RUN`+`ENV`（装 JDK 配环境）→ `COPY`（拷 jar）→ `ENTRYPOINT`（运行脚本）。

## 构建镜像（PPT 第 40 页）

Dockerfile 写好了，用它构建镜像：

```bash
docker build -t myImage:1.0 .
```

PPT 专门解释了后面两截：

| 片段 | 含义 |
| --- | --- |
| `-t myImage:1.0` | **给镜像起名**，格式还是老规矩 `repository:tag`（[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)的命名规范）；不写 tag 时默认为 `latest` |
| `.`（末尾那一个点） | **指定 Dockerfile 所在的目录**。这里写 `.` 表示"就在当前目录" |

用法上还有几个顺带要知道的点：

- **末尾那个目录同时是"构建上下文"**——它是 `COPY` 能找到文件的**范围**：`COPY jdk17.tar.gz /usr/local/` 里的 `jdk17.tar.gz`，指的是**那个目录里**的 `jdk17.tar.gz`。所以"要在 Dockerfile 里 `COPY` 什么，就得把它放在那个目录里"（课程资料里 `Dockerfile`、`jdk17.tar.gz`、`tlias.jar` 就是放在同一个目录的）。
- **命令要在那个目录里执行**（或者把路径写全）。写完 `.` 就是在当前目录找 `Dockerfile`；文件名叫别的（比如 `Dockerfile.jdk21`）时用 `-f` 指定。
- 构建完用 `docker images` 就能看到这个新镜像——**它和 `pull` 下来的镜像没区别**，接下来照常用 `docker run` 跑。

## 本机实测：构建 → 运行 → 看日志 → 端口映射（PPT 第 39～40 页的证据链）

这一节把上面那份 Dockerfile 的**每一步**都变成"看得见的结果"。本机用一份**模拟 Java 应用**的 Dockerfile 走了一遍（用已有的 `alpine` 镜像当底座，其余指令和课程那份一一对应）：

```dockerfile
# 本机实测用的"模拟 Java 应用"Dockerfile（指令结构和课程那份一致）
FROM docker.m.daocloud.io/library/alpine
# 模拟"安装 JDK"（真实版本是 COPY jdk17.tar.gz + RUN tar 解压）
RUN mkdir -p /usr/local/jdk && echo "jdk 已安装（模拟）" > /usr/local/jdk/install.log
# 配环境变量（和课程那份一样的两行）
ENV JAVA_HOME=/usr/local/jdk
ENV PATH=$JAVA_HOME/bin:$PATH
# 应用目录 + 进去
RUN mkdir -p /app
WORKDIR /app
# 拷应用 jar（本机放了一个文本文件当 jar）
COPY app.jar app.jar
# 声明端口
EXPOSE 8080
# 启动命令：把"环境变量和 jar 都拿到手了"打印出来，然后挂着不退出
ENTRYPOINT ["sh", "-c", "echo \"[容器启动] JAVA_HOME=$JAVA_HOME\"; echo \"[容器启动] 应用内容: $(cat /app/app.jar)\"; sleep 300"]
```

（`ENTRYPOINT` 那行之所以啰嗦，是因为要让容器把"读到的环境变量"和"读到的 jar 内容"打印到日志里——真实项目的 `ENTRYPOINT` 就是简简单单一句 `["java","-jar","/tlias/tlias.jar"]`。）

**① 构建镜像**（对应 PPT 第 40 页的命令）：

```
$ docker build -t ch20-java-app:1.0 .
  → 构建成功（每一步 RUN/COPY/ENV 各成一层）
```

**② 看构建出来的镜像**（本机实测）：

```
$ docker images ch20-java-app
REPOSITORY      TAG       SIZE
ch20-java-app   1.0       13MB
```

**③ 用这个镜像跑容器**——`-p 8083:8080` 做端口映射（照 [110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)的 `-p 宿主机端口:容器端口`）：

```
$ docker run -d --name ch20-app -p 8083:8080 ch20-java-app:1.0
d666a8750a43e7ec4beb6410d0981e0c6d285146632f7d95ec183ec0df81a356
```

**④ 看日志——`ENV` 和 `COPY` 到底生效没有**（本机实测，这一步最关键）：

```
$ docker logs ch20-app
[容器启动] JAVA_HOME=/usr/local/jdk
[容器启动] 应用内容: 这是一个模拟的应用 jar 包（真实项目里是 tlias-web-management-0.0.1-SNAPSHOT.jar）
```

两行日志正好各证明一件事：

- 第一行打印出了 `/usr/local/jdk` → **`ENV JAVA_HOME=...` 生效了**（`ENTRYPOINT` 里能读到这个变量）；
- 第二行 `cat /app/app.jar` 能读出内容 → **`COPY app.jar app.jar` 生效了**（jar 真的在 `/app` 里，因为前面有 `WORKDIR /app`）。

**⑤ 端口映射**（本机实测）：

```
$ docker ps --filter name=ch20-app
NAMES      STATUS         PORTS
ch20-app   Up 2 seconds   0.0.0.0:8083->8080/tcp, [::]:8083->8080/tcp
```

`PORTS` 那一列 `0.0.0.0:8083->8080/tcp` 就是**宿主机 8083 → 容器 8080** 的映射——容器里的应用按 `EXPOSE 8080` 声明的那样监听 8080，外面通过宿主机的 8083 访问它。

**⑥ 清理**（本机实测，实验做完就删干净）：

```
$ docker rm -f ch20-app && docker rmi ch20-java-app:1.0
Untagged: ch20-java-app:1.0
Deleted: sha256:515b06ccd7401fa26de5bed7173dfe4071a50bc764b2feaa9c13905bf2d10632
```

把这份证据和 PPT 的指令一一对上：

| Dockerfile 指令 | 本机实测里能看到的证据 |
| --- | --- |
| `FROM ...` | `docker build` 从底座开始依次执行（每一步各成一层） |
| `RUN mkdir -p ...` | 构建成功（模拟的"装 JDK"记在了镜像里） |
| `ENV JAVA_HOME=...` | `docker logs` 第一行 `JAVA_HOME=/usr/local/jdk` |
| `WORKDIR /app` | `COPY` 的目标成了 `/app/app.jar`（日志里 `cat /app/app.jar` 有内容） |
| `COPY app.jar app.jar` | `docker logs` 第二行打印出了 jar 的内容 |
| `EXPOSE 8080` | `docker ps` 的 `PORTS` 列里是 `->8080/tcp` |
| `ENTRYPOINT [...]` | 容器一起来就输出了那两行日志（不用 `exec` 进去手动执行） |
| `docker build -t 名:tag .` | 构建出 `ch20-java-app:1.0`，`docker images` 能查到 |

## 三个问答（PPT 第 41 页）

第 41 页把这一节拎出三问：

| PPT 的问题 | 答案 |
| --- | --- |
| **镜像的结构是怎样的？** | 镜像中包含了应用程序所需要的**运行环境、函数库、配置、以及应用本身**等各种文件，这些文件**分层打包**而成——也就是 **基础镜像（BaseImage）+ 层（Layer）+ 入口（Entrypoint）** 三部分 |
| **Dockerfile 是做什么的？** | Dockerfile 就是**利用固定的指令来描述镜像的结构和构建过程**，这样 Docker 才可以依次来构建镜像 |
| **构建镜像的命令是什么？** | **`docker build -t 镜像名 Dockerfile目录`**（在本例里就是 `docker build -t myImage:1.0 .`） |

一句话把三问串起来：**Dockerfile 用指令把"镜像的结构和搭法"写下来（`FROM` 底座 → 一层层 `COPY`/`RUN`/`ENV` → `ENTRYPOINT` 收口），`docker build` 照着它搭出镜像。**

## Docker 网络（PPT 第 42～44 页）

### 默认都挂在一座网桥上（PPT 第 43 页）

第 42 页的同一张小节页之后，进入"Docker 核心"的最后一块——**网络**。第 43 页先讲默认情况：

> **默认情况下，所有容器都是以 bridge 方式连接到 Docker 的一个虚拟网桥上。**

这一页的图里标了三层东西：

| 图里的元素 | 含义 |
| --- | --- |
| 宿主机 + **`docker0` `172.17.0.1/16`** | Docker 在宿主机上建的一座**虚拟网桥**（相当于一台虚拟交换机），`172.17.0.1` 是它在宿主机这一侧的地址，`/16` 表示整个 `172.17.x.x` 网段归它管 |
| 容器 + **`eth0`** + **`vethX` / `vethY` / `vethZ`** | 每个容器里有一块网卡 `eth0`；宿主机上对应一根"虚拟网线"（`veth`，virtual ethernet），一头插在 `docker0` 上、一头插进容器里 |
| 容器下的 **`mysql`**、**`java 应用`**、地址 **`172.17.0.2 / 172.17.0.3 / 172.17.0.4`** | 容器从这座网桥上分到各自的 IP，**能互相通信**（在同一个网段里）——图里画的正是"mysql 容器"和"java 应用容器"这两个典型角色 |

> [!TIP]
> 第 43 页那张图在本机有两处能对上的旁证（都来自本机实测）：
> - `docker inspect` 看一个容器的网络，写的是 **`网络: bridge`**——默认就是挂在这座网桥上；
> - 更直观的一处：本机起 nginx 容器后用 curl 从**宿主机**访问它，容器里 nginx 的访问日志第一列是 **`172.17.0.1`**——正是网桥在宿主机这一侧的地址。也就是说，从容器往外看，"宿主机"就是 `docker0` 那个 IP。
>
> | 这一节（PPT 第 43～44 页）的实测情况 | 说明 |
> | --- | --- |
> | `docker inspect` 里的 `网络: bridge` | **本机实测**（.2） |
> | nginx 日志里宿主机显示为 `172.17.0.1` | **本机实测**（.5） |
> | `docker network create / ls / connect / ...` 这一组命令 | **没有逐个敲**，按 PPT 第 44 页写 |

### 用容器名互相访问：自定义网络（PPT 第 44 页）

第 44 页抛出这一节最要紧的一句话：

> **加入自定义网络的容器才可以通过容器名互相访问。**

这一句看着不起眼，但它是**后面 [113 篇](/posts/编程学习/javaweb学习笔记/113-docker项目部署与dockercompose/)能不能部署起来的关键**：部署完 tlias 之后，nginx 容器要转发给 java 应用容器、java 应用要连数据库容器——它们的配置里写的**不是 IP，而是容器名**：

```nginx
# 课程资料 04. 项目部署/前端项目/conf/nginx.conf 里的转发目标
location ^~ /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://tlias-server:8080;   # 注意这里写的是"容器名"，不是 IP
}
```

```yaml
# 课程资料里 tlias.jar 打进去的 application.yml（数据库地址）
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/tlias       # 这里也是"容器名"
```

两条配置里的 `tlias-server` 和 `mysql` 都是**容器名**。要让这种写法生效，前提就是 PPT 这一页说的那句话：**这些容器必须加入同一个自定义网络**——这也是为什么课程里起容器时都带着 `--network itheima`（[113 篇](/posts/编程学习/javaweb学习笔记/113-docker项目部署与dockercompose/)会给完整的命令）。用 IP 也能通，但容器一重建 IP 就变了，配置跟着失效；**用容器名，容器重建了名字还在**。

网络的操作命令（PPT 第 44 页的表，一共七条）：

| 命令 | 说明 |
| --- | --- |
| `docker network create` | **创建一个网络** |
| `docker network ls` | **查看所有网络** |
| `docker network rm` | **删除指定网络** |
| `docker network prune` | **清除未使用的网络** |
| `docker network connect` | **使指定容器连接加入某网络** |
| `docker network disconnect` | **使指定容器连接离开某网络** |
| `docker network inspect` | **查看网络详细信息** |

按用途分一下组更好记（和 [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)里数据卷那五条命令是同一套思路）：

| 想干什么 | 用哪条 |
| --- | --- |
| 建一个新的网络 | `docker network create itheima` |
| 看看有哪些网络 | `docker network ls` |
| 看某个网络的详情（里面有哪些容器、网段是多少） | `docker network inspect itheima` |
| 让一个**已经跑着**的容器加入网络 / 离开网络 | `docker network connect itheima tlias-server` / `docker network disconnect ...` |
| 删掉某个网络 / 清掉所有没用到的网络 | `docker network rm itheima` / `docker network prune` |

而**"起容器时就指定网络"**靠的是 `docker run` 的 `--network` 参数（课程里就是 `--network itheima`）；用 Docker Compose 部署时，这件事由 yml 里的 `networks` 配置负责（[113 篇](/posts/编程学习/javaweb学习笔记/113-docker项目部署与dockercompose/)）。

> [!WARNING]
> 一个常见的坑：**"容器之间能通"和"能用容器名访问"不是一回事**。默认的 `bridge` 网桥上没有容器名解析，就算两个容器网段相同、能 ping 通 IP，写容器名照样解析不了；**只有加入（同一个）自定义网络的容器才能通过容器名互相访问**。记住这一句，部署时"数据库连不上/域名解析失败"的毛病基本都能对上号。

## 收尾：从"会敲命令"到"会做镜像"（PPT 第 45 页）

第 45 页是章节目录页——**快速入门 / Docker 核心 / 项目部署**。到这一页为止，"Docker 核心"这一大块（常见命令、数据卷、自定义镜像、网络）已经全部讲完了：

| Docker 核心的四块 | 在哪一篇 |
| --- | --- |
| 常见命令 | [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/) |
| 数据卷 | [111 篇](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/) |
| **自定义镜像** | **本篇**（`FROM` 底座 → 一层层搭 → `docker build` 出镜像） |
| **网络** | **本篇**（默认 bridge 网桥；自定义网络 + 容器名互访） |

接下来那一整块**"项目部署"**——把 tlias 的服务端打成镜像跑起来、前端交给 nginx 容器、再用 Docker Compose 一次拉起一套——就是 [113 篇](/posts/编程学习/javaweb学习笔记/113-docker项目部署与dockercompose/)的内容了。

## 小结

| 问题 | 答案 |
| --- | --- |
| 什么是镜像？ | **包含了应用程序、程序运行的系统函数库、运行配置等文件的文件包**；构建镜像的过程就是把这些文件打包的过程；部署 Java 应用与构建 Java 镜像的步骤一一对应，区别只在"运行环境"换成了基础镜像、"运行 jar"换成了启动脚本（PPT 第 35 页） |
| 镜像结构分哪三部分？ | **基础镜像（BaseImage）**——应用依赖的系统函数库、环境、配置、文件等（`FROM centos:7`）；**层（Layer）**——添加安装包、依赖、配置等，**每次操作都形成新的一层**；**入口（Entrypoint）**——镜像运行入口，一般是程序启动的脚本和参数（PPT 第 37 页） |
| 为什么"每次操作都多一层"？ | `RUN`/`COPY` 这类改文件系统的指令各叠一个只读层：层能**共享**（多个镜像共用一个底座）、构建能**命中缓存**（不变的层不重建）；代价是镜像大、构建慢，所以一次安装里的命令习惯用 `&&` 串成一条 `RUN` |
| Dockerfile 是什么？ | 一个**文本文件**，里面是一个个**指令**，用指令说明"要执行什么操作来构建镜像"；Docker 照着它依次构建（PPT 第 38 页） |
| 六个常见指令分别做什么？ | `FROM` 指定基础镜像；`ENV` 设置环境变量（可在后面指令用）；`COPY` 拷贝本地文件到镜像指定目录；`RUN` 执行 Linux shell 命令（安装过程）；`EXPOSE` 指定容器运行时监听的端口（**给使用者看的声明**）；`ENTRYPOINT` 镜像中应用的启动命令（容器运行时调用） |
| Java 应用 Dockerfile 的骨架？ | `FROM centos:7` → `COPY`+`RUN` 解压装 JDK → `ENV JAVA_HOME` 与 `ENV PATH` → `RUN mkdir -p /app` + `WORKDIR /app` → `COPY app.jar app.jar` → `EXPOSE 8080` → `ENTRYPOINT ["java","-jar","/app/app.jar"]` |
| `EXPOSE` 会真的开放端口吗？ | **不会**。PPT 说它"是给镜像使用者看的"；真正对外的是 `docker run -p 宿主机端口:容器端口` |
| `WORKDIR` 和 `RUN cd` 有什么区别？ | `WORKDIR` 改的是**后面指令的工作目录**（持续生效，`COPY` 的相对目标和 `ENTRYPOINT` 的相对路径都跟着它）；`RUN cd /app` 只在那一条命令里 `cd` 了一下，**下一条指令又回到了原目录** |
| 构建镜像的命令与两个参数？ | `docker build -t 镜像名:tag Dockerfile目录`——`-t` 给镜像起名（`repository:tag`，不写 tag 默认 `latest`）；末尾那个目录既是"Dockerfile 在哪"，也是 `COPY` 找文件的**构建上下文** |
| 本机实测证明了什么？ | 用"模拟 Java 应用"的 Dockerfile 走通：`docker build -t ch20-java-app:1.0 .` 构建成功 → `docker images` 看到 13MB 的镜像 → `docker run -d --name ch20-app -p 8083:8080` 跑起来 → `docker logs` 打印出 `JAVA_HOME=/usr/local/jdk`（**ENV 生效**）和 jar 的内容（**COPY 生效**）→ `docker ps` 里 `0.0.0.0:8083->8080/tcp`（**端口映射**） |
| 容器默认接在哪个网络？ | 默认所有容器都以 **bridge** 方式接在 Docker 的虚拟网桥 `docker0`（`172.17.0.1/16`）上，容器各自分到 `172.17.0.x` 的地址（本机 `docker inspect` 里就能看到 `网络: bridge`） |
| 怎么才能"用容器名"访问另一个容器？ | **加入自定义网络的容器才可以通过容器名互相访问**——所以要 `docker network create` 建网络，起容器时 `--network itheima`（或给跑着的容器 `docker network connect`）。课程里 nginx 配的 `proxy_pass http://tlias-server:8080`、tlias 配的 `jdbc:mysql://mysql:3306/tlias` 全是容器名，靠的就是这一条 |
| 网络有哪几条操作命令？ | `docker network create`（创建）、`ls`（查看所有）、`rm`（删除指定）、`prune`（清除未使用）、`connect`（让容器加入）、`disconnect`（让容器离开）、`inspect`（看详情） |

## 相关

- [上一篇：Docker常见命令与数据卷](/posts/编程学习/javaweb学习笔记/111-docker常见命令与数据卷/)
- [下一篇：Docker项目部署与DockerCompose](/posts/编程学习/javaweb学习笔记/113-docker项目部署与dockercompose/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. **镜像是什么**（PPT 第 35 页）：**包含了应用程序、程序运行的系统函数库、运行配置等文件的文件包**；构建镜像的过程就是把上述文件**打包**的过程
2. **"部署 Java 应用"与"构建 Java 镜像"的对照**（PPT 第 35 页）：准备 Linux 服务器 ↔ 准备 Linux **运行环境**；安装 JDK 并配置环境变量 ↔ 同样两步；拷贝 Jar 包 ↔ 同样一步；运行 Jar 包 ↔ **编写运行脚本，运行 Jar 包**——前者是"在机器上装一遍"，后者是"把装的过程打成包、到处跑"
3. **镜像结构三部分**（PPT 第 37 页）：**基础镜像 BaseImage**（应用依赖的系统函数库、环境、配置、文件等，如 `FROM centos:7`）、**层 Layer**（添加安装包、依赖、配置等，**每次操作都形成新的一层**）、**入口 Entrypoint**（镜像运行入口，一般是程序启动的脚本和参数，如 `java -jar xx.jar`）
4. **分层的两个好处和一个代价**：好处是层可**共享**（同一底座只存一份）、构建能**命中缓存**（不变的层不重建）；代价是层越多镜像越大、构建越慢——所以一次安装里的命令用 `&&` 串成**一条 `RUN`**
5. **Dockerfile 是什么**（PPT 第 38 页）：一个**文本文件**，包含一个个**指令**，用指令说明要执行什么操作来构建镜像；它描述的是**镜像的结构和构建过程**
6. **六个常见指令**：`FROM`（指定基础镜像）、`ENV`（设置环境变量，可在后面指令使用）、`COPY`（拷贝本地文件到镜像的指定目录）、`RUN`（执行 Linux 的 shell 命令，一般是安装过程的命令）、`EXPOSE`（指定容器运行时监听的端口，**是给镜像使用者看的**）、`ENTRYPOINT`（镜像中应用的启动命令，**容器运行时调用**）
7. **Java 应用 Dockerfile 的顺序**：`FROM centos:7` → `COPY jdk17.tar.gz /usr/local/` + `RUN tar -xzf ... && rm ...`（装 JDK，一条 RUN 里解压并删包）→ `ENV JAVA_HOME=/usr/local/jdk-17.0.10` + `ENV PATH=$JAVA_HOME/bin:$PATH` → `RUN mkdir -p /app` + `WORKDIR /app` → `COPY app.jar app.jar` → `EXPOSE 8080` → `ENTRYPOINT ["java","-jar","/app/app.jar"]`
8. **`RUN` 与 `ENTRYPOINT` 的分工**：`RUN` 是**构建镜像时**执行的（装 JDK、建目录）；`ENTRYPOINT` 是**容器启动时**执行的（跑 jar）。PPT 第 35 页说的"编写运行脚本"，落到文件里就是 `ENTRYPOINT`
9. **`WORKDIR` 的作用**：把**后面指令的工作目录**切过去（等价于持续生效的 `cd`）——所以 `COPY app.jar app.jar` 落到 `/app/app.jar`、`ENTRYPOINT` 里可以用相对路径；`RUN cd /app` 只在那一行有效
10. **构建命令**（PPT 第 40 页）：`docker build -t myImage:1.0 .`——`-t` 给镜像起名（`repository:tag`，不写 tag 默认 `latest`）；末尾的 `.` 是 **Dockerfile 所在目录**，它同时是 `COPY` 找文件的**构建上下文**
11. **本机实测（自定义镜像）**：`docker build -t ch20-java-app:1.0 .` 构建成功 → `docker images` 看到 `ch20-java-app:1.0 13MB` → `docker run -d --name ch20-app -p 8083:8080 ch20-java-app:1.0` → `docker logs ch20-app` 打出 `JAVA_HOME=/usr/local/jdk`（ENV 生效）与 jar 内容（COPY 生效）→ `docker ps` 显示 `0.0.0.0:8083->8080/tcp`（端口映射）
12. **网络（PPT 第 43 页）**：默认所有容器都以 **bridge** 方式接在 Docker 的虚拟网桥 **`docker0`（`172.17.0.1/16`）** 上，容器从网桥上分到 `172.17.0.2`、`.3`、`.4` 这样的地址（本机 `docker inspect` 里能看到 `网络: bridge`）
13. **网络（PPT 第 44 页）**：**加入自定义网络的容器才可以通过容器名互相访问**——这是部署时"nginx 用 `tlias-server` 找到 java 应用、java 应用用 `mysql` 找到数据库"的前提
14. **网络操作命令（七条）**：`docker network create`（创建一个网络）、`ls`（查看所有网络）、`rm`（删除指定网络）、`prune`（清除未使用的网络）、`connect`（使指定容器连接加入某网络）、`disconnect`（使指定容器连接离开某网络）、`inspect`（查看网络详细信息）
15. **本轮实测边界**：**自定义镜像做过本机实测**（模拟 Java 应用的构建/运行/日志/端口映射）；**网络那一组命令没有逐个敲**，按 PPT 写，只有 `docker inspect` 的 `bridge` 与 nginx 日志里的 `172.17.0.1` 两处旁证

### 二、裸写题

- [ ] **2-1 给你的 SpringBoot 应用写一份 Dockerfile（从 CentOS 7 开始）**
  需求：你手上有一个 SpringBoot 打出来的 **jar 包**（叫 `app.jar`）和一份 **Linux 版 JDK 压缩包**（叫 `jdk17.tar.gz`，解压出来的目录名是 `jdk-17.0.10`），两个文件都在当前目录。请写一份 Dockerfile，要求：
  ① 用 **CentOS 7** 当底座；
  ② 把 JDK 装进去、环境变量配好（让镜像里 `java` 命令能用）；
  ③ 建一个应用目录 `/app`，把 jar 拷进去（拷贝的操作用相对路径也能落到 `/app` 下）；
  ④ 声明这个镜像会监听 **8080**；
  ⑤ **容器一启动就运行** `java -jar /app/app.jar`。
  写完后回答两个小问题：**为什么"装 JDK"要写成"拷进来 + 解压"两条指令**？**这份文件里哪一行对应 PPT 第 35 页说的"编写运行脚本"**？
  （练习文件 `test_112_Dockerfile.txt` 里给了完整的写作区和检查点。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：照"镜像结构三部分"的顺序写——**先定底座，再从下往上搭层，最后收口到启动入口**；中间"装 JDK"这一步，本机的压缩包不会自己跑进镜像里，得先拷、再在镜像里解压
  > **二级 · 方法**：底座用 `FROM centos:7`；拷文件用 `COPY 源 目标`；解压用 `RUN tar -xzf ... -C ...`（顺手 `&& rm` 删掉安装包）；环境变量用 `ENV`（`JAVA_HOME` 指向解压出来的目录，`PATH` 里把 `$JAVA_HOME/bin` 拼在最前面）；目录用 `RUN mkdir -p /app` + `WORKDIR /app`；声明端口用 `EXPOSE 8080`；启动命令用 `ENTRYPOINT ["java","-jar","/app/app.jar"]`
  > **三级 · 骨架**：`FROM ____` ↳ `COPY jdk17.tar.gz ____` ↳ `RUN tar -xzf ____ -C /usr/local/ && rm ____` ↳ `ENV JAVA_HOME=____` ↳ `ENV PATH=$JAVA_HOME/bin:$____` ↳ `RUN mkdir -p /app` ↳ `WORKDIR ____` ↳ `COPY app.jar ____` ↳ `EXPOSE ____` ↳ `ENTRYPOINT ["java","-jar","____"]`

  > [!TIP]- 参考答案（做完再点开）
  > ```dockerfile
  > # 使用 CentOS 7 作为基础镜像
  > FROM centos:7
  >
  > # 添加 JDK 到镜像中：先把压缩包拷进去，再在镜像里解压（解完把包删掉）
  > COPY jdk17.tar.gz /usr/local/
  > RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ && rm /usr/local/jdk17.tar.gz
  >
  > # 设置环境变量：JAVA_HOME 指向解压出来的目录，PATH 里带上它的 bin
  > ENV JAVA_HOME=/usr/local/jdk-17.0.10
  > ENV PATH=$JAVA_HOME/bin:$PATH
  >
  > # 创建应用目录，并把后面的工作目录切过去
  > RUN mkdir -p /app
  > WORKDIR /app
  >
  > # 复制应用 JAR 文件到容器（相对路径，落到 /app/app.jar）
  > COPY app.jar app.jar
  >
  > # 暴露端口（声明给镜像使用者看）
  > EXPOSE 8080
  >
  > # 运行命令：容器启动时执行
  > ENTRYPOINT ["java", "-jar", "/app/app.jar"]
  > ```
  > **两个小问题**：
  > ① "装 JDK"要分成两条，是因为 **`COPY` 只能把本机的文件搬进镜像、不会解压**，而 `RUN` 才能执行 Linux 命令；所以先 `COPY` 把压缩包搬进去、再 `RUN` 在镜像里解压。**注意**：`COPY` 那一层里的压缩包**已经留在镜像里**了，后面 `rm` 只是让它在"当前状态"下看不见，镜像体积并不会因此变小（想彻底省体积要用多阶段构建，课程没讲）。
  > ② PPT 第 35 页的"编写运行脚本，运行 Jar 包"，落到这份文件里就是最后一行 **`ENTRYPOINT ["java","-jar","/app/app.jar"]`**——它就是那个"启动脚本"。
  > 检查点：① 第一行是 `FROM centos:7`；② 装 JDK 是 `COPY` + `RUN` 两条、且有 `&& rm`；③ `JAVA_HOME` 指向 `jdk-17.0.10`、`PATH` 里保留了 `$PATH`；④ `WORKDIR` 在 `COPY app.jar` 之前；⑤ `EXPOSE 8080` 写成了"声明"而不是指望它开端口；⑥ 最后一行用方括号 exec 形式、写绝对路径。

- [ ] **2-2 讲清镜像结构和"为什么每次操作都会多一层"**
  需求：请依次回答：
  ① 用一句话说清**镜像是什么**；
  ② 把**镜像结构的三部分**说出来（中文名 + 英文名 + 各自装什么）；
  ③ 把下面这份 Dockerfile 的**每条指令**分别归到"基础镜像 / 层 / 入口"里（同一个指令如果不好归类，说明为什么）；
  ④ **为什么"每次操作都会形成新的一层"**？层多了**有什么好处、有什么代价**？
  ⑤ 顺带回答："在后面的层里删掉前面层里的文件，镜像会变小吗？"
  （练习文件 `test_112_Dockerfile与网络.md` 的题目2-2 里给了写作区。）

  ```dockerfile
  FROM centos:7
  COPY jdk17.tar.gz /usr/local/
  RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ && rm /usr/local/jdk17.tar.gz
  ENV JAVA_HOME=/usr/local/jdk-17.0.10
  ENV PATH=$JAVA_HOME/bin:$PATH
  RUN mkdir -p /app
  WORKDIR /app
  COPY app.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "/app/app.jar"]
  ```

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：把三条线索接起来——**"镜像=文件包"**（PPT 第 35 页）→ **"底座 + 一层层加 + 一个启动口"**（PPT 第 36～37 页）→ **"改文件系统的指令各叠一层"**
  > **二级 · 方法**：底座看 `FROM`；"层"看 `COPY`/`RUN`/`ENV` 这些往上加东西的指令；入口看 `ENTRYPOINT`（`EXPOSE` 只是声明，算"给使用者看的说明"）；分层的好处在"共享 + 缓存"、代价在"体积 + 构建时间"，所以用 `&&` 把一次安装串成一条 `RUN`
  > **三级 · 骨架**：① 镜像是把 `____`、`____`、`____` 一起打包的文件包；② 三部分：**基础镜像**（`____` 指令）/ **层**（`____`/`____`/`____` 指令）/ **入口**（`____` 指令）；③ 归类表自己列一遍；④ 好处是层能 `____`、构建能 `____`，代价是 `____`；⑤ 答"不会变小"，因为 `____`

  > [!TIP]- 参考答案（做完再点开）
  > **① 镜像是什么**：包含了**应用程序、程序运行的系统函数库、运行配置**等文件的**文件包**；构建镜像就是把这些文件打包的过程。
  > **② 镜像结构三部分**：
  > - **基础镜像 BaseImage**——应用依赖的系统函数库、环境、配置、文件等；
  > - **层 Layer**——添加安装包、依赖、配置等，**每次操作都形成新的一层**；
  > - **入口 Entrypoint**——镜像运行入口，一般是程序启动的脚本和参数。
  > **③ 指令归类**：
  >
  > | 指令 | 归到哪一部分 | 说明 |
  > | --- | --- | --- |
  > | `FROM centos:7` | **基础镜像** | 一行定底座 |
  > | `COPY jdk17.tar.gz ...` + `RUN tar ... && rm ...` | **层** | 装 JDK 这一层（拷贝 + 解压） |
  > | `ENV JAVA_HOME=...` / `ENV PATH=...` | **层**（配置那一层） | 加的是配置（只改元数据、不占体积） |
  > | `RUN mkdir -p /app` / `WORKDIR /app` | **层**（+ 影响后面所有指令的目录） | 建目录算一层；`WORKDIR` 本身只改元数据 |
  > | `COPY app.jar app.jar` | **层** | 应用本身进来 |
  > | `EXPOSE 8080` | **入口那一侧**（声明） | 只声明"容器会监听 8080"，给使用者看，不真的开端口 |
  > | `ENTRYPOINT [...]` | **入口** | 容器启动时执行的命令 |
  >
  > **④ 为什么会一层层加上去**：Dockerfile 里每一条**会改动文件系统**的指令（`RUN`、`COPY`）都会在下面那一层之上**再叠一个只读层**——Dockerfile 里有几条这样的指令，镜像就是几层叠出来的。
  > **好处**：层可以**共享**（多个镜像基于同一个底座时只存一份；`docker pull` 时一行行 `Pull complete` 就是在分层下载），构建还能**命中缓存**（没变的层直接复用，所以把不常变的写前面）。
  > **代价**：层越多，镜像越大、构建越慢，`docker history` 一长串；所以同一次安装里的命令习惯用 `&&` 串成**一条 `RUN`**（如"解压 + 删安装包"）。
  > **⑤ 会变小吗**：**不会**。后面层里删除，只是让它"在最终视图里看不见"，前面那一层里这个文件**照样存在、照样占体积**（比如 `COPY jdk17.tar.gz` 那一层里的安装包，永远留在镜像里）——想真正省体积，要在**同一个 `RUN` 里**做完"用 + 删"，或者用多阶段构建。

- [ ] **2-3 逐行解释这份 Dockerfile，并回答四个追问**
  需求：请逐行说明下面这份 Dockerfile 每一行在干什么，然后回答四个问题：
  ① `EXPOSE 8080` 写在 Dockerfile 里，是不是容器一起来 8080 就对外开了？
  ② `ENV PATH=$JAVA_HOME/bin:$PATH` 里的 `$JAVA_HOME` 是从哪来的？为什么 `$JAVA_HOME/bin` 要写在 `$PATH` 前面？
  ③ 把 `WORKDIR /app` 换成 `RUN cd /app` 行不行？为什么？
  ④ 最后一行改成 `ENTRYPOINT java -jar /app/app.jar`（不加方括号）有什么差别？
  （练习文件 `test_112_Dockerfile与网络.md` 的题目2-3 里给了写作区。）

  ```dockerfile
  FROM centos:7
  COPY jdk17.tar.gz /usr/local/
  RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ &&  rm /usr/local/jdk17.tar.gz
  ENV JAVA_HOME=/usr/local/jdk-17.0.10
  ENV PATH=$JAVA_HOME/bin:$PATH
  RUN mkdir -p /app
  WORKDIR /app
  COPY app.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "/app/app.jar"]
  ```

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：按"这条指令是**构建时**干的还是**运行时**干的"分两类去读——`RUN`/`COPY`/`ENV` 是构建时把镜像搭起来；`EXPOSE`/`ENTRYPOINT` 是留给"运行时"的（一个声明、一个真正执行）；`WORKDIR` 比较特殊，它改的是"后面指令的环境"
  > **二级 · 方法**：`FROM` 定底座；`COPY` 搬文件；`RUN` 在镜像里执行命令；`ENV` 配的环境变量**后面的指令就能用**（所以 `$JAVA_HOME` 来自上一行，`$PATH` 是原有的）；`WORKDIR` 是**持续生效**的切目录；`EXPOSE` 只是"给使用者看"的声明，真开端口靠 `docker run -p`；`ENTRYPOINT` 的方括号形式（exec 形式）和去掉方括号的 shell 形式差别在"命令怎么被执行"
  > **三级 · 骨架**：① `EXPOSE` = `____`（声明），真正对外靠 `docker run ____`；② `$JAVA_HOME` 来自 `____` 那一行，写前面是为了 `____`，末尾的 `$PATH` 是为了 `____`；③ 不行，因为 `RUN cd` 只 `____`，后面指令又 `____`；④ 方括号是 `____` 形式（直接执行），不带方括号是 `____` 形式（经过 shell）

  > [!TIP]- 参考答案（做完再点开）
  > **逐行**：
  > - `FROM centos:7`——**指定基础镜像**：一个完整的 CentOS 7 环境（`/etc`、`/lib`、`/bin` 都在）；写死 `7` 是为了不让版本漂移；
  > - `COPY jdk17.tar.gz /usr/local/`——**把本机的 JDK 压缩包拷进镜像**的 `/usr/local/`（`COPY 源 目标`，源是构建上下文里的文件）；
  > - `RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ && rm /usr/local/jdk17.tar.gz`——**在镜像里解压**到 `/usr/local/`，并顺手删掉压缩包；`&&` 让"解压 + 删包"算**一次操作**（一层）；
  > - `ENV JAVA_HOME=/usr/local/jdk-17.0.10`——配 `JAVA_HOME`，指向**解压出来的目录名**（这个名字是压缩包定的，升级 JDK 时要跟着改）；
  > - `ENV PATH=$JAVA_HOME/bin:$PATH`——把 JDK 的 `bin` **拼到 PATH 最前面**；
  > - `RUN mkdir -p /app`——建应用目录（`-p`：父目录一起建、已存在不报错）；
  > - `WORKDIR /app`——把**后面指令的工作目录**切到 `/app`；
  > - `COPY app.jar app.jar`——把 jar 拷进来，目标是相对路径，落到 `/app/app.jar`（就是上面 `WORKDIR` 的效果）；
  > - `EXPOSE 8080`——**声明**容器运行时监听 8080；
  > - `ENTRYPOINT ["java", "-jar", "/app/app.jar"]`——**容器启动时**执行的命令，跑起这个 jar。
  > **四个追问**：
  > ① **不会**。`EXPOSE` 是"**给镜像使用者看的**"声明，它不会替你开放端口；真正让外面能访问的是 `docker run -p 宿主机端口:容器端口`（本机实测里就是 `-p 8083:8080`，`docker ps` 的 PORTS 列显示 `0.0.0.0:8083->8080/tcp`）。
  > ② `$JAVA_HOME` 来自**上一行刚设的 `ENV JAVA_HOME=...`**——PPT 说 ENV"**可在后面指令使用**"就是这个意思；`$JAVA_HOME/bin` 写在前面是为了**优先用这里装进来的 JDK**（PATH 是从左往右找命令的）；末尾的 `$PATH` 是**把系统原来的搜索路径保留下来**，否则 `ls`、`tar` 这些命令就都不好找了。
  > ③ **不行**。`RUN cd /app` 只在那**一条命令**里切了目录，**下一条指令又回到原来的工作目录**（每条指令各自独立执行）；`WORKDIR` 是**持续生效**的——它一设，后面 `COPY app.jar app.jar` 的目标、`ENTRYPOINT` 里的相对路径起点都跟着变。
  > ④ 方括号那种叫 **exec 形式**——命令和参数**分开写、不经过 shell**，就是"老老实实执行 `java -jar /app/app.jar`"；写成 `ENTRYPOINT java -jar /app/app.jar` 是 **shell 形式**，会被套进 `/bin/sh -c "..."` 里执行（好处是能写 shell 语法、能用环境变量展开，代价是信号传递等行为不一样）。课程最终用的是方括号这一种。

- [ ] **2-4 把镜像构建出来、跑起来，并验证"环境变量和拷贝都生效了"**
  需求：Dockerfile 已经写好放在当前目录，里面有 `FROM`、`COPY`、`RUN`、`ENV JAVA_HOME`、`WORKDIR`、`COPY app.jar`、`EXPOSE 8080`、`ENTRYPOINT` 这些指令。请写出：
  ① **构建命令**：镜像名叫 `tlias`、版本 `1.0`（并解释 `-t` 与末尾那个点各是什么、`.` 和 `COPY` 能拷哪些文件有什么关系）；
  ② 怎么看构建出来的镜像在不在；
  ③ 用这个镜像跑一个后台容器，名字叫 `tlias-server`，把**宿主机的 8080** 映射到**容器的 8080**；
  ④ 怎么确认容器起来了、端口映射对不对；
  ⑤ 怎么**看到容器里"环境变量真的设了、jar 真的在 /app 里"**（说两种手段，其中一种要能从"启动日志"里看出来）；
  ⑥ 用完怎么把容器和镜像都清掉。
  （练习文件 `test_112_Dockerfile与网络.md` 的题目2-4 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：照"**build → images → run → ps → 验证 → 清理**"这条链走；验证那一步要拿到"容器**里面**的状态"，所以要么进容器看、要么让容器启动时自己把状态打出来（看日志）
  > **二级 · 方法**：构建 `docker build -t tlias:1.0 .`；查看 `docker images tlias`；运行 `docker run -d --name tlias-server -p 8080:8080 tlias:1.0`；查看 `docker ps --filter name=tlias-server`；看日志 `docker logs tlias-server`（`ENTRYPOINT` 的打印会出现在这里）；进容器看 `docker exec -it tlias-server sh`（再 `echo $JAVA_HOME`、`ls /app`）或直接 `docker exec tlias-server ls /app`；清理 `docker rm -f tlias-server` + `docker rmi tlias:1.0`
  > **三级 · 骨架**：① `docker build -____ tlias:1.0 ____`；② `docker ____ tlias`；③ `docker run ____ --name tlias-server ____ 8080:8080 tlias:1.0`；④ `docker ps --filter ____`（看 PORTS 列）；⑤ `docker ____ tlias-server` 看启动日志 / `docker ____ tlias-server echo $JAVA_HOME`；⑥ `docker rm ____ tlias-server` + `docker ____ tlias:1.0`

  > [!TIP]- 参考答案（做完再点开）
  > ```bash
  > # ① 构建镜像：-t 是给镜像起名（repository:tag），末尾的 . 是 Dockerfile 所在目录
  > #    （也就是"构建上下文"——COPY 只能拷这个范围里的文件，所以 jar 和 jdk 包要放在这里）
  > docker build -t tlias:1.0 .
  >
  > # ② 看镜像有没有构建出来
  > docker images tlias
  > # REPOSITORY   TAG   IMAGE ID   CREATED   SIZE
  > # tlias        1.0   ...        ...       ...
  >
  > # ③ 跑容器：-d 后台、--name 起名（唯一）、-p 宿主机端口:容器端口
  > docker run -d --name tlias-server -p 8080:8080 tlias:1.0
  > # 返回一串容器 ID
  >
  > # ④ 确认它在跑、端口映射对不对
  > docker ps --filter name=tlias-server
  > # NAMES          STATUS         PORTS
  > # tlias-server   Up ...         0.0.0.0:8080->8080/tcp
  >
  > # ⑤ 验证"环境变量设了、jar 在 /app 里"——两种手段：
  > #    手段一：看日志（ENTRYPOINT 启动时打印的东西都会进这里）
  > docker logs tlias-server
  > # 本机实测里就是靠这一步看到 [容器启动] JAVA_HOME=/usr/local/jdk 与 jar 的内容
  > #    手段二：进容器里看（exec 是"在容器里执行一条命令"）
  > docker exec tlias-server echo $JAVA_HOME
  > docker exec tlias-server ls /app
  > # 也可以开一个交互式终端进去翻：docker exec -it tlias-server sh
  >
  > # ⑥ 清理：先删容器，再删镜像
  > docker rm -f tlias-server
  > docker rmi tlias:1.0
  > ```
  > 检查点：① 构建命令是 `docker build -t tlias:1.0 .`（`-t` 与 `.` 都能解释）；② 知道"`COPY` 的源只能在构建上下文里"；③ `-p 8080:8080` 里**左边是宿主机、右边是容器**；④ 用 `docker ps` 的 PORTS 列验证映射；⑤ 验证手段里至少有"看日志"这一条（并且知道日志来自 `ENTRYPOINT`）；⑥ 清理顺序是**先容器后镜像**（镜像被容器占用时删不掉）。
  > 顺带提醒：本机实测时宿主机 8080 可能已经被占用，所以实验里换成了 `-p 8083:8080`（不影响理解——**左边随便换，右边必须是应用真正监听的端口**）。

- [ ] **2-5 让两个容器"用名字互相找到"（网络）**
  需求：你起了两个容器：数据库容器 `mysql` 和 Java 应用容器 `tlias-server`。应用里的数据库地址写的是 `jdbc:mysql://mysql:3306/tlias`，结果启动时报"找不到主机/域名解析失败"。请回答：
  ① 为什么会解析不了 `mysql` 这个名字（提示：它们现在都在默认网络里）；
  ② 现在最省事的**两种修法**分别是什么（一种"动网络"、一种"动配置"），各自有什么缺点；
  ③ 写出"**创建一个叫 `itheima` 的网络**"和"**让已经跑着的 `tlias-server` 加入它**"的命令，以及"看现在有哪些网络"的命令；
  ④ 如果重来一次，用 `docker run` **一次就把网络指定好**该怎么写（以 `tlias:1.0` 这个镜像、名字叫 `tlias-server`、映射 8080 为例）；
  ⑤ 落回部署：**nginx 容器**要转发请求给这个应用容器，它的 `proxy_pass` 该写什么？（顺便说一句：为什么写容器名比写 IP 好？）
  （练习文件 `test_112_Dockerfile与网络.md` 的题目2-5 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：一句话定音——**加入自定义网络的容器才可以通过容器名互相访问**；所以要么让两个容器"进同一个自定义网络"，要么放弃"用名字"改用 IP
  > **二级 · 方法**：建网络 `docker network create itheima`、查看 `docker network ls`、让跑着的容器加入 `docker network connect itheima tlias-server`；起容器时指定用 `--network itheima`；nginx 那边写 `proxy_pass http://tlias-server:8080;`（写"容器名 + 容器内的端口"）
  > **三级 · 骨架**：① 默认的 `____` 网桥上没有容器名解析；② 修法一：两个容器都加进同一个 `____` 网络；修法二：把地址从 `____` 改成容器的 `____`（缺点：重建容器后 `____` 会变）；③ `docker network ____ itheima` / `docker network ____ itheima tlias-server` / `docker network ____`；④ `docker run -d --name tlias-server --____ itheima -p 8080:8080 tlias:1.0`；⑤ `proxy_pass http://____:____;`

  > [!TIP]- 参考答案（做完再点开）
  > **① 为什么解析不了**：容器默认都接在 **bridge 网桥**上，那座网桥上**没有"容器名 → IP"的解析**；`mysql` 这个名字没人认识，自然解析失败（就算两个容器能 ping 通 IP，名字照样不认）。PPT 第 44 页那句就是答案：**加入自定义网络的容器才可以通过容器名互相访问**。
  > **② 两种修法**：
  > - **动网络**：建一个自定义网络（如 `itheima`），把 `mysql` 和 `tlias-server` **都加进这个网络**——配置里的 `mysql` 就能解析了（课程采用的正是这一种）；
  > - **动配置**：把地址改成**能用 IP 访问到的地方**（比如指向宿主机的映射端口 `192.168.100.128:3307`，[110 篇](/posts/编程学习/javaweb学习笔记/110-docker快速入门/)的端口映射写法）。
  >   缺点：容器**一重建 IP（或端口）就变**，配置又得跟着改；容器名是稳定的，所以课程选第一种。
  > **③ 命令**：
  > ```bash
  > docker network create itheima              # 创建一个网络
  > docker network ls                          # 看看现在有哪些网络
  > docker network connect itheima tlias-server  # 让"已经跑着"的容器加入这个网络
  > docker network connect itheima mysql         # 数据库容器也加进去
  > docker network inspect itheima             # 看这个网络里有哪些容器（可选，验证用）
  > ```
  > **④ 起容器时一次指定**：
  > ```bash
  > docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0
  > ```
  > （课程资料里那条就是 `docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0`。）
  > **⑤ nginx 那边**：
  > ```nginx
  > location ^~ /api/ {
  >     rewrite ^/api/(.*)$ /$1 break;
  >     proxy_pass http://tlias-server:8080;   # 容器名:容器内端口
  > }
  > ```
  > 写**容器名**而不是 IP 的好处：容器重建（更新版本、换配置）时 IP 会变，名字不变——配置不用跟着改。前提还是那一句：**nginx 容器和应用容器要在同一个自定义网络里**（[113 篇](/posts/编程学习/javaweb学习笔记/113-docker项目部署与dockercompose/)里 `--network itheima` / Compose 的 `networks` 干的就是这件事）。
  > 检查点：① 能说出"默认网桥上没有容器名解析"；② 两种修法都说得出，并知道课程用的是"自定义网络"；③ 三条网络命令写对（create / ls / connect）；④ `--network itheima` 写在 `docker run` 上；⑤ `proxy_pass` 写的是"容器名 + 容器内端口 8080"，并且能解释"为什么不用 IP"。

### 三、综合题

- [ ] **3-1 从"一个 jar + 一个 JDK 包"到"两个容器能互相访问"（走完整条链）**
  需求：你手上有一个 SpringBoot 工程打出来的 `app.jar`，还有一份 `jdk17.tar.gz`（解压出 `jdk-17.0.10`）。请**从零**把"自己的应用做成镜像、跑成容器、并让另一个容器能用名字访问它"这件事做完，每一步都写清"在哪儿做、做什么、怎么确认成功"：
  1. **先规划**：这份镜像要由哪几部分组成（对着"基础镜像 / 层 / 入口"说一遍），哪些文件必须放在同一个目录里、为什么；
  2. **写 Dockerfile**：从 CentOS 7 开始，装 JDK、配环境变量、建目录、拷 jar、声明端口、写启动命令；
  3. **构建镜像**：写出命令并解释 `-t` 与末尾那个目录；
  4. **跑起来**：后台运行、起名 `tlias-server`、映射端口，并**验证三件事**——容器在跑、端口映射对、`ENV`/`COPY` 真生效了（说清用什么手段看出来的）；
  5. **接上网络**：建一个叫 `itheima` 的自定义网络，把数据库容器 `mysql` 和这个应用容器都放进去，然后解释"为什么放进去之后，配置里就能写 `jdbc:mysql://mysql:3306/tlias` 了"；
  6. **回头看**：把"部署 Java 应用的步骤"和"构建 Java 镜像的步骤"再对照一遍，说说镜像到底省掉了什么；
  7. **收尾**：把这一整套用到的命令按顺序列成一张清单（从 `docker build` 到 `docker network connect`），并说明每一步失败时你会先看什么。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：整条链是"**准备文件 → 写 Dockerfile → build → run → 验证 → 接网络**"；顺序上有个不变的规律：**先让镜像能跑起来，再去解决它和别人的通信**——一上来就折腾网络，出了问题分不清是镜像的事还是网络的事
  > **二级 · 方法**：文件三样（`Dockerfile`、`jdk17.tar.gz`、`app.jar`）放同一个目录当构建上下文；`docker build -t tlias:1.0 .`；`docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0`（网络要先 `docker network create itheima`）；验证靠 `docker ps`（端口）、`docker logs`（ENTRYPOINT 打印）、`docker exec`（进容器看）；"名字能通"靠"都在同一个自定义网络里"
  > **三级 · 骨架**：① 目录里放 `____`、`____`、`____`（因为 `COPY` 只能拷 `____` 里的文件）；② `FROM ____` → `COPY jdk17.tar.gz ____` → `RUN ____` → `ENV ____` → `WORKDIR ____` → `COPY app.jar ____` → `EXPOSE ____` → `ENTRYPOINT ____`；③ `docker build -t ____ ____`；④ `docker run -d --name ____ -p ____:____ tlias:1.0` + `docker ____` + `docker ____`；⑤ `docker network create ____` + `docker network connect ____ ____`（或 `--network`），因为同一个自定义网络里才 `____`；⑥ 省掉了 `____`；⑦ 清单按顺序列

  > [!TIP]- 参考答案（做完再点开）
  > ```
  > 【0】先规划
  >   · 镜像 = 基础镜像（CentOS 7）+ 若干层（装 JDK、配环境变量、拷 jar）+ 入口（java -jar）
  >   · 同一个目录里必须有：Dockerfile、jdk17.tar.gz、app.jar
  >     原因：COPY 只能拷"构建上下文（末尾那个目录）"里的文件，
  >           Dockerfile 里写 jdk17.tar.gz / app.jar 时，指的就是那个目录里的这两个文件。
  >
  > 【1】写 Dockerfile（文件内容）
  >   FROM centos:7
  >   COPY jdk17.tar.gz /usr/local/
  >   RUN tar -xzf /usr/local/jdk17.tar.gz -C /usr/local/ && rm /usr/local/jdk17.tar.gz
  >   ENV JAVA_HOME=/usr/local/jdk-17.0.10
  >   ENV PATH=$JAVA_HOME/bin:$PATH
  >   RUN mkdir -p /app
  >   WORKDIR /app
  >   COPY app.jar app.jar
  >   EXPOSE 8080
  >   ENTRYPOINT ["java", "-jar", "/app/app.jar"]
  >
  > 【2】构建镜像
  >   docker build -t tlias:1.0 .
  >     · -t tlias:1.0 —— 给镜像起名与版本（不写 tag 默认 latest）
  >     · 末尾的 .    —— Dockerfile 所在目录，同时是构建上下文
  >   确认成功：docker images tlias 能看到 tlias:1.0
  >
  > 【3】跑起来
  >   docker run -d --name tlias-server -p 8080:8080 tlias:1.0
  >   确认成功：
  >     · docker ps --filter name=tlias-server   → Up，PORTS 是 0.0.0.0:8080->8080/tcp
  >     · docker logs tlias-server               → 能看到 ENTRYPOINT 打出来的启动信息
  >       （本机实测里就是靠这一步看到 JAVA_HOME 与 jar 内容——证明 ENV 与 COPY 生效）
  >     · docker exec tlias-server ls /app       → 能看到 app.jar
  >     · docker exec tlias-server echo $JAVA_HOME → 能看到 /usr/local/jdk-17.0.10
  >
  > 【4】接上网络（容器名互访）
  >   docker network create itheima
  >   docker network connect itheima tlias-server
  >   docker network connect itheima mysql
  >   （下次直接：docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0）
  >
  >   为什么这样就能写 jdbc:mysql://mysql:3306/tlias：
  >     因为 PPT 第 44 页那条规则——"加入自定义网络的容器才可以通过容器名互相访问"。
  >     tlias-server 和 mysql 都在 itheima 这个自定义网络里，
  >     所以应用里写容器名 mysql，Docker 能把它解析成 mysql 容器在网桥上的 IP；
  >     3306 是"容器内"的端口（不是宿主机映射出去的那个 3307）。
  >
  > 【5】回头看"镜像省掉了什么"
  >   · 手动部署：换台机器就要"装 JDK → 配环境变量 → 传 jar → 起进程"四步重来一遍；
  >   · 镜像：这四步提前写进 Dockerfile、构建一次，
  >     任何装了 Docker 的机器上 docker run 一下就是同一个环境。
  >
  > 【6】命令清单（顺序照抄）
  >   ① 准备 Dockerfile + jdk17.tar.gz + app.jar（同一目录）
  >   ② docker build -t tlias:1.0 .              失败先看：文件名/路径、COPY 的源在不在上下文里
  >   ③ docker images tlias                      失败先看：上一步有没有真的成功
  >   ④ docker network create itheima
  >   ⑤ docker run -d --name tlias-server --network itheima -p 8080:8080 tlias:1.0
  >                                              失败先看：容器名重不重、端口占没占
  >   ⑥ docker ps --filter name=tlias-server     看状态与端口映射
  >   ⑦ docker logs tlias-server                 看应用有没有起来
  >   ⑧ docker exec tlias-server ...             进容器里验证环境
  >   ⑨ docker network connect itheima mysql     让数据库也进同一个网络
  >   ⑩ 清理：docker rm -f tlias-server && docker rmi tlias:1.0
  > ```
  > 检查点：① 三样文件放同一目录并说得出理由（构建上下文）；② Dockerfile 指令顺序对、`WORKDIR` 在 `COPY app.jar` 之前、`ENTRYPOINT` 用方括号；③ 构建命令的 `-t` 与 `.` 解释到位；④ 运行命令里 `-p` 左右含义对、验证手段至少两种（含"看日志"）；⑤ 网络那一环能落到 PPT 第 44 页那句话上，并说清"3306 是容器内端口"；⑥ 清单齐全、每一步都有"失败先看什么"。
