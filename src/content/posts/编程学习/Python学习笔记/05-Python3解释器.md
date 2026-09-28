---
title: Python3 解释器
published: 2026-09-14
description: Python3 解释器的启动方式、交互式编程和脚本式编程
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-05-interpreter.webp
order: 5
---
Linux/Unix的系统上，一般默认的 python 版本为 2.x，我们可以将 python3.x 安装在 **/usr/local/python3** 目录中。

安装完成后，我们可以将路径 **/usr/local/python3/bin** 添加到您的 Linux/Unix 操作系统的环境变量中，这样您就可以通过 shell 终端输入下面的命令来启动 Python3 。

```bash
$ PATH=$PATH:/usr/local/python3/bin/python3    # 设置环境变量
$ python3 --version
Python 3.4.0
```

在Window系统下你可以通过以下命令来设置Python的环境变量，假设你的Python安装在 C:\Python34 下:

```cmd
set path=%path%;C:\python34
```

---

## 交互式编程

我们可以在命令提示符中输入"Python"命令来启动Python解释器：

```bash
$ python3
```

执行以上命令后，出现如下窗口信息：

```bash
$ python3
Python 3.4.0 (default, Apr 11 2014, 13:05:11) 
[GCC 4.8.2] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>>
```

在 python 提示符中输入以下语句，然后按回车键查看运行效果：

```python
print("Hello, Python!")
```

以上命令执行结果如下：

```
Hello, Python!
```

当键入一个多行结构时，续行是必须的。我们可以看下如下 if 语句：

```python
>>> flag = True
>>> if flag :
...     print("flag 条件为 True!")
... 
flag 条件为 True!
```

---

## 脚本式编程

将如下代码拷贝至 **hello.py** 文件中：

```python
print("Hello, Python!")
```

通过以下命令执行该脚本：

```bash
python3 hello.py
```

输出结果为：

```
Hello, Python!
```

在Linux/Unix系统中，你可以在脚本顶部添加以下命令让Python脚本可以像SHELL脚本一样可直接执行：

```python
#! /usr/bin/env python3
```

然后修改脚本权限，使其有执行权限，命令如下：

```bash
$ chmod +x hello.py
```

执行以下命令：

```bash
./hello.py
```

输出结果为：

```
Hello, Python!
```

---

## 相关

