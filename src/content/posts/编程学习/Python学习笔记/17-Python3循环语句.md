---
title: Python3 循环语句
published: 2026-09-15
description: Python3 while、for 循环、break、continue 和 range() 函数
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-17-loop.webp
order: 17
---
本章节将为大家介绍 Python 循环语句的使用。

Python 中的循环语句有 for 和 while。

Python 循环语句的控制结构图如下所示：

![](https://img.tsh520.cn/file/blog/article/loop.png)

## 循环语句

### 循环控制关键字与方法

| 关键字 / 函数 | 说明 | 示例 |
| --- | --- | --- |
| `for` | 迭代循环，用于遍历序列或可迭代对象 | `for i in list:` |
| `while` | 条件循环，条件为 True 时持续执行 | `while x > 0:` |
| `break` | 立即终止当前循环 | `break` |
| `continue` | 跳过本次循环剩余代码，进入下一次迭代 | `continue` |
| `else（循环）` | 循环正常结束（未被 break）时执行 | `for i in range(3): ... else: ...` |
| `pass` | 循环中的占位语句（空操作） | `for i in range(5): pass` |
| `range()` | 生成整数序列，常与 for 循环配合使用 | `range(0, 5)` |
| `enumerate()` | 遍历时同时获取索引和值 | `for i, v in enumerate(list):` |

---

## while 循环

Python 中 while 语句的一般形式：

```
while 判断条件(condition)：
    执行语句(statements)……
```

执行流程图如下：

![](https://img.tsh520.cn/file/blog/article/886A6E10-58F1-4A9B-8640-02DBEFF0EF9A.jpg)

执行 Gif 演示：

![](https://img.tsh520.cn/file/blog/article/006faQNTgw1f5wnm06h3ug30ci08cake.gif)

同样需要注意冒号和缩进。另外，在 Python 中没有 do..while 循环。

以下实例使用了 while 来计算 1 到 100 的总和：

## 实例

```python
n = 100
sum = 0
counter = 1
while counter <= n:
    sum = sum + counter
    counter += 1
print("1 到 %d 之和为: %d" % (n, sum))
```

执行结果如下：

```
1 到 100 之和为: 5050
```

### 无限循环

我们可以通过设置条件表达式永远不为 false 来实现无限循环，实例如下：

## 实例

```python
var = 1
while var == 1:
    num = int(input("输入一个数字:"))
    print("你输入的数字是: ", num)
print("Good bye!")
```

执行以上脚本，输出结果如下：

```
输入一个数字  :5
你输入的数字是:  5
输入一个数字  :
```

你可以使用 **CTRL+C** 来退出当前的无限循环。

无限循环在服务器上客户端的实时请求非常有用。

### while 循环使用 else 语句

如果 while 后面的条件语句为 false 时，则执行 else 的语句块。

语法格式如下：

```python
while <expr>:
    <statement(s)>
else:
    <additional_statement(s)>
```

expr 条件语句为 true 则执行 statement(s) 语句块，如果为 false，则执行 additional_statement(s)。

循环输出数字，并判断大小：

## 实例

```python
count = 0
while count < 5:
    print(count, " 小于 5")
    count = count + 1
else:
    print(count, " 大于或等于 5")
```

执行以上脚本，输出结果如下：

```
0  小于 5
1  小于 5
2  小于 5
3  小于 5
4  小于 5
5  大于或等于 5
```

### 简单语句组

类似 if 语句的语法，如果你的 while 循环体中只有一条语句，你可以将该语句与 while 写在同一行中，如下所示：

## 实例

```python
flag = 1
while (flag):
    print('欢迎访问菜鸟教程!')
print("Good bye!")
```

**注意：** 以上的无限循环你可以使用 CTRL+C 来中断循环。

执行以上脚本，输出结果如下：

```
欢迎访问菜鸟教程!
欢迎访问菜鸟教程!
欢迎访问菜鸟教程!
欢迎访问菜鸟教程!
欢迎访问菜鸟教程!
……
```

---

## for 语句

Python for 循环可以遍历任何可迭代对象，如一个列表或者一个字符串。

for循环的一般格式如下：

for \<variable> in \<sequence>: \<statements> else: \<statements>

**流程图：**

![](https://img.tsh520.cn/file/blog/article/A71EC47E-BC53-4923-8F88-B027937EE2FF.jpg)

Python for 循环实例：

## 实例

```python
sites = ["Baidu", "Google", "Runoob", "Taobao"]
for site in sites:
    print(site)
```

以上代码执行输出结果为：

```
Baidu
Google
Runoob
Taobao
```

也可用于打印字符串中的每个字符：

## 实例

```python
word = 'runoob'
for letter in word:
    print(letter)
```

以上代码执行输出结果为：

```
r
u
n
o
o
b
```

整数范围值可以配合 range() 函数使用：

## 实例

```python
for number in range(1, 6):
    print(number)
```

以上代码执行输出结果为：

```
1
2
3
4
5
```

---

## for...else

在 Python 中，for...else 语句用于在循环结束后执行一段代码。

语法格式如下：

```
for item in iterable:
    # 循环主体
else:
    # 循环结束后执行的代码
```

当循环执行完毕（即遍历完 iterable 中的所有元素）后，会执行 else 子句中的代码，如果在循环过程中遇到了 break 语句，则会中断循环，此时不会执行 else 子句。

## 实例

```python
for x in range(6):
    print(x)
else:
    print("Finally finished!")
```

执行脚本后，输出结果为：

```
0
1
2
3
4
5
Finally finished!
```

以下 for 实例中使用了 break 语句，break 语句用于跳出当前循环体，不会执行 else 子句：

## 实例

```python
sites = ["Baidu", "Google", "Runoob", "Taobao"]
for site in sites:
    if site == "Runoob":
        print("菜鸟教程!")
        break
    print("循环数据 " + site)
else:
    print("没有循环数据!")
print("完成循环!")
```

执行脚本后，在循环到 "Runoob"时会跳出循环体：

```
循环数据 Baidu
循环数据 Google
菜鸟教程!
完成循环!
```

---

## range() 函数

如果你需要遍历数字序列，可以使用内置 range() 函数。它会生成数列，例如:

## 实例

```python
>>> for i in range(5):
...     print(i)
...
0
1
2
3
4
```

你也可以使用 range() 指定区间的值：

## 实例

```python
>>> for i in range(5, 9):
...     print(i)
5
6
7
8
>>>
```

也可以使 range() 以指定数字开始并指定不同的增量(甚至可以是负数，有时这也叫做'步长'):

## 实例

```python
>>> for i in range(0, 10, 3):
...     print(i)
0
3
6
9
>>>
```

负数：

## 实例

```python
>>> for i in range(-10, -100, -30):
...     print(i)
-10
-40
-70
>>>
```

您可以结合 range() 和 len() 函数以遍历一个序列的索引,如下所示:

## 实例

```python
>>> a = ['Google', 'Baidu', 'Runoob', 'Taobao', 'QQ']
>>> for i in range(len(a)):
...     print(i, a[i])
...
0 Google
1 Baidu
2 Runoob
3 Taobao
4 QQ
>>>
```

还可以使用 range() 函数来创建一个列表：

## 实例

```python
>>> list(range(5))
[0, 1, 2, 3, 4]
>>>
```

更多关于 range() 函数用法参考： [https://www.runoob.com/python3/python3-func-range.html](https://www.runoob.com/python3/python3-func-range.html)

---

## break 和 continue 语句及循环中的 else 子句

**break 执行流程图：**

![](https://img.tsh520.cn/file/blog/article/E5A591EF-6515-4BCB-AEAA-A97ABEFC5D7D.jpg)

**continue 执行流程图：**

![](https://img.tsh520.cn/file/blog/article/8962A4F1-B78C-4877-B328-903366EA1470.jpg)

while 语句代码执行过程：

![](https://img.tsh520.cn/file/blog/article/python-while.webp)

for 语句代码执行过程：

![](https://img.tsh520.cn/file/blog/article/break-continue-536.png)

**break** 语句可以跳出 for 和 while 的循环体。如果你从 for 或 while 循环中终止，任何对应的循环 else 块将不执行。

**continue** 语句被用来告诉 Python 跳过当前循环块中的剩余语句，然后继续进行下一轮循环。

### 实例

while 中使用 break：

## 实例

```python
n = 5
while n > 0:
    n -= 1
    if n == 2:
        break
    print(n)
print('循环结束。')
```

输出结果为：

```
4
3
循环结束。
```

while 中使用 continue：

## 实例

```python
n = 5
while n > 0:
    n -= 1
    if n == 2:
        continue
    print(n)
print('循环结束。')
```

输出结果为：

```
4
3
1
0
循环结束。
```

更多实例如下：

## 实例

```python
for letter in 'Runoob':
    if letter == 'b':
        break
    print('当前字母为:', letter)

var = 10
while var > 0:
    print('当前变量值为:', var)
    var = var - 1
    if var == 5:
        break
print("Good bye!")
```

执行以上脚本输出结果为：

```
当前字母为 : R
当前字母为 : u
当前字母为 : n
当前字母为 : o
当前字母为 : o
当前变量值为 : 10
当前变量值为 : 9
当前变量值为 : 8
当前变量值为 : 7
当前变量值为 : 6
Good bye!
```

以下实例循环字符串 Runoob，碰到字母 o 跳过输出：

## 实例

```python
for letter in 'Runoob':
    if letter == 'o':
        continue
    print('当前字母:', letter)

var = 10
while var > 0:
    var = var - 1
    if var == 5:
        continue
    print('当前变量值:', var)
print("Good bye!")
```

执行以上脚本输出结果为：

```
当前字母 : R
当前字母 : u
当前字母 : n
当前字母 : b
当前变量值 : 9
当前变量值 : 8
当前变量值 : 7
当前变量值 : 6
当前变量值 : 4
当前变量值 : 3
当前变量值 : 2
当前变量值 : 1
当前变量值 : 0
Good bye!
```

循环语句可以有 else 子句，它在穷尽列表(以for循环)或条件变为 false (以while循环)导致循环终止时被执行，但循环被 break 终止时不执行。

如下实例用于查询质数的循环例子:

## 实例

```python
for n in range(2, 10):
    for x in range(2, n):
        if n % x == 0:
            print(n, '等于', x, '*', n//x)
            break
    else:
        print(n, ' 是质数')
```

执行以上脚本输出结果为：

```
2  是质数
3  是质数
4 等于 2 * 2
5  是质数
6 等于 2 * 3
7  是质数
8 等于 2 * 4
9 等于 3 * 3
```

---

## pass 语句

Python pass是空语句，是为了保持程序结构的完整性。

pass 不做任何事情，一般用做占位语句，如下实例

## 实例

```python
>>> while True:
...     pass
```

最小的类:

## 实例

```python
>>> class MyEmptyClass:
...     pass
```

以下实例在字母为 o 时 执行 pass 语句块:

## 实例

```python
for letter in 'Runoob':
    if letter == 'o':
        pass
        print('执行 pass 块')
    print('当前字母:', letter)
print("Good bye!")
```

执行以上脚本输出结果为：

```
当前字母 : R
当前字母 : u
当前字母 : n
执行 pass 块
当前字母 : o
执行 pass 块
当前字母 : o
当前字母 : b
Good bye!
```

---

## 相关

- [Python3 条件控制](/posts/编程学习/python学习笔记/16-python3条件控制/)
- [Python 推导式](/posts/编程学习/python学习笔记/18-python推导式/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 两种循环：`while 条件:`（条件为真就一直转）和 `for 变量 in 可迭代对象:`（遍历序列，逐个取值）
2. 通用要点：循环头后面要写**冒号**，循环体靠**缩进**；Python 里没有 do...while
3. `range()` 生成整数序列：`range(5)` → 0~4、`range(1, 11)` → 1~10（含头不含尾）、`range(0, 10, 2)` 指定步长、`range(10, 0, -1)` 倒着走；`list(range(5))` 还能直接得到列表
4. `break`：立刻终止整个循环（for/while 都能用），循环的 `else` 子句也不会执行
5. `continue`：跳过本轮剩下的语句，直接进入下一轮
6. `for...else` / `while...else`：循环**正常结束**（没被 break 打断）时执行 else，被 break 终止时不执行
7. `enumerate()`：遍历时同时拿到下标和值，写成 `for i, v in enumerate(列表):`
8. `pass`：空语句，什么都不做，只用来占位（写循环、类、函数的空实现时保证语法完整）
9. 无限循环：`while True:` 会一直转，要靠 `break` 退出（命令行里可以用 Ctrl+C 强停）
10. 嵌套循环：外层转一圈，内层转满一轮；想在一行里连续打印不换行，用 `print(值, end=" ")` 控制结尾

### 二、裸写题

- [x] **2-1 while 循环基础**
  创建文件 `test_while.py`，完成以下操作：
  - 用 while 循环打印 1 到 10 的数字
  - 每个数字换行输出

  > **批改（2026-09-28）**：✅ 正确（实测输出 1~10 每个数字一行，`while i <= 10` 和 `i += 1` 都对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：循环条件写成"还没数到 10"，每转一圈打印一次、再把计数器加一；计数器别忘了在循环外面先起个步
  > **二级 · 方法**：`while 条件:` 循环体里 `print(数字)`，再 `i += 1`（等价于 `i = i + 1`）
  > **三级 · 骨架**：`i = 1` / `while i ____ 10:` / `    print(i)` / `    i ____ 1`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > i = 1
  > while i <= 10:
  >     print(i)
  >     i += 1
  > ```

- [x] **2-2 for 循环遍历**
  创建文件 `test_for.py`，完成以下操作：
  - 用 for 循环遍历列表 `["苹果", "香蕉", "橘子", "葡萄"]`
  - 打印每个元素

  > **批改（2026-09-28）**：✅ 正确（实测 `苹果/香蕉/橘子/葡萄` 逐个打印，顺序和题面列表一致）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：for 循环会自发地一个接一个把元素交给你，不需要自己数下标
  > **二级 · 方法**：`for 变量 in 序列:`，循环体里直接打印这个变量
  > **三级 · 骨架**：`for fruit ____ fruits:` / `    print(____)`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > fruits = ["苹果", "香蕉", "橘子", "葡萄"]
  > for fruit in fruits:
  >     print(fruit)
  > ```

- [x] **2-3 range() 函数**
  创建文件 `test_range.py`，完成以下操作：
  - 用 range(1, 11) 打印 1 到 10
  - 用 range(0, 10, 2) 打印 0 到 10 的偶数
  - 用 range(10, 0, -1) 倒序打印 10 到 1

  > **批改（2026-09-28）**：✅ 正确（三段输出都对：1~10、0 2 4 6 8 10、倒序 10~1）；第 2 段你写的是 `range(0, 11, 2)`（题面字面是 `range(0, 10, 2)`），把"0 到 10 的偶数"里的 10 也打出来了，与题面说明一致。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：这个函数管"从哪开始、到哪结束、每次迈多大"，结束值本身取不到；步长写成负数就能倒着走
  > **二级 · 方法**：`range(开始, 结束, 步长)`——`range(1, 11)`、`range(0, 10, 2)`、`range(10, 0, -1)`
  > **三级 · 骨架**：`for i in range(1, ____):` / `for i in range(0, 10, ____):` / `for i in range(10, ____, -1):`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > print("1到10:")
  > for i in range(1, 11):
  >     print(i, end=" ")
  > print()
  >
  > print("偶数:")
  > for i in range(0, 10, 2):
  >     print(i, end=" ")
  > print()
  >
  > print("倒序:")
  > for i in range(10, 0, -1):
  >     print(i, end=" ")
  > print()
  > ```

- [x] **2-4 break 跳出循环**
  创建文件 `test_break.py`，完成以下操作：
  - 用 while 循环，从 1 开始累加
  - 当总和超过 100 时，用 break 跳出循环
  - 打印最后加的数字和总和

  > **批改（2026-09-28）**：⚠️ 总和 105 正确（实测累加到 14 时超过 100 跳出），但题面要求"打印最后加的数字和总和"，你只打印了 105，缺最后加的数字 14（你的 `i` 就是 14，应写成 `print(f"最后加的数字: {i}")` 和 `print(f"总和: {z}")`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：先让循环"永远为真"不停加下去，加到超过 100 的瞬间立刻跳出；跳出后把这两个数字都打印出来
  > **二级 · 方法**：`while True:` 配 `break`；累加 `total += i`
  > **三级 · 骨架**：`while ____:` / `    i += 1` / `    total += i` / `    if total > 100:` / `        ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-4
  > total = 0
  > i = 0
  > while True:
  >     i += 1
  >     total += i
  >     if total > 100:
  >         break
  > print(f"最后加的数字: {i}")
  > print(f"总和: {total}")
  > ```

- [x] **2-5 continue 跳过本次**
  创建文件 `test_continue.py`，完成以下操作：
  - 用 for 循环打印 1 到 10
  - 如果数字是 5，用 continue 跳过不打印

  > **批改（2026-09-28）**：✅ 正确（实测输出 `1 2 3 4 6 7 8 9 10`，5 被 `continue` 跳过；末尾没换行，参考答案补了一行 `print()`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：遇到 5 就"这一轮到此为止"，后面的打印语句不执行，直接进入下一轮
  > **二级 · 方法**：`if i == 5:` 之后写 `continue`（跳过本次循环的剩余代码）
  > **三级 · 骨架**：`for i in range(1, 11):` / `    if i == ____:` / `        ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-5
  > for i in range(1, 11):
  >     if i == 5:
  >         continue
  >     print(i, end=" ")
  > print()
  > ```

- [x] **2-6 for...else 语句** ❌
  创建文件 `test_for_else.py`，完成以下操作：
  - 在列表 `[1, 3, 5, 7, 9]` 中查找数字 6
  - 如果找到，打印"找到了"
  - 如果没找到（循环正常结束），打印"没找到"

  > **批改（2026-09-28）**：❌ 你的 `else` 缩进在 `if` 那一层，成了 if-else，不是题面要求的 for...else；它是靠 `i == nums[-1]`（走到最后一个元素）才碰巧输出 `没找到`。正确写法是 `else:` 与 `for` 对齐：循环体里 `if num == 6: print("找到了"); break`，循环外面写 `else: print("没找到")`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：找到就打印并跳出，跳出了就不会走"没找到"那一支；只有循环从头到尾跑完也没跳出，才执行循环自带的 else
  > **二级 · 方法**：`for...else:`——`else` 要和 `for` 对齐（别缩进到 `if` 那一层），循环里命中时 `break`
  > **三级 · 骨架**：`for num in nums:` / `    if num == 6:` / `        print("找到了")` / `        ____` / `else:`（与 for 对齐）/ `    print("没找到")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-6
  > nums = [1, 3, 5, 7, 9]
  > for num in nums:
  >     if num == 6:
  >         print("找到了")
  >         break
  > else:
  >     print("没找到")
  > ```

- [x] **2-7 嵌套循环**
  创建文件 `test_nested.py`，完成以下操作：
  - 用嵌套 for 循环打印乘法表（1-5）
  - 输出格式：`1x1=1`、`1x2=2`...`5x5=25`

  > **批改（2026-09-28）**：✅ 正确（实测 5×5 乘法表全部输出，行内用 `end="\t"` 分隔、每行结尾 `print()` 换行，格式与题面一致）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：外层管行、内层管列——内层每转一圈打印一个算式且不换行，内层转完后由外层补一个换行
  > **二级 · 方法**：两层 `for i in range(1, 6):` 嵌套；行内用 `print(f"{i}x{j}={i*j}", end="\t")` 不换行，一行结束再 `print()` 换行
  > **三级 · 骨架**：`for i in range(1, 6):` / `    for j in range(1, ____):` / `        print(f"{i}x{j}={i*j}", end="____")` / `    ____()`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-7
  > for i in range(1, 6):
  >     for j in range(1, 6):
  >         print(f"{i}x{j}={i*j}", end="\t")
  >     print()
  > ```
