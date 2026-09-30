---
title: 会话技术与JWT令牌
published: 2026-09-29
description: 登录校验的第一块拼图「登录标记」——先想清楚登录校验要解决的两件事（登录标记 + 统一拦截），再对比三种会话跟踪方案（Cookie、Session、令牌）的原理与优缺点，然后拆开 JWT 令牌的三段结构看签名怎么防篡改，最后用 jjwt 把令牌的生成与解析写进工具类、接进登录接口，附过期令牌报 ExpiredJwtException 与 Cookie、Session 传递的真机实测
tags:
  - JavaWeb
  - HTTP
  - 后端
image: https://img.tsh520.cn/file/blog/post-covers/javaweb-82-session-jwt.webp
order: 82
---

[81 篇](/posts/编程学习/javaweb学习笔记/81-登录功能/)把登录接口做完了：用户名密码一对，服务器就发一枚令牌（`data.token`）。可发出去之后呢？**前端带不带随它，服务端验不验也没人管**——直接请求 `/depts`、`/emps`、`/report/*` 照样拿得到数据。PPT 第 9 页把这个问题摆在台面上之后，第 10～13 页给出了解法：**登录校验**。

本篇（PPT 第 10～28 页）负责登录校验的**前半部分**——"标记"从哪来。也就是：登录成功之后，靠什么技术在**后续每一次请求**里都能认出"这是刚才那个人"？答案是**会话技术**，而课程最终选的是其中的**令牌**方案（JWT）。后半部分"怎么拦"（过滤器 Filter、拦截器 Interceptor）在 83、84 篇。

## 登录校验的思路：两件事（PPT 第 10～13 页）

PPT 第 10 页把目录重念了一遍（**登录功能** / 登录校验），第 11 页打出"02 登录校验"的章节页，接着第 12 页给出一张贯穿后面所有内容的思路图。图上反复出现两个词：

> **登录标记**（存、取） + **统一拦截**

PPT 第 13 页把它们定义清楚：

> **登录标记**：用户登录成功之后，在后续的每一次请求中，都可以获取到该标记。【会话技术】
> **统一拦截**：过滤器 Filter、拦截器 Interceptor

翻译成大白话，登录校验要办两件事：

| 要办的事 | 拷问的问题 | 用什么技术 | 在哪一篇 |
| --- | --- | --- | --- |
| **登录标记** | 登录成功时把"这个人是谁"**存**在哪？之后每次请求又怎么**取**出来？ | **会话技术**（Cookie / Session / **令牌**） | **本篇** |
| **统一拦截** | 每个请求进来，怎么**统一**检查有没有合法标记，而不是在每个接口里各写一遍？ | **过滤器 Filter**、**拦截器 Interceptor** | 83 / 84 篇 |

这两件事是有先后依赖的：**先有标记，才谈得上拦**——标记长什么样（存在客户端还是服务端、怎么带、怎么验），直接决定了拦截器里那几行校验代码怎么写。所以课程先把会话技术讲透，再讲拦截。

PPT 第 14 页（以及第 24 页又叠了一遍的目录）把"登录校验"这块排成了四节：

> 会话技术 → JWT令牌 → 过滤器Filter → 拦截器Interceptor

前两节是本篇，后两节是 83、84 篇。

## 会话与会话跟踪（PPT 第 15 页）

PPT 第 15 页先给出两个定义：

> **会话**：用户打开浏览器，访问 web 服务器的资源，会话建立，直到有一方断开连接，会话结束。在一次会话中可以包含**多次请求和响应**。
> **会话跟踪**：一种维护浏览器状态的方法，服务器需要**识别多次请求是否来自于同一浏览器**，以便在同一次会话的多次请求间**共享数据**。

为什么需要"跟踪"？因为 HTTP 协议是**无状态**的（[32 篇](/posts/编程学习/javaweb学习笔记/32-http协议与请求数据格式/)：服务器对事务处理**没有记忆能力**，每次请求 - 响应都是**独立**的）。可登录这件事偏偏要求"连着记"：

- 第 1 次请求是 `POST /login`，登录成功；
- 第 5 次请求是 `GET /emps`——服务器凭什么知道这两个请求来自同一个人、而且这个人已经登录过了？

浏览器和服务器之间必须有个约定，让"状态"在多次请求间传下去，这就是**会话跟踪**。PPT 第 15 页列了三套方案：

| 分类 | 方案 | 一句话原理 |
| --- | --- | --- |
| 客户端会话跟踪技术 | **Cookie** | 服务器把标记**写给浏览器**，浏览器之后每次请求自动带上 |
| 服务端会话跟踪技术 | **Session** | 数据**存在服务器**上，只把一个编号（JSESSIONID）交给浏览器带着 |
| —— | **令牌技术** | 把状态**打包成一个令牌**交给客户端自己带着，服务器只负责生成和校验 |

下面按 PPT 的顺序逐个看。

## 方案一 Cookie：标记写在浏览器上（PPT 第 16～17 页）

**原理**（PPT 第 16 页的对比图）：

```text
① 服务器 → 浏览器：响应头 Set-Cookie: name=value
② 浏览器把这对 name=value 存下来
③ 之后每次请求 浏览器 → 服务器：请求头 Cookie: name=value
④ 服务器从请求头里读出 name=value → 认出这个浏览器
```

**优点**：HTTP 协议中支持的技术——浏览器和服务器天生就懂这一套，不用自己实现。

**缺点**（PPT 第 17 页问答里原样列着）：

1. **移动端 APP 无法使用 Cookie**：Cookie 是浏览器的机制，APP 里的网络请求不归浏览器管；
2. **不安全，用户可以自己禁用 Cookie**：浏览器设置里把 Cookie 一关，这套方案直接失效；而且 Cookie 内容明文存在客户端；
3. **Cookie 不能跨域**：PPT 第 16 页的例子——页面在 `http://192.168.150.100:8080`，请求要发到 `http://192.168.150.200:90`，这个请求就带不上那边的 Cookie。**跨域的区分有三个维度：协议、IP/域名、端口**，三者有一个不同就算跨域。

