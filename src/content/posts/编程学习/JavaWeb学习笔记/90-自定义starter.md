---
title: 自定义starter
published: 2026-09-29
description: 把前两篇学的起步依赖与自动配置合起来用一次——做一个自己的公共组件 starter（依赖管理功能 + 自动配置功能），按「建 starter 模块、建 autoconfigure 模块、写自动配置类并登记到 imports 文件」三步落地，附本机 install 两个模块后只加一行依赖就能注入工具类的实测，末尾交代 3.2.x 与老版本读文件方式的差异
tags:
  - JavaWeb
  - SpringBoot
  - Maven
image: https://img.tsh520.cn/file/blog/post-covers/javaweb-90-custom-starter.webp
order: 90
---

[88 篇](/posts/编程学习/javaweb学习笔记/88-springboot配置优先级与bean管理/)讲了 bean 怎么声明（`@Component` / `@Bean`），[89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)把 SpringBoot 的自动配置拆到了源码级（`@Import` → `AutoConfigurationImportSelector` → `.imports` 文件 → `@Conditional` 条件装配）。这一篇（PPT 第 34～36 页）把这两样合起来用一次：**自己也做一个 starter**——让别的工程"引一行依赖 + 写几行配置"就能用上我们的公共组件。

## 这一节的场景（PPT 第 34～35 页）

第 34 页把小节页（起步依赖 / 自动配置 / 实现方案 / 源码跟踪 / **自定义 starter**）又摆了一遍，第 35 页给出真实场景：

> **场景**：在实际开发中，经常会定义一些**公共组件**，提供给各个项目团队使用。而在 SpringBoot 的项目中，一般会将这些公共组件封装为 SpringBoot 的 **starter**（包含了**起步依赖**和**自动配置**的功能）。

这句"包含了起步依赖和自动配置的功能"就是全篇的骨架——一个 starter 之所以"引进来就能用"，靠的就是**两件事一起做**：

| 能力 | 干什么 | 落在哪 |
| --- | --- | --- |
| **依赖管理功能** | 把公共组件需要的坐标（含第三方 SDK、支撑库）一起带进来 | starter 模块自己的 `pom.xml` |
| **自动配置功能** | 让组件里的类不用使用方写配置就进 IOC 容器 | 自动配置类 + `.imports` 名单文件 |

PPT 第 35 页顺带点了一句：不管是 **SpringBoot 官方**提供的 starter，还是**其它技术**提供的 starter，都是这两块能力。所以我们天天在用的 `spring-boot-starter-web`、`mybatis-spring-boot-starter`、`pagehelper-spring-boot-starter`（[89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)那张依赖列表里的那些）——它们内部的结构，跟我们马上要造的是一回事，只是做的东西不一样。

## 需求与目标（PPT 第 36 页）

> **需求**：自定义 `aliyun-oss-spring-boot-starter`，完成阿里云 OSS 操作工具类 `AliyunOSSOperator` 的自动配置。
>
> **目标**：引入起步依赖引入之后，要想使用阿里云 OSS，**注入 `AliyunOSSOperator` 直接使用即可**。

这个"直接使用即可"是有分量的：使用方**不用**把工具类的源码拷进自己的工程、**不用**给它加 `@Component`、**不用**写任何配置类——只写一行依赖、配几行参数、然后 `@Autowired`。

拿我们自己的经历对照一下就明白这有多省事：同样的 OSS 工具类，[73 篇](/posts/编程学习/javaweb学习笔记/73-阿里云oss与参数配置化/)里的做法是把它**连同源码一起放进工程**，靠类上的 `@Component` 和 `@ConfigurationProperties(prefix = "aliyun.oss")` 生效；现在要把它搬进 starter，让"别的团队不用抄代码"。

## 三个步骤（PPT 第 36 页）

PPT 给出的步骤只有三条：

> 1. 创建 **`aliyun-oss-spring-boot-starter`** 模块；
> 2. 创建 **`aliyun-oss-spring-boot-autoconfigure`** 模块，在 **starter 中引入该模块**；
> 3. 在 **`aliyun-oss-spring-boot-autoconfigure`** 模块中定义自动配置功能，并定义自动配置文件 **`META-INF/spring/xxxx.imports`**。

配上第 36 页那两个框，两个模块的分工一目了然：

```text
aliyun-oss-spring-boot-starter         ← 依赖管理功能（只管"带什么依赖进来"）
        │  依赖
        ▼
aliyun-oss-spring-boot-autoconfigure   ← 自动配置功能（放工具类、参数类、自动配置类、imports 文件）
```

**为什么拆成两个模块？** 这是 starter 的通用结构（官方 starter 也是这么分的）：`starter` 只负责"**打包依赖**"（它也常常只有一份 pom，连一个 Java 类都没有），`autoconfigure` 负责"**自动配置逻辑**"。这样职责清楚、将来要调整"带哪些依赖"时不用碰自动配置代码；命名上也遵循惯例——`xxx-spring-boot-starter` 与 `xxx-spring-boot-autoconfigure`（官方 Starter 是 `spring-boot-starter-xxx`，第三方一般写成 `xxx-spring-boot-starter`，正好和我们这里一致）。

## 动手：两个模块长什么样

### 第一步：starter 模块（依赖管理功能）

