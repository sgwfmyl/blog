---
title: Python函数基础
published: 2026-09-16
description: Python函数的定义、调用、参数、返回值及说明文档
tags:
  - Python
  - 函数
image: https://img.tsh520.cn/file/blog/post-covers/python-20-function.webp
order: 20
---

## 函数定义

函数是组织好的、可重复使用的、用来实现特定功能的代码片段。

### 定义语法

```python
# 定义函数
def 函数名(参数列表):
    函数体
    ......
    return 返回值
```

### 调用语法

```python
# 调用函数
函数名(参数)
```

### 示例

```python
# 定义函数
def out_line():
    print('-------------------------')

# 调用函数
out_line()
```

---

## 函数使用的注意事项

- 函数必须**先定义，在调用**
- 函数定义时，并不会执行，只有在调用函数时，函数体的逻辑才会运行
- 函数中通过**缩进**来描述归属关系
- 函数定义时的参数列表与返回值语句是**可有可无的**（由需求确定）

---

## 函数的参数与返回值

在定义函数时，根据业务需要，可以指定参数与返回值。

### 参数的概念

- **形参（形式参数）**：函数定义时括号里的参数，只能在函数内使用（局部变量）
- **实参（实际参数）**：函数在实际调用时传入的参数

### 示例：单参数函数

```python
# 计算圆的面积
def circle_area(r):
    area = 3.14 * r * r
    return area

# 调用函数
c_area = circle_area(10)
print(c_area)  # 314.0
```

### 示例：多参数函数

```python
# 计算长方形的面积
def rectangle_area(l, w):
    area = l * w
    return area

# 调用函数
r_area = rectangle_area(20, 10)
print(r_area)  # 200
```

### 注意事项

- 函数定义时如果有多个参数，多个参数之间使用**逗号（,）分隔**
- `return` 语句只有返回功能，而没有输出打印的功能，如果要输出，需要结合 `print()` 函数来实现

---

## 函数的多个返回值

函数可以有多个返回值，返回值会封装到元组中。

```python
def circle_area_len(r):
    return 3.14 * r * r, 2 * 3.14 * r

# 方式1：封装到元组中
al = circle_area_len(10)
print(al)  # (314.0, 62.800000000000004)

# 方式2：元组解包
area, len = circle_area_len(10)
print(area, len)  # 314.0 62.800000000000004
```

---

## 函数的说明文档

函数的说明文档（Docstring）是写在函数开头，用三个引号包裹的字符串，用于解释函数的功能、参数、返回值等信息，方便调用者清楚函数的具体作用及细节。

### 语法格式

```python
def 函数名(参数列表):
    """
    函数功能描述
    
    :param 参数名: 参数说明
    :return: 返回值说明
    """
    函数体
    return 返回值
```

### 示例

```python
def circle_area_len(r):
    """
    该函数用于根据圆的半径，计算圆的面积和圆的周长
    
    :param r: 圆的半径
    :return: 圆的面积，圆的周长
    """
    return 3.14 * r * r, 2 * 3.14 * r
```

### 查看函数说明文档

- 使用 `help` 函数：`help(circle_area_len)`
- 鼠标悬浮在函数上，自动展示（IDE推荐）

> 记住：好的文档，能让你的代码更容易理解、使用和维护！

---

## 总结口诀

- **定义用def，调用加括号**
- **形参定义时，实参调用时**
- **多参用逗号，返回用return**
- **多值返元组，解包用逗号**
- **文档写三引号，help可查看**

---

## 相关

