---
title: Python3 字典
published: 2026-09-15
description: Python3 字典的创建、访问、修改、删除和常用方法
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-12-dict.webp
order: 12
---
字典是另一种可变容器模型，且可存储任意类型对象。

字典的每个键值 key=>value 对用冒号: 分割，每个对之间用逗号(**,**)分割，整个字典包括在花括号 {} 中,格式如下所示：

```
d = {key1 : value1, key2 : value2, key3 : value3 }
```

**注意：** dict 作为 Python 的关键字和内置函数，变量名不建议命名为 **dict** 。

![](https://img.tsh520.cn/file/blog/article/py-dict-3.png)

键必须是唯一的，但值则不必。

值可以取任何数据类型，但键必须是不可变的，如字符串，数字。

一个简单的字典实例：

```
tinydict = {'name': 'runoob', 'likes': 123, 'url': 'www.runoob.com'}
```

![](https://img.tsh520.cn/file/blog/article/py-dict-2.png)

也可如此创建字典：

```
tinydict1 = { 'abc': 456 }
tinydict2 = { 'abc': 123, 98.6: 37 }
```

---

## 创建空字典

使用大括号 { } 创建空字典：

## 实例

```python
# 使用大括号 {} 来创建空字典
emptyDict = {}

# 打印字典
print(emptyDict)

# 查看字典的数量
print("Length:", len(emptyDict))

# 查看类型
print(type(emptyDict))
```

以上实例输出结果：

```
{}
Length: 0
<class 'dict'>
```

使用内建函数 dict() 创建字典：

## 实例

```python
emptyDict = dict()

# 打印字典
print(emptyDict)

# 查看字典的数量
print("Length:", len(emptyDict))

# 查看类型
print(type(emptyDict))
```

以上实例输出结果：

```
{}
Length: 0
<class 'dict'>
```

---

## 访问字典里的值

把相应的键放入到方括号中，如下实例:

## 实例

```python
tinydict = {'Name': 'Runoob', 'Age': 7, 'Class': 'First'}
print("tinydict['Name']: ", tinydict['Name'])
print("tinydict['Age']: ", tinydict['Age'])
```

以上实例输出结果：

```
tinydict['Name']:  Runoob
tinydict['Age']:  7
```

如果用字典里没有的键访问数据，会输出错误如下：

## 实例

```python
tinydict = {'Name': 'Runoob', 'Age': 7, 'Class': 'First'}
print("tinydict['Alice']: ", tinydict['Alice'])
```

以上实例输出结果：

```
Traceback (most recent call last):
  File "test.py", line 5, in <module>
    print ("tinydict['Alice']: ", tinydict['Alice'])
KeyError: 'Alice'
```

---

## 修改字典

向字典添加新内容的方法是增加新的键/值对，修改或删除已有键/值对如下实例:

## 实例

```python
tinydict = {'Name': 'Runoob', 'Age': 7, 'Class': 'First'}
tinydict['Age'] = 8
tinydict['School'] = "菜鸟教程"
print("tinydict['Age']: ", tinydict['Age'])
print("tinydict['School']: ", tinydict['School'])
```

以上实例输出结果：

```
tinydict['Age']:  8
tinydict['School']:  菜鸟教程
```

---

## 删除字典元素

能删单一的元素也能清空字典，清空只需一项操作。

显式删除一个字典用del命令，如下实例：

## 实例

```python
tinydict = {'Name': 'Runoob', 'Age': 7, 'Class': 'First'}
del tinydict['Name']
tinydict.clear()
del tinydict
print("tinydict['Age']: ", tinydict['Age'])
print("tinydict['School']: ", tinydict['School'])
```

但这会引发一个异常，因为用执行 del 操作后字典不再存在：

```
Traceback (most recent call last):
  File "/runoob-test/test.py", line 9, in <module>
    print ("tinydict['Age']: ", tinydict['Age'])
NameError: name 'tinydict' is not defined
```

**注：** del() 方法后面也会讨论。

### 字典键的特性

字典值可以是任何的 python 对象，既可以是标准的对象，也可以是用户定义的，但键不行。

两个重要的点需要记住：

1）不允许同一个键出现两次。创建时如果同一个键被赋值两次，后一个值会被记住，如下实例：

## 实例

```python
tinydict = {'Name': 'Runoob', 'Age': 7, 'Name': '小菜鸟'}
print("tinydict['Name']: ", tinydict['Name'])
```

以上实例输出结果：

```
tinydict['Name']:  小菜鸟
```

2）键必须不可变，所以可以用数字，字符串或元组充当，而用列表就不行，如下实例：

## 实例

```python
tinydict = {['Name']: 'Runoob', 'Age': 7}
print("tinydict['Name']: ", tinydict['Name'])
```

以上实例输出结果：

```
Traceback (most recent call last):
  File "test.py", line 3, in <module>
    tinydict = {['Name']: 'Runoob', 'Age': 7}
TypeError: unhashable type: 'list'
```

---

## 字典内置函数&方法

Python字典包含了以下内置函数：

| 序号 | 函数及描述 | 实例 |
| --- | --- | --- |
| 1 | len(dict)   计算字典元素个数，即键的总数。 | ``` >>> tinydict = {'Name': 'Runoob', 'Age': 7, 'Class': 'First'} >>> len(tinydict) 3 ``` |
| 2 | str(dict)   输出字典，可以打印的字符串表示。 | ``` >>> tinydict = {'Name': 'Runoob', 'Age': 7, 'Class': 'First'} >>> str(tinydict) "{'Name': 'Runoob', 'Class': 'First', 'Age': 7}" ``` |
| 3 | type(variable)   返回输入的变量类型，如果变量是字典就返回字典类型。 | ``` >>> tinydict = {'Name': 'Runoob', 'Age': 7, 'Class': 'First'} >>> type(tinydict) <class 'dict'> ``` |

Python字典包含了以下内置方法：

| 序号 | 函数及描述 |
| --- | --- |
| 1 | [dict.clear()](https://www.runoob.com/python3/python3-att-dictionary-clear.html)   删除字典内所有元素 |
| 2 | [dict.copy()](https://www.runoob.com/python3/python3-att-dictionary-copy.html)   返回一个字典的浅复制 |
| 3 | [dict.fromkeys()](https://www.runoob.com/python3/python3-att-dictionary-fromkeys.html)   创建一个新字典，以序列seq中元素做字典的键，val为字典所有键对应的初始值 |
| 4 | [dict.get(key, default=None)](https://www.runoob.com/python3/python3-att-dictionary-get.html)   返回指定键的值，如果键不在字典中返回 default 设置的默认值 |
| 5 | [key in dict](https://www.runoob.com/python3/python3-att-dictionary-in.html)   如果键在字典dict里返回true，否则返回false |
| 6 | [dict.items()](https://www.runoob.com/python3/python3-att-dictionary-items.html)   以列表返回一个视图对象 |
| 7 | [dict.keys()](https://www.runoob.com/python3/python3-att-dictionary-keys.html)   返回一个视图对象 |
| 8 | [dict.setdefault(key, default=None)](https://www.runoob.com/python3/python3-att-dictionary-setdefault.html)   和get()类似, 但如果键不存在于字典中，将会添加键并将值设为default |
| 9 | [dict.update(dict2)](https://www.runoob.com/python3/python3-att-dictionary-update.html)   把字典dict2的键/值对更新到dict里 |
| 10 | [dict.values()](https://www.runoob.com/python3/python3-att-dictionary-values.html)   返回一个视图对象 |
| 11 | [dict.pop(key\[,default\])](https://www.runoob.com/python3/python3-att-dictionary-pop.html)   删除字典 key（键）所对应的值，返回被删除的值。 |
| 12 | [dict.popitem()](https://www.runoob.com/python3/python3-att-dictionary-popitem.html)   返回并删除字典中的最后一对键和值。 |

---

## 相关

- [Python3 元组](/posts/编程学习/python学习笔记/11-python3元组/)
- [Python3 集合](/posts/编程学习/python学习笔记/13-python3集合/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 字典用花括号 `{键: 值}` 创建，键值对之间用逗号隔开（`tinydict = {'name': 'runoob', 'likes': 123}`）；空的直接写 `{}`，也可以写 `dict()`
2. 键必须是**不可变**类型（字符串、数字、元组都行，用列表当键会报 `TypeError: unhashable type: 'list'`）；键**不允许重复**，同一个键赋值两次只会记住后一个
3. 取值：把键放进方括号 `d['键']`；键不存在会报 `KeyError`。用 `get(键)` 取不到时返回 `None`，用 `get(键, 默认值)` 还能指定默认值
4. 修改与添加是**同一句写法** `d[键] = 值`：键已存在就改它的值，不存在就新增这个键值对
5. 删除：`del d[键]` 删一个键值对、`pop(键)` 删掉并把它的值返回、`clear()` 清空整个字典、`del d` 连字典本身一起删（之后访问会报 `NameError`）
6. 判断与统计：`键 in 字典` 判断键在不在里面、`len(d)` 数键的个数；`str(d)` 得到字典的字符串表示、`type()` 查类型
7. 取出全部内容：`keys()` 所有键、`values()` 所有值、`items()` 所有键值对；它们返回的是**视图对象**，可以直接用 `for` 遍历，也能用 `list()` 转成列表看
8. 遍历的惯用写法：`for k, v in d.items():` 一次解出键和值；只要遍历键可以写 `for k in d:`
9. 复制与合并：`copy()` 复制出一个独立副本（改原来的不影响副本）、`update(d2)` 把另一个字典的键值对合并进来（同名的键会被覆盖）
10. 其它常用方法：`setdefault(键, 默认值)` 取不到就顺手写进去、`popitem()` 弹出最后一个键值对、`fromkeys()` 用一批键造新字典；另外别把变量命名成 `dict`

### 二、裸写题

- [x] **2-1 创建字典**
  创建文件 `test_dict.py`，完成以下操作：
  - 创建空字典 `d1 = {}`
  - 用 `dict()` 创建空字典 `d2 = dict()`
  - 创建字典 `person = {"name": "张三", "age": 20, "city": "北京"}`
  - 打印每个字典及其类型

  > **批改（2026-09-28）**：⚠️ 三个字典都创建正确，但只打印了类型（输出三行 `<class 'dict'>`），漏了字典本身的内容；参考写法是 `print(f"空字典d1: {d1}, 类型: {type(d1)}")` 这样三行分别打印。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：三个字典按题面建好，再一行一个地打印"字典本身 + 它的类型"
  > **二级 · 方法**：空字典写 `{}` 或 `dict()`，普通字典写 `{键: 值, 键: 值}`；类型用 `type()` 查
  > **三级 · 骨架**：`print(f"空字典d1: {d1}, 类型: {____(d1)}")` / `person = {"name": "张三", "age": ____, "city": "北京"}`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > d1 = {}
  > d2 = dict()
  > person = {"name": "张三", "age": 20, "city": "北京"}
  >
  > print(f"空字典d1: {d1}, 类型: {type(d1)}")
  > print(f"空字典d2: {d2}, 类型: {type(d2)}")
  > print(f"字典person: {person}, 类型: {type(person)}")
  > ```

- [x] **2-2 访问字典元素**
  创建文件 `test_access.py`，完成以下操作：
  - 创建字典 `d = {"name": "李四", "age": 25, "job": "工程师"}`
  - 用 `[]` 访问 name 的值
  - 用取值方法（取不到也不报错的那个）访问 age 的值
  - 用取值方法访问不存在的键 salary，并指定默认值 0

  > **批改（2026-09-28）**：⚠️ 前两项正确（`d["name"]` 得 `李四`、`d.get("age")` 得 `25`）；第三项题面要求访问不存在的键 `salary`，你写成了 `"aaa"`（结果同为 0），按题面应写成 `print(d.get("salary", 0))`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：取值有两种写法——直接把键放进方括号（键不存在会报错），或者用方法取（取不到时还能给个默认值）
  > **二级 · 方法**：`d['name']` 直接取；`d.get('age')` 取；`d.get('salary', 0)` 给不存在的键指定默认值
  > **三级 · 骨架**：`print(f"name: {d[____]}")` / `print(f"age: {d.____('age')}")` / `print(f"salary: {d.____('salary', 0)}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > d = {"name": "李四", "age": 25, "job": "工程师"}
  >
  > print(f"name: {d['name']}")        # 李四
  > print(f"age: {d.get('age')}")      # 25
  > print(f"salary: {d.get('salary', 0)}")  # 0（不存在返回默认值）
  > ```

- [x] **2-3 修改字典**
  创建文件 `test_modify.py`，完成以下操作：
  - 创建字典 `d = {"name": "王五", "age": 30}`
  - 修改 age 的值为 31
  - 添加新的键值对 "city": "上海"
  - 打印修改后的字典

  > **批改（2026-09-28）**：✅ 正确（`age` 改成 31、新增 `city` 为上海，输出 `{'name': '王五', 'age': 31, 'city': '上海'}`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：改已有的键、加新的键用的是同一句写法，Python 看这个键本来在不在，自己决定是改还是加
  > **二级 · 方法**：`d[键] = 值`——键已存在就改值，不存在就新增
  > **三级 · 骨架**：`d["age"] = ____` / `d["____"] = "上海"`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > d = {"name": "王五", "age": 30}
  > print(f"修改前: {d}")
  >
  > d["age"] = 31      # 修改
  > d["city"] = "上海"  # 添加
  > print(f"修改后: {d}")
  > ```

- [x] **2-4 删除字典元素**
  创建文件 `test_delete.py`，完成以下操作：
  - 创建字典 `d = {"a": 1, "b": 2, "c": 3, "d": 4}`
  - 用 `del` 删除键 "a"
  - 删除键 "b"，并把它对应的值取出来
  - 把整个字典清空

  > **批改（2026-09-28）**：⚠️ `del d["a"]`、`d.pop("b")` 后输出 `{'c': 3, 'd': 4}`，`clear()` 后输出 `{}`，都对；但题面要求 `pop()`"并获取其值"，你写的是 `d.pop("b")` 没接住返回值，漏了这一步（应写成 `val = d.pop("b")`，`val` 是 2）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：三种删法：按关键字删掉一个、删掉并接住它的值、一下把整个字典清空
  > **二级 · 方法**：`del d["a"]`；`val = d.pop("b")`（把删掉的值接住）；`d.clear()` 清空
  > **三级 · 骨架**：`____ d["a"]` / `val = d.____("b")` / `d.____()`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-4
  > d = {"a": 1, "b": 2, "c": 3, "d": 4}
  > print(f"初始: {d}")
  >
  > del d["a"]
  > print(f"del后: {d}")  # {'b': 2, 'c': 3, 'd': 4}
  >
  > val = d.pop("b")
  > print(f"pop后: {d}, 删除的值: {val}")  # {'c': 3, 'd': 4}, 2
  >
  > d.clear()
  > print(f"clear后: {d}")  # {}
  > ```

- [x] **2-5 字典遍历**
  创建文件 `test_iter.py`，完成以下操作：
  - 创建字典 `d = {"name": "赵六", "age": 28, "city": "广州"}`
  - 遍历打印所有键
  - 遍历打印所有值
  - 遍历打印所有键值对

  > **批改（2026-09-28）**：⚠️ 三项输出内容都对（`dict_keys(['name', 'age', 'city'])`、`dict_values(['赵六', 28, '广州'])`、`dict_items([('name', '赵六'), ...])`），但没有真正"遍历"——一个 for 循环都没写，而是直接 `print` 了视图对象；参考写法是 `for k, v in d.items(): print(f"  {k}: {v}")`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：取"全部键""全部值""全部键值对"各有一个方法，取出之后要用 for 循环真正逐个遍历着打印；键值对要一次解出两个变量
  > **二级 · 方法**：`d.keys()` 所有键、`d.values()` 所有值、`d.items()` 所有键值对；`for k, v in d.items():` 解出键和值
  > **三级 · 骨架**：`for k in d.____():` / `for v in d.____():` / `for k, v in d.____():` / `print(f"  {k}: {v}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-5
  > d = {"name": "赵六", "age": 28, "city": "广州"}
  >
  > print("所有键:", list(d.keys()))
  > print("所有值:", list(d.values()))
  > print("所有键值对:")
  > for k, v in d.items():
  >     print(f"  {k}: {v}")
  > ```

- [x] **2-6 字典判断与统计**
  创建文件 `test_check.py`，完成以下操作：
  - 创建字典 `d = {"apple": 5, "banana": 3, "orange": 8}`
  - 用 `in` 判断 "apple" 是否在字典中
  - 统计字典里键的个数
  - 获取 "grape" 的数量（键不存在时返回 0）

  > **批改（2026-09-28）**：✅ 正确（`"apple" in d` 输出 True、`len(d)` 输出 3、`d.get("grape", 0)` 输出 0）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：判断键在不在用成员运算符、数键的个数用长度函数、取一个可能不存在的键用带默认值的取法
  > **二级 · 方法**：`"apple" in d`；`len(d)`；`d.get("grape", 0)`
  > **三级 · 骨架**：`print(f"apple是否在字典中: {'apple' ____ d}")` / `print(f"字典长度: {____(d)}")` / `print(f"grape数量: {d.____('grape', 0)}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-6
  > d = {"apple": 5, "banana": 3, "orange": 8}
  >
  > print(f"apple是否在字典中: {'apple' in d}")  # True
  > print(f"字典长度: {len(d)}")                  # 3
  > print(f"grape数量: {d.get('grape', 0)}")      # 0
  > ```

- [x] **2-7 字典合并与复制**
  创建文件 `test_merge.py`，完成以下操作：
  - 创建字典 `d1 = {"a": 1, "b": 2}` 和 `d2 = {"c": 3, "d": 4}`
  - 把 d2 的键值对合并到 d1 里去
  - 复制一份 d1 给 d3（要独立副本，改 d1 不能影响 d3）
  - 修改 d1 的 "a" 为 10，观察 d3 是否变化

  > **批改（2026-09-28）**：✅ 正确（`update` 合并后 `{'a': 1, 'b': 2, 'c': 3, 'd': 4}`；`copy` 后把 `d1["a"]` 改成 10，实测 d1 输出 `{'a': 10, ...}`、d3 仍是 `{'a': 1, ...}`，副本独立没被带着改）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：合并是把另一个字典的键值对灌进当前字典；复制要的是独立副本，改原来的不能影响到它
  > **二级 · 方法**：`d1.update(d2)` 合并；`d3 = d1.copy()` 复制
  > **三级 · 骨架**：`d1.____(d2)` / `d3 = d1.____()` / `d1["a"] = ____`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-7
  > d1 = {"a": 1, "b": 2}
  > d2 = {"c": 3, "d": 4}
  >
  > d1.update(d2)
  > print(f"合并后: {d1}")  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}
  >
  > d3 = d1.copy()
  > d1["a"] = 10
  > print(f"d1: {d1}")  # {'a': 10, 'b': 2, 'c': 3, 'd': 4}
  > print(f"d3: {d3}")  # {'a': 1, 'b': 2, 'c': 3, 'd': 4}（不受影响）
  > ```