`aliyun-oss-spring-boot-starter/pom.xml`——注意它**只有依赖，没有代码**：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.10</version>
    <relativePath/> <!-- lookup parent from repository -->
</parent>
<groupId>com.aliyun.oss</groupId>
<artifactId>aliyun-oss-spring-boot-starter</artifactId>
<version>0.0.1-SNAPSHOT</version>
...
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>

    <dependency>
        <groupId>com.aliyun.oss</groupId>
        <artifactId>aliyun-oss-spring-boot-autoconfigure</artifactId>
        <version>0.0.1-SNAPSHOT</version>
    </dependency>
</dependencies>
```

关键就是最后那个依赖——**starter 引入 autoconfigure**，于是使用方引 starter 时，靠 Maven 的**依赖传递**（[89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)起步依赖那一节）把 autoconfigure 模块一路带过去，连带 autoconfigure 自己依赖的阿里云 SDK 也一起到位。

### 第二步：autoconfigure 模块（自动配置功能）

`aliyun-oss-spring-boot-autoconfigure/pom.xml` 里装着组件真正需要的东西：

```xml
<groupId>com.aliyun.oss</groupId>
<artifactId>aliyun-oss-spring-boot-autoconfigure</artifactId>
<version>0.0.1-SNAPSHOT</version>
...
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
    </dependency>

    <!--阿里云OSS依赖-->
    <dependency>
        <groupId>com.aliyun.oss</groupId>
        <artifactId>aliyun-sdk-oss</artifactId>
        <version>3.17.4</version>
    </dependency>
    <dependency>
        <groupId>javax.xml.bind</groupId>
        <artifactId>jaxb-api</artifactId>
        <version>2.3.1</version>
    </dependency>
    <dependency>
        <groupId>javax.activation</groupId>
        <artifactId>activation</artifactId>
        <version>1.1.1</version>
    </dependency>
    <!-- no more than 2.3.3-->
    <dependency>
        <groupId>org.glassfish.jaxb</groupId>
        <artifactId>jaxb-runtime</artifactId>
        <version>2.3.3</version>
    </dependency>
</dependencies>
```

这正是"**依赖管理功能**"的实质：那"三个 jaxb 兄弟"是 [73 篇](/posts/编程学习/javaweb学习笔记/73-阿里云oss与参数配置化/)里必须自己补上的坐标——现在它们被**封在 starter 里**，使用方再也不用记这一串。

### 第三步：写作三个类 + 一个名字很长的文件

`autoconfigure` 模块里一共三个 Java 文件：

**① 工具类 `AliyunOSSOperator`**——从工程里搬过来，但**去掉 `@Component`**，改成**构造方法接收参数对象**：

```java
package com.aliyun.oss;

public class AliyunOSSOperator {

    private AliyunOSSProperties aliyunOSSProperties;

    public AliyunOSSOperator(AliyunOSSProperties aliyunOSSProperties) {
        this.aliyunOSSProperties = aliyunOSSProperties;
    }

    public String upload(byte[] content, String originalFilename) throws Exception {
        String endpoint = aliyunOSSProperties.getEndpoint();
        String bucketName = aliyunOSSProperties.getBucketName();
        String region = aliyunOSSProperties.getRegion();
        // ... 后面就是原来那套 OSS 上传逻辑（创建 OSSClient、putObject、返回访问地址）
    }
}
```

**② 参数类 `AliyunOSSProperties`**——同样**去掉 `@Component`**，只保留绑定前缀的注解（它怎么变成 bean，交给下面的自动配置类负责）：

```java
package com.aliyun.oss;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "aliyun.oss")
public class AliyunOSSProperties {
    private String endpoint;
    private String bucketName;
    private String region;
    // ... getter / setter（课程代码里是手写的，也可以用 Lombok 的 @Data）
}
```

**③ 自动配置类 `AliyunOSSAutoConfiguration`**——这是全篇的核心，只有短短几行：

```java
package com.aliyun.oss;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AliyunOSS的自动配置类
 */
@EnableConfigurationProperties(AliyunOSSProperties.class)
@Configuration
public class AliyunOSSAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public AliyunOSSOperator aliyunOSSOperator(AliyunOSSProperties aliyunOSSProperties){
        return new AliyunOSSOperator(aliyunOSSProperties);
    }

}
```

三行注解各司其职，正好把 [88 篇](/posts/编程学习/javaweb学习笔记/88-springboot配置优先级与bean管理/)与 [89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)的知识点用齐了：

| 注解 / 位置 | 作用 | 来自哪篇 |
| --- | --- | --- |
| `@Configuration` | 自动配置类本身就是"造 bean 的配置类" | 88 篇（第三方 Bean 一节） |
| `@EnableConfigurationProperties(AliyunOSSProperties.class)` | 让参数类成为 bean 并能绑定配置文件里 `aliyun.oss` 前缀的值——**替代原来类上的 `@Component`** | 89 篇（自动配置） |
| `@Bean` + 形参 | 把工具类的对象交给容器，参数对象由容器按类型注入 | 88 篇（`@Bean` 的两个细节） |
| `@ConditionalOnMissingBean` | 容器里没有 `AliyunOSSOperator` 时才补一个——使用方自己定义过就让位 | 89 篇（`@Conditional` 条件装配，本篇末尾本机实测过） |

**④ 那个名字很长的文件**——自动配置类写好了还不够，SpringBoot 不认识它。按 [89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)源码跟踪的结论，自动配置类必须登记在约定文件里：

```text
src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