> [!TIP]
> **本机实测**（课程工程里的 `SessionController` 就是演示这两套方案的，连接的就是本机 `tlias` 库、`root`，课程示例密码 `1234`，**动手时把 `password` 换成你自己 MySQL 的密码**）：
>
> ```text
> GET /c1 →  响应头：Set-Cookie: login_username=itheima
> GET /c2（带 Cookie: login_username=itheima）→ {"code":1,"msg":"success","data":null}
> ```
>
> `/c1` 里是 `response.addCookie(new Cookie("login_username","itheima"))`——**往响应里塞 Cookie**，浏览器收到 `Set-Cookie` 后存下来；`/c2` 里是 `request.getCookies()` 遍历着找 `login_username`——**从请求头里读 Cookie**。一写一读，就是上面那四步。

**PPT 第 17 页的问答**（答完接着往下走）：

| PPT 的问题 | 答案 |
| --- | --- |
| Cookie 会话跟踪方案的原理? | 响应头 `Set-Cookie` 写标记，请求头 `Cookie` 带标记 |
| Cookie 会话跟踪方案的优缺点? | 优点：HTTP 协议中支持的技术；缺点：移动端 APP 无法使用、不安全（用户可以自己禁用 Cookie）、不能跨域 |

## 方案二 Session：数据留在服务端，只给浏览器一个编号（PPT 第 18～20 页）

**原理**（PPT 第 18、19 页）：

```text
① 浏览器第一次请求 → 服务器创建一块 Session（服务端存储），响应头 Set-Cookie: JSESSIONID=1
② 浏览器之后每次请求 → 请求头 Cookie: JSESSIONID=1
③ 服务器按编号 1 找到自己存的那格 Session → 读出里面的数据
```

所以 PPT 第 20 页的问答第一句就是：**Session 的底层是基于 Cookie 的**——服务器要靠 `JSESSIONID` 这个 Cookie 把"哪一格 Session 是你的"带回给自己。

**优点**：数据**存储在服务端**，安全（客户端只有一个编号，看不到内容）。

**缺点**：

1. **服务器集群环境下无法直接使用 Session**。PPT 第 19 页画了负载均衡：请求 1 打到服务器 A，Session(1) 建在 A 上；请求 2 被负载均衡分到了服务器 B——B 上根本没有 1 号 Session，用户就"掉线"了。要用 Session 就得额外做 Session 共享或粘性会话；
2. **Cookie 的缺点它全跑不掉**：毕竟编号是靠 Cookie 传的——移动端 APP 用不了、用户能禁用 Cookie、跨域带不过去。

> [!TIP]
> **本机实测**（同一台机器、同一套连接信息）——三行把"Session 底层靠 Cookie"讲透：
>
> ```text
> GET /s1 →  响应头：Set-Cookie: JSESSIONID=EF2A02EA23EDBCA4BC4BD0E42A2653F3; Path=/; HttpOnly
> GET /s2（带 Cookie: JSESSIONID=…）   → {"code":1,"msg":"success","data":"tom"}   ← 取到 Session 里存的用户名
> GET /s2（不带 JSESSIONID，新会话）    → {"code":1,"msg":"success","data":null}   ← 取不到
> ```
>
> `/s1` 里 `session.setAttribute("loginUser", "tom")` 往 Session 存值，响应里就多了 `Set-Cookie: JSESSIONID=...`；`/s2` 里 `session.getAttribute("loginUser")` 取值——**同一个 JSESSIONID 能拿到 `tom`，换一个或没有就拿不到**。这就是"服务器按编号找自己的那格 Session"，也是"Session 靠 Cookie 传编号"最直接的证据。
>
> （响应头里的 `HttpOnly` 是容器给 JSESSIONID 加的保险：这种 Cookie 不允许 JS 脚本读取，防止被脚本偷走。）

**PPT 第 20 页的问答**：

| PPT 的问题 | 答案 |
| --- | --- |
| Session 会话跟踪方案的原理? | Session 的底层是基于 Cookie 的（`Set-Cookie`、`Cookie` 传 JSESSIONID） |
| Session 会话跟踪方案的优缺点? | 优点：存储在服务端，安全；缺点：服务器集群环境下无法直接使用 Session、Cookie 的缺点 |

## 方案三 令牌：状态自己带着走（PPT 第 21～23 页）

PPT 第 21 页把三种方案摆在一起对比，并给"方案三（令牌）"标了**主流方案**；第 22、23 页展开讲它。**原理**：

```text
① 登录成功 → 服务器【生成】一个令牌：里面装着"你是谁"等信息，还带一段签名防篡改 → 交给客户端保存
② 之后每次请求 → 客户端把令牌放在请求头里带上
③ 服务器【校验】令牌：签名对不对、内容有没有被改、过没过期 → 通过才放行
```

和前面两套最大的不同：**服务器什么都不用存**。令牌本身就是"自包含"的（信息都在里面），校验靠的是数学（签名），不靠查表。于是：

**优点**（PPT 第 21、22 页）：

- **支持 PC 端、移动端**——就是一段字符串，浏览器、APP、小程序都能存能带，不受 Cookie 限制；
- **解决集群环境下的认证问题**——任何一台服务器拿到令牌都能独立校验（秘钥相同即可），不用共享 Session；
- **减轻服务器端存储压力**——服务端不存会话数据。

**缺点**：**需要自己实现**（Cookie 和 Session 是 Servlet 容器白送的，令牌这一套得自己写生成与校验）。

**PPT 第 22 页的问答**：

| PPT 的问题 | 答案 |
| --- | --- |
| 令牌会话跟踪方案的优缺点? | 优点：支持 PC 端、移动端；解决集群环境下的认证问题；减轻服务器端存储压力。缺点：需要自己实现 |

把三种方案并排总结一下：

| 方案 | 标记/数据存在哪 | 浏览器怎么带 | 优点 | 缺点 |
| --- | --- | --- | --- | --- |
| **Cookie** | 浏览器（明文） | 响应 `Set-Cookie`，之后请求头 `Cookie` 自动带 | HTTP 协议原生支持 | 移动端 APP 用不了、不安全（可禁用）、不能跨域 |
| **Session** | 服务端（靠 JSESSIONID 找） | 请求头 `Cookie` 里带 `JSESSIONID` | 数据在服务端，安全 | **集群下不能直接用**；Cookie 的缺点它也全有 |
| **令牌** | 客户端（令牌自包含 + 签名） | 请求头里带令牌（课程约定头名就叫 `token`） | 支持 PC/移动端、解决集群认证、减轻服务端存储 | 需要自己实现 |

课程选令牌，正是冲着"移动端 + 集群 + 不用存"这三点去的；而"自己实现"这件事，就是本节的 **JWT**。

