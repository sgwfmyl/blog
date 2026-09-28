---
title: Python3 数据类型转换
published: 2026-09-14
description: Python3 隐式类型转换和显式类型转换的方法
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-15-conversion.webp
order: 15
---
有时候，我们需要对数据内置的类型进行转换，数据类型的转换，一般情况下你只需要将数据类型作为函数名即可。

Python 数据类型转换可以分为两种：

- 隐式类型转换 - 自动完成
- 显式类型转换 - 需要使用类型函数来转换

## 数据类型转换

### 隐式类型转换

在隐式类型转换中，Python 会自动将一种数据类型转换为另一种数据类型，不需要我们去干预。

以下实例中，我们对两种不同类型的数据进行运算，较低数据类型（整数）就会转换为较高数据类型（浮点数）以避免数据丢失。

## 实例

``` python
num_int = 123
num_flo = 1.23

num_new = num_int + num_flo

print("num_int 数据类型为:",type(num_int))
print("num_flo 数据类型为:",type(num_flo))

print("num_new 值为:",num_new)
print("num_new 数据类型为:",type(num_new))
```

以上实例输出结果为：

```
num_int 数据类型为: <class 'int'>
num_flo 数据类型为: <class 'float'>
num_new: 值为: 124.23
num_new 数据类型为: <class 'float'>
```

代码解析：

- 实例中我们对两个不同数据类型的变量 `num_int` 和 `num_flo` 进行相加运算，并存储在变量 `num_new` 中。
- 然后查看三个变量的数据类型。
- 在输出结果中，我们看到 `num_int` 是 `整型（integer）` ， `num_flo` 是 ` 浮点型（float）` 。
- 同样，新的变量 `num_new` 是 ` 浮点型（float）` ，这是因为 Python 会将较小的数据类型转换为较大的数据类型，以避免数据丢失。

我们再看一个实例，整型数据与字符串类型的数据进行相加：

## 实例

``` python
num_int = 123
num_str = "456"

print("num_int 数据类型为:",type(num_int))
print("num_str 数据类型为:",type(num_str))

print(num_int+num_str)
```
以上实例输出结果为：

```
num_int 数据类型为: <class 'int'>
num_str 数据类型为: <class 'str'>
Traceback (most recent call last):
  File "/runoob-test/test.py", line 7, in <module>
    print(num_int+num_str)
TypeError: unsupported operand type(s) for +: 'int' and 'str'
```

从输出中可以看出，整型和字符串类型运算结果会报错，输出 TypeError。 Python 在这种情况下无法使用隐式转换。

但是，Python 为这些类型的情况提供了一种解决方案，称为显式转换。

### 显式类型转换

在显式类型转换中，用户将对象的数据类型转换为所需的数据类型。 我们使用 int()、float()、str() 等预定义函数来执行显式类型转换。

int() 强制转换为整型：

## 实例

```python
x = int(1)      # x 输出结果为 1
y = int(2.8)    # y 输出结果为 2
z = int("3")    # z 输出结果为 3
```

float() 强制转换为浮点型：

## 实例

```python
x = float(1)      # x 输出结果为 1.0
y = float(2.8)    # y 输出结果为 2.8
z = float("3")    # z 输出结果为 3.0
w = float("4.2")  # w 输出结果为 4.2
```

str() 强制转换为字符串类型：

## 实例

```python
x = str("s1")   # x 输出结果为 's1'
y = str(2)      # y 输出结果为 '2'
z = str(3.0)    # z 输出结果为 '3.0'
```

整型和字符串类型进行运算，就可以用强制类型转换来完成：

## 实例

```python
num_int = 123
num_str = "456"

print("num_int 数据类型为:", type(num_int))
print("类型转换前，num_str 数据类型为:", type(num_str))

num_str = int(num_str)  # 强制转换为整型
print("类型转换后，num_str 数据类型为:", type(num_str))

num_sum = num_int + num_str

print("num_int 与 num_str 相加结果为:", num_sum)
print("sum 数据类型为:", type(num_sum))
```

以上实例输出结果为：

```
num_int 数据类型为: <class 'int'>
类型转换前，num_str 数据类型为: <class 'str'>
类型转换后，num_str 数据类型为: <class 'int'>
num_int 与 num_str 相加结果为: 579
sum 数据类型为: <class 'int'>
```

以下几个内置的函数可以执行数据类型之间的转换。这些函数返回一个新的对象，表示转换的值。