文件内容只有一行（全类名）：

```text
com.aliyun.oss.AliyunOSSAutoConfiguration
```

> [!IMPORTANT]
> 这个文件的**路径一个字都不能改**：目录是 `META-INF/spring/`，文件名是 `org.springframework.boot.autoconfigure.AutoConfiguration.imports`——SpringBoot 就是按这个名字去 jar 包里找的（[89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)里 `AutoConfigurationImportSelector` 读名单那一行，找不到时的报错信息直接把这个文件名印在日志里）。

## 使用方怎么用（只做三件事）

starter 装好之后，使用者（测试工程 `springboot-autoconfiguration-test`）只做三件事：

```xml
<!-- ① pom.xml 里加一行依赖 -->
<dependency>
    <groupId>com.aliyun.oss</groupId>
    <artifactId>aliyun-oss-spring-boot-starter</artifactId>
    <version>0.0.1-SNAPSHOT</version>
</dependency>
```

```yaml
# ② application.yml 里配三项参数（前缀就是参数类上绑定的 aliyun.oss）
aliyun:
  oss:
    endpoint: https://oss-cn-beijing.aliyuncs.com
    bucketName: java-ai
    region: cn-beijing
```

```java
// ③ 直接注入，直接用
@RestController
public class UploadController {

    @Autowired
    private AliyunOSSOperator aliyunOSSOperator;

    @GetMapping("/check")
    public String check() {
        return "AliyunOSSOperator 已自动装配: " + (aliyunOSSOperator != null) + " , 实例: " + aliyunOSSOperator;
    }
}
```

注意③里那个 `AliyunOSSOperator` 的**类型来自 starter 的包**（`com.aliyun.oss.AliyunOSSOperator`）——使用方的工程里**没有这个类的源码**，也没有任何 `@Component`、`@Configuration`、`@Import`。它为什么能注入？全靠那行 `.imports` 登记——这就是"**自动配置**"四个字在项目里的实际兑现方式。

## 本机实测：install 两个模块 → 一行依赖 → 自动装配成功

这条链路在本机完整跑过一遍（本机的 Maven 本地仓库在 `A:\develop\maven\apache-maven-3.9.14\mvn_repo\`，不是默认的 `~/.m2`，所以打包时用 `-s` 指定了一份改过本地仓库位置的 `settings.xml`）：

```bash
# ① 先把 autoconfigure 模块装进本地仓库
mvn -s settings.xml clean install        # 在 aliyun-oss-spring-boot-autoconfigure 里执行
mvn -s settings.xml clean install        # 在 aliyun-oss-spring-boot-starter 里执行
```

控制台可以看到它被装进了本地仓库：

```text
Installing ...\aliyun-oss-spring-boot-autoconfigure-0.0.1-SNAPSHOT.jar to A:\develop\maven\apache-maven-3.9.14\mvn_repo\com\aliyun\oss\aliyun-oss-spring-boot-autoconfigure\0.0.1-SNAPSHOT\...
Installing ...\aliyun-oss-spring-boot-starter-0.0.1-SNAPSHOT.jar to A:\develop\maven\apache-maven-3.9.14\mvn_repo\com\aliyun\oss\aliyun-oss-spring-boot-starter\0.0.1-SNAPSHOT\...
```

（[26 篇](/posts/编程学习/javaweb学习笔记/26-maven依赖管理与生命周期/)讲过 `install` 与 `package` 的区别：`package` 只把 jar 打进 `target/`，`install` 还会把它**装进本地仓库**——别的工程要引用，就必须走 `install`。）

然后测试工程只加"一行依赖 + 三项配置 + 一次注入"（上面那三件事），启动后访问 `/check`：

```text
AliyunOSSOperator 已自动装配: true , 实例: com.aliyun.oss.AliyunOSSOperator@38ec98ee
```

这条链路把 starter 的**两个能力都验证了**：

1. **依赖管理功能**——测试工程的 pom 里只有一行 `aliyun-oss-spring-boot-starter`，`autoconfigure` 模块和它需要的阿里云 SDK、（当年要自己补的）jaxb 三兄弟全被依赖传递带了进来；
2. **自动配置功能**——`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 里那一行让 SpringBoot 读到了 `AliyunOSSAutoConfiguration`，再由 `@Bean` + `@EnableConfigurationProperties` 把工具类和配置对象都造好；`@ConditionalOnMissingBean` 则保证使用方自己定义了同类型 bean 时自动配置让位（[89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)那个实验做的就是这个对照）。

一句话：**测试工程里没有一行业务配置代码，`AliyunOSSOperator` 就能直接注入**——这正是 PPT 第 36 页那个目标"注入 `AliyunOSSOperator` 直接使用即可"的兑现。

## 版本说明：3.2.x 读 `.imports`，老版本读 `spring.factories`

[89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)已经提过一次，这里再按 starter 的角度强调一遍，因为**写自己的 starter 时这一步写错就全废**：

| SpringBoot 版本 | 自动配置类登记在哪 | 写法 |
| --- | --- | --- |
| **2.7.0 之前**（历史写法） | `META-INF/spring.factories` | 按 `org.springframework.boot.autoconfigure.EnableAutoConfiguration=` 这个键，把全类名写成一串（本项目不适用） |
| **2.7.0 及以后**（现在） | `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` | **一行一个全类名** |