## JWT 令牌介绍：三段结构（PPT 第 25 页）

PPT 第 24 页把目录又叠了一遍（表示从"会话技术"转到"JWT令牌"这块），第 25 页正式介绍 JWT：

> **全称**：JSON Web Token（官网 <https://jwt.io/>）
> **定义**：定义了一种简洁的、自包含的格式，用于在通信双方以 json 数据格式**安全**的传输信息。

JWT 令牌由**三部分**组成，中间用 `.` 分隔：

| 部分 | 装什么（PPT 原文） | 例子 |
| --- | --- | --- |
| **Header**（头） | 记录**令牌类型、签名算法**等 | `{"alg":"HS256","type":"JWT"}` |
| **Payload**（有效载荷） | 携带一些**自定义信息、默认信息**等 | `{"id":"1","username":"Tom"}` |
| **Signature**（签名） | **防止 Token 被篡改、确保安全性**。将 header、payload 融入，并加入指定秘钥，通过指定签名算法计算而来 | 数字签名(header.payload，secret) |

拿一枚**本机实测生成的真令牌**（下一节细讲它怎么来的）对照着拆，三段分别是：

```text
eyJhbGciOiJIUzI1NiJ9 . eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImV4cCI6MTc5MDY5MzM0Nn0 . BSgyQPMJ6PV1atT0j6uSkFoLDqsiBWawaoqek_hqJjI
└──── Header 段 ────┘   └──────────────── Payload 段 ────────────────┘   └─────────────── Signature 段 ───────────────┘
```

把前两段按 Base64 解开：

| 段 | 解出来的 JSON | 说明 |
| --- | --- | --- |
| Header 段 | `{"alg":"HS256"}` | 用的是 HS256 签名算法（PPT 的例子还多一个 `"type":"JWT"`） |
| Payload 段 | `{"id":1,"username":"admin","exp":1790693346}` | `id`、`username` 是生成时放进去的**自定义信息**；`exp` 是**默认信息**里的过期时间（Unix 时间戳，单位秒——本机这枚是"生成时刻 + 1 分钟"） |
| Signature 段 | `BSgyQPMJ6PV1atT0j6uSkFoLDqsiBWawaoqek_hqJjI` | 签名，不是给人读的，是给服务器**比对**用的 |

**签名怎么防篡改**：签名是用"`header.payload` 这两段 + 一个只有服务器知道的秘钥"，按 Header 里声明的算法（HS256）算出来的一串值。校验时服务器**拿同样的方式再算一遍**：

- 算出来**和令牌里的第三段一致** → 说明 header、payload 一个字符都没被改过，令牌可信；
- **不一致** → 要么内容被改了（改了任何字符，算出来的签名都对不上），要么用的秘钥不对。

> [!IMPORTANT]
> **Base64 是编码，不是加密**。PPT 第 25 页的定义：
>
> > Base64：是一种基于 64 个可打印字符（A-Z a-z 0-9 + /）来表示二进制数据的编码方式。
>
> 它是"换一种写法"，不是"上锁"——上面那张表就是把令牌的前两段 Base64 解出来的结果，**谁都能解**。所以：
>
> - 令牌里**不要放密码等敏感信息**（本机实测解开 payload 就能看到 `id`、`username`、过期时间，这也正是课程往 claims 里只放 id 和 username 的原因）；
> - JWT 防的是**篡改**，不是**偷看**；传输安全要靠 HTTPS。

## 生成与解析：jjwt 与 Jwts（PPT 第 26 页）

PPT 第 26 页给出"两步走"：

1. **引入 jjwt 依赖**（pom.xml）：

```xml
<!--JWT-->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.9.1</version>
</dependency>
```

2. **调用官方提供的工具类 `Jwts` 来生成或解析 jwt 令牌**。

**生成令牌**（PPT 版示例，写在一个测试方法里）：

```java
@Test
public void testGenJwt() {
    // 自定义信息：将来会装进 Payload
    Map<String, Object> claims = new HashMap<>();
    claims.put("id", 10);
    claims.put("username", "itheima");

    String jwt = Jwts.builder()
            .signWith(SignatureAlgorithm.HS256, "SVRIRUlNQQ==")   // 指定签名算法与秘钥
            .addClaims(claims)                                    // 添加自定义信息
            .setExpiration(new Date(System.currentTimeMillis() + 12 * 3600 * 1000))  // 过期时间：12 小时
            .compact();                                           // 生成令牌
    System.out.println(jwt);
}
```

这条链每一步都在往令牌的三段里"填东西"：

| 方法 | 干什么 | 对应令牌的哪一段 |
| --- | --- | --- |
| `Jwts.builder()` | 拿到一个令牌构造器 | —— |
| `.signWith(SignatureAlgorithm.HS256, 秘钥)` | 声明签名算法 HS256，并给出秘钥 | **Signature** 段（以及 Header 段里的 `alg`） |
| `.addClaims(claims)` | 放入自定义信息（Map） | **Payload** 段 |
| `.setExpiration(日期)` | 放入过期时间 | **Payload** 段的 `exp` |
| `.compact()` | 把上面这些打包成字符串 | 返回完整的三段式令牌 |

**解析令牌**：

```java
@Test
public void testParseJwt() throws Exception {
    String jwtToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...";

    Claims claims = Jwts.parser()
            .setSigningKey("SVRIRUlNQQ==")   // 指定秘钥
            .parseClaimsJws(jwtToken)        // 解析令牌（同时校验签名与有效期）
            .getBody();                      // 获取自定义信息
    System.out.println(claims);
}
```

解析是生成的反过程：`Jwts.parser()` 拿到解析器 → `.setSigningKey(秘钥)` 告诉它"用哪个秘钥去核签名" → `.parseClaimsJws(token)` 真正解析（**签名不对、令牌过期，都在这一步抛异常**）→ `.getBody()` 拿回 Payload 里的内容（一个 `Claims` 对象，可以 `get("id")` 这样取值）。

> [!WARNING]
> **两处秘钥必须完全一致**（PPT 第 27 页把它单列成"注意事项"）：生成时用什么秘钥，解析时就必须用什么秘钥——**秘钥是配套的**。课程里这个秘钥是一段 **Base64 字符串**（jjwt 0.9.1 的 `signWith` / `setSigningKey` 传字符串时，要求是 Base64 编码的秘钥）：PPT 示例里的 `SVRIRUlNQQ==` 解开是 `ITHEIMA`，工程 `JwtUtils` 里用的 `aXRoZWltYQ==` 解开是 `itheima`——都是"拿一个词当秘钥"的意思，真实项目里当然要换成长长的随机串，并且**绝对不能泄露**。

