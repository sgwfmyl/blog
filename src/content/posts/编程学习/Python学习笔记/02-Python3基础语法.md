---
title: Python3 基础语法
published: 2026-08-19
description: Python3 编码、标识符、关键字、注释、缩进和数据类型等基础语法
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-02-grammar.webp
order: 2
---
## 编码

默认情况下，Python3 源码文件以 **UTF-8** 编码，所有字符串都是 unicode 字符串。

当然你也可以为源码文件指定不同的编码：

```
# -*- coding: cp-1252 -*-
```

上述定义允许在源文件中使用 Windows-1252 字符集中的字符编码，对应适合语言为保加利亚语、白俄罗斯语、马其顿语、俄语、塞尔维亚语。

---

## 标识符

- 第一个字符必须以字母（a-z, A-Z）或下划线 \_ 。
- 标识符的其他的部分由字母、数字和下划线组成。
- 标识符对大小写敏感，count 和 Count 是不同的标识符。
- 标识符对长度无硬性限制，但建议保持简洁（一般不超过 20 个字符）。
- 禁止使用保留关键字，如 if、for、class 等不能作为标识符。

合法标识符：

```
age = 25                # 普通变量名，最常见
user_name = "Alice"     # 用下划线连接单词，清晰易读
_total = 100            # 下划线开头通常表示“内部使用”或“私有”
MAX_SIZE = 1024         # 全大写通常表示“常量”（固定不变的值）
calculate_area()        # 函数名，动词+名词
StudentInfo             # 类名，首字母大写（驼峰命名法）
__private_var           # 双下划线开头，有特殊含义
```

**非法标识符：**

```
2nd_place = "silver"    # 错误：以数字开头
user-name = "Bob"       # 错误：包含连字符
class = "Math"          # 错误：使用关键字
$price = 9.99          # 错误：包含特殊字符
for = "loop"           # 错误：使用关键字
```

Python 3 允许使用 Unicode 字符作为标识符，可以用中文作为变量名，非 ASCII 标识符也是允许的了。

```python
姓名 = "张三"  # 合法
π = 3.14159   # 合法
```

测试标识符是否合法：

## 实例
```python
def is_valid_identifier(name):  
try:  
#我想测试这个名字能不能当变量，那我就直接拿这个名字造一个变量，赋值 None
exec(f"{name} = None")  
return True  
except:  
return False  
  
print(is_valid_identifier("2var")) # False  
print(is_valid_identifier("var2")) # True
```

---

## Python 保留关键字

保留字即关键字，我们不能把它们用作任何标识符名称。Python 的标准库提供了一个 keyword 模块，可以输出当前版本的所有关键字：

```python
>>> import keyword
>>> keyword.kwlist
['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']
>>>
```

| **类别**   | **关键字**    | **说明**              |
| -------- | ---------- | ------------------- |
| **逻辑值**  | `True`     | 布尔真值                |
|          | `False`    | 布尔假值                |
|          | `None`     | 表示空值或无值             |
| **逻辑运算** | `and`      | 逻辑与运算               |
|          | `or`       | 逻辑或运算               |
|          | `not`      | 逻辑非运算               |
| **条件控制** | `if`       | 条件判断语句              |
|          | `elif`     | 否则如果（else if 的缩写）   |
|          | `else`     | 否则分支                |
| **循环控制** | `for`      | 迭代循环                |
|          | `while`    | 条件循环                |
|          | `break`    | 跳出循环                |
|          | `continue` | 跳过当前循环的剩余部分，进入下一次迭代 |
| **异常处理** | `try`      | 尝试执行代码块             |
|          | `except`   | 捕获异常                |
|          | `finally`  | 无论是否发生异常都会执行的代码块    |
|          | `raise`    | 抛出异常                |
| **函数定义** | `def`      | 定义函数                |
|          | `return`   | 从函数返回值              |
|          | `lambda`   | 创建匿名函数              |
| **类与对象** | `class`    | 定义类                 |
|          | `del`      | 删除对象引用              |
| **模块导入** | `import`   | 导入模块                |
|          | `from`     | 从模块导入特定部分           |
|          | `as`       | 为导入的模块或对象创建别名       |
| **作用域**  | `global`   | 声明全局变量              |
|          | `nonlocal` | 声明非局部变量（用于嵌套函数）     |
| **异步编程** | `async`    | 声明异步函数              |
|          | `await`    | 等待异步操作完成            |
| **其他**   | `assert`   | 断言，用于测试条件是否为真       |
|          | `in`       | 检查成员关系              |
|          | `is`       | 检查对象身份（是否是同一个对象）    |
|          | `pass`     | 空语句，用于占位            |
|          | `with`     | 上下文管理器，用于资源管理       |
|          | `yield`    | 从生成器函数返回值           |

