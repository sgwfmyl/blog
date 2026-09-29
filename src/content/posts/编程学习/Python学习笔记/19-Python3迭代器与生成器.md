---
title: Python3 迭代器与生成器
published: 2026-09-16
description: Python3 迭代器、iter()、next() 和 yield 生成器
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-19-iterator.webp
order: 19
---
## 迭代器

迭代是 Python 最强大的功能之一，是访问集合元素的一种方式。

迭代器是一个可以记住遍历的位置的对象。

迭代器对象从集合的第一个元素开始访问，直到所有的元素被访问完结束。迭代器只能往前不会后退。

迭代器有两个基本的方法： **iter()** 和 **next()** 。

字符串，列表或元组对象都可用于创建迭代器：

## 实例(Python 3.0+)

```python
>>> list = [1, 2, 3, 4]
>>> it = iter(list)  # 创建迭代器对象
>>> print(next(it))  # 输出迭代器的下一个元素
1
>>> print(next(it))
2
>>>
```

迭代器对象可以使用常规for语句进行遍历：

## 实例(Python 3.0+)

```python
list = [1, 2, 3, 4]
it = iter(list)
for x in it:
    print(x, end=" ")
```

执行以上程序，输出结果如下：

```
1 2 3 4
```

也可以使用 next() 函数：

## 实例(Python 3.0+)

```python
import sys
list = [1, 2, 3, 4]
it = iter(list)
while True:
    try:
        print(next(it))
    except StopIteration:
        sys.exit()
```

执行以上程序，输出结果如下：

```
1
2
3
4
```

### 创建一个迭代器

把一个类作为一个迭代器使用需要在类中实现两个方法 \_\_iter\_\_() 与 \_\_next\_\_() 。

如果你已经了解的面向对象编程，就知道类都有一个构造函数，Python 的构造函数为 \_\_init\_\_(), 它会在对象初始化的时候执行。