**本机装的是 Spring Boot 3.2.x**（启动日志里是 `:: Spring Boot :: (v3.2.10)`，autoconfigure 模块的父工程也是 3.2.10），走的是 **`.imports`** 这一套；课程代码里用的就是这个文件。所以：以后看老资料、老视频里讲"在 `spring.factories` 里加一行"，那是 **2.7 之前**的做法，新版本按 `.imports` 写就好——两者是**版本替换**关系，不是"两个都要写"。

## 小结

| 问题 | 答案 |
| --- | --- |
| 为什么要自定义 starter？ | 把**公共组件**提供给各团队使用；SpringBoot 项目里一般把公共组件封装成 starter（含**起步依赖**与**自动配置**两个功能） |
| starter 的两个能力？ | **依赖管理功能**（把组件需要的坐标一起带进来）+ **自动配置功能**（使用方不写配置就能注入） |
| 本篇的需求与目标？ | 自定义 `aliyun-oss-spring-boot-starter` 完成 `AliyunOSSOperator` 的自动配置；目标是**引入依赖后注入 `AliyunOSSOperator` 直接使用** |
| 三个步骤？ | ① 创建 **starter 模块**；② 创建 **autoconfigure 模块**并在 starter 中**引入**它；③ 在 autoconfigure 中写**自动配置功能** + **`META-INF/spring/xxxx.imports`** 文件 |
| 两个模块怎么分工？ | starter **只有 pom**（依赖管理）；autoconfigure 放工具类、参数类、自动配置类与 `.imports` 文件（自动配置） |
| 自动配置类怎么写？ | `@Configuration` + `@EnableConfigurationProperties(XxxProperties.class)`，方法上 `@Bean` + `@ConditionalOnMissingBean`（使用方自己定义了就让位） |
| 工具类与参数类要改什么？ | **去掉 `@Component`**：工具类改成**构造方法**接收参数对象；参数类只保留 `@ConfigurationProperties(prefix = "...")`，由 `@EnableConfigurationProperties` 启用 |
| 那个文件叫什么？ | `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`，内容是一行**自动配置类全类名** |
| 使用方要写什么？ | ① pom 一行依赖；② yml 几行参数（前缀与参数类的 `prefix` 对应）；③ 直接 `@Autowired` 注入——**不写任何配置类** |
| 本机实测结果？ | autoconfigure 与 starter 两个模块 `mvn clean install` 装进本地仓库（`A:\...\mvn_repo\com\aliyun\oss\...`）；测试工程只加一行依赖 + 三项配置，`/check` 返回 **`AliyunOSSOperator 已自动装配: true , 实例: com.aliyun.oss.AliyunOSSOperator@38ec98ee`** |
| 版本差异？ | 本机 Spring Boot **3.2.x** 走 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`；**2.7.0 之前**的 `spring.factories` 是**历史写法** |

## 相关

- [上一篇：SpringBoot自动配置原理](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)
- [下一篇：Maven分模块设计与开发](/posts/编程学习/javaweb学习笔记/91-maven分模块设计与开发/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. **场景、做法与本篇目标**：开发中经常要定义**公共组件**提供给各个团队使用，SpringBoot 项目里一般把公共组件封装成 **starter**——它同时包含**起步依赖**（依赖管理功能）和**自动配置**（自动配置功能）两块能力，SpringBoot 官方与其它技术提供的 starter 都是这个结构；本篇的需求就是自定义 `aliyun-oss-spring-boot-starter` 完成 `AliyunOSSOperator` 的自动配置，目标是**引入起步依赖之后，注入 `AliyunOSSOperator` 直接使用即可**
2. **两个能力分别落在哪**：**依赖管理功能**在 starter 模块自己的 `pom.xml` 里（引入 autoconfigure 模块，靠依赖传递把 SDK 等一起带过去）；**自动配置功能**在 autoconfigure 模块里（自动配置类 + `.imports` 名单文件）
3. **三个步骤**：① 创建 **`aliyun-oss-spring-boot-starter`** 模块；② 创建 **`aliyun-oss-spring-boot-autoconfigure`** 模块，并在 starter 中**引入该模块**；③ 在 autoconfigure 模块中定义**自动配置功能**，并定义自动配置文件 **`META-INF/spring/xxxx.imports`**（完整文件名是 `org.springframework.boot.autoconfigure.AutoConfiguration.imports`）
4. **两个模块里各装什么**：starter 模块通常**只有 pom.xml**（可以一个类都没有）——依赖 `spring-boot-starter` 与 `aliyun-oss-spring-boot-autoconfigure`；autoconfigure 模块里装着工具类 `AliyunOSSOperator`、参数类 `AliyunOSSProperties`、自动配置类 `AliyunOSSAutoConfiguration` 和 `resources/META-INF/spring/` 下那个 `.imports` 文件，pom 里放组件真正需要的依赖（`aliyun-sdk-oss`、jaxb 三兄弟等）
5. **工具类与参数类的改造**：都**去掉 `@Component`**（第三方组件不能依赖使用方的组件扫描）；工具类改成**构造方法**接收 `AliyunOSSProperties`；参数类保留 `@ConfigurationProperties(prefix = "aliyun.oss")`，由自动配置类上的注解启用
6. **自动配置类的写法**：类上 **`@EnableConfigurationProperties(AliyunOSSProperties.class)`** + **`@Configuration`**；方法上 **`@Bean`** + **`@ConditionalOnMissingBean`**（使用方自己定义了同类型 bean 时自动配置让位）；方法形参写参数类型，容器按类型自动装配
7. **`.imports` 文件**：路径 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`，**一行一个自动配置类全类名**（`com.aliyun.oss.AliyunOSSAutoConfiguration`）；SpringBoot 启动时由 `AutoConfigurationImportSelector` 读它
8. **使用方要做的三件事**：① pom 里加**一行** starter 依赖；② `application.yml` 里配前缀对应的参数（`aliyun.oss.endpoint` / `bucketName` / `region`）；③ 直接 `@Autowired` 注入工具类——**不写任何 `@Component` / `@Configuration` / `@Import`**
9. **本机实测**：两个模块先 `mvn clean install` 装进本地仓库（本机仓库在 `A:\develop\maven\apache-maven-3.9.14\mvn_repo\`，所以打了 `-s settings.xml`）；测试工程只加一行依赖 + 三项配置后访问 `/check`，返回 **`AliyunOSSOperator 已自动装配: true , 实例: com.aliyun.oss.AliyunOSSOperator@38ec98ee`**——两个能力（依赖管理 + 自动配置）同时被验证
10. **版本差异**：**2.7.0 之前**自动配置类登记在 `META-INF/spring.factories`（按 `org.springframework.boot.autoconfigure.EnableAutoConfiguration=` 的键写），是**历史写法**；**本机 Spring Boot 3.2.x** 走的是 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`（一行一个全类名）