> 更多 Python 保留关键字参考： [https://www.runoob.com/python3/python3-keyword.html](https://www.runoob.com/python3/python3-keyword.html) 。

---

## 注释

Python中单行注释以 **#** 开头

多行注释可以用多个 # 号，还有 ''' 和 """：

---

## 行与缩进

python最具特色的就是使用**缩进来表示代码块**，不需要使用大括号 {} 。

缩进的空格数是可变的，但是同一个代码块的语句必须包含相同的缩进空格数。实例如下：

## 实例(Python 3.0+)
```
if True:
    print ("True")
else:
    print ("False")
```

以下代码最后一行语句缩进数的空格数不一致，会导致运行错误：

## 实例
```
if True:
    print ("Answer")
    print ("True")
else:
    print ("Answer")
  print ("False")    # 缩进不一致，会导致运行错误
```

错误：

```
File "test.py", line 6
    print ("False")    # 缩进不一致，会导致运行错误
                                      ^
IndentationError: unindent does not match any outer indentation level
```

---

## 多行语句

Python 通常是一行写完一条语句，但如果语句很长，我们可以使用反斜杠 \\ 来实现多行语句，例如：

```
total = item_one + \
        item_two + \
        item_three
```

在 \[\], {}, 或 () 中的多行语句，不需要使用反斜杠 \\，例如：

```
total = ['item_one', 'item_two', 'item_three',
        'item_four', 'item_five']
```

---

## 数字(Number)类型

python中数字有**四种**类型：整数、布尔型、浮点数和复数。

- **int** (整数), 如 1, 只有一种整数类型 int，表示为长整型，没有 python2 中的 Long。
- **bool** (布尔), 如 True。
- **float** (浮点数), 如 1.23、3E-2
- **complex** (复数) - 复数由实部和虚部组成，形式为 a + bj，其中 a 是实部，b 是虚部，j 表示虚数单位。如 1 + 2j、 1.1 + 2.2j

---

## 字符串(String)

- Python 中单引号 ' 和双引号 " 使用**完全相同**。
- 使用三引号(''' 或 """)可以指定一个多行字符串。
- 转义符 \\。
- 反斜杠可以用来转义，使用 r 可以让反斜杠不发生转义。 如 **r"this is a line with \\n"** 则 \\n 会显示，并不是换行。
- 按字面意义级联字符串，如 **"this " "is " "string"** 会被自动转换为 **this is string** 。
- 字符串可以用 + 运算符连接在一起，用 \* 运算符重复。
- Python 中的字符串有两种索引方式，从左往右以 0 开始，从右往左以 -1 开始。
- Python 中的字符串不能改变。
- Python 没有单独的字符类型，一个字符就是长度为 1 的字符串。
- 字符串切片 str\[start:end\]，其中 start（包含）是切片开始的索引，end（不包含）是切片结束的索引。
- 字符串的切片可以加上步长参数 step，语法格式如下：str\[start:end:step\]

## 空行

函数之间或类的方法之间用空行分隔，表示一段新的代码的开始。类和函数入口之间也用一行空行分隔，以突出函数入口的开始。

空行与代码缩进不同，空行并**不是 Python 语法的一部分**。书写时不插入空行，Python 解释器运行也不会出错。但是空行的作用在于分隔两段不同功能或含义的代码，便于日后代码的维护或重构。

**记住：** 空行也是程序代码的一部分。

---

## 等待用户输入

执行下面的程序在按回车键后就会等待用户输入：
``` python
#!/usr/bin/python3
 
input("\n\n按下 enter 键后退出。")
```


以上代码中 ，\\n\\n 在结果输出前会输出两个新的空行。一旦用户按下 **enter** 键时，程序将退出。

---

## 同一行显示多条语句

Python 可以在同一行中使用多条语句，语句之间使用分号; 分割，以下是一个简单的实例：

```python
import sys; x = 'runoob'; sys.stdout.write(x + '\n')
```

输出结果为：

```
runoob
```

使用交互式命令行执行，输出结果为：

```
>>> import sys; x = 'runoob'; sys.stdout.write(x + '\n')
runoob
7
```

此处的 7 表示字符数， **runoob** 有 6 个字符， **\\n** 表示一个字符，加起来 **7** 个字符。

```
>>> import sys
>>> sys.stdout.write(" hi ")    # hi 前后各有 1 个空格
 hi 4
```

---

## 多个语句构成代码组

**缩进相同**的一组语句构成一个代码块，我们称之代**码组**。

像if、while、def和class这样的复合语句，首行以关键字开始，以冒号(: )结束，该行之后的一行或多行代码构成代码组。

我们将首行及后面的代码组称为一个子句(clause)。

如下实例：

```
if expression : 
   suite
elif expression : 
   suite 
else : 
   suite
```

---

## print 输出

**print** 默认输出**是换行的**，如果要**实现不换行**需要在变量末尾加上 end=""：
```python
#!/usr/bin/python3
 
x="a"
y="b"
# 换行输出
print( x )
print( y )
 
print('---------')
# 不换行输出
print( x, end=" " )
print( y, end=" " )
print()
```

结果为：

```
a
b
---------
a b
```

> **更多内容参考：** [Python2 与 Python3 print 不换行](https://www.runoob.com/w3cnote/python-print-without-newline.html)

---

## import 与 from...import

在 python 用 import 或者 from...import 来**导入相应的模块。**

将**整个模块**(somemodule)导入，格式为： import somemodule

从某个模块中导入**某个**函数,格式为： **from** somemodule **import** somefunction

从某个模块中导入**多个**函数,格式为： **from** somemodule **import** firstfunc, secondfunc, thirdfunc

将某个模块中的**全部函数**导入，格式为： from somemodule import \*

> 更多内容可以参考： [Python import 和 from … import 的主要区别](https://www.runoob.com/w3cnote/python-import-and-from-import.html)

---

## 命令行参数

很多程序可以执行一些操作来查看一些基本信息，Python可以使用-h参数查看各参数帮助信息：

```
$ python -h
usage: python [option] ... [-c cmd | -m mod | file | -] [arg] ...
Options and arguments (and corresponding environment variables):
-c cmd : program passed in as string (terminates option list)
-d     : debug output from parser (also PYTHONDEBUG=x)
-E     : ignore environment variables (such as PYTHONPATH)
-h     : print this help message and exit

[ etc. ]
```

我们在使用脚本形式执行 Python 时，可以接收命令行输入的参数，具体使用可以参照 [Python 3 命令行参数](https://www.runoob.com/python3/python3-command-line-arguments.html) 。

---

## 相关

- [Python3 简介](/posts/编程学习/python学习笔记/01-python3简介/)
- [Python3 基本数据类型](/posts/编程学习/python学习笔记/03-python3基本数据类型/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 源码文件默认以 **UTF-8** 编码；要指定别的编码，就在文件第一行写 `# -*- coding: cp-1252 -*-` 这样的编码声明
2. 标识符规则：第一个字符必须是**字母或下划线**，其余部分由字母、数字、下划线组成；**大小写敏感**（`count` 和 `Count` 是两个标识符）；不能使用保留**关键字**；建议保持简洁（一般不超过 20 个字符）
3. 判断一个名字能不能当标识符要看四件事：不能为空、首字符是字母或下划线、其余字符都是字母/数字/下划线、不是关键字；Python 3 还允许中文等非 ASCII 字符做标识符（如 `姓名`、`π`）
4. 查看关键字：`keyword` 模块的 `keyword.kwlist` 输出当前版本的全部关键字（Python 3.13 共 **35** 个），`keyword.iskeyword(名字)` 判断某个名字是不是关键字
5. 缩进就是 Python 的代码块标记（不需要大括号 `{}`）；同一个代码块里的语句**缩进必须一致**，否则报 `IndentationError: unindent does not match any outer indentation level`
6. 多行语句：语句太长可以用反斜杠 `\` 续行；在 `[]`、`{}`、`()` 里面的多行语句**不需要**反斜杠
7. 数字有四种类型：整数 `int`（没有 Python 2 的 Long）、布尔 `bool`、浮点数 `float`、复数 `complex`（如 `1 + 2j`）
8. 字符串：单引号和双引号**完全等价**；三引号可以写多行；`+` 连接、`*` 重复；索引从左往右从 0 开始、从右往左从 -1 开始；切片 `str[start:end:step]`（含 start、不含 end）；字符串**不可变**
9. 同一行写多条语句用分号 `;` 分隔（如 `import sys; x = 'runoob'`）；导入模块的三种写法：`import 模块`、`from 模块 import 函数`、`from 模块 import *`
10. 输出与输入：`print` 默认**换行**，末尾加上 `end=" "` 就能**不换行**；`input("提示语")` 会等用户按下回车才继续；空行不是语法的一部分，但能分隔代码、方便阅读

### 二、裸写题

- [x] **2-1 标识符合法性判断** ❌
  创建文件 `test_identifier.py`，编写程序：让用户输入一个名字，判断它能不能作为合法的 Python 标识符（不能以数字开头、不能是保留关键字、只能包含字母、数字、下划线），并把判断结果输出。运行程序，分别用 `2name`、`user_name`、`class` 这三个输入各测一次，输出应为 `False`、`True`、`False`。

  > **批改（2026-09-28）**：❌ 只写了 `user_name = 10` 一行有效代码（`2name`、`class` 两行被注释掉），没有题面要求的"输入标识符、判断是否合法"程序，运行后没有任何输出。把参考代码敲进 `test_identifier.py` 跑一遍，三个测试的输出应是 `False`、`True`、`False`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：分四步检查——空名字先判否；再看首字符是不是字母或下划线；再逐个字符看是否只由字母、数字、下划线组成；最后查是不是保留关键字
  > **二级 · 方法**：`input()` 拿输入；`name[0].isalpha()` 判首字符；`char.isalnum()` 判字母数字；`keyword.iskeyword(name)` 查关键字
  > **三级 · 骨架**：`if not (name[0].____() or name[0] == "_"): return False` / 循环里逐字检查 `if not (char.____() or char == "_")` / `if keyword.____(name): return False`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > import keyword
  >
  > def is_valid_identifier(name):
  >     # 检查是否为空
  >     if not name:
  >         return False
  >     # 检查第一个字符是否为字母或下划线
  >     if not (name[0].isalpha() or name[0] == '_'):
  >         return False
  >     # 检查是否包含非法字符
  >     for char in name:
  >         if not (char.isalnum() or char == '_'):
  >             return False
  >     # 检查是否为关键字
  >     if keyword.iskeyword(name):
  >         return False
  >     return True
  >
  > # 测试
  > print(is_valid_identifier("2name"))    # False
  > print(is_valid_identifier("user_name"))  # True
  > print(is_valid_identifier("class"))    # False
  > ```

- [x] **2-2 查看 Python 关键字**
  打开命令提示符（CMD）进入 Python 交互模式，查看当前版本有哪些保留关键字；然后把完整的列表输出一遍，并统计一下共有多少个关键字。

  > **批改（2026-09-28）**：⚠️ 写了 `test_keyword.py`，实测打印出完整的 35 个关键字列表，但没有做题面要求的"统计共有多少个"——补一行 `print(len(keyword.kwlist))`，输出应为 `35`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：关键字列表由标准库里的一个专门模块提供；先把整个列表打印出来看，再用长度函数数出个数
  > **二级 · 方法**：`import keyword`；`keyword.kwlist` 是全部关键字组成的列表；`len(keyword.kwlist)` 取个数
  > **三级 · 骨架**：`print(keyword.____)` / `print(____(keyword.kwlist))`

  > [!TIP]- 参考答案（做完再点开）
  > **2-2**：Python 3.13 共有 **35** 个关键字。运行代码后会输出完整列表，可以用 `len(keyword.kwlist)` 直接获取数量。

- [x] **2-3 缩进错误实验**
  创建文件 `test_indent.py`，故意写一段缩进不一致的代码：让同一个分支里的第二行比第一行少缩进两格。运行它，观察报错信息，然后修正缩进让程序正常运行、两行内容都输出。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：同一个代码块里的缩进必须一致；把第二行故意少缩进两格，运行就会在那一行报缩进错误
  > **二级 · 方法**：`if True:` 下面放两行输出语句，第二行只缩进 2 个空格；报错类型是 `IndentationError`
  > **三级 · 骨架**：
  > ```python
  > if True:
  >     print("正确缩进")
  >   print("错误缩进")    # 故意只缩进 2 格 → 运行报错
  > ```

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > # 修正后：统一使用4个空格缩进
  > if True:
  >     print("正确缩进")
  >     print("错误缩进")  # 也改成4个空格
  > ```
  > 或者让第二行不缩进，成为独立语句：
  > ```python
  > if True:
  >     print("正确缩进")
  > print("错误缩进")  # 不缩进，属于if外面的语句
  > ```

- [x] **2-4 多行语句练习**
  创建文件 `test_multiline.py`，把 `1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10` 这段加法拆成多行来写，运行后输出总和（应为 `55`）。

  > **批改（2026-09-28）**：✅ 正确（`test_multiline.py` 用反斜杠 `\` 把加法拆成两行，实测输出 `55`；续行没有缩进也能跑）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：语句太长想换行，得先告诉 Python"下一行还是这条语句的一部分"
  > **二级 · 方法**：反斜杠 `\` 是续行符，写在要换行的那一行末尾；在 `[]`、`{}`、`()` 里面的多行语句不需要反斜杠
  > **三级 · 骨架**：`total = 1 + 2 + 3 + 4 + 5 + \` 换行后接着写 `6 + 7 + ____ + 10`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-4
  > total = 1 + 2 + 3 + 4 + 5 + \
  >         6 + 7 + 8 + 9 + 10
  > print(total)  # 输出：55
  > ```

- [x] **2-5 字符串操作练习**
  创建文件 `test_string.py`：定义字符串 `"Hello Python"`，依次输出第一个字符、最后一个字符、前 5 个字符组成的切片、以及把整个字符串重复两遍的结果。运行并记录每行的输出。

  > **批改（2026-09-28）**：⚠️ `test_string.py` 四行操作都对（`s[0]` 取首字符、`s[-1]` 取末字符、`s[0:5]` 切片、`s * 2` 重复），但字符串写成了小写 `"hello python"`（题面是 `"Hello Python"`），实测输出 `h`、`n`、`hello`、`hello pythonhello python`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：索引从左往右从 0 开始、从右往左从 -1 开始；切片"含头不含尾"；重复用乘号
  > **二级 · 方法**：`s[0]` 取首字符、`s[-1]` 取末字符、`s[0:5]` 切片、`s * 2` 重复
  > **三级 · 骨架**：`print(s[____])  # 第一个字符` / `print(s[-____])  # 最后一个字符` / `print(s[0:____])  # 切片` / `print(s ____ 2)  # 重复`

  > [!TIP]- 参考答案（做完再点开）
  > **2-5**：输出结果：
  > ```text
  > H
  > n
  > Hello
  > Hello PythonHello Python
  > ```

- [x] **2-6 不换行输出练习**
  创建文件 `test_print.py`，让 1 到 5 这五个数字输出在同一行、每个数字后面跟一个空格，最后再补一次换行。运行程序，观察输出是不是 `1 2 3 4 5 `（末尾有一个空格）。

  > **批改（2026-09-28）**：✅ 正确（`test_print.py` 实测输出 `1 2 3 4 5 `，1 到 5 每个数字后面都带空格；末尾那句 `print()` 换行也写了）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：输出默认会换行，要在每次输出末尾把"换行"换成空格；循环结束之后再单独换一次行
  > **二级 · 方法**：`print(i, end=" ")` 把结尾换成空格；数字范围用 `range(1, 6)`；最后写一个空的 `print()`
  > **三级 · 骨架**：`for i in range(____, ____):` / `print(i, end="____")` / `print()`

  > [!TIP]- 参考答案（做完再点开）
  > **2-6**：输出结果：`1 2 3 4 5 `（末尾有一个空格）

- [x] **2-7 等待用户输入**
  创建文件 `test_input.py`，编写程序：提示用户输入姓名，然后输出问候语 `你好，<姓名>！欢迎学习Python！`（姓名后面要紧跟叹号）。运行程序，输入自己的名字观察输出。

  > **批改（2026-09-28）**：⚠️ `test_input.py` 的 `input()` 和字符串 `+` 拼接都对，但漏了名字后面的叹号：实测输入 `张三` 输出 `你好，张三欢迎学习Python！`，题面要求 `你好，张三！欢迎学习Python！`，应写成 `print("你好，" + name + "！欢迎学习Python！")`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：先把用户输入存进变量，再把三截文字拼成一句输出（注意叹号在姓名和后半句之间）
  > **二级 · 方法**：`input("提示语")` 拿到的直接是字符串；拼接用 `+`
  > **三级 · 骨架**：`name = input("请输入你的姓名: ")` / `print("你好，" + name + "____欢迎学习Python！")`

  > [!TIP]- 参考答案（做完再点开）
  > **2-7**：运行后输入 `小明`，输出：`你好，小明！欢迎学习Python！`

- [x] **2-8 导入模块练习**
  创建文件 `test_import.py`，用两种导入方式计算 16 和 25 的平方根：第一种把整个标准库模块拿进来，第二种只从模块里拿要用的那个函数。运行程序，输出结果应为 `4.0` 和 `5.0`。

  > **批改（2026-09-28）**：✅ 正确（`test_import.py` 中 `import math` + `math.sqrt(16)` 得 `4.0`，`from math import sqrt` + `sqrt(25)` 得 `5.0`，两种导入方式都对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：第一种导入后要写"模块名.函数名"才能调用；第二种导入后直接写函数名调用
  > **二级 · 方法**：`import math` + `math.sqrt(16)`；`from math import sqrt` + `sqrt(25)`
  > **三级 · 骨架**：`____ math` / `print(math.____(16))` / `from math import ____` / `print(____(25))`

  > [!TIP]- 参考答案（做完再点开）
  > **2-8**：运行输出：
  > ```text
  > 4.0
  > 5.0
  > ```