| 函数 | 描述 |
| --- | --- |
| [int(x \[,base\])](https://www.runoob.com/python3/python3-func-int.html) | 将x转换为一个整数 |
| [float(x)](https://www.runoob.com/python3/python3-func-float.html) | 将x转换到一个浮点数 |
| [complex(real \[,imag\])](https://www.runoob.com/python3/python3-func-complex.html) | 创建一个复数 |
| [str(x)](https://www.runoob.com/python3/python3-func-str.html) | 将对象 x 转换为字符串 |
| [repr(x)](https://www.runoob.com/python3/python3-func-repr.html) | 将对象 x 转换为表达式字符串 |
| [eval(str)](https://www.runoob.com/python3/python3-func-eval.html) | 用来计算在字符串中的有效Python表达式,并返回一个对象 |
| [tuple(s)](https://www.runoob.com/python3/python3-func-tuple.html) | 将序列 s 转换为一个元组 |
| [list(s)](https://www.runoob.com/python3/python3-att-list-list.html) | 将序列 s 转换为一个列表 |
| [set(s)](https://www.runoob.com/python3/python3-func-set.html) | 转换为可变集合 |
| [dict(d)](https://www.runoob.com/python3/python3-func-dict.html) | 创建一个字典。d 必须是一个 (key, value)元组序列。 |
| [frozenset(s)](https://www.runoob.com/python3/python3-func-frozenset.html) | 转换为不可变集合 |
| [chr(x)](https://www.runoob.com/python3/python3-func-chr.html) | 将一个整数转换为一个字符 |
| [ord(x)](https://www.runoob.com/python3/python3-func-ord.html) | 将一个字符转换为它的整数值 |
| [hex(x)](https://www.runoob.com/python3/python3-func-hex.html) | 将一个整数转换为一个十六进制字符串 |
| [oct(x)](https://www.runoob.com/python3/python3-func-oct.html) | 将一个整数转换为一个八进制字符串 |
| [bool(x)](https://www.runoob.com/python3/python3-func-bool.html) | 将对象 x 转换为布尔值（True 或 False） |
| [bytes(\[source\[, encoding\[, errors\]\]\])](https://www.runoob.com/python3/python3-func-bytes.html) | 将对象转换为不可变字节序列 |
| [bytearray(\[source\[, encoding\[, errors\]\]\])](https://www.runoob.com/python3/python3-func-bytearray.html) | 将对象转换为可变字节数组 |
| [memoryview(obj)](https://www.runoob.com/python3/python3-func-memoryview.html) | 返回给定参数的内存视图对象（不复制数据） |
| [bin(x)](https://www.runoob.com/python3/python3-func-bin.html) | 将一个整数转换为一个二进制字符串 |
| [ascii(x)](https://www.runoob.com/python3/python3-func-ascii.html) | 返回对象的 ASCII 表示，非 ASCII 字符会被转义 |

---

## 相关

- [Python数据容器总结与对比](/posts/编程学习/python学习笔记/14-python数据容器总结与对比/)
- [Python3 条件控制](/posts/编程学习/python学习笔记/16-python3条件控制/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 隐式类型转换：Python 自动完成——两种类型运算时往"更宽"的类型上靠（`int` + `float` → `float`），避免数据丢失；数字直接加字符串则会报 `TypeError`，Python 不会偷偷替你转
2. 显式类型转换：把类型名当函数用，写法是 `目标类型(值)`，常用的有 `int()`、`float()`、`str()`、`bool()`
3. 转整数 `int(x)`：`int(2.8)` 得 2（小数部分直接截断，不是四舍五入）、`int("123")` 得 123；但 `int("3.14")` 会报 `ValueError`——字符串得是纯整数写法，带小数点要先 `float()` 再 `int()`
4. 转浮点 `float(x)`：`float(1)` 得 1.0、`float("3.14")` 得 3.14、`float("100")` 得 100.0，整数字符串也能直接转
5. 转字符串 `str(x)`：任何类型都能转（`str(123)`、`str(3.14)`、`str(True)`）；只有转成字符串之后，才能用 `+` 和别的字符串拼接
6. 转布尔 `bool(x)`：`0`、`0.0`、`""`、`[]`、`{}`、`None` 这些"空/零"的值都是 `False`，其余为 `True`；注意非空字符串 `"0"`、`"False"` 也是 `True`
7. 序列互转：`list(s)` 转列表、`tuple(s)` 转元组、`set(s)` 转集合；字符串会被拆成一个个字符，集合本身无序，转成列表/元组的顺序不保证
8. 转集合 `set()` 顺带去重：`set([1, 2, 2, 3, 3, 3])` 得 `{1, 2, 3}`，`set("aabbbccc")` 得 `{'a', 'b', 'c'}`
9. 转字典 `dict()`：用键值对序列创建，如 `dict([("name", "小明"), ("age", 18)])` 得 `{'name': '小明', 'age': 18}`
10. 字符与数值、进制互转：`chr(65)` 得 `'A'`、`ord('A')` 得 65；`hex(255)` 得 `'0xff'`、`oct(8)` 得 `'0o10'`、`bin()` 同理；另外 `eval("3 + 5 * 2")` 得 13（把字符串当表达式算），`repr(3.14)` 得 `'3.14'`

### 二、裸写题

- [x] **2-1 隐式类型转换**
  创建文件 `test_implicit.py`，完成以下操作：
  - 创建变量 `a = 10`（整数）和 `b = 3.14`（浮点数）
  - 计算 `c = a + b`
  - 用 `type()` 打印 `a`、`b`、`c` 的类型
  - 观察结果，解释为什么 `c` 是浮点数

  > **批改（2026-09-28）**：✅ 正确（`a`、`b`、`c` 类型实测 `<class 'int'> <class 'float'> <class 'float'>`；注释里也答出了"自动把整数转成浮点数，避免数据丢失"）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：两种不同类型直接相加时，Python 会自动往更宽的类型上靠，这一步不需要你写任何转换代码；用查看类型的函数逐个验证就行
  > **二级 · 方法**：两个变量直接用 `+` 相加；查看类型用内置函数 `type(x)`
  > **三级 · 骨架**：`c = a ____ b` / `print(f"c = {c}, 类型: {____(c)}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > a = 10
  > b = 3.14
  > c = a + b
  >
  > print(f"a = {a}, 类型: {type(a)}")
  > print(f"b = {b}, 类型: {type(b)}")
  > print(f"c = {c}, 类型: {type(c)}")
  > # 输出：
  > # a = 10, 类型: <class 'int'>
  > # b = 3.14, 类型: <class 'float'>
  > # c = 13.14, 类型: <class 'float'>
  > # 解释：Python 会自动将整数转换为浮点数，避免数据丢失
  > ```

- [x] **2-2 整数转换**
  创建文件 `test_int.py`，完成以下操作：
  - 将浮点数 `3.14` 转换为整数
  - 将字符串 `"123"` 转换为整数
  - 将字符串 `"3.14"` 转换为整数（观察是否报错）
  - 打印每个结果及其类型

  > **批改（2026-09-28）**：⚠️ `int(3.14)`=3、`int("123")`=123、`int(float("3.14"))`=3 都对；但 `int("3.14")` 那行被注释掉了，没有实际跑出报错（去掉注释会得到 `ValueError: invalid literal for int() with base 10: '3.14'`），另外 `print(a,b,d)` 只打了值、没打印类型（题面要求"打印每个结果及其类型"）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：转整数就是把值交给"整数类型函数"；小数会直接被切掉小数部分，字符串里带小数点这个函数不认，会报错
  > **二级 · 方法**：`int(x)` 转整数；`int(2.8)` 截断成 2；字符串要先 `float("3.14")` 转成 3.14 再 `int()`
  > **三级 · 骨架**：`a = ____(3.14)` / `b = int("____")` / `c = int(____("3.14"))`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > a = int(3.14)
  > b = int("123")
  > # c = int("3.14")  # 这行会报错，因为不能直接将小数字符串转为整数
  >
  > print(f"int(3.14) = {a}, 类型: {type(a)}")  # 3, <class 'int'>
  > print(f"int('123') = {b}, 类型: {type(b)}")  # 123, <class 'int'>
  > # 如果要转换 "3.14"，需要先转为 float 再转 int：
  > c = int(float("3.14"))
  > print(f"int(float('3.14')) = {c}")  # 3
  > ```

- [x] **2-3 浮点数转换**
  创建文件 `test_float.py`，完成以下操作：
  - 将整数 `100` 转换为浮点数
  - 将字符串 `"3.14"` 转换为浮点数
  - 将字符串 `"100"` 转换为浮点数
  - 打印每个结果及其类型

  > **批改（2026-09-28）**：⚠️ 第 3 项题面是 `float("100")`（字符串），你写成了 `c = float(100)`（整数），虽然结果都是 100.0，但没测到"字符串转浮点"这个点；另外 `print(a, b, c)` 只打印了值、没有打印类型（题面要求"打印每个结果及其类型"）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：转浮点也是"类型函数"套路，整数和小数字符串都能收；整数转出来会补上 `.0`
  > **二级 · 方法**：`float(x)`；`float(100)` → 100.0、`float("3.14")` → 3.14、`float("100")` → 100.0
  > **三级 · 骨架**：`a = ____(100)` / `b = float("3.14")` / `c = float("____")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > a = float(100)
  > b = float("3.14")
  > c = float("100")
  >
  > print(f"float(100) = {a}, 类型: {type(a)}")    # 100.0, <class 'float'>
  > print(f"float('3.14') = {b}, 类型: {type(b)}")  # 3.14, <class 'float'>
  > print(f"float('100') = {c}, 类型: {type(c)}")   # 100.0, <class 'float'>
  > ```

- [x] **2-4 字符串转换**
  创建文件 `test_str.py`，完成以下操作：
  - 将整数 `123` 转换为字符串
  - 将浮点数 `3.14` 转换为字符串
  - 将布尔值 `True` 转换为字符串
  - 打印每个结果及其类型，并用 `+` 拼接字符串

  > **批改（2026-09-28）**：✅ 正确（输出 `123 <class 'str'> 3.14 <class 'str'> True <class 'str'>`，用 `+` 拼接得到 `1233.14True`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：任何类型都能变成字符串，转完类型都是字符串；只有都变成字符串之后，才能用加号拼接
  > **二级 · 方法**：`str(x)` 转字符串；转换后 `a + b` 得到拼接结果
  > **三级 · 骨架**：`a = ____(123)` / `print(f"拼接: 数字是 {____}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-4
  > a = str(123)
  > b = str(3.14)
  > c = str(True)
  >
  > print(f"str(123) = '{a}', 类型: {type(a)}")      # '123', <class 'str'>
  > print(f"str(3.14) = '{b}', 类型: {type(b)}")      # '3.14', <class 'str'>
  > print(f"str(True) = '{c}', 类型: {type(c)}")      # 'True', <class 'str'>
  > print(f"拼接: 数字是 {a}")  # 拼接: 数字是 123
  > ```

- [x] **2-5 布尔值转换**
  创建文件 `test_bool.py`，测试下列值的真假，记录哪些是 `True`，哪些是 `False`：
  - `0`、`1`、`-1`
  - `""`、`"0"`、`"False"`
  - `[]`、`[0]`
  - `None`

  > **批改（2026-09-28）**：⚠️ 缺 `bool("0")`、`bool("False")`、`bool([0])` 三个测试点，而且第 2 项写的是 `bool(False)`（测的是布尔值 False，不是字符串 `"False"`）；已测的 0/1/-1/""/[]/None 输出 `False True True False False False` 都对，补上的三项应都是 `True`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**："空"和"零"一律是假，有内容一律是真；字符串要看有没有字符，容器要看有没有元素——哪怕里面装的是 0 或 False，只要非空就是真
  > **二级 · 方法**：`bool(x)` 转布尔；数字看是否为 0、字符串看是否为空串、列表看是否为空
  > **三级 · 骨架**：`print(f"bool('') = {____('')}")` / `print(f"bool([0]) = {bool([____])}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-5
  > print(f"bool(0) = {bool(0)}")       # False
  > print(f"bool(1) = {bool(1)}")       # True
  > print(f"bool(-1) = {bool(-1)}")     # True
  > print(f"bool('') = {bool('')}")     # False
  > print(f"bool('0') = {bool('0')}")   # True（非空字符串）
  > print(f"bool('False') = {bool('False')}")  # True（非空字符串）
  > print(f"bool([]) = {bool([])}")     # False
  > print(f"bool([0]) = {bool([0])}")   # True（非空列表）
  > print(f"bool(None) = {bool(None)}") # False
  > ```

- [x] **2-6 转列表**
  创建文件 `test_list.py`，完成以下操作：
  - 将字符串 `"hello"` 转换为列表
  - 将元组 `(1, 2, 3)` 转换为列表
  - 将集合 `{3, 1, 2}` 转换为列表（观察顺序）
  - 打印每个结果

  > **批改（2026-09-28）**：✅ 正确（`['h', 'e', 'l', 'l', 'o']`、`[1, 2, 3]`、`[1, 2, 3]`；集合是无序的，本次正好按 1、2、3 输出）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：把别的可迭代对象整个搬进列表；字符串会被拆成一个个字符，集合本来无序、顺序看运气
  > **二级 · 方法**：`list(s)`；`list("hello")` → `['h', 'e', 'l', 'l', 'o']`、`list((1, 2, 3))` → `[1, 2, 3]`
  > **三级 · 骨架**：`a = ____("hello")` / `b = list((1, 2, 3))` / `c = list({3, 1, 2})`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-6
  > a = list("hello")
  > b = list((1, 2, 3))
  > c = list({3, 1, 2})
  >
  > print(f"list('hello') = {a}")        # ['h', 'e', 'l', 'l', 'o']
  > print(f"list((1,2,3)) = {b}")        # [1, 2, 3]
  > print(f"list({3,1,2}) = {c}")        # 顺序可能不同，因为集合是无序的
  > ```

- [x] **2-7 转元组**
  创建文件 `test_tuple.py`，完成以下操作：
  - 将字符串 `"Python"` 转换为元组
  - 将列表 `[10, 20, 30]` 转换为元组
  - 打印每个结果及其类型

  > **批改（2026-09-28）**：⚠️ 题面是字符串 `"Python"`，你写成了小写 `"python"`，输出首字母变成 `'p'`（`('p', 'y', 't', 'h', 'o', 'n')`）；`tuple([10, 20, 30])` 得 `(10, 20, 30)`、类型 `<class 'tuple'>` 都对。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：跟转列表一个套路，只是换了个目标类型；字符串照样会被拆成一个个字符
  > **二级 · 方法**：`tuple(s)`；`tuple("Python")` → `('P', 'y', 't', 'h', 'o', 'n')`
  > **三级 · 骨架**：`a = ____("Python")` / `b = tuple([10, 20, ____])`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-7
  > a = tuple("Python")
  > b = tuple([10, 20, 30])
  >
  > print(f"tuple('Python') = {a}")       # ('P', 'y', 't', 'h', 'o', 'n')
  > print(f"tuple([10,20,30]) = {b}")     # (10, 20, 30)
  > print(f"类型: {type(b)}")             # <class 'tuple'>
  > ```

- [x] **2-8 转集合**
  创建文件 `test_set.py`，完成以下操作：
  - 将列表 `[1, 2, 2, 3, 3, 3]` 转换为集合（观察去重效果）
  - 将字符串 `"aabbbccc"` 转换为集合
  - 打印每个结果

  > **批改（2026-09-28）**：⚠️ 第 1 项题面是 `[1, 2, 2, 3, 3, 3]`，你写成了 `[1, 2, 4, 2, 3, 3, 3]`（多一个 4），输出 `{1, 2, 3, 4}`（应为 `{1, 2, 3}`）；第 2 项字符串也写成 `"aaabbbccc"`（多一个 a），去重结果 `{'a', 'b', 'c'}` 不受影响。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：转成集合会自动去掉重复元素，转换过程本身就是一次去重
  > **二级 · 方法**：`set(s)`；`set([1, 2, 2, 3, 3, 3])` → `{1, 2, 3}`、`set("aabbbccc")` → `{'a', 'b', 'c'}`
  > **三级 · 骨架**：`a = ____([1, 2, 2, 3, 3, 3])` / `b = set("____")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-8
  > a = set([1, 2, 2, 3, 3, 3])
  > b = set("aabbbccc")
  >
  > print(f"set([1,2,2,3,3,3]) = {a}")   # {1, 2, 3}（自动去重）
  > print(f"set('aabbbccc') = {b}")      # {'a', 'b', 'c'}（自动去重）
  > ```

- [x] **2-9 转字典**
  创建文件 `test_dict.py`，完成以下操作：
  - 用键值对列表创建字典：`[("name", "小明"), ("age", 18)]`
  - 用字典推导式创建字典：`{x: x**2 for x in range(1, 5)}`
  - 打印每个结果

  > **批改（2026-09-28）**：✅ 正确（`dict()` 创建 `{'name': '小明', 'age': 18}`、推导式得 `{1: 1, 2: 4, 3: 9, 4: 16}`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：从"键值对"出发建字典——要么给一串 (键, 值) 小元组，要么用字典推导式一行生成
  > **二级 · 方法**：`dict([("name", "小明"), ("age", 18)])`；推导式 `{x: x**2 for x in range(1, 5)}`
  > **三级 · 骨架**：`a = ____([("name", "小明"), ("age", 18)])` / `b = {x: x**2 for x in ____(1, 5)}`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-9
  > a = dict([("name", "小明"), ("age", 18)])
  > b = {x: x**2 for x in range(1, 5)}
  >
  > print(f"dict() 创建: {a}")    # {'name': '小明', 'age': 18}
  > print(f"推导式创建: {b}")      # {1: 1, 2: 4, 3: 9, 4: 16}
  > ```

- [x] **2-10 表达式求值与字符串表示**
  创建文件 `test_eval.py`，完成以下操作：
  - 把字符串 `"3 + 5 * 2"` 当作表达式计算，得到它的结果
  - 把浮点数 `3.14` 转成它的表达式字符串形式
  - 打印每个结果及其类型

  > **批改（2026-09-28）**：✅ 正确（`eval("3+5*2")` 得 `13 <class 'int'>`，`repr(3.14)` 得 `3.14 <class 'str'>`，值和类型都对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：一个是"把字符串当代码算"，一个是"把值变成能写进代码的字符串"；后者转出来的类型是字符串
  > **二级 · 方法**：`eval("3 + 5 * 2")` → 13；`repr(3.14)` → `'3.14'`
  > **三级 · 骨架**：`a = ____("3 + 5 * 2")` / `b = ____(3.14)`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-10
  > a = eval("3 + 5 * 2")
  > b = repr(3.14)
  >
  > print(f"eval('3 + 5 * 2') = {a}")   # 13
  > print(f"类型: {type(a)}")            # <class 'int'>
  > print(f"repr(3.14) = {b}")           # '3.14'
  > print(f"类型: {type(b)}")            # <class 'str'>
  > ```

- [x] **2-11 数字与字符互转**
  创建文件 `test_char.py`，完成以下操作：
  - 把数字 `65`、`97`、`48` 转换成对应的字符
  - 把字符 `'A'`、`'a'`、`'0'` 转换成对应的数字
  - 打印每个结果

  > **批改（2026-09-28）**：✅ 正确（`chr(65/97/48)` 输出 `A/a/0`，`ord("a"/"A"/"0")` 输出 `97/65/48`，六项都对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：字符和它的编码数字是一一对应的，两个方向各有一个函数；`65` 是 `'A'`、`97` 是 `'a'`、`48` 是 `'0'`
  > **二级 · 方法**：数字转字符 `chr(65)` → `'A'`；字符转数字 `ord('A')` → 65
  > **三级 · 骨架**：`print(f"chr(65) = {____(65)}")` / `print(f"ord('A') = {____('A')}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-11
  > print(f"chr(65) = {chr(65)}")   # A
  > print(f"chr(97) = {chr(97)}")   # a
  > print(f"chr(48) = {chr(48)}")   # 0
  >
  > print(f"ord('A') = {ord('A')}")  # 65
  > print(f"ord('a') = {ord('a')}")  # 97
  > print(f"ord('0') = {ord('0')}")  # 48
  > ```

- [x] **2-12 进制字符串转换**
  创建文件 `test_hex.py`，完成以下操作：
  - 把数字 `255`、`16`、`10` 转换成十六进制字符串
  - 把数字 `8`、`16`、`255` 转换成八进制字符串
  - 打印每个结果

  > **批改（2026-09-28）**：✅ 正确（`hex` 输出 `0xff/0x10/0xa`，`oct` 输出 `0o10/0o20/0o377`，六项都对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：转出来的带前缀标记进制（`0x` 是十六进制、`0o` 是八进制），结果类型是字符串
  > **二级 · 方法**：`hex(255)` → `'0xff'`；`oct(8)` → `'0o10'`
  > **三级 · 骨架**：`print(f"hex(255) = {____(255)}")` / `print(f"oct(8) = {____(8)}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-12
  > print(f"hex(255) = {hex(255)}")  # 0xff
  > print(f"hex(16) = {hex(16)}")    # 0x10
  > print(f"hex(10) = {hex(10)}")    # 0xa
  >
  > print(f"oct(8) = {oct(8)}")      # 0o10
  > print(f"oct(16) = {oct(16)}")    # 0o20
  > print(f"oct(255) = {oct(255)}")  # 0o377
  > ```