### 二、裸写题

- [ ] **2-1 把公共组件拆成两个模块，并说清各自装什么**
  需求：你的团队要发布一个公共组件给其它项目用，约定叫 `aliyun-oss-spring-boot-starter`。
  要求：
  ① 画出两个模块的名字与**依赖方向**，说明哪个模块管"带哪些依赖进来"、哪个模块管"使用方不写配置就能注入"；
  ② 写出 starter 模块的 pom **依赖部分**（要有哪两个依赖、其中哪个是本组件自己的模块）；
  ③ 说出组件真正需要的第三方坐标（阿里云 SDK 与"三个 jaxb 兄弟"）应该写在**哪个模块**的 pom 里，为什么；
  ④ 回答：为什么 starter 模块里通常一个 Java 类都没有？
  （写作区见练习文件 `test_90_自定义starter.txt` 的题目2-1。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：一个模块专门"带货"（依赖），一个模块专门"干活"（自动配置）；使用方只引"带货"的那个，另一个靠依赖传递跟进来
  > **二级 · 方法**：两个模块名 `aliyun-oss-spring-boot-starter` 与 `aliyun-oss-spring-boot-autoconfigure`（同 groupId、同版本）；starter 的依赖是 `spring-boot-starter` + `aliyun-oss-spring-boot-autoconfigure`；组件用到的第三方坐标（`com.aliyun.oss:aliyun-sdk-oss`、`javax.xml.bind:jaxb-api`、`javax.activation:activation`、`org.glassfish.jaxb:jaxb-runtime`）写在使用到它们的模块里
  > **三级 · 骨架**：
  > ```xml
  > <dependency>
  >     <groupId>org.springframework.boot</groupId>
  >     <artifactId>spring-boot-starter</artifactId>
  > </dependency>
  > <dependency>
  >     <groupId>com.aliyun.oss</groupId>
  >     <artifactId>____</artifactId>
  >     <version>0.0.1-SNAPSHOT</version>
  > </dependency>
  > ```

  > [!TIP]- 参考答案（做完再点开）
  > ① 模块结构与依赖方向：
  > ```text
  > aliyun-oss-spring-boot-starter         ← 依赖管理功能（管"带哪些依赖进来"）
  >         │ 依赖
  >         ▼
  > aliyun-oss-spring-boot-autoconfigure   ← 自动配置功能（管"不写配置就能注入"）
  > ```
  > ② starter 模块的依赖部分：
  > ```xml
  > <dependencies>
  >     <dependency>
  >         <groupId>org.springframework.boot</groupId>
  >         <artifactId>spring-boot-starter</artifactId>
  >     </dependency>
  >
  >     <dependency>
  >         <groupId>com.aliyun.oss</groupId>
  >         <artifactId>aliyun-oss-spring-boot-autoconfigure</artifactId>
  >         <version>0.0.1-SNAPSHOT</version>
  >     </dependency>
  > </dependencies>
  > ```
  > ③ 写在 **autoconfigure 模块**的 pom 里——因为工具类 `AliyunOSSOperator` 就在这个模块里编译，它用到的 `aliyun-sdk-oss`、jaxb 三兄弟必须在这个模块声明；使用方引 starter 时，这些坐标靠**依赖传递**自动到位（这也正是"依赖管理功能"的实现方式）。
  > ④ 因为它的职责只有"声明依赖"：starter 自己不写代码，引什么由 pom 说、干活的代码在 autoconfigure 模块里。这样分工的好处是职责清晰，将来要调整"带哪些依赖"不用碰自动配置代码。
  > 自查：把使用方工程里除 starter 之外的所有相关依赖删掉再编译——能编译过、能启动，就说明依赖被 starter 带进来了。