- [Python3 迭代器与生成器](/posts/编程学习/python学习笔记/19-python3迭代器与生成器/)
- [Python函数进阶](/posts/编程学习/python学习笔记/21-python函数进阶/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 函数定义：`def 函数名(参数列表):` 加缩进的函数体，`return 返回值` 把结果交回调用处
2. 调用：写 `函数名(参数)`；函数**必须先定义后调用**，定义时函数体不会执行，调用时才运行
3. 形参（定义时括号里的参数，只能在函数内使用）与实参（调用时真正传进去的值）是两回事
4. 多个参数之间用**逗号**分隔；参数列表和返回值都是可有可无的，看需求
5. `return` 只有"返回"功能、没有打印功能，要看到结果得配合 `print()`
6. 函数执行到 `return` 就结束，后面的代码不再执行；没有 `return` 的函数返回 `None`
7. 多个返回值：写成 `return 值1, 值2`，实际返回一个**元组**；可以用两个变量接（元组解包），也可以用一个变量接整个元组
8. 说明文档（Docstring）：写在函数体开头、用三引号包裹，注明功能、`:param 参数名:`、`:return:`
9. 查看说明文档：`help(函数名)`；IDE 里鼠标悬浮在函数上也会自动展示
10. 口诀：定义用 def，调用加括号；形参定义时，实参调用时；多参用逗号，返回用 return；多值返元组，解包用逗号

### 二、裸写题

- [x] **2-1 分数等级判断**
  定义一个函数 `get_grade(score)`，根据传入的分数返回对应的等级：
  - 分数 >= 90：返回 "A"
  - 分数 >= 75：返回 "B"
  - 分数 >= 60：返回 "C"
  - 分数 < 60：返回 "D"

  > **批改（2026-09-28）**：✅ 正确（实测 93→A、90→A、80→B、75→B、65→C、60→C、59→D，四个分支都对；只是改用 `input()` 交互，未像参考答案那样一次跑多组）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：分数从高到低依次判断，命中一档就把对应字母交回去；最后一个分支兜住剩下的分数
  > **二级 · 方法**：`def 函数名(参数):` 定义；用 `if score >= 90:` / `elif` / `else:` 分档；每档 `return "A"` 这样的字符串
  > **三级 · 骨架**：`def get_grade(score):` / `    if score >= ____:` / `        return "A"` / `    elif ...: ` / `    else: return "____"`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > def get_grade(score):
  >     if score >= 90:
  >         return "A"
  >     elif score >= 75:
  >         return "B"
  >     elif score >= 60:
  >         return "C"
  >     else:
  >         return "D"
  >
  > print(get_grade(93))   # A
  > print(get_grade(80))   # B
  > print(get_grade(65))   # C
  > print(get_grade(40))   # D
  > ```

- [x] **2-2 回文串判断**
  定义一个函数 `is_palindrome(s)`，判断字符串是否是回文串（正读和反读相同），返回 bool 值。
  示例回文串："level"、"radar"、"黄山落叶松叶落山黄"、"12321"

  > **批改（2026-09-28）**：⚠️ 函数本身正确，但只测了 `is_palindrome("level")` 一个回文用例（输出 True），没有反例；建议补 `print(is_palindrome("hello"))`（应为 False）和中文/数字用例。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：回文就是"原串"和"把它整个倒过来"完全一样，所以先得到倒序字符串，再和原串比一比
  > **二级 · 方法**：字符串切片 `s[::-1]` 得到倒序；返回比较结果 `s == s[::-1]`（比较运算本身就是布尔值，不必再写 if）
  > **三级 · 骨架**：`def is_palindrome(s):` / `    return s == s[____]`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > def is_palindrome(s):
  >     return s == s[::-1]
  >
  > print(is_palindrome("level"))          # True
  > print(is_palindrome("hello"))          # False
  > print(is_palindrome("黄山落叶松叶落山黄"))  # True
  > print(is_palindrome("12321"))          # True
  > print(is_palindrome("12345"))          # False
  > ```

- [x] **2-3 时间转换**
  定义一个函数 `time_convert(seconds)`，将传入的秒数转换为小时、分钟、秒，并返回格式化的字符串。

  > **批改（2026-09-28）**：⚠️ 换算逻辑和输出正确（772 → 0 小时 12 分钟 52 秒），但有两点差在题面：函数名拼成了 `time_conver`（要求 `time_convert`），且只测了小时为 0 的 772；建议改用 `time_convert(3772)` 验证小时位。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：先除出整小时数（不够 1 小时的零头留下继续算）；剩下的秒按同样的办法拆出分钟和秒
  > **二级 · 方法**：整除 `//` 取商、取余 `%` 拿余数——`hours = seconds // 3600`、`minutes = (seconds % 3600) // 60`、`seconds = (seconds % 3600) % 60`；最后用 f-string 拼成 `f"{hours} 小时 {minutes} 分钟 {seconds} 秒"`
  > **三级 · 骨架**：`hours = seconds ____ 3600` / `minutes = (seconds % 3600) ____ 60` / `return f"{____} 小时 {minutes} 分钟 {seconds} 秒"`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > def time_convert(seconds):
  >     hours = seconds // 3600
  >     minutes = (seconds % 3600) // 60
  >     seconds = (seconds % 3600) % 60
  >     return f"{hours} 小时 {minutes} 分钟 {seconds} 秒"
  >
  > print(time_convert(3772))  # 1 小时 2 分钟 52 秒
  > ```
