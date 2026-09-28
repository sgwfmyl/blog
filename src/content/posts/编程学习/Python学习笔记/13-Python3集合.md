---
title: Python3 集合
published: 2026-09-15
description: Python3 集合的创建、添加、删除和集合运算
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-13-set.webp
order: 13
---
## Python3 集合

集合（set）是一个无序的不重复元素序列。

集合中的元素不会重复，并且可以进行交集、并集、差集等常见的集合操作。

可以使用大括号 { } 创建集合，元素之间用逗号, 分隔， 或者也可以使用 set() 函数创建集合。

**创建格式：**

```
parame = {value01,value02,...}
或者
set(value)
```

以下是一个简单实例：

```
set1 = {1, 2, 3, 4}            # 直接使用大括号创建集合
set2 = set([4, 5, 6, 7])      # 使用 set() 函数从列表创建集合
```

**注意：** 创建一个空集合必须用 set() 而不是 { }，因为 { } 是用来创建一个空字典。

更多实例演示：

## 实例(Python 3.0+)

```python
>>> basket = {'apple', 'orange', 'apple', 'pear', 'orange', 'banana'}
>>> print(basket)  # 这里演示的是去重功能
{'orange', 'banana', 'pear', 'apple'}
>>> 'orange' in basket  # 快速判断元素是否在集合内
True
>>> 'crabgrass' in basket
False

>>> # 下面展示两个集合间的运算.
...
>>> a = set('abracadabra')
>>> b = set('alacazam')
>>> a
{'a', 'r', 'b', 'c', 'd'}
>>> a - b  # 集合a中包含而集合b中不包含的元素
{'r', 'd', 'b'}
>>> a | b  # 集合a或b中包含的所有元素
{'a', 'c', 'r', 'd', 'b', 'm', 'z', 'l'}
>>> a & b  # 集合a和b中都包含了的元素
{'a', 'c'}
>>> a ^ b  # 不同时包含于a和b的元素
{'r', 'd', 'b', 'm', 'z', 'l'}
```

类似列表推导式，同样集合支持集合推导式(Set comprehension):

## 实例(Python 3.0+)

```python
>>> a = {x for x in 'abracadabra' if x not in 'abc'}
>>> a
{'r', 'd'}
```

---

## 集合的基本操作

### 1、添加元素

**语法格式如下：**

```
s.add( x )
```

将元素 x 添加到集合 s 中，如果元素已存在，则不进行任何操作。

## 实例(Python 3.0+)

```python
>>> thisset = set(("Google", "Runoob", "Taobao"))
>>> thisset.add("Facebook")
>>> print(thisset)
{'Taobao', 'Facebook', 'Google', 'Runoob'}
```

还有一个方法，也可以添加元素，且参数可以是列表，元组，字典等，语法格式如下：

```
s.update( x )
```

x 可以有多个，用逗号分开。

## 实例(Python 3.0+)

```python
>>> thisset = set(("Google", "Runoob", "Taobao"))
>>> thisset.update({1, 3})
>>> print(thisset)
{1, 3, 'Google', 'Taobao', 'Runoob'}
>>> thisset.update([1, 4], [5, 6])
>>> print(thisset)
{1, 3, 4, 5, 6, 'Google', 'Taobao', 'Runoob'}
>>>
```

### 2、移除元素

**语法格式如下：**

```
s.remove( x )
```

将元素 x 从集合 s 中移除，如果元素不存在，则会发生错误。

## 实例(Python 3.0+)

```python
>>> thisset = set(("Google", "Runoob", "Taobao"))
>>> thisset.remove("Taobao")
>>> print(thisset)
{'Google', 'Runoob'}
>>> thisset.remove("Facebook")  # 不存在会发生错误
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
KeyError: 'Facebook'
>>>
```

此外还有一个方法也是移除集合中的元素，且如果元素不存在，不会发生错误。格式如下所示：

```
s.discard( x )
```

## 实例(Python 3.0+)

```python
>>> thisset = set(("Google", "Runoob", "Taobao"))
>>> thisset.discard("Facebook")  # 不存在不会发生错误
>>> print(thisset)
{'Taobao', 'Google', 'Runoob'}
```

我们也可以设置随机删除集合中的一个元素，语法格式如下：

```
s.pop()
```

## 脚本模式实例(Python 3.0+)

```python
thisset = set(("Google", "Runoob", "Taobao", "Facebook"))
x = thisset.pop()

print(x)
```

输出结果：

```
Runoob
```

多次执行测试结果都不一样。

set 集合的 pop 方法会对集合进行无序的排列，然后将这个无序排列集合的左面第一个元素进行删除。

### 3、计算集合元素个数

**语法格式如下：**

```
len(s)
```

计算集合 s 元素个数。