- [ ] **2-2 写这个公共组件的自动配置功能（三个类 + 一个文件）**
  需求：组件的工具类 `AliyunOSSOperator`（构造方法需要一个参数对象 `AliyunOSSProperties`，参数对象要能读到配置文件里 `aliyun.oss` 前缀下的 `endpoint` / `bucketName` / `region`）已经搬进 autoconfigure 模块了。要求写出自动配置功能：
  ① 工具类与参数类分别要怎么改（原来它们靠"交给容器管理"的注解生效，现在这条路不能走了）；
  ② 自动配置类（类上、方法上各写什么，方法里干什么，形参谁来传）；
  ③ 自动配置类的登记文件：**完整路径**与**文件内容**；
  ④ 回答：如果使用方自己在工程里定义了一个同类型的工具类 bean，你的 starter 会怎么表现？靠哪个注解保证的？
  （写作区见练习文件 `test_90_自定义starter.txt` 的题目2-2。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：第三方组件不能指望"被使用方扫描到"，所以两个类都别再标"交给容器管理"的注解——工具类改成构造接收参数对象，参数类只留"绑定前缀"，由自动配置类统一把它们造出来；最后别忘了登记文件，否则 SpringBoot 根本不知道有这个自动配置类
  > **二级 · 方法**：类上 `@EnableConfigurationProperties(AliyunOSSProperties.class)` + `@Configuration`（顺序无所谓）；方法上 `@Bean` + `@ConditionalOnMissingBean`，返回 `new AliyunOSSOperator(aliyunOSSProperties)`；登记文件 `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`，内容一行全类名；"让位"靠 `@ConditionalOnMissingBean`
  > **三级 · 骨架**：
  > ```java
  > public class AliyunOSSOperator {
  >     private AliyunOSSProperties aliyunOSSProperties;
  >     public AliyunOSSOperator(____ aliyunOSSProperties) { this.aliyunOSSProperties = aliyunOSSProperties; }
  > }
  >
  > @____(prefix = "aliyun.oss")
  > public class AliyunOSSProperties { private String endpoint; /* ... */ }
  >
  > @____(AliyunOSSProperties.class)
  > @____
  > public class AliyunOSSAutoConfiguration {
  >     @____
  >     @____
  >     public AliyunOSSOperator aliyunOSSOperator(____ props) { return new AliyunOSSOperator(props); }
  > }
  > ```
  > ③ 路径 `src/main/resources/____/____/org.springframework.boot.autoconfigure.____.imports`

  > [!TIP]- 参考答案（做完再点开）
  > ① 两个类的改造：**都去掉 `@Component`**——工具类改成构造方法接收参数对象；参数类只留 `@ConfigurationProperties(prefix = "aliyun.oss")`（以及 getter/setter），它由自动配置类上的 `@EnableConfigurationProperties` 启用：
  > ```java
  > public class AliyunOSSOperator {
  >     private AliyunOSSProperties aliyunOSSProperties;
  >     public AliyunOSSOperator(AliyunOSSProperties aliyunOSSProperties) {
  >         this.aliyunOSSProperties = aliyunOSSProperties;
  >     }
  >     public String upload(byte[] content, String originalFilename) throws Exception { /* OSS 上传逻辑 */ }
  > }
  > ```
  > ```java
  > @ConfigurationProperties(prefix = "aliyun.oss")
  > public class AliyunOSSProperties {
  >     private String endpoint;
  >     private String bucketName;
  >     private String region;
  >     // getter / setter
  > }
  > ```
  > ② 自动配置类：
  > ```java
  > package com.aliyun.oss;
  >
  > import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
  > import org.springframework.boot.context.properties.EnableConfigurationProperties;
  > import org.springframework.context.annotation.Bean;
  > import org.springframework.context.annotation.Configuration;
  >
  > @EnableConfigurationProperties(AliyunOSSProperties.class)   // 让参数类成为 bean 并绑定 aliyun.oss 前缀
  > @Configuration
  > public class AliyunOSSAutoConfiguration {
  >
  >     @Bean
  >     @ConditionalOnMissingBean                                // 使用方自己定义了就让位
  >     public AliyunOSSOperator aliyunOSSOperator(AliyunOSSProperties aliyunOSSProperties){
  >         return new AliyunOSSOperator(aliyunOSSProperties);   // 形参由容器按类型自动装配
  >     }
  > }
  > ```
  > ③ 登记文件：
  > ```text
  > src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
  > ```
  > 内容一行：
  > ```text
  > com.aliyun.oss.AliyunOSSAutoConfiguration
  > ```
  > （2.7.0 之前写在 `META-INF/spring.factories` 里，是历史写法；本机 Spring Boot 3.2.x 读的是 `.imports`。）
  > ④ 使用方自己定义过同类型 bean 时，**自动配置类里那个 `@Bean` 方法不会执行**——容器里用使用方定义的那个，应用照常启动、注入也不会报"同类型 bean 有两个"。保证这件事的注解是 **`@ConditionalOnMissingBean`**：判断环境中没有对应的 bean（按类型或名称）时才注册。本机实测过：加上自定义 bean 后，控制台打印了 `[实验] 自定义的 AliyunOSSOperator bean 被创建`，应用正常启动，`/check` 依然能注入。
  > 自查：把自动配置类的登记文件删掉（或改个名字）再启动使用方工程——注入会失败（找不到 bean），这就是"登记文件是必需品"的证明。