- [Python3 编程第一步](/posts/编程学习/python学习笔记/04-python3编程第一步/)
- [Python3 注释](/posts/编程学习/python学习笔记/06-python3注释/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. Linux/Unix 上一般把 python3 装在 **/usr/local/python3**，把 **/usr/local/python3/bin** 加进环境变量后就能在终端直接用 `python3`；Windows 下设置环境变量的命令是 `set path=%path%;C:\python34`
2. 两种运行方式：**交互式**（在命令提示符里启动解释器，出现 `>>>` 提示符，敲一句执行一句）和**脚本式**（把代码写进 `.py` 文件再整体运行）
3. 交互式提示符：主提示符是 `>>>`；多行结构还没写完时会变成 `...` 续行提示符，**连续按两次回车**才会执行
4. 退出交互式环境：输入 `exit()`
5. 交互式里可以直接输出：敲 `print("Hello, Python!")` 立刻得到 `Hello, Python!`，不用先建文件
6. 脚本式编程三步：创建 `hello.py` → 写入代码 → 在 CMD 里用 `python hello.py` 运行
7. Linux/Unix 想让脚本像 SHELL 脚本一样直接执行：脚本第一行写 `#! /usr/bin/env python3`，再 `chmod +x hello.py` 加执行权限，然后用 `./hello.py` 运行
8. 查看版本：`python --version` 或 `python -V`（实测都输出 `Python 3.13.0`）
9. 交互式可以直接当计算器：`100 / 3` 得 `33.333333333333336`、`100 // 3` 得 `33`、`2 ** 10` 得 `1024`
10. 查类型用 `type(值)`：`100 / 3` 是 `<class 'float'>`、`100 // 3` 是 `<class 'int'>`；循环写成 `for i in range(1, 6):` 就能输出 1 到 5

### 二、裸写题

- [x] **2-1 启动 Python 交互式环境**
  打开命令提示符（CMD）启动 Python 交互式环境，然后在 `>>>` 提示符后依次做三件事：
  - 算一下 `1 + 1` 的结果
  - 输出一行 `Hello`
  - 退出交互式环境

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：交互式环境就是"敲一句、按回车、立刻看结果"，最后要有一个专门的命令退出
  > **二级 · 方法**：CMD 里输入 `python` 启动（出现 `>>>`）；输出用 `print("Hello")`；退出用 `exit()`
  > **三级 · 骨架**：`C:\> python` → `>>> 1 + 1` → `>>> ____("Hello")` → `>>> ____()`

  > [!TIP]- 参考答案（做完再点开）
  > ```bash
  > # 2-1
  > # 在 CMD 中操作：
  > C:\> python
  > Python 3.13.0 (tags/v3.13.0:60403a5, Oct 07 2024, 09:38:07) [MSC v.1941 64 bit (AMD64)] on win32
  > Type "help", "copyright", "credits" or "license" for more information.
  > >>> 1 + 1
  > 2
  > >>> print("Hello")
  > Hello
  > >>> exit()
  > ```

- [x] **2-2 交互式模式下输入多行代码**
  在 Python 交互式环境里输入一段多行结构：先把 `x` 赋值为 `10`，再写一个判断——`x` 大于 5 时依次输出"大于5"和"结束"两行。注意观察输入过程中提示符的变化，以及最后怎么才能让它执行。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：多行结构没写完时提示符会从 `>>>` 变成 `...`；全部敲完还要再按一次回车（也就是连按两次回车）才会执行
  > **二级 · 方法**：先 `x = 10`，再 `if x > 5:`，两行输出语句都要缩进；结尾按两次回车
  > **三级 · 骨架**：`>>> if x > 5:` / `...     print("____5")` / `...     print("结束")` / `...`（空行后再按一次回车执行）

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > >>> x = 10
  > >>> if x > 5:
  > ...     print("大于5")
  > ...     print("结束")
  > ...
  > 大于5
  > 结束
  > ```

- [x] **2-3 创建并运行第一个 Python 脚本**
  用记事本创建文件 `hello.py`，里面写两行输出：第一行输出 `Hello, Python!`，第二行输出 `这是我的第一个脚本`。然后在 CMD 中把这个脚本运行起来。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：脚本式编程 = 先建好 `.py` 文件 → 再让解释器去执行这个文件
  > **二级 · 方法**：两行都用 `print("内容")` 写；运行写 `python hello.py`（要在文件所在目录下执行，或者写完整路径）
  > **三级 · 骨架**：`print("Hello, ____!")` / `C:\> ____ hello.py`

  > [!TIP]- 参考答案（做完再点开）
  > ```bash
  > # 2-3
  > # 在 CMD 中：
  > C:\> python hello.py
  > Hello, Python!
  > 这是我的我的第一个脚本
  > ```

- [x] **2-4 查看 Python 版本**
  在 CMD 中分别用两种写法查看当前 Python 的版本信息（一种完整参数、一种短参数）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：解释器带一个"看版本"的启动参数，一种是完整单词、一种是单个字母，两种写法输出一样
  > **二级 · 方法**：`python --version`（完整参数）和 `python -V`（短参数，**大写 V**）
  > **三级 · 骨架**：`C:\> python ____` / `C:\> python ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```bash
  > # 2-4
  > C:\> python --version
  > Python 3.13.0
  >
  > C:\> python -V
  > Python 3.13.0
  > ```

- [x] **2-5 使用交互式模式进行计算**
  在 Python 交互式环境中完成以下操作：
  - 计算 `100 / 3`（保留小数的除法）
  - 计算 `100 // 3`（整除）
  - 计算 `2 ** 10`（乘方）
  - 再查看一下前两个结果各自的数据类型

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：交互式里直接敲算式回车就能看到结果；想确认"结果是小数还是整数"，有一个内置函数能问出类型
  > **二级 · 方法**：`/` 得到浮点数、`//` 得到整数、`**` 是乘方；查类型用 `type(值)`
  > **三级 · 骨架**：`>>> 100 ____ 3` / `>>> ____(100 / 3)`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-5
  > >>> 100 / 3
  > 33.333333333333336
  > >>> type(100 / 3)
  > <class 'float'>
  > >>> 100 // 3
  > 33
  > >>> type(100 // 3)
  > <class 'int'>
  > >>> 2 ** 10
  > 1024
  > >>> type(2 ** 10)
  > <class 'int'>
  > ```

- [x] **2-6 多行循环练习**
  在交互式环境中写一个循环，把 1 到 5 挨个输出（每行一个数字）。记住：多行输入最后要按两次回车才会执行。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：多行结构在交互式里同样用 `...` 续行，敲完空行回车才执行；范围要写"含头不含尾"
  > **二级 · 方法**：`for i in range(1, 6):` 配一行缩进的 `print(i)`；结尾按两次回车
  > **三级 · 骨架**：`>>> for i in range(____, ____):` / `...     print(____)` / `...`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-6
  > >>> for i in range(1, 6):
  > ...     print(i)
  > ...
  > 1
  > 2
  > 3
  > 4
  > 5
  > ```