## 实例(Python 3.0+)

```python
>>> thisset = set(("Google", "Runoob", "Taobao"))
>>> len(thisset)
3
```

### 4、清空集合

**语法格式如下：**

```
s.clear()
```

清空集合 s。

## 实例(Python 3.0+)

```python
>>> thisset = set(("Google", "Runoob", "Taobao"))
>>> thisset.clear()
>>> print(thisset)
set()
```

### 5、判断元素是否在集合中存在

**语法格式如下：**

```
x in s
```

判断元素 x 是否在集合 s 中，存在返回 True，不存在返回 False。

## 实例(Python 3.0+)

```python
>>> thisset = set(("Google", "Runoob", "Taobao"))
>>> "Runoob" in thisset
True
>>> "Facebook" in thisset
False
>>>
```

### 集合内置方法完整列表

| 方法 | 描述 |
| --- | --- |
| [add()](https://www.runoob.com/python3/ref-set-add.html) | 为集合添加元素 |
| [clear()](https://www.runoob.com/python3/ref-set-clear.html) | 移除集合中的所有元素 |
| [copy()](https://www.runoob.com/python3/ref-set-copy.html) | 拷贝一个集合 |
| [difference()](https://www.runoob.com/python3/ref-set-difference.html) | 返回多个集合的差集 |
| [difference\_update()](https://www.runoob.com/python3/ref-set-difference_update.html) | 移除集合中的元素，该元素在指定的集合也存在。 |
| [discard()](https://www.runoob.com/python3/ref-set-discard.html) | 删除集合中指定的元素 |
| [intersection()](https://www.runoob.com/python3/ref-set-intersection.html) | 返回集合的交集 |
| [intersection\_update()](https://www.runoob.com/python3/ref-set-intersection_update.html) | 返回集合的交集。 |
| [isdisjoint()](https://www.runoob.com/python3/ref-set-isdisjoint.html) | 判断两个集合是否包含相同的元素，如果没有返回 True，否则返回 False。 |
| [issubset()](https://www.runoob.com/python3/ref-set-issubset.html) | 判断指定集合是否为该方法参数集合的子集。 |
| [issuperset()](https://www.runoob.com/python3/ref-set-issuperset.html) | 判断该方法的参数集合是否为指定集合的子集 |
| [pop()](https://www.runoob.com/python3/ref-set-pop.html) | 随机移除元素 |
| [remove()](https://www.runoob.com/python3/ref-set-remove.html) | 移除指定元素 |
| [symmetric\_difference()](https://www.runoob.com/python3/ref-set-symmetric_difference.html) | 返回两个集合中不重复的元素集合。 |
| [symmetric\_difference\_update()](https://www.runoob.com/python3/ref-set-symmetric_difference_update.html) | 移除当前集合中在另外一个指定集合相同的元素，并将另外一个指定集合中不同的元素插入到当前集合中。 |
| [union()](https://www.runoob.com/python3/ref-set-union.html) | 返回两个集合的并集 |
| [update()](https://www.runoob.com/python3/ref-set-update.html) | 给集合添加元素 |
| [len()](https://www.runoob.com/python3/python3-string-len.html) | 计算集合元素个数 |

---

## 相关

- [Python3 字典](/posts/编程学习/python学习笔记/12-python3字典/)
- [Python数据容器总结与对比](/posts/编程学习/python学习笔记/14-python数据容器总结与对比/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 创建集合：直接写大括号 `{元素1, 元素2}`，或者用 `set(可迭代对象)` 从列表等转换；**空集合必须写 `set()`**——`{}` 创建出来的是空字典
2. 集合的三个特点：**无序**、**不重复**（自动去重）、元素可变但只能放不可变类型；它**不支持索引和切片**，只能判断"某个值在不在里面"
3. 添加元素：`add(元素)` 加一个（已存在就不动）、`update(序列)` 一次加多个（可以同时传好几个序列）
4. 移除元素：`remove(元素)` 不存在会报 `KeyError`、`discard(元素)` 不存在也不报错、`pop()` 随机弹出并返回一个元素、`clear()` 清空；`del` 则是把整个集合删掉
5. 集合运算：差集 `-`（在 a 不在 b）、并集 `|`、交集 `&`、对称差集 `^`（只出现在其中一个集合里）
6. 集合运算的方法写法：`difference()` 差集、`union()` 并集、`intersection()` 交集、`symmetric_difference()` 对称差集；判断子集/超集用 `issubset()`、`issuperset()`
7. 判断与统计：`元素 in 集合` 判断在不在（比逐个比对快得多）、`len(s)` 数元素个数
8. 去重：把列表丢进 `set()` 就去掉了重复元素（**顺序会打乱**），想变回列表再用 `list()` 转一次；集合推导式写 `{x for x in 序列 if 条件}`
9. 复制：`copy()` 得到一个独立副本；直接打印集合时，元素顺序可能和你写入的顺序不一样（这是无序的正常表现）
10. 怎么选：要"去重""快速判断在不在"就用集合；要顺序、要按下标取值就用列表

### 二、裸写题

- [x] **2-1 创建集合**
  创建文件 `test_set.py`，完成以下操作：
  - 创建空集合 `s1 = set()`
  - 用大括号创建集合 `s2 = {1, 2, 3}`
  - 用 `set()` 从列表创建集合 `s3 = set([4, 5, 6])`
  - 打印每个集合及其类型

  > **批改（2026-09-28）**：✅ 正确（空集合 `set()`、`{1, 2, 3}`、`set([4, 5, 6])` 三个集合和类型都对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：空集合不能写空的大括号（那会变成空字典），得用转换函数造；三个集合建好后一行一个地打印"集合 + 类型"
  > **二级 · 方法**：空集合写 `set()`；直接写 `{元素1, 元素2}`；从列表来写 `set([列表])`；类型用 `type()` 查
  > **三级 · 骨架**：`s1 = ____()` / `s2 = {1, ____, 3}` / `s3 = set([4, 5, ____])` / `print(f"集合s3: {s3}, 类型: {____(s3)}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > s1 = set()
  > s2 = {1, 2, 3}
  > s3 = set([4, 5, 6])
  >
  > print(f"空集合s1: {s1}, 类型: {type(s1)}")
  > print(f"集合s2: {s2}, 类型: {type(s2)}")
  > print(f"集合s3: {s3}, 类型: {type(s3)}")
  > ```

- [x] **2-2 添加元素**
  创建文件 `test_add.py`，完成以下操作：
  - 创建集合 `s = {1, 2, 3}`
  - 添加一个元素 `4`
  - 一次添加多个元素 `[5, 6, 7]`
  - 打印每次操作后的集合

  > **批改（2026-09-28）**：⚠️ `add(4)`、`update([5, 6, 7])` 都生效（最终 `{1, 2, 3, 4, 5, 6, 7}`），但只在最后打印了一次，题面要求"打印每次操作后的集合"，缺 `{1, 2, 3}` 和 `{1, 2, 3, 4}` 这两步输出。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：加一个和加一批是两个不同的方法；每做一步立刻打印一次，别攒到最后
  > **二级 · 方法**：加一个 `s.add(元素)`；加一批 `s.update([元素1, 元素2])`（参数也可以是元组、集合）
  > **三级 · 骨架**：`s.____(4)` / `s.____([5, 6, 7])`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > s = {1, 2, 3}
  > print(f"初始: {s}")
  >
  > s.add(4)
  > print(f"add后: {s}")  # {1, 2, 3, 4}
  >
  > s.update([5, 6, 7])
  > print(f"update后: {s}")  # {1, 2, 3, 4, 5, 6, 7}
  > ```

- [x] **2-3 移除元素**
  创建文件 `test_remove.py`，完成以下操作：
  - 创建集合 `s = {"a", "b", "c", "d"}`
  - 移除元素 "a"
  - 移除 "e"（元素不存在也不报错）
  - 随机移除一个元素

  > **批改（2026-09-28）**：✅ 正确（`remove("a")`、`discard("e")` 都没报错、`pop()` 随机删掉一个，实测剩余 `{'c', 'b'}`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：三种删法——删指定的（不存在会报错）、删指定的（不存在也不报错）、随机弹出一个
  > **二级 · 方法**：`s.remove(元素)`；`s.discard(元素)`（不存在不报错）；`s.pop()` 随机移除并返回一个元素
  > **三级 · 骨架**：`s.____("a")` / `s.____("e")` / `x = s.____()`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > s = {"a", "b", "c", "d"}
  > print(f"初始: {s}")
  >
  > s.remove("a")
  > print(f"remove后: {s}")
  >
  > s.discard("e")  # 不存在不会报错
  > print(f"discard后: {s}")
  >
  > x = s.pop()
  > print(f"pop移除: {x}, 剩余: {s}")
  > ```

- [x] **2-4 集合运算**
  创建文件 `test_operation.py`，完成以下操作：
  - 创建集合 `a = {1, 2, 3, 4}` 和 `b = {3, 4, 5, 6}`
  - 计算交集（两个集合都有的元素）
  - 计算并集（两个集合合起来的所有元素）
  - 计算差集（在 a 里但不在 b 里的元素）
  - 计算对称差集（只出现在其中一个集合里的元素）

  > **批改（2026-09-28）**：✅ 正确（交集 `{3, 4}`、并集 `{1, 2, 3, 4, 5, 6}`、差集 `{1, 2}`、对称差集 `{1, 2, 5, 6}` 全对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：四种集合运算各有一个运算符，直接算完打印；每种运算也都有同名的方法写法
  > **二级 · 方法**：交集 `a & b`、并集 `a | b`、差集 `a - b`、对称差集 `a ^ b`；写成方法也可以：`a.intersection(b)`、`a.union(b)`、`a.difference(b)`、`a.symmetric_difference(b)`
  > **三级 · 骨架**：`print(f"交集: {a ____ b}")` / `print(f"并集: {a ____ b}")` / `print(f"差集(a-b): {a ____ b}")` / `print(f"对称差集: {a ____ b}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-4
  > a = {1, 2, 3, 4}
  > b = {3, 4, 5, 6}
  >
  > print(f"交集: {a & b}")          # {3, 4}
  > print(f"并集: {a | b}")          # {1, 2, 3, 4, 5, 6}
  > print(f"差集(a-b): {a - b}")     # {1, 2}
  > print(f"对称差集: {a ^ b}")      # {1, 2, 5, 6}
  > ```

- [x] **2-5 集合判断**
  创建文件 `test_check.py`，完成以下操作：
  - 创建集合 `s = {"苹果", "香蕉", "橘子"}`
  - 用 `in` 判断 "苹果" 是否在集合中
  - 统计集合里元素的个数
  - 复制一个集合副本

  > **批改（2026-09-28）**：✅ 正确（`"苹果" in s` 输出 True、`len(s)` 输出 3、`copy()` 出来的集合内容相同）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：判断在不在用成员运算符、数个数用长度函数、要一个独立副本用复制方法
  > **二级 · 方法**：`"苹果" in s`；`len(s)`；`s2 = s.copy()`
  > **三级 · 骨架**：`print(f"苹果是否在集合中: {'苹果' ____ s}")` / `print(f"集合长度: {____(s)}")` / `s2 = s.____()`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-5
  > s = {"苹果", "香蕉", "橘子"}
  >
  > print(f"苹果是否在集合中: {'苹果' in s}")  # True
  > print(f"集合长度: {len(s)}")              # 3
  >
  > s2 = s.copy()
  > print(f"复制的集合: {s2}")
  > ```

- [x] **2-6 集合去重** ❌
  创建文件 `test_unique.py`，完成以下操作：
  - 创建列表 `lst = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4]`
  - 用 `set()` 去重
  - 再用 `list()` 转回列表

  > **批改（2026-09-28）**：❌ 第 2 步去重是对的（`set(lst)` 输出 `{1, 2, 3, 4}`），但第 3 步写成了 `print(list(lst))`，转回的是原列表 `lst`，输出 `[1, 2, 2, 3, 3, 3, 4, 4, 4, 4]`，重复元素还在；正确写法是先把集合存起来 `s = set(lst)`，再 `print(list(s))`，才会得到 `[1, 2, 3, 4]`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：先让列表过一遍"自动去重"的那种容器，拿到去重结果；再把**这个去重结果**（而不是原列表）转回列表
  > **二级 · 方法**：去重 `s = set(lst)`；转回列表 `lst2 = list(s)`
  > **三级 · 骨架**：`s = ____(lst)` / `lst2 = ____(s)`（注意别把原 `lst` 又转一遍）

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-6
  > lst = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4]
  > print(f"原始列表: {lst}")
  >
  > s = set(lst)
  > print(f"去重后: {s}")
  >
  > lst2 = list(s)
  > print(f"转回列表: {lst2}")
  > ```

- [x] **2-7 集合推导式**
  创建文件 `test_comprehension.py`，完成以下操作：
  - 用集合推导式生成 1-10 中所有偶数的集合
  - 用集合推导式从字符串 "abracadabra" 中去除 a、b、c

  > **批改（2026-09-28）**：✅ 正确（偶数集合 `{2, 4, 6, 8, 10}`、去掉 a/b/c 后 `{'d', 'r'}` 都对）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：跟列表推导式一个套路（表达式 + for + if），把最外层的括号换成花括号，结果就是集合
  > **二级 · 方法**：`{x for x in range(1, 11) if x % 2 == 0}`；`{x for x in 'abracadabra' if x not in 'abc'}`
  > **三级 · 骨架**：`even = {x ____ x in range(1, 11) if x % 2 == 0}` / `s = {x for x in 'abracadabra' if x ____ in 'abc'}`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-7
  > # 1-10 中所有偶数
  > even = {x for x in range(1, 11) if x % 2 == 0}
  > print(f"偶数集合: {even}")  # {2, 4, 6, 8, 10}
  >
  > # 去除 a、b、c
  > s = {x for x in 'abracadabra' if x not in 'abc'}
  > print(f"去重后: {s}")  # {'r', 'd'}
  > ```