更多内容查阅： [Python3 面向对象](https://www.runoob.com/python3/python3-class.html)

\_\_iter\_\_() 方法返回一个特殊的迭代器对象， 这个迭代器对象实现了 \_\_next\_\_() 方法并通过 StopIteration 异常标识迭代的完成。

\_\_next\_\_() 方法（Python 2 里是 next()）会返回下一个迭代器对象。

创建一个返回数字的迭代器，初始值为 1，逐步递增 1：

## 实例(Python 3.0+)

```python
class MyNumbers:
    def __iter__(self):
        self.a = 1
        return self

    def __next__(self):
        x = self.a
        self.a += 1
        return x

myclass = MyNumbers()
myiter = iter(myclass)

print(next(myiter))
print(next(myiter))
print(next(myiter))
print(next(myiter))
print(next(myiter))
```

执行输出结果为：

```
1
2
3
4
5
```

### StopIteration

StopIteration 异常用于标识迭代的完成，防止出现无限循环的情况，在 \_\_next\_\_() 方法中我们可以设置在完成指定循环次数后触发 StopIteration 异常来结束迭代。

在 20 次迭代后停止执行：

## 实例(Python 3.0+)

```python
class MyNumbers:
    def __iter__(self):
        self.a = 1
        return self

    def __next__(self):
        if self.a <= 20:
            x = self.a
            self.a += 1
            return x
        else:
            raise StopIteration

myclass = MyNumbers()
myiter = iter(myclass)

for x in myiter:
    print(x)
```

执行输出结果为：

```
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
```

---

## 生成器

在 Python 中，使用了 **yield** 的函数被称为生成器（generator）。

**yield** 是一个关键字，用于定义生成器函数，生成器函数是一种特殊的函数，可以在迭代过程中逐步产生值，而不是一次性返回所有结果。

跟普通函数不同的是，生成器是一个返回迭代器的函数，只能用于迭代操作，更简单点理解生成器就是一个迭代器。

当在生成器函数中使用 **yield** 语句时，函数的执行将会暂停，并将 **yield** 后面的表达式作为当前迭代的值返回。

然后，每次调用生成器的 **next()** 方法或使用 **for** 循环进行迭代时，函数会从上次暂停的地方继续执行，直到再次遇到 **yield** 语句。这样，生成器函数可以逐步产生值，而不需要一次性计算并返回所有结果。

调用一个生成器函数，返回的是一个迭代器对象。

下面是一个简单的示例，展示了生成器函数的使用：

## 实例

```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1

generator = countdown(5)
print(next(generator))
print(next(generator))
print(next(generator))
for value in generator:
    print(value)
```

以上实例中， **countdown** 函数是一个生成器函数。它使用 yield 语句逐步产生从 n 到 1 的倒数数字。在每次调用 yield 语句时，函数会返回当前的倒数值，并在下一次调用时从上次暂停的地方继续执行。

通过创建生成器对象并使用 next() 函数或 for 循环迭代生成器，我们可以逐步获取生成器函数产生的值。在这个例子中，我们首先使用 next() 函数获取前三个倒数值，然后通过 for 循环获取剩下的两个倒数值。

生成器函数的优势是它们可以按需生成值，避免一次性生成大量数据并占用大量内存。此外，生成器还可以与其他迭代工具（如for循环）无缝配合使用，提供简洁和高效的迭代方式。

执行以上程序，输出结果如下：

```
5
4
3
2
1
```

以下实例使用 yield 实现斐波那契数列：

## 实例(Python 3.0+)

```python
import sys

def fibonacci(n):
    a, b, counter = 0, 1, 0
    while True:
        if counter > n:
            return
        yield a
        a, b = b, a + b
        counter += 1

f = fibonacci(10)
while True:
    try:
        print(next(f), end=" ")
    except StopIteration:
        sys.exit()
```

执行以上程序，输出结果如下：

```
0 1 1 2 3 5 8 13 21 34 55
```

---

## 相关

- [Python 推导式](/posts/编程学习/python学习笔记/18-python推导式/)
- [Python函数基础](/posts/编程学习/python学习笔记/20-python函数基础/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 迭代器：能"记住遍历位置"的对象，只能往前走、不能后退；字符串、列表、元组都能转成迭代器
2. 两个基本操作：`iter(可迭代对象)` 创建迭代器；`next(迭代器)` 取出下一个元素（取完还取会抛 `StopIteration`）
3. 迭代器也能直接被 `for` 循环遍历；迭代器是"一次性"的，取过的元素不会再来
4. 自定义迭代器类要实现两个方法：`__iter__()`（初始化并返回迭代器对象，通常是 `return self`）和 `__next__()`（每次调用返回下一个值）
5. `StopIteration` 异常：迭代完成的信号——`__next__()` 里没有更多值时就 `raise StopIteration`，`for` 循环靠它知道该停下
6. 生成器：函数里用了 `yield`，它就是生成器函数；调用它返回的是**生成器对象**（一种迭代器），函数体不会立刻执行
7. `yield` 的作用：返回本次迭代的值并**暂停**函数，下次取下一个值（`next()` 或下一轮 for）时从暂停处继续
8. 生成器的好处：按需产生值，不必一次性算完、存下所有结果，省内存；并且能和其他迭代工具（如 for）无缝配合
9. 常见例子：倒计时 `countdown(n)` 用 `yield n` 逐步倒数；斐波那契用 `a, b = b, a + b` 边算边 `yield`

### 二、裸写题

- [x] **2-1 基本迭代器使用**
  创建文件 `test_iter.py`，完成以下操作：
  - 用 `iter()` 创建列表 `[1, 2, 3, 4, 5]` 的迭代器
  - 用 `next()` 逐个获取元素
  - 用 `for` 循环遍历剩余元素

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：先把列表变成"逐个别取"的迭代器，取走几个之后再用循环把剩下的取完——取过的不会重复出现
  > **二级 · 方法**：`it = iter(lst)` 创建迭代器；`next(it)` 取下一个；剩下的交给 `for x in it:`
  > **三级 · 骨架**：`it = ____(lst)` / `print(____(it))` / `for x in ____:`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > lst = [1, 2, 3, 4, 5]
  > it = iter(lst)
  >
  > print(next(it))  # 1
  > print(next(it))  # 2
  > print(next(it))  # 3
  >
  > for x in it:
  >     print(x, end=" ")  # 4 5
  > print()
  > ```

- [ ] **2-2 自定义迭代器类**
  创建文件 `test_class.py`，完成以下操作：
  - 创建一个迭代器类，生成 1-10 的数字

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：写一个"会自己数数"的类：每次别人来要值就吐出一个、内部计数加一，数到 10 以后发出"结束"信号
  > **二级 · 方法**：实现迭代器协议的两个方法——`__iter__()`（初始化迭代器，返回 `self`）、`__next__()`（每次返回下一个值，没有值时 `raise StopIteration` 异常）——这就是 Python 的迭代器协议，实现了这两个方法的类就是迭代器
  > **三级 · 骨架**：`class MyNumbers:` / `    def ____(self):` / `        self.a = 1` / `        return ____` / `    def ____(self):` / `        if self.a <= 10: ... else: raise ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > class MyNumbers:
  >     def __iter__(self):
  >         self.a = 1      # 初始化计数器
  >         return self     # 返回迭代器对象
  >
  >     def __next__(self):
  >         if self.a <= 10:
  >             x = self.a
  >             self.a += 1
  >             return x
  >         else:
  >             raise StopIteration  # 没有更多值时抛出异常
  >
  > myclass = MyNumbers()
  > for x in myclass:
  >     print(x, end=" ")
  > print()
  > ```

- [x] **2-3 生成器函数**
  创建文件 `test_generator.py`，完成以下操作：
  - 用 `yield` 创建一个生成器，生成 1-10 的平方数

  > **批改（2026-09-28）**：✅ 正确（`next()` 取到 1、4 后 `for` 取完剩下 9~100，1-10 的平方数全部输出）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：把"算平方"放进循环里，每算出一个就交出去一个并暂停，等下次被要值时继续算下一个
  > **二级 · 方法**：`yield` 关键字暂停函数执行并返回一个值，下次调用时从暂停处继续；含 `yield` 的函数就是生成器函数，调用后返回生成器对象；可以用 `next()` 或 `for` 循环逐步获取值
  > **三级 · 骨架**：`def squares(n):` / `    for i in range(1, n + 1):` / `        ____ i ** 2` / `gen = squares(10)` / `print(____(gen))`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > def squares(n):
  >     for i in range(1, n + 1):
  >         yield i ** 2  # 暂停并返回平方数
  >
  > gen = squares(10)  # 调用生成器函数，返回生成器对象
  > print(next(gen))  # 1
  > print(next(gen))  # 4
  > print(next(gen))  # 9
  >
  > for x in gen:
  >     print(x, end=" ")  # 16 25 36 49 64 81 100
  > print()
  > ```

- [x] **2-4 斐波那契生成器**
  创建文件 `test_fibonacci.py`，完成以下操作：
  - 用 `yield` 实现斐波那契数列生成器

  > **批改（2026-09-28）**：✅ 正确（`range(20)` 输出 0、1、1、2、3、5、8、13 … 4181，与斐波那契数列一致）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：斐波那契数列是 0, 1, 1, 2, 3, 5, 8, 13 ...（每个数是前两个数之和）；每轮先把当前值交出去，再让两个变量一起往前挪一位
  > **二级 · 方法**：`yield a` 返回当前值；`a, b = b, a + b` 是**同时赋值**（先算右边，再同时赋给左边）
  > **三级 · 骨架**：`def fibonacci():` / `    a, b = 0, 1` / `    while True:` / `        ____ a` / `        a, b = b, ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-4
  > def fibonacci():
  >     a, b = 0, 1
  >     while True:
  >         yield a      # 返回当前斐波那契数
  >         a, b = b, a + b  # 计算下一个数
  >
  > fib = fibonacci()
  > for _ in range(20):
  >     print(next(fib), end=" ")
  > print()
  > ```