## 本机实测：生成、过期与篡改（PPT 第 27 页的问答 + 真机对照）

PPT 第 27 页把这一节的问答收在一起，三个问题都值得背下来：

| PPT 的问题 | 答案 |
| --- | --- |
| JWT 令牌由哪几个部分组成，每个部分都存储什么内容？ | **header**（头）记录令牌类型、签名算法；**payload**（载荷）携带一些自定义的信息；**signature**（签名）防止被篡改、保证安全性 |
| JWT 令牌生成及校验？ | 生成用 `Jwts.builder()...`；解析（校验）用 `Jwts.parser()...` |
| JWT 令牌解析（校验）时什么情况会报错？ | **令牌被篡改** 或 **过期失效**了 |
| 注意事项 | 校验时使用的签名秘钥，必须和生成令牌时使用的秘钥**配套** |

说"会报错"还不够直观，本机把课程的 `JwtTest` 跑了一遍，两个错误现场都能看到：

> [!TIP]
> **本机实测（一）：生成成功**
>
> ```text
> # testGenerateJwt 输出（自定义信息 id=1、username=admin，过期时间设为 1 分钟）
> eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImV4cCI6MTc5MDY5MzM0Nn0.BSgyQPMJ6PV1atT0j6uSkFoLDqsiBWawaoqek_hqJjI
> ```
>
> 这就是上一节被拆成三段的那枚令牌：Header 段是 `{"alg":"HS256"}`、Payload 段是 `{"id":1,"username":"admin","exp":1790693346}`。

> [!TIP]
> **本机实测（二）：解析一个过期的令牌 → `ExpiredJwtException`**
>
> 课程 `JwtTest` 里"解析令牌"那个方法，`token` 变量里的令牌是**课程录制时（2024 年）生成**的，早就过期了。照原样跑，控制台直接抛出：
>
> ```text
> io.jsonwebtoken.ExpiredJwtException: JWT expired at 2024-11-24T17:16:18Z.
> Current time: 2026-09-29T22:48:07Z, a difference of 58253509112 milliseconds.
> Allowed clock skew: 0 milliseconds.
> ```
>
> 逐句读一遍（这正是"过期会解析失败"的现场证据）：
>
> - `JWT expired at 2024-11-24T17:16:18Z`——这枚令牌的过期时间是 2024-11-24，早就过了；
> - `Current time: 2026-09-29T22:48:07Z, a difference of 58253509112 milliseconds`——当前时间与过期时间差了约 58253509 秒（≈ 674 天）；
> - `Allowed clock skew: 0 milliseconds`——不允许任何"时钟宽容"（服务器之间时间若有一点点偏差也可以放宽，这里没放宽）。
>
> **所以照课程敲这段解析代码时，一跑就会看到这个过期报错，不是你把代码写错了**——把 `token` 换成刚刚生成的那枚（或者自己重新生成一枚再立刻解析）就正常了。
>
> 另外两种失败（PPT 第 27 页说的"被篡改"，以及"秘钥不配套"）：**令牌里任何一个字符被改动、或解析时用了另一把秘钥，签名校验都对不上，会抛 `SignatureException`**。到 83 篇做接口级实测时，它的表现就是"篡改后的令牌 → HTTP 401"。

## 登录成功后生成令牌（PPT 第 28 页）

PPT 第 28 页把这一篇的东西落到登录功能上：

> 定义 JWT 令牌操作工具类。（基于 AI）
> 登录完成后，调用工具类生成 JWT 令牌，并返回。

**第一步，把生成/解析封装成工具类**（课程工程 `utils/JwtUtils.java`）：

```java
public class JwtUtils {

    private static final String SECRET_KEY = "aXRoZWltYQ=="; // 秘钥
    private static final long EXPIRATION_TIME = 12 * 60 * 60 * 1000; // 12小时

    /**
     * 生成JWT令牌
     * @param claims 令牌中包含的信息
     * @return 生成的JWT令牌字符串
     */
    public static String generateToken(Map<String, Object> claims) {
        return Jwts.builder()
                .signWith(SignatureAlgorithm.HS256, SECRET_KEY)
                .addClaims(claims)
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .compact();
    }

    /**
     * 解析JWT令牌
     * @param token 要解析的JWT令牌字符串
     * @return 包含令牌信息的Claims对象
     * @throws Exception 如果令牌无效或已过期，则抛出异常
     */
    public static Claims parseToken(String token) throws Exception {
        return Jwts.parser()
                .setSigningKey(SECRET_KEY)
                .parseClaimsJws(token)
                .getBody();
    }
}
```

和 PPT 第 26 页的写法一一对应，只是把它收进了工具类：

- `generateToken` = 生成那串链（算法 HS256 + 秘钥、claims、12 小时过期、`compact()`）；
- `parseToken` = 解析那串链（秘钥、`parseClaimsJws`、取 `getBody()`），**它就是后面 83、84 篇校验令牌时要反复调用的方法**；
- 两个方法都是 `static`，调用时不用注入、直接 `JwtUtils.generateToken(claims)`；秘钥和过期时长做成了常量——想改"登录一次能用多久"，只动 `EXPIRATION_TIME` 这一行。

**第二步，登录成功时调用它**（[81 篇](/posts/编程学习/javaweb学习笔记/81-登录功能/)里"先当它存在"的那一步，现在可以落实了）：

```java
    @Override
    public LoginInfo login(Emp emp) {
        //1. 调用mapper接口, 根据用户名和密码查询员工信息
        Emp e = empMapper.selectByUsernameAndPassword(emp);

        //2. 判断: 判断是否存在这个员工, 如果存在, 组装登录成功信息
        if(e != null){
            log.info("登录成功, 员工信息: {}", e);
            //生成JWT令牌
            Map<String, Object> claims = new HashMap<>();
            claims.put("id", e.getId());
            claims.put("username", e.getUsername());
            String jwt = JwtUtils.generateToken(claims);

            return new LoginInfo(e.getId(), e.getUsername(), e.getName(), jwt);
        }

        //3. 不存在, 返回null
        return null;
    }
```