- [ ] **2-3 把"我的组件怎么才能被别的工程用上"讲清楚**
  需求：同事问你三个问题，请写清楚：
  ① 为什么不能把工具类的源码直接拷给别的团队用（至少两条理由）；
  ② 打包好的两个模块要怎么"交付"给别的工程，包管理器层面做了什么动作、跟只打 `package` 有什么区别；
  ③ 使用方接入你的组件要做哪几件事，其中哪几件是"必须的"。
  （写作区见练习文件 `test_90_自定义starter.txt` 的题目2-3。）

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：① 从"重复维护"和"依赖与配置都得自己补"两个角度说；② 关键词是"装进本地仓库"与"打进 target"的区别；③ 数一数使用方写的东西：依赖、配置、注入
  > **二级 · 方法**：`mvn clean install`（`install` 会把 jar 装进本地仓库，`package` 只到 `target/`）；使用方 pom 一行依赖 + yml 参数（前缀与参数类 `prefix` 一致）+ `@Autowired` 注入；`install` 安装顺序：先 autoconfigure 再 starter（被依赖的先装）
  > **三级 · 骨架**：① 拷贝源码 → 每个团队各维护一份，改一次要改 N 处；而且 OSS 的 SDK 与 jaxb 三兄弟还得各自补；② 在组件模块里执行 `mvn ____` → 装进本地仓库；③ 使用方：____ 一行依赖、____ 参数、____ 注入

  > [!TIP]- 参考答案（做完再点开）
  > ① 不拷源码的理由：**重复维护**——每个团队各存一份，组件一改就要挨个通知、挨个改；**依赖与配置也得自己补**——OSS 的 SDK 与那三个 jaxb 坐标要各自加一遍，工具类的 bean 也要各自声明（[73 篇](/posts/编程学习/javaweb学习笔记/73-阿里云oss与参数配置化/)就是这么干的，麻烦之处都见过）；此外还有**版本失控**的问题（各团队引的版本可能不一致）。做成 starter 后，这些都被封进依赖里。
  > ② 交付方式：在两个模块的目录下分别执行 **`mvn clean install`**——`install` 会把打好的 jar **装进本地仓库**（本机是 `A:\develop\maven\apache-maven-3.9.14\mvn_repo\com\aliyun\oss\...`）；`package` 只把 jar 打进工程的 `target/` 目录，本地仓库里没有，别的工程就引不到。顺序上**先 install autoconfigure、再 install starter**（被依赖的模块要先在仓库里）。
  > ③ 使用方要做三件事：pom 里加**一行** starter 依赖（**必须**）、`application.yml` 里写参数（`aliyun.oss` 三项，**按需必须**——组件要和 OSS 通信就得配）、`@Autowired` 注入工具类（用的时候写）。**不必须**的是任何配置类、任何 `@Component`、任何 `@Import`——这三样一件都不用写，正是"自动配置功能"省下来的。
  > 自查：本机实测的结果是 `/check` 返回 `AliyunOSSOperator 已自动装配: true , 实例: com.aliyun.oss.AliyunOSSOperator@38ec98ee`——使用方工程里确实没有任何配置代码。

### 三、综合题