**为什么 claims 里放 id 和 username**：令牌是后续请求的"身份证"，服务器校验通过之后要能回答"这是谁"——`id` 用来唯一定位员工，`username` 用来打日志、显示。所以登录成功时这两个字段必须装进去（本机实测把登录响应里的令牌中段解开，看到的正是 `{"id":1,"username":"shinaian","exp":1790736345}`，其中 `exp` 是 12 小时后）。

**令牌去哪儿**：函数返回值顺着 `LoginInfo` → Controller → `Result.success(info)` 一路回到前端，落在 `data.token` 里（接口文档规定）。前端把它存起来，之后每次请求放在**请求头 `token`** 里带上；服务端那一头"怎么接住并校验"，就是 83、84 篇用过滤器/拦截器要做的事。

## 小结

| 问题 | 答案 |
| --- | --- |
| 登录校验要办哪两件事？ | **登录标记**（登录成功后在后续每次请求都能拿到该标记，靠**会话技术**）+ **统一拦截**（过滤器 Filter / 拦截器 Interceptor） |
| 什么是会话/会话跟踪？ | 会话是"打开浏览器访问资源到一方断开"之间可包含多次请求响应的过程；会话跟踪是维护浏览器状态的方法——**识别多次请求是否来自同一浏览器**，在同一次会话的多次请求间共享数据 |
| 三种会话跟踪方案？ | **Cookie**（客户端）、**Session**（服务端）、**令牌**（状态打包给客户端自己带） |
| Cookie 的原理与优缺点？ | 响应头 `Set-Cookie: name=value` 写、请求头 `Cookie: name=value` 带；优点：HTTP 协议支持；缺点：移动端 APP 无法使用、不安全（可禁用）、不能跨域（跨域看协议/IP/端口三个维度） |
| Session 的原理与优缺点？ | **底层基于 Cookie**：响应 `Set-Cookie: JSESSIONID=1`、请求带 `Cookie: JSESSIONID=1`，服务器按编号找自己的那格 Session；优点：存服务端、安全；缺点：**集群下不能直接用**（负载均衡换台机器就找不到）+ Cookie 的缺点 |
| 令牌方案的优缺点？ | 优点：支持 PC 端与移动端、解决集群认证问题、减轻服务端存储压力；缺点：需要自己实现（**主流方案**） |
| JWT 是什么？ | JSON Web Token（<https://jwt.io/>）：简洁、自包含，在通信双方以 json 格式安全传输信息的格式 |
| JWT 三段结构？ | **Header**（令牌类型、签名算法）、**Payload**（自定义信息、默认信息如 `exp`）、**Signature**（把 header、payload 加秘钥按算法算出的**数字签名**，防篡改） |
| Base64 是什么？ | 基于 64 个可打印字符表示二进制数据的**编码方式**——不是加密，令牌前两段谁都能解开，所以不能放敏感信息 |
| 生成与解析怎么写？ | 依赖 `io.jsonwebtoken:jjwt:0.9.1`；生成 `Jwts.builder().signWith(HS256, 秘钥).addClaims(claims).setExpiration(日期).compact()`；解析 `Jwts.parser().setSigningKey(秘钥).parseClaimsJws(token).getBody()` |
| 什么时候解析会失败？ | **被篡改** 或 **过期**；秘钥必须与生成时配套（不配套/被改 → `SignatureException`，过期 → `ExpiredJwtException`） |
| 本机实测看到了什么？ | Cookie：`Set-Cookie: login_username=itheima`；Session：`Set-Cookie: JSESSIONID=…; HttpOnly`，带 JSESSIONID 取到 `tom`、不带取到 `null`；生成令牌成功；解析旧令牌报 `ExpiredJwtException: JWT expired at 2024-11-24T17:16:18Z` |
| 登录成功时怎么用？ | 把 `id`、`username` 放进 `claims` → `JwtUtils.generateToken(claims)` 生成 → 随 `LoginInfo`（`data.token`）返回；前端之后每次请求放在请求头 `token` 里（接口文档约定） |

## 相关

- [上一篇：登录功能](/posts/编程学习/javaweb学习笔记/81-登录功能/)
- [下一篇：过滤器Filter](/posts/编程学习/javaweb学习笔记/83-过滤器filter/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. **登录校验的两件事**：**登录标记**——登录成功之后，在后续的每一次请求中都可以获取到该标记（靠**会话技术**）；**统一拦截**——在请求进业务之前统一检查（靠**过滤器 Filter / 拦截器 Interceptor**，83、84 篇）
2. **会话与会话跟踪 + 三种方案**：会话是"用户打开浏览器访问资源、会话建立，直到有一方断开连接"的过程，一次会话可包含**多次请求和响应**；会话跟踪是一种维护浏览器状态的方法——服务器要**识别多次请求是否来自同一浏览器**，以便在同一次会话的多次请求间**共享数据**；三种方案是 **Cookie**（客户端会话跟踪技术）、**Session**（服务端会话跟踪技术）、**令牌技术**（课程选的**主流方案**）
3. **Cookie 的原理与优缺点**：原理是响应头 `Set-Cookie: name=value` 写标记、之后请求头 `Cookie: name=value` 自动带上；优点：HTTP 协议中支持的技术；缺点：移动端 APP 无法使用、不安全（用户可以自己禁用 Cookie）、不能跨域（跨域区分**协议、IP/域名、端口**三个维度）
4. **Session 的原理与优缺点**：底层**基于 Cookie**——服务器创建 Session 后返回 `Set-Cookie: JSESSIONID=…`，浏览器之后带着它，服务器按编号找到自己那格 Session；优点：存储在服务端，安全；缺点：**服务器集群环境下无法直接使用**（负载均衡到另一台机器就找不到），以及 Cookie 的那些缺点
5. **令牌方案的优缺点**：优点——支持 PC 端与移动端、解决集群环境下的认证问题、减轻服务器端存储压力；缺点——**需要自己实现**
6. **JWT 的三段结构与各自内容**：**Header**（头）记录令牌类型、签名算法；**Payload**（有效载荷）携带自定义信息与默认信息（如 `exp` 过期时间）；**Signature**（签名）防止 Token 被篡改——把 header、payload 融入并加入指定秘钥，用指定签名算法计算而来
7. **Base64 是什么、为什么不能放敏感信息**：Base64 是基于 64 个可打印字符（A-Z a-z 0-9 + /）表示二进制数据的**编码方式**（不是加密）；本机实测把令牌中段解开就能看到 `{"id":1,"username":"shinaian","exp":…}`，所以令牌里不能放密码等敏感信息，JWT 防的是篡改不是偷看
8. **生成与解析的写法**：依赖 `io.jsonwebtoken:jjwt:0.9.1`；生成 `Jwts.builder().signWith(SignatureAlgorithm.HS256, 秘钥).addClaims(claims).setExpiration(日期).compact()`；解析 `Jwts.parser().setSigningKey(秘钥).parseClaimsJws(token).getBody()`
9. **什么情况解析失败、本机实测证据**：**被篡改**或**过期失效**；秘钥必须与生成时**配套**（不配套或被改 → `SignatureException`）；本机实测解析课程里 2024 年生成的旧令牌报 `io.jsonwebtoken.ExpiredJwtException: JWT expired at 2024-11-24T17:16:18Z.`（换了新生成的令牌就正常）
10. **登录成功后生成令牌**：把 `id`、`username` 放进 `claims` → 调工具类 `JwtUtils.generateToken(claims)`（HS256、12 小时过期）→ 随 `LoginInfo` 的第四个参数返回，最终落在响应 `data.token` 里

### 二、裸写题

- [ ] **2-1 写一个"生成令牌"的工具方法**
  需求：写一个静态方法，接收一个 Map（里面是自定义信息，比如 id、username），生成并返回一个令牌字符串。要求：用 HS256 算法签名（秘钥自己定一个字符串常量），带上自定义信息，并且**12 小时后过期**。
  （练习文件 `test_82_JWT生成与解析.java` 的题目2-1 里给了写作区，pom 依赖片段也在素材里。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：引入 JWT 的库之后，用官方的构造器一步步"拼"出令牌——声明算法与秘钥 → 放自定义信息 → 放过期时间 → 打包成字符串
  > **二级 · 方法**：`Jwts.builder().signWith(SignatureAlgorithm.HS256, 秘钥).addClaims(claims).setExpiration(new Date(System.currentTimeMillis() + 12*60*60*1000)).compact()`；日期用 `java.util.Date`；秘钥写成一个 `private static final String` 常量
  > **三级 · 骨架**：`public static String generateToken(Map<String, Object> ____) { return Jwts.builder().signWith(SignatureAlgorithm.____, ____).addClaims(____).setExpiration(new Date(System.currentTimeMillis() + ____)).____(); }`

  > [!TIP]- 参考答案（做完再点开）
  > ```java
  > public class JwtUtils {
  >
  >     private static final String SECRET_KEY = "aXRoZWltYQ=="; // 秘钥
  >     private static final long EXPIRATION_TIME = 12 * 60 * 60 * 1000; // 12小时
  >
  >     /**
  >      * 生成JWT令牌
  >      * @param claims 令牌中包含的信息
  >      * @return 生成的JWT令牌字符串
  >      */
  >     public static String generateToken(Map<String, Object> claims) {
  >         return Jwts.builder()
  >                 .signWith(SignatureAlgorithm.HS256, SECRET_KEY)
  >                 .addClaims(claims)
  >                 .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
  >                 .compact();
  >     }
  > }
  > ```
  > 检查点：① `compact()` 不能漏——它才是真正"打包出字符串"的那一步；② 过期时间是 `new Date(System.currentTimeMillis() + 毫秒数)`，别把参数写成"当前时间"（那就立刻过期了）；③ 秘钥是**一段 Base64 字符串**（jjwt 0.9.1 对 String 形态的秘钥有这个要求），解析时必须用**同一段**。

- [ ] **2-2 写一个"解析令牌"的工具方法**
  需求：写一个静态方法，接收一个令牌字符串，**解析并返回里面的自定义信息**。另外回答两个问题：
  ① 解析时什么情况会失败、分别抛什么异常？
  ② 本机解析一个 2024 年生成的旧令牌时报了 `ExpiredJwtException`，这说明什么？
  （练习文件 `test_82_JWT生成与解析.java` 的题目2-2 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：解析是生成的反过程——拿到解析器、告诉它用哪把秘钥去核签名、解析、把有效载荷取出来
  > **二级 · 方法**：`Jwts.parser().setSigningKey(秘钥).parseClaimsJws(token).getBody()`；返回值类型是 `Claims`（本质上还是个 Map，`get("id")` 能取值）；签名校验和有效期校验都在 `parseClaimsJws` 这一步发生
  > **三级 · 骨架**：`public static Claims parseToken(String token) throws Exception { return Jwts.parser().setSigningKey(____).____(token).____(); }`

  > [!TIP]- 参考答案（做完再点开）
  > ```java
  >     /**
  >      * 解析JWT令牌
  >      * @param token 要解析的JWT令牌字符串
  >      * @return 包含令牌信息的Claims对象
  >      * @throws Exception 如果令牌无效或已过期，则抛出异常
  >      */
  >     public static Claims parseToken(String token) throws Exception {
  >         return Jwts.parser()
  >                 .setSigningKey(SECRET_KEY)
  >                 .parseClaimsJws(token)
  >                 .getBody();
  >     }
  > ```
  > ① 两种失败：**令牌被篡改**（内容改了任何字符）或**秘钥不配套** → 签名校验对不上，抛 `SignatureException`；**令牌过期失效** → 抛 `ExpiredJwtException`。
  > ② 说明那枚令牌的 `exp` 时间点已经过去，JWT 库在解析时**主动做了有效期校验**并把过期当成异常抛出来（原文：`io.jsonwebtoken.ExpiredJwtException: JWT expired at 2024-11-24T17:16:18Z.`）——所以课程里硬编码的那个旧 token 一跑就报错，换成刚生成的令牌就好。这也意味着"过期"这件事**不需要自己判断**，解析通过就说明令牌还在有效期内。

- [ ] **2-3 让登录成功后自动生成并返回令牌**
  需求：登录成功（用户名密码对得上）时，生成一枚令牌——令牌里带上这个员工的 id 和用户名；再把 id、用户名、姓名、令牌四样东西组装成登录结果返回。生成令牌的活儿交给 2-1 写的工具方法；秘钥、过期时长都在工具类里。
  （练习文件 `test_82_会话技术与JWT.java` 的题目2-3 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：在"查到员工之后、返回之前"插两步——① 准备自定义信息（Map，放 id、username）；② 调工具方法生成令牌
  > **二级 · 方法**：`Map<String, Object> claims = new HashMap<>();` + `claims.put("id", e.getId())`、`claims.put("username", e.getUsername())`；`String jwt = JwtUtils.generateToken(claims);`；最后 `new LoginInfo(e.getId(), e.getUsername(), e.getName(), jwt)`
  > **三级 · 骨架**：`Map<String, Object> claims = new ____<>(); claims.put("____", e.getId()); claims.put("____", e.getUsername()); String jwt = JwtUtils.____(claims); return new LoginInfo(____, ____, ____, jwt);`

  > [!TIP]- 参考答案（做完再点开）
  > ```java
  >     @Override
  >     public LoginInfo login(Emp emp) {
  >         //1. 调用mapper接口, 根据用户名和密码查询员工信息
  >         Emp e = empMapper.selectByUsernameAndPassword(emp);
  >
  >         //2. 判断: 判断是否存在这个员工, 如果存在, 组装登录成功信息
  >         if(e != null){
  >             log.info("登录成功, 员工信息: {}", e);
  >             //生成JWT令牌
  >             Map<String, Object> claims = new HashMap<>();
  >             claims.put("id", e.getId());
  >             claims.put("username", e.getUsername());
  >             String jwt = JwtUtils.generateToken(claims);
  >
  >             return new LoginInfo(e.getId(), e.getUsername(), e.getName(), jwt);
  >         }
  >
  >         //3. 不存在, 返回null
  >         return null;
  >     }
  > ```
  > 检查点：① claims 里放的是**数据库里查到的员工**的 id/username（`e`），不是请求里传进来的对象；② 本机实测登录响应里的令牌中段解出来就是 `{"id":1,"username":"shinaian","exp":1790736345}`（`exp` = 生成时刻 + 12 小时）——claims 放什么，令牌里就能解出什么；③ 令牌最终随接口响应 `data.token` 回到前端，之后每次请求放到请求头 `token` 里（接口文档约定）。

- [ ] **2-4 把三种会话跟踪方案讲清楚，并说明课程为什么选令牌**
  需求：PPT 第 21 页把三种方案摆在一起比较，其中一种被标了"主流方案"。请分别写清楚：
  ① 三种方案各自的**原理**（标记存在哪、浏览器怎么把它带回来、服务器怎么认）；
  ② 三种方案各自的**优缺点**；
  ③ 课程为什么选第三种？（提示：想想移动端、服务器集群、服务端存储这三件事）
  另外补一句：本机实测里 `GET /s2` 一次带 `JSESSIONID`、一次不带，两次结果有什么不同？这说明了什么？
  （练习文件 `test_82_会话技术与JWT.java` 的题目2-4 里给了写作区。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：按"数据存在哪"给三种方案分个类——存浏览器、存服务器、存在令牌自己身上，然后顺着"登录之后谁记住、请求怎么带回来"把原理说一遍
  > **二级 · 方法**：关键词——`Set-Cookie` / `Cookie`（响应头写、请求头带）、`JSESSIONID`（Session 的底层是 Cookie）、集群/负载均衡（换台机器就找不到 Session）、令牌自包含 + 签名（服务端不存东西）
  > **三级 · 骨架**：① Cookie：数据存____，服务器用____头写、浏览器用____头带；② Session：数据存____，靠____这个 Cookie 找到它；③ 令牌：数据在____，服务器只负责____和____。优缺点各写 2~3 条，选令牌的理由按"____端、____环境、服务端____"三点说

  > [!TIP]- 参考答案（做完再点开）
  > ① **原理**：
  > - **Cookie**：服务器在响应头里写 `Set-Cookie: name=value`，浏览器存下来，之后每次请求自动在请求头 `Cookie: name=value` 里带回，服务器从请求头读取；
  > - **Session**：数据存在**服务端**，服务器创建 Session 后返回 `Set-Cookie: JSESSIONID=1`（编号），浏览器之后带着 `Cookie: JSESSIONID=1` 来，服务器按编号找到自己的那格 Session——**底层基于 Cookie**；
  > - **令牌**：登录成功时服务器**生成**令牌（里面装着自定义信息 + 签名）交给客户端保存，之后客户端每次请求把令牌放在请求头里带上，服务器**校验**（签名、有效期）即可，自己什么都不用存。
  > ② **优缺点**：
  > - Cookie：优点——HTTP 协议中支持的技术；缺点——移动端 APP 无法使用、不安全（用户可以自己禁用 Cookie）、不能跨域；
  > - Session：优点——存储在服务端，安全；缺点——服务器**集群环境下无法直接使用**（负载均衡换台机器就找不到），且 Cookie 的缺点（移动端、可禁用、跨域）它也跑不掉；
  > - 令牌：优点——支持 PC 端与移动端、解决集群环境下的认证问题、减轻服务器端存储压力；缺点——需要自己实现。
  > ③ 选令牌的理由就是它那三条优点：**移动端**（APP 里没有 Cookie 机制，但能存字符串）、**集群**（任何一台服务器拿同一把秘钥都能独立校验，不用共享 Session）、**服务端存储**（服务器不存会话数据，压力小）；代价是"需要自己实现"——这个实现就是 JWT（jjwt 库 + `Jwts` 工具类）。
  > 补充：`GET /s2` 带 `JSESSIONID` 时返回 `{"code":1,"msg":"success","data":"tom"}`（取到了 Session 里存的用户名），不带时返回 `{"code":1,"msg":"success","data":null}`（拿不到）。同一个 JSESSIONID 能换到数据、换一个或没有就换不到——**说明服务器就是靠 Cookie 里这个编号认人**，Session 离了 Cookie 就找不到自己那格数据。

### 三、综合题

- [ ] **3-1 做一遍"令牌的一生"实验：生成 → 解析 → 过期 / 篡改，再接进登录接口**
  这一题把本篇串起来，重点是**把结论用真机跑出来**。
  1. 建 `JwtUtils` 工具类：写生成令牌、解析令牌两个静态方法（HS256 + 秘钥常量 + 12 小时过期）；
  2. 写一个测试方法生成令牌（自定义信息里放 `id=1`、`username=admin`，**过期时间先设成 1 分钟**，方便做第 5 步），运行，把输出的令牌抄下来；
  3. 把令牌按 `.` 切开数一数有几段，并把**中段**按 Base64 解开，把解出来的 JSON 抄下来（对照：这就是 Payload）；
  4. 用同一个秘钥解析刚才生成的令牌，把控制台打印出的内容抄下来；
  5. 等一分钟后再解析同一枚令牌（或者直接解析课程 `JwtTest` 里那个 2024 年的旧令牌），把异常类名和异常信息的**前两行**原样抄下来；
  6. 把令牌的最后**一个字符改掉**（模拟篡改），再解析一次，记下抛出的异常；再换成一把**不一样的秘钥**解析，记下抛出的异常——这两次应该是同一个异常类；
  7. 把过期时间改成 12 小时，接进登录接口：启动应用，发一次正确的登录请求，把响应里的 `token` 抄进练习文件；
  8. 回答下面的问题。

  （练习文件 `test_82_JWT生成与解析.java` 的"综合题"一段里按第 2～6 步给了记录区，`test_82_会话技术与JWT.java` 里给了第 1、7 步的写作区。）

  回答：① 为什么改动令牌里的**一个字符**就会解析失败？② 把令牌中段 Base64 解出来能看到 `id`、`username`，那**能不能**把密码也放进令牌里？为什么？③ 解析通过这件事能同时证明哪两件事？

  **涉及知识点**

  | 知识点 | 在这里的应用 |
  | --- | --- |
  | JWT 三段结构（PPT 25） | 第 3 步——数段数、解开前两段看内容 |
  | 签名防篡改（PPT 25、27） | 第 6 步——改字符/换秘钥都解析失败 |
  | 过期会解析失败（PPT 27） | 第 5 步——`ExpiredJwtException` 现场 |
  | jjwt 依赖与 `Jwts` 写法（PPT 26） | 第 1、2、4 步——`Jwts.builder()` / `Jwts.parser()` |
  | 登录成功后生成令牌（PPT 28） | 第 1、7 步——claims 放 id/username，随 `LoginInfo` 返回 |
  | 令牌是"自包含"的（PPT 21、25） | 第 8 步——服务端不存数据也敢信令牌的原因 |

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：先生成一枚"短命"的令牌把三个实验做完（正常解析、过期、篡改），再回到登录接口上看真实业务里的令牌长什么样
  > **二级 · 方法**：生成 `Jwts.builder().signWith(SignatureAlgorithm.HS256, 秘钥).addClaims(claims).setExpiration(new Date(...)).compact()`；解析 `Jwts.parser().setSigningKey(秘钥).parseClaimsJws(token).getBody()`；解开中段用 Base64 解码工具（在线 Base64 解码或 IDE 里看）；过期令牌在课程 `JwtTest` 里就有现成的
  > **三级 · 骨架**：① `String jwt = JwtUtils.____(claims);`；③ Base64 解码中段 → `{"id":1,"username":"admin","exp":____}`；④ `Claims claims = JwtUtils.____(token);`；⑤ 异常 `io.jsonwebtoken.____JwtException`；⑥ 改一个字符 / 换秘钥 → `____Exception`；⑦ `POST /login` 响应 `data.token`

  > [!TIP]- 参考答案（做完再点开）
  > 1. `JwtUtils` 见题目2-1、2-2 的答案（秘钥 `aXRoZWltYQ==`、12 小时过期，两个 `static` 方法）。
  > 2. 生成方法可参考课程的 `JwtTest.testGenerateJwt`（`id=1`、`username=admin`、过期 1 分钟）。**本机实测**输出：
  >    ```text
  >    eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImV4cCI6MTc5MDY5MzM0Nn0.BSgyQPMJ6PV1atT0j6uSkFoLDqsiBWawaoqek_hqJjI
  >    ```
  > 3. 三段（用 `.` 分隔）。中段 Base64 解开是：
  >    ```json
  >    {"id":1,"username":"admin","exp":1790693346}
  >    ```
  >    头段解开是 `{"alg":"HS256"}`；第三段是签名（不可读、供比对）。
  > 4. 用同一把秘钥解析，`System.out.println(claims)` 打印类似 `{id=1, username=admin, exp=1790693346}`（`Claims` 的 `toString` 是 Map 样式）——取值得用 `claims.get("id")`。
  > 5. **本机实测**（解析课程里 2024 年生成的旧令牌）：
  >    ```text
  >    io.jsonwebtoken.ExpiredJwtException: JWT expired at 2024-11-24T17:16:18Z.
  >    Current time: 2026-09-29T22:48:07Z, a difference of 58253509112 milliseconds.
  >    ```
  >    说明 JWT 库在解析时会把"过期"当异常抛出来；课程里那个硬编码 token 早就过期，换成刚生成的就正常。
  > 6. 改一个字符、或换一把秘钥，都会抛 **`SignatureException`**（签名与内容/秘钥对不上）。把这两次实验对比着看：**过期**和**签名不对**是两种不同的失败，分别对应 `ExpiredJwtException` 与 `SignatureException`。
  > 7. 把过期时间改成 `12 * 60 * 60 * 1000` 后接进登录业务（见题目2-3 答案），**本机实测**登录响应：
  >    ```text
  >    {"code":1,"msg":"success","data":{
  >      "id":1,"username":"shinaian","name":"施耐庵",
  >      "token":"eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJzaGluYWlhbiIsImV4cCI6MTc5MDczNjM0NX0.zHEWXHS6ZSoz8L2klv-8fFZQODftFlp4r_Ps1jGJFic"}}
  >    ```
  >    中段解出来是 `{"id":1,"username":"shinaian","exp":1790736345}`——claims 里放什么，令牌里就能解出什么。
  > 8. 回答：
  >    ① 第三段签名是拿"`header.payload` + 秘钥"按 HS256 算出来的。令牌里改了哪怕一个字符，服务器重新计算时用的"原料"就变了，算出来的签名与令牌里带着的第三段**对不上**——于是判定"被篡改过"，直接解析失败。改动越细微越说明问题：**签名保护的是完整性**，不是保密性。
  >    ② **不能**。Base64 是编码不是加密，令牌前两段**谁都能解开**（实验第 3 步就解开了）；把密码放进去等于把密码公开传送和公开存储。课程只放 `id` 与 `username` 正是这个道理——这两个信息即便被人看到，也不足以直接登录；真正的敏感数据（密码、身份证号）不放令牌，要放也只能放"服务端拿着能查到的标识"。
  >    ③ 解析通过能同时证明两件事：**令牌确实由持有正确秘钥的服务器签发**（签名对得上，没被篡改过），以及**令牌还没过期**（`exp` 还没到）。这正是"服务器不存任何会话数据、也敢相信请求者身份"的全部依据——也就是令牌方案"减轻服务端存储压力 / 解决集群认证"的底气。