- [ ] **3-1 照课程案例做一个自己的 starter，并让另一个工程用起来**
  这一题把 PPT 第 36 页的三步完整走一遍，每一步都要能说出"为什么这么做"。
  1. 建 `aliyun-oss-spring-boot-autoconfigure` 模块：把工具类与参数类搬进来（**去掉 `@Component`**，工具类改成构造方法接收参数对象），pom 里补上组件需要的依赖（阿里云 SDK + 三个 jaxb 坐标）；
  2. 在 autoconfigure 模块里写自动配置类：类上 `@EnableConfigurationProperties(...)` + `@Configuration`，方法上 `@Bean` + `@ConditionalOnMissingBean`；
  3. 新建登记文件（注意目录与文件名的每一个字），写入自动配置类的全类名；
  4. 建 `aliyun-oss-spring-boot-starter` 模块：pom 里依赖 `spring-boot-starter` 与你的 autoconfigure 模块（starter 里**不写代码**）；
  5. 依次 `install` 两个模块进本地仓库（先 autoconfigure、再 starter），记下控制台里 `Installing ... to ...` 那两行；
  6. 另建（或用课程给的）测试工程：**只做三件事**——加一行 starter 依赖、在 yml 里写 `aliyun.oss` 三项参数、在 Controller 里 `@Autowired` 注入工具类并提供 `/check` 接口；
  7. 启动测试工程，把 `/check` 的返回原文抄下来，确认"自动装配 = true"；
  8. 做"让位"对照实验：在测试工程里自己用 `@Bean` 定义一个同类型的工具类 bean（打印一句话），重启后看控制台**有没有**出现你那句话、有没有报"同类型 bean 有两个"的错；
  9. 收尾回答：① 两个能力分别由哪部分提供？② 使用方为什么不用写任何配置类？③ 本机读的是 `.imports` 还是 `spring.factories`？

  （练习文件 `test_90_自定义starter.txt` 的"综合题"一段里按这 9 步给了写作区。）

  **涉及知识点**

  | 知识点 | 在这里的应用 |
  | --- | --- |
  | 场景与两个能力（PPT 35） | 第 1、4 步——依赖管理放 starter、自动配置放 autoconfigure |
  | 三个步骤（PPT 36） | 第 1～4 步——建两个模块、引入、写自动配置 + imports |
  | 第三方 Bean 与 `@Bean`（88 篇） | 第 2 步——`@Configuration` + `@Bean` + 形参自动装配 |
  | `@ConditionalOnMissingBean`（89 篇） | 第 2、8 步——使用方定义了就让位 |
  | `.imports` 名单文件（89 篇源码跟踪） | 第 3 步——路径与文件名的每一个字都不能改 |
  | `install` 与本地仓库（26 篇） | 第 5 步——装进本地仓库别的工程才能引用 |
  | 本机实测（第 14 章 ） | 第 5～8 步的对照答案——`/check` 返回"已自动装配: true" |
  | 版本差异 | 第 9 步——本机 3.2.x 走 `.imports`，`spring.factories` 是历史写法 |

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：按"依赖 → 自动配置 → 登记 → 使用"的顺序做，每完成一步都先想"使用方少写了什么"；第 8 步的对照实验是把 [89 篇](/posts/编程学习/javaweb学习笔记/89-springboot自动配置原理/)那个实测再做一次，只是这次组件是你自己写的
  > **二级 · 方法**：类上 `@EnableConfigurationProperties` + `@Configuration`；方法上 `@Bean` + `@ConditionalOnMissingBean`；登记文件 `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`；`mvn clean install`（本机本地仓库换过位置，打包时用 `-s settings.xml`）；使用方 yml 的前缀与参数类 `prefix` 一致（`aliyun.oss`）；"同类型 bean 有两个"的报错关键词是 `NoUniqueBeanDefinitionException`
  > **三级 · 骨架**：① `@____(AliyunOSSProperties.class)` + `@____`；`@____` + `@____`；③ 文件路径 `META-INF/spring/org.springframework.boot.autoconfigure.____.imports`；⑤ `mvn clean ____`；⑥ 使用方 pom 一整块依赖 + yml 的 `aliyun:` → `oss:` 三项 + Controller 里 `@____ private AliyunOSSOperator ____;`；⑧ `@____ public class MyConfig { @____ public AliyunOSSOperator ____() { ... } }`

  > [!TIP]- 参考答案（做完再点开）
  > 1~4. 模块、pom、三个类与登记文件见 2-1、2-2 的答案（自动配置类是 `@EnableConfigurationProperties(AliyunOSSProperties.class)` + `@Configuration`，方法上 `@Bean` + `@ConditionalOnMissingBean`；登记文件里一行全类名 `com.aliyun.oss.AliyunOSSAutoConfiguration`）。
  > 5. **本机实测**：两条 `mvn -s settings.xml clean install` 的控制台里分别出现
  >    ```text
  >    Installing ... to A:\develop\maven\apache-maven-3.9.14\mvn_repo\com\aliyun\oss\aliyun-oss-spring-boot-autoconfigure\0.0.1-SNAPSHOT\...
  >    Installing ... to A:\develop\maven\apache-maven-3.9.14\mvn_repo\com\aliyun\oss\aliyun-oss-spring-boot-starter\0.0.1-SNAPSHOT\...
  >    ```
  > 6. 测试工程那三件事：pom 一行 `com.aliyun.oss:aliyun-oss-spring-boot-starter:0.0.1-SNAPSHOT`；yml 里 `aliyun.oss` 的 `endpoint` / `bucketName` / `region`；Controller 里 `@Autowired private AliyunOSSOperator aliyunOSSOperator;`（这个类型来自 starter 的包，工程里没有它的源码）。
  > 7. **本机实测**：`/check` 返回原文——
  >    ```text
  >    AliyunOSSOperator 已自动装配: true , 实例: com.aliyun.oss.AliyunOSSOperator@38ec98ee
  >    ```
  > 8. **本机实测**：加上自定义的 `@Bean` 后控制台出现 `[实验] 自定义的 AliyunOSSOperator bean 被创建`，应用**正常启动**（`Started SpringbootAutoconfigurationTestApplication in 2.084 seconds`），`/check` 依然能注入，**没有** `NoUniqueBeanDefinitionException`——说明自动配置类里那个带 `@ConditionalOnMissingBean` 的方法让位了。
  > 9. 三个回答：
  >    ① **依赖管理功能**由 starter 模块的 pom 提供（引入 autoconfigure，连带阿里云 SDK 与 jaxb 三兄弟一起进来）；**自动配置功能**由 autoconfigure 模块提供（自动配置类 + `.imports` 登记文件）。
  >    ② 因为自动配置类已经把"造哪些 bean"写好了，而 `.imports` 文件让 SpringBoot 在启动时自动读到它（`AutoConfigurationImportSelector` 读名单 → `@Conditional` 条件满足 → 注册 bean）——使用方**不需要**再写 `@Component` / `@Configuration` / `@Import` 中的任何一个。
  >    ③ **本机是 Spring Boot 3.2.x**，读的是 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`；`spring.factories` 是 2.7.0 之前的**历史写法**。
