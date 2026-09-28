---
title: Python3 基本数据类型
published: 2026-09-13
description: Python3 变量赋值、Number、String、bool、List、Tuple、Set、Dictionary 数据类型
tags:
  - Python
image: https://img.tsh520.cn/file/blog/post-covers/python-03-data-types.webp
order: 3
---

Python 中的变量不需要声明。每个变量在使用前都必须赋值，变量赋值以后该变量才会被创建。

在 Python 中，变量就是变量，它没有类型，我们所说的类型是变量所指的内存中对象的类型。

等号 = 用来给变量赋值。等号左边是变量名，右边是存储在变量中的值。例如：

## 实例(Python 3.0+)

``` python
#!/usr/bin/python3  
  
counter = 100 # 整型变量  
miles = 1000.0 # 浮点型变量  
name = "runoob" # 字符串  
  
print(counter)  
print(miles)  
print(name)
```

执行以上程序会输出如下结果：

```
100
1000.0
runoob
```

### 多个变量赋值

Python 允许你同时为多个变量赋值。例如：

``` python
a = b = c = 1
```

以上实例创建一个整型对象，值为 1，三个变量被赋予相同的数值。

你也可以为多个变量同时指定不同的值。例如：

``` python
a, b, c = 1, 2, "runoob"
```

以上实例中，整型对象 1 和 2 分别分配给变量 a 和 b，字符串对象 "runoob" 分配给变量 c。

可以通过 type() 函数查看变量的类型：

## 实例
``` python

# 变量定义  
x = 10 # 整数  
y = 3.14 # 浮点数  
name = "Alice" # 字符串  
is_active = True # 布尔值  
  
# 多变量赋值  
a, b, c = 1, 2, "three"  
  
# 查看数据类型  
print(type(x)) # \<class 'int'>  
print(type(y)) # \<class 'float'>  
print(type(name)) # \<class 'str'>  
print(type(is_active)) # \<class 'bool'>
```

---

## 标准数据类型

Python3 中有 6 种标准数据类型，以及 bool 布尔类型（bool 是 int 的子类，有时单独列出）：

- Number（数字）
- String（字符串）
- bool（布尔类型）
- List（列表）
- Tuple（元组）
- Set（集合）
- Dictionary（字典）

按是否可变，可以分为以下两类：

- **不可变数据（4 个）：** Number（数字）、String（字符串）、bool（布尔）、Tuple（元组）
- **可变数据（3 个）：** List（列表）、Dictionary（字典）、Set（集合）

此外还有一些高级的数据类型，如字节数组类型 bytes。

---

## Number（数字）

Python3 支持 **int、float、bool、complex（复数）** 。

在 Python 3 里，只有一种整数类型 int，表示为长整型，没有 Python 2 中的 Long。

内置的 `type()` 函数可以用来查询变量所指的对象类型。

```
>>> a, b, c, d = 20, 5.5, True, 4+3j
>>> print(type(a), type(b), type(c), type(d))
&lt;class 'int'&gt; &lt;class 'float'&gt; &lt;class 'bool'&gt; &lt;class 'complex'&gt;
```

此外还可以用 `isinstance()` 来判断：

## 实例

```
>>> a = 111  
>>> isinstance(a, int)  
True
```
`isinstance` 和 `type` 的区别在于：

- `type()` 不会认为子类是一种父类类型。
- `isinstance()` 会认为子类是一种父类类型。
```
>>> class A:
...     pass
...
>>> class B(A):
...     pass
...
>>> isinstance(A(), A)
True
>>> type(A()) == A
True
>>> isinstance(B(), A)
True
>>> type(B()) == A
False
```

> **注意：** Python3 中，bool 是 int 的子类，True 和 False 可以和数字相加，True==1、False==0 会返回 **True** ，但可以通过 is 来判断对象身份。

```
>>> issubclass(bool, int)
True
>>> True == 1
True
>>> False == 0
True
>>> True + 1
2
>>> False + 1
1
>>> 1 is True
&lt;stdin&gt;:1: SyntaxWarning: "is" with 'int' literal. Did you mean "=="?
False
>>> 0 is False
&lt;stdin&gt;:1: SyntaxWarning: "is" with 'int' literal. Did you mean "=="?
False
> 
```

> 
> **为什么会出现 SyntaxWarning？**
> 
> Python 检测到你在用 `is` 比较一个字面量整数（如 1）和 True，这通常是代码错误——因为 `is` 比较的是对象身份（是否同一个对象），而不是值是否相等。Python 建议使用 `==` 来比较值，除非你确实需要检查是否是同一个对象。


当你指定一个值时，Number 对象就会被创建：

``` python
var1 = 1
var2 = 10
```

可以使用 del 语句删除对象引用：

``` python
del var1
```

例如：

```
del var
del var_a, var_b
```

### 数值运算

## 实例

``` python
>>> 5 + 4   # 加法
9
>>> 4.3 - 2 # 减法
2.3
>>> 3 * 7   # 乘法
21
>>> 2 / 4   # 除法，得到一个浮点数
0.5
>>> 2 // 4  # 整除，得到一个整数
0
>>> 17 % 3  # 取余
2
>>> 2 ** 5  # 乘方
32
```

**注意：**

- Python 可以同时为多个变量赋值，如 `a, b = 1, 2` 。
- 一个变量可以通过赋值指向不同类型的对象。
- 数值的除法包含两个运算符：/ 返回一个浮点数，// 返回一个整数（向下取整）。
- 在混合计算时，Python 会把整型自动转换为浮点数。

### 数值类型实例

| int | float | complex |
| --- | --- | --- |
| 10 | 0.0 | 3.14j |
| 100 | 15.20 | 45.j |
| \-786 | \-21.9 | 9.322e-36j |
| 0o17 | 32.3e+18 | .876j |
| \-0o112 | \-90. | \-.6545+0J |
| \-0x260 | \-32.54e100 | 3e+26J |
| 0x69 | 70.2E-12 | 4.53e-7j |

> 注意：Python 3 中整数字面量不允许前导零（如 `080` ），八进制数必须使用 `0o` 前缀（如 `0o17` ），十六进制使用 `0x` 前缀（如 `0x69` ），二进制使用 `0b` 前缀。

Python 还支持复数，复数由实数部分和虚数部分构成，可以用 a + bj 或者 complex(a, b) 表示，复数的实部 **a** 和虚部 **b** 都是浮点型。

---

## String（字符串）

Python 中的字符串用单引号 ' 或双引号 " 括起来，同时使用反斜杠 \\ 转义特殊字符。

字符串截取的语法格式如下：

```
变量[头下标:尾下标]
```

索引值以 0 为开始值，-1 为从末尾开始的位置。

![](https://img.tsh520.cn/file/blog/article/123456-20200923-1.svg)

加号 + 是字符串的连接符，星号 \* 表示复制当前字符串，与之结合的数字为复制的次数。实例如下：

## 实例

``` python
#!/usr/bin/python3

my_str = 'Runoob'       # 定义一个字符串变量（避免使用 str 作为变量名，会覆盖内置类型）

print(my_str)           # 打印整个字符串：Runoob
print(my_str[0:-1])     # 打印索引 0 到倒数第二个字符（不含最后一个）：Runoo
print(my_str[0])        # 打印第一个字符：R
print(my_str[2:5])      # 打印索引 2、3、4 的字符（不含索引 5）：noo
print(my_str[2:])       # 打印从索引 2 开始到末尾：noob
print(my_str * 2)       # 重复打印两次：RunoobRunoob
print(my_str + "TEST")  # 字符串拼接：RunoobTEST
```

执行以上程序会输出如下结果：

```
Runoob
Runoo
R
noo
noob
RunoobRunoob
RunoobTEST
```

Python 使用反斜杠 \ 转义特殊字符，如果你不想让反斜杠发生转义，可以在字符串前面添加一个 r，表示原始字符串：

## 实例

```
>>> print('Ru\noob')
Ru
oob
>>> print(r'Ru\noob')
Ru\noob
```

另外，反斜杠（\）可以作为续行符，表示下一行是上一行的延续。也可以使用 **"""..."""** 或者 **'''...'''** 跨越多行。

注意，Python 没有单独的字符类型，一个字符就是长度为 1 的字符串。

## 实例

```
>>> word = 'Python'
>>> print(word[0], word[5])
P n
>>> print(word[-1], word[-6])
n P
```

与 C 字符串不同的是，Python 字符串不能被改变。向一个索引位置赋值，比如 word[0] = 'm' 会导致错误。

**注意：**

- 反斜杠可以用来转义，使用 `r` 前缀可以让反斜杠不发生转义（原始字符串）。
- 字符串可以用 `+` 运算符连接，用 `*` 运算符重复。
- Python 中的字符串有两种索引方式：从左往右以 0 开始，从右往左以 -1 开始。
- Python 中的字符串不能改变，字符串是不可变类型。

---

## bool（布尔类型）

布尔类型即 True 或 False。在 Python 中，True 和 False 都是关键字，表示布尔值。

布尔类型可以用来控制程序的流程，比如判断某个条件是否成立，或者在某个条件满足时执行某段代码。

布尔类型特点：

- 布尔类型只有两个值：True 和 False。
- bool 是 int 的子类，因此布尔值可以被看作整数来使用，其中 True 等价于 1，False 等价于 0。
- 布尔类型可以和其他数据类型进行比较，比如数字、字符串等。在比较时，Python 会将 True 视为 1，False 视为 0。
- 布尔类型可以和逻辑运算符一起使用，包括 `and` 、 `or` 和 `not` ，用来组合多个布尔表达式。
- 布尔类型也可以被转换成其他数据类型，比如整数、浮点数和字符串。在转换时，True 会被转换成 1，False 会被转换成 0。
- 可以使用 `bool()` 函数将其他类型的值转换为布尔值。以下值转换为布尔值时为 `False` ： `None` 、 `False` 、零（ `0` 、 `0.0` 、 `0j` ）、空序列（如 `''` 、 `()` 、 `[]` ）和空映射（如 `{}` ）。其他所有值转换为布尔值时均为 `True` 。

## 实例

``` python
# 布尔类型的值和类型
a = True
b = False
print(type(a))  # <class 'bool'>
print(type(b))  # <class 'bool'>

# 布尔类型的整数表现
print(int(True))   # 1
print(int(False))  # 0

# 使用 bool() 函数进行转换
print(bool(0))          # False
print(bool(42))         # True
print(bool(''))         # False
print(bool('Python'))   # True
print(bool([]))         # False
print(bool([1, 2, 3]))  # True

# 布尔逻辑运算
print(True and False)  # False
print(True or False)   # True
print(not True)        # False

# 布尔比较运算
print(5 > 3)   # True
print(2 == 2)  # True
print(7 < 4)   # False

# 布尔值在控制流中的应用
if True:
    print("This will always print")

if not False:
    print("This will also always print")

x = 10
if x:
    print("x 是非零值，在布尔上下文中为 True")
```

**注意：** 在 Python 中，所有非零的数字和非空的字符串、列表、元组等数据类型都被视为 True，只有 **0、空字符串、空列表、空元组** 等被视为 False。因此，在进行布尔类型转换时，需要注意数据类型的真假性。

---

## List（列表）

List（列表）是 Python 中使用最频繁的数据类型。

列表可以完成大多数集合类的数据结构实现。列表中元素的类型可以不相同，它支持数字、字符串，甚至可以包含列表（即嵌套列表）。

列表写在方括号 \[\] 之间，用逗号分隔开的元素列表。

和字符串一样，列表同样可以被索引和截取，列表被截取后返回一个包含所需元素的新列表。

列表截取的语法格式如下：

```
变量[头下标:尾下标]
```

索引值以 0 为开始值，-1 为从末尾的开始位置。

![](https://img.tsh520.cn/file/blog/article/list_slicing1_new1.png)

加号 + 是列表连接运算符，星号 \* 是重复操作。如下实例：

## 实例

``` python
#!/usr/bin/python3

my_list = ['abcd', 786, 2.23, 'runoob', 70.2]  # 避免使用 list 作为变量名，会覆盖内置类型
tinylist = [123, 'runoob']

print(my_list)             # 打印整个列表：['abcd', 786, 2.23, 'runoob', 70.2]
print(my_list[0])          # 打印第一个元素（索引 0）：abcd
print(my_list[1:3])        # 打印索引 1 和 2 的元素（不含索引 3）：[786, 2.23]
print(my_list[2:])         # 打印从索引 2 开始到末尾的所有元素：[2.23, 'runoob', 70.2]
print(tinylist * 2)        # 重复打印 tinylist 两次：[123, 'runoob', 123, 'runoob']
print(my_list + tinylist)  # 拼接两个列表
```

以上实例输出结果：

```
['abcd', 786, 2.23, 'runoob', 70.2]
abcd
[786, 2.23]
[2.23, 'runoob', 70.2]
[123, 'runoob', 123, 'runoob']
['abcd', 786, 2.23, 'runoob', 70.2, 123, 'runoob']
```

与 Python 字符串不一样的是，列表中的元素是可以改变的：

## 实例

```
>>> a = [1, 2, 3, 4, 5, 6]
>>> a[0] = 9
>>> a[2:5] = [13, 14, 15]
>>> a
[9, 2, 13, 14, 15, 6]
>>> a[2:5] = []   # 将对应的元素值设置为空列表，即删除这些元素
>>> a
[9, 2, 6]
```

List 内置了有很多方法，例如 `append()` 、 `pop()` 等等，这在后面会讲到。

**注意：**

- 列表写在方括号之间，元素用逗号隔开。
- 和字符串一样，列表可以被索引和切片。
- 列表可以使用 + 操作符进行拼接。
- 列表中的元素是可以改变的（可变类型）。

Python 列表截取可以接收第三个参数，参数作用是截取的步长，以下实例在索引 1 到索引 4 的位置设置步长为 2（每隔一个位置取一个元素）来截取列表：

![](https://img.tsh520.cn/file/blog/article/py-dict-1.png)

如果第三个参数为负数表示逆向读取，以下实例用于翻转字符串中的单词顺序：

## 实例
``` python
def reverseWords(input):

    # 通过空格将字符串分隔，把各个单词分隔为列表
    inputWords = input.split(" ")

    # inputWords[-1::-1] 三个参数说明：
    # 第一个参数 -1 表示从最后一个元素开始
    # 第二个参数为空，表示移动到列表开头
    # 第三个参数 -1 表示逆向步进（每次向左移动一个位置）
    inputWords = inputWords[-1::-1]

    # 重新用空格拼接单词
    output = ' '.join(inputWords)

    return output

if __name__ == "__main__":
    input = 'I like runoob'
    rw = reverseWords(input)
    print(rw)
```

输出结果为：

```
runoob like I
```

---

## Tuple（元组）

元组（tuple）与列表类似，不同之处在于元组的元素不能修改。元组写在小括号 () 里，元素之间用逗号隔开。

元组中的元素类型也可以不相同：

## 实例
``` python
#!/usr/bin/python3

my_tuple = ('abcd', 786, 2.23, 'runoob', 70.2)  # 避免使用 tuple 作为变量名
tinytuple = (123, 'runoob')

print(my_tuple)               # 输出完整元组
print(my_tuple[0])            # 输出第一个元素：abcd
print(my_tuple[1:3])          # 输出索引 1 和 2 的元素：(786, 2.23)
print(my_tuple[2:])           # 输出从索引 2 开始的所有元素
print(tinytuple * 2)          # 输出两次 tinytuple
print(my_tuple + tinytuple)   # 连接两个元组
```

以上实例输出结果：

```
('abcd', 786, 2.23, 'runoob', 70.2)
abcd
(786, 2.23)
(2.23, 'runoob', 70.2)
(123, 'runoob', 123, 'runoob')
('abcd', 786, 2.23, 'runoob', 70.2, 123, 'runoob')
```

元组与字符串类似，可以被索引且下标从 0 开始，-1 为从末尾开始的位置，也可以进行截取。

其实，可以把字符串看作一种特殊的元组。

## 实例
```
>>> tup = (1, 2, 3, 4, 5, 6)
>>> print(tup[0])
1
>>> print(tup[1:5])
(2, 3, 4, 5)
>>> tup[0] = 11  # 修改元组元素的操作是非法的
Traceback (most recent call last):
  File "&lt;stdin&gt;", line 1, in &lt;module&gt;
TypeError: 'tuple' object does not support item assignment
```


虽然元组的元素不可改变，但它可以包含可变的对象，比如 list 列表。

构造包含 0 个或 1 个元素的元组比较特殊，有一些额外的语法规则：

```
tup1 = ()    # 空元组
tup2 = (20,) # 一个元素，需要在元素后添加逗号
```

如果你想创建只有一个元素的元组，需要在元素后面添加一个逗号，以区分它是元组而不是普通的值。因为在没有逗号的情况下，Python 会将括号解释为数学运算中的括号：

```
not_a_tuple = (42)  # 这是整数 42，不是元组
```

`string` 、 `list` 和 `tuple` 都属于 sequence（序列）。

**注意：**

- 与字符串一样，元组的元素不能修改（不可变类型）。
- 元组也可以被索引和切片，方法与列表相同。
- 注意构造包含 0 或 1 个元素的元组的特殊语法规则。
- 元组也可以使用 + 操作符进行拼接。

---

## Set（集合）

Python 中的集合（Set）是一种无序、可变的数据类型，用于存储唯一的元素。集合中的元素不会重复，并且可以进行交集、并集、差集等常见的集合操作。

在 Python 中，集合使用大括号 {} 表示，元素之间用逗号, 分隔。也可以使用 set() 函数创建集合。

> **注意：** 创建一个空集合必须用 set() 而不是 {}，因为 {} 创建的是一个空字典。

创建格式：

```
parame = {value01, value02, ...}
或者
set(value)
```

## 实例

``` python
#!/usr/bin/python3

sites = {'Google', 'Taobao', 'Runoob', 'Facebook', 'Zhihu', 'Baidu'}

print(sites)   # 输出集合（无序，重复元素会被自动去掉）

# 成员测试
if 'Runoob' in sites:
    print('Runoob 在集合中')
else:
    print('Runoob 不在集合中')

# set 可以进行集合运算
a = set('abracadabra')
b = set('alacazam')

print(a)           # a 中的唯一字符

print(a - b)       # a 和 b 的差集（在 a 中但不在 b 中）
print(a | b)       # a 和 b 的并集（在 a 或 b 中）
print(a & b)       # a 和 b 的交集（同时在 a 和 b 中）
print(a ^ b)       # a 和 b 的对称差集（在 a 或 b 中，但不同时存在）
```

以上实例输出结果：

```
{'Zhihu', 'Baidu', 'Taobao', 'Runoob', 'Google', 'Facebook'}
Runoob 在集合中
{'b', 'c', 'a', 'r', 'd'}
{'r', 'b', 'd'}
{'b', 'c', 'a', 'z', 'm', 'r', 'l', 'd'}
{'c', 'a'}
{'z', 'b', 'm', 'r', 'l', 'd'}
```

---

## Dictionary（字典）

字典（dictionary）是 Python 中另一个非常有用的内置数据类型。

字典是一种映射类型，用 {} 标识，它是一个 **键(key): 值(value)** 的集合。键(key) 必须使用不可变类型，且在同一个字典中键必须是唯一的。

> **注意：** Python 3.7 起，字典会保持元素的 **插入顺序** ，不再是无序的。如果需要有序字典的特性，直接使用普通 `dict` 即可。

## 实例

``` python
#!/usr/bin/python3

my_dict = {}
my_dict['one'] = "1 - 菜鸟教程"
my_dict[2]     = "2 - 菜鸟工具"

tinydict = {'name': 'runoob', 'code': 1, 'site': 'www.runoob.com'}

print(my_dict['one'])       # 输出键为 'one' 的值
print(my_dict[2])           # 输出键为 2 的值
print(tinydict)             # 输出完整的字典
print(tinydict.keys())      # 输出所有键
print(tinydict.values())    # 输出所有值
```

以上实例输出结果：

```
1 - 菜鸟教程
2 - 菜鸟工具
{'name': 'runoob', 'code': 1, 'site': 'www.runoob.com'}
dict_keys(['name', 'code', 'site'])
dict_values(['runoob', 1, 'www.runoob.com'])
```

构造函数 `dict()` 可以直接从键值对序列中构建字典：

## 实例

```
>>> dict([('Runoob', 1), ('Google', 2), ('Taobao', 3)])
{'Runoob': 1, 'Google': 2, 'Taobao': 3}
>>> {x: x**2 for x in (2, 4, 6)}
{2: 4, 4: 16, 6: 36}
>>> dict(Runoob=1, Google=2, Taobao=3)
{'Runoob': 1, 'Google': 2, 'Taobao': 3}
```

{x: x\*\*2 for x in (2, 4, 6)} 使用的是字典推导式，更多推导式内容可以参考： [Python 推导式](https://www.runoob.com/python3/python-comprehensions.html) 。

另外，字典类型也有一些内置的函数，例如 `clear()` 、 `keys()` 、 `values()` 等。

**注意：**

- 字典是一种映射类型，它的元素是键值对。
- 字典的键必须为不可变类型，且不能重复。
- 创建空字典使用 **{}** 。
- Python 3.7 起字典保持插入顺序。

---

## bytes 类型

在 Python3 中，bytes 类型表示的是不可变的二进制序列（byte sequence）。与字符串类型不同的是，bytes 类型中的元素是整数值（0 到 255 之间的整数），而不是 Unicode 字符。

bytes 类型通常用于处理二进制数据，比如图像文件、音频文件、视频文件等。在网络编程中，也经常使用 bytes 类型来传输二进制数据。

创建 bytes 对象最常见的方式是使用 b 前缀：

## 实例

``` python
x = b"hello"           # 使用 b 前缀创建 bytes 对象
print(x)               # b'hello'
print(type(x))         # <class 'bytes'>
print(x[0])            # 104（'h' 的 ASCII 值，bytes 元素是整数）
```

也可以使用 `bytes()` 函数将其他类型的对象转换为 bytes 类型，第二个参数指定编码方式：

``` python
x = bytes("hello", encoding="utf-8")
```

与字符串类型类似，bytes 类型也支持切片、拼接、查找、替换等操作。由于 bytes 类型是不可变的，修改操作需要创建一个新的 bytes 对象：

## 实例

``` python
x = b"hello"
y = x[1:3]          # 切片操作，得到 b'el'
z = x + b"world"    # 拼接操作，得到 b'helloworld'
print(y)            # b'el'
print(z)            # b'helloworld'
```

需要注意的是，bytes 类型中的元素是整数值，因此在进行比较操作时需要使用相应的整数值。可以用 `ord()` 函数将字符转换为对应的整数值：

## 实例

``` python
x = b"hello"
if x[0] == ord("h"):    # ord("h") 返回 104
    print("第一个元素是 'h'")
```

---

## Python 数据类型转换

有时候我们需要对数据内置的类型进行转换，只需要将数据类型作为函数名即可。在下一章节 [Python3 数据类型转换](https://www.runoob.com/python3/python3-type-conversion.html) 会具体介绍。

以下几个内置函数可以执行数据类型之间的转换，这些函数返回一个新的对象，表示转换后的值：

| 函数 | 描述 |
| --- | --- |
| [int(x \[,base\])](https://www.runoob.com/python3/python-func-int.html) | 将 x 转换为一个整数 |
| [float(x)](https://www.runoob.com/python3/python-func-float.html) | 将 x 转换为一个浮点数 |
| [complex(real \[,imag\])](https://www.runoob.com/python3/python-func-complex.html) | 创建一个复数 |
| [str(x)](https://www.runoob.com/python3/python-func-str.html) | 将对象 x 转换为字符串 |
| [repr(x)](https://www.runoob.com/python3/python-func-repr.html) | 将对象 x 转换为表达式字符串 |
| [eval(str)](https://www.runoob.com/python3/python-func-eval.html) | 计算字符串中的有效 Python 表达式，并返回一个对象 |
| [tuple(s)](https://www.runoob.com/python3/python3-func-tuple.html) | 将序列 s 转换为一个元组 |
| [list(s)](https://www.runoob.com/python3/python3-att-list-list.html) | 将序列 s 转换为一个列表 |
| [set(s)](https://www.runoob.com/python3/python-func-set.html) | 转换为可变集合 |
| [dict(d)](https://www.runoob.com/python3/python-func-dict.html) | 创建一个字典。d 必须是一个 (key, value) 元组序列。 |
| [frozenset(s)](https://www.runoob.com/python3/python-func-frozenset.html) | 转换为不可变集合 |
| [chr(x)](https://www.runoob.com/python3/python-func-chr.html) | 将一个整数转换为对应的字符 |
| [ord(x)](https://www.runoob.com/python3/python-func-ord.html) | 将一个字符转换为它的整数值（Unicode 码点） |
| [hex(x)](https://www.runoob.com/python3/python-func-hex.html) | 将一个整数转换为十六进制字符串 |
| [oct(x)](https://www.runoob.com/python3/python-func-oct.html) | 将一个整数转换为八进制字符串 |

---

## f-string 格式化字符串

f-string 是 Python 3.6+ 引入的字符串格式化方法，在字符串前加 `f`，用 `{}` 插入变量或表达式。

### 基本用法

```python
name = "小明"
age = 18
print(f"我叫{name}，今年{age}岁")
# 输出：我叫小明，今年18岁
```

### {} 里可以写表达式

```python
x = 10
print(f"{x} + 5 = {x + 5}")
# 输出：10 + 5 = 15
```

### 对比其他写法

```python
name = "小明"
age = 18

# 方法1：f-string（推荐）
print(f"我叫{name}，今年{age}岁")

# 方法2：format()
print("我叫{}，今年{}岁".format(name, age))

# 方法3：拼接
print("我叫" + name + "，今年" + str(age) + "岁")
```

f-string 最简洁，推荐使用。

---

## 相关

- [Python3 基础语法](/posts/编程学习/python学习笔记/02-python3基础语法/)
- [Python3 编程第一步](/posts/编程学习/python学习笔记/04-python3编程第一步/)

## 练习题

### 一、知识回顾（读完直接做下面的实践题）

1. 变量不需要声明，使用前必须赋值（赋值以后变量才会被创建）；变量本身没有类型，类型指的是它指向的内存对象的类型；`del 变量名` 删除对象引用
2. 两种多变量赋值：链式赋值 `a = b = c = 1`（三个变量同一个值）和拆包赋值 `a, b, c = 1, 2, "runoob"`（各赋各的值）；一个变量也可以改指别的类型的对象
3. 查看类型用 `type(变量)`（返回 `<class 'int'>` 这样的结果）；判断类型用 `isinstance(变量, 类型)`（返回 True/False）——`isinstance` 认子类，`type` 不认
4. 数据类型一共 7 种：Number（数字）、String（字符串）、bool（布尔）、List（列表）、Tuple（元组）、Set（集合）、Dictionary（字典）；按"能不能改"分：**不可变**的是 Number、String、bool、Tuple，**可变**的是 List、Dictionary、Set
5. 布尔类型只有 `True` 和 `False` 两个值，bool 是 int 的**子类**（True 等价 1、False 等价 0，`True + 1` 得 2）；转成布尔值时 `None`、`False`、零（`0`、`0.0`、`0j`）、空序列（`""`、`()`、`[]`）和空映射 `{}` 都是 False，其余都是 True
6. 数值运算：`+` 加、`-` 减、`*` 乘、`/` 除（结果一定是浮点数）、`//` 整除（向下取整）、`%` 取余、`**` 乘方；混合计算时整型会自动转成浮点数；整数字面量不允许前导零，八进制/十六进制/二进制分别写 `0o17`、`0x69`、`0b` 前缀
7. 字符串：单引号和双引号完全相同、反斜杠转义、加 `r` 前缀是原始字符串；`+` 连接、`*` 重复；索引从左往右从 0 开始、从右往左从 -1 开始；切片写成 `变量[头下标:尾下标]`（含头不含尾）；字符串**不能改变**
8. 四种容器的写法与关键区别：列表 `[...]` 元素**可改**（可以按下标赋值、切片赋值）；元组 `(...)` 元素**不可改**，单元素元组要写成 `(42,)`（逗号不能省）；集合 `{...}` 无序且元素唯一（空集合必须用 `set()`，`{}` 是空字典）；字典 `{键: 值}` 的键必须是不可变类型且唯一（Python 3.7 起保持插入顺序）
9. 集合运算：差集 `-`（在 a 中不在 b 中）、并集 `|`、交集 `&`、对称差集 `^`；成员测试用 `in`；字典取所有键用 `keys()`、所有值用 `values()`、清空用 `clear()`
10. 类型转换就用同名的内置函数：`int()`、`float()`、`str()`、`list()`、`tuple()`、`set()`、`dict()`、`bytes()`（转 bytes 要指定 `encoding="utf-8"`）；格式化输出用 f-string——字符串前加 `f`，`{}` 里可以直接写变量或表达式

### 二、裸写题

- [x] **2-1 变量赋值与类型查看**
  创建文件 `test_var.py`，完成以下操作：
  - 创建四个变量：`age = 25`、`height = 1.75`、`name = "小明"`、`is_student = True`
  - 逐行输出每个变量的值和它的类型（一行一个变量，带上变量名做标签）

  > **批改（2026-09-28）**：✅ 正确（`test_var.py` 四个变量赋值和 `type()` 都对，实测输出 `<class 'int'>`、`<class 'float'>`、`<class 'str'>`、`<class 'bool'>`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：先按题面把四个变量建好，再一行一个变量地输出"值 + 类型"；类型不用自己判断，有一个内置函数能问出答案
  > **二级 · 方法**：查类型用 `type(变量)`；输出用带标签的 f-string，如 `print(f"age = {age}, 类型: {type(age)}")`
  > **三级 · 骨架**：`print(f"age = {age}, 类型: {____(age)}")`（另外三个变量同理）

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-1
  > age = 25
  > height = 1.75
  > name = "小明"
  > is_student = True
  >
  > print(f"age = {age}, 类型: {type(age)}")
  > print(f"height = {height}, 类型: {type(height)}")
  > print(f"name = {name}, 类型: {type(name)}")
  > print(f"is_student = {is_student}, 类型: {type(is_student)}")
  > ```

- [x] **2-2 多变量赋值**
  创建文件 `test_multi.py`，完成以下操作：
  - 一次给三个变量赋同一个值：`x = y = z = 100`
  - 一次给三个变量赋不同的值：`a, b, c = 1, 2, "hello"`
  - 输出所有变量的值

  > **批改（2026-09-28）**：✅ 正确（`test_multi.py` 中链式赋值 `x = y = z = 100` 与拆包赋值 `a, b, c = 1, 2, "hello"` 都写对了，实测输出 `x = 100, y = 100, z = 100` 和 `a = 1, b = 2, c = hello`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：一行里用等号把三个变量串起来就是"都等于同一个值"；一行里用逗号把变量和值一一对应就是"各等于各的值"
  > **二级 · 方法**：链式赋值 `x = y = z = 100`；拆包赋值 `a, b, c = 1, 2, "hello"`
  > **三级 · 骨架**：`x = y = ____ = 100` / `a, b, c = 1, 2, "____"` / 再逐行输出

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-2
  > x = y = z = 100
  > a, b, c = 1, 2, "hello"
  >
  > print(f"x = {x}, y = {y}, z = {z}")
  > print(f"a = {a}, b = {b}, c = {c}")
  > ```

- [x] **2-3 数值运算练习**
  创建文件 `test_number.py`，完成以下计算并把每项结果逐行输出（带上算式做标签）：
  - 计算 `15 + 3`（加法）
  - 计算 `20 / 3`（除法，得到浮点数）
  - 计算 `20 // 3`（整除）
  - 计算 `20 % 3`（取余）
  - 计算 `2 ** 10`（乘方）

  > **批改（2026-09-28）**：✅ 正确（`test_number.py` 五项实测 `18`、`6.666666666666667`、`6`、`2`、`1024` 全对）；最后一行标签写成 `2 **10`，少了一个空格。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：五项各写一行"标签 + 结果"；标签里保留原算式，方便和结果对照
  > **二级 · 方法**：算式的值直接写进 f-string 的 `{}` 里（如 `f"15 + 3 = {15 + 3}"`）；除法和整除分别用 `/`、`//`
  > **三级 · 骨架**：`print(f"20 / 3 = {____}")` / `print(f"20 // 3 = {20 ____ 3}")` / `print(f"2 ** 10 = {2 ____ 10}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-3
  > print(f"15 + 3 = {15 + 3}")      # 18
  > print(f"20 / 3 = {20 / 3}")     # 6.666666666666667
  > print(f"20 // 3 = {20 // 3}")   # 6
  > print(f"20 % 3 = {20 % 3}")     # 2
  > print(f"2 ** 10 = {2 ** 10}")   # 1024
  > ```

- [x] **2-4 布尔类型练习**
  创建文件 `test_bool.py`，完成以下操作：
  - 对 `0`、`1`、`""`、`"Python"`、`[]`、`[1,2]`、`None` 这七个值逐行输出它们的布尔值（一行一项，带上原始值做标签）
  - 再验证 `True + 1` 和 `False + 1` 的结果

  > **批改（2026-09-28）**：⚠️ `test_bool.py` 里 7 个 `bool()` 测试和 `True + 1`、`False + 1` 的取值全对（`False`、`True`、`False`、`True`、`False`、`True`、`False`，以及 `2`、`1`）；两处笔误：① 第 4 项写成 `bool('python')`，题面是 `bool('Python')`（值同为 True，但输出的字串不一样）；② `True + 1` 那行标签拼成了 `Trur`、`=` 后还缺空格，实测输出 `Trur + 1 =2`，应写成 `print(f"True + 1 = {True + 1}")`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：把每个值交给"转布尔"的内置函数看它变 True 还是 False；后两项是布尔值直接当数字相加
  > **二级 · 方法**：布尔转换写 `bool(值)`；相加的直接写 `True + 1` / `False + 1`（True 当 1、False 当 0）
  > **三级 · 骨架**：`print(f"bool(0) = {____(0)}")` / `print(f"True + 1 = {True ____ 1}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-4
  > print(f"bool(0) = {bool(0)}")       # False
  > print(f"bool(1) = {bool(1)}")       # True
  > print(f"bool('') = {bool('')}")     # False
  > print(f"bool('Python') = {bool('Python')}")  # True
  > print(f"bool([]) = {bool([])}")     # False
  > print(f"bool([1,2]) = {bool([1,2])}")  # True
  > print(f"bool(None) = {bool(None)}") # False
  >
  > print(f"True + 1 = {True + 1}")   # 2
  > print(f"False + 1 = {False + 1}") # 1
  > ```

- [x] **2-5 字符串操作练习** ❌
  创建文件 `test_string.py`，完成以下操作：
  - 定义字符串 `s = "Hello Python"`
  - 输出第一个字符、最后一个字符
  - 输出索引 0 到 5 的切片
  - 输出字符串重复 3 次的结果
  - 在末尾拼接 `" World"` 并输出

  > **批改（2026-09-28）**：❌ `test_string1.py` 前四项都对（`s[0]` 得 `H`、`s[-1]` 得 `n`、`s[0:5]` 得 `Hello`、`s * 3` 重复三次），但拼接写成了 `s + 'word'`，实测输出 `Hello Pythonword`；题面要求拼接 `" World"`，应写成 `print(f"拼接: {s + ' World'}")`，输出 `Hello Python World`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：取单个字符、取一段切片、重复、拼接是四种不同操作，各写一行；记得拼的内容前面有一个空格
  > **二级 · 方法**：`s[0]` 首字符、`s[-1]` 末字符、`s[0:5]` 切片（含头不含尾）、`s * 3` 重复、`s + ' World'` 拼接
  > **三级 · 骨架**：`print(f"第一个字符: {s[____]}")` / `print(f"切片 [0:5]: {s[0:____]}")` / `print(f"拼接: {s ____ ' World'}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-5
  > s = "Hello Python"
  >
  > print(f"第一个字符: {s[0]}")    # H
  > print(f"最后一个字符: {s[-1]}") # n
  > print(f"切片 [0:5]: {s[0:5]}") # Hello
  > print(f"重复3次: {s * 3}")     # Hello PythonHello PythonHello Python
  > print(f"拼接: {s + ' World'}") # Hello Python World
  > ```

- [x] **2-6 列表操作练习**
  创建文件 `test_list.py`，完成以下操作：
  - 创建列表 `fruits = ["苹果", "香蕉", "橘子", "葡萄"]`
  - 输出第一个元素和最后一个元素
  - 输出索引 1 到 3 的切片
  - 在列表后面接上另一个列表 `["西瓜"]` 并输出结果
  - 把第二个元素改成 `"梨"`，再输出整个列表

  > **批改（2026-09-28）**：✅ 正确（`test_list.py` 五项全对：`fruits[0]` 得 `苹果`、`fruits[-1]` 得 `葡萄`、切片得 `['香蕉', '橘子']`、`+ ['西瓜']` 拼接成功、`fruits[1] = "梨"` 后输出 `['苹果', '梨', '橘子', '葡萄']`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：列表的索引、切片和字符串一个套路；"接上另一个列表"是拼接出新列表（原列表不变），"改成梨"是直接给某个下标重新赋值
  > **二级 · 方法**：`fruits[0]`、`fruits[-1]`、`fruits[1:3]` 切片、`fruits + ["西瓜"]` 拼接、`fruits[1] = "梨"` 按下标赋值
  > **三级 · 骨架**：`print(f"切片 [1:3]: {fruits[____:____]}")` / `print(f"拼接: {fruits ____ ['西瓜']}")` / `fruits[____] = "梨"`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-6
  > fruits = ["苹果", "香蕉", "橘子", "葡萄"]
  >
  > print(f"第一个: {fruits[0]}")    # 苹果
  > print(f"最后一个: {fruits[-1]}") # 葡萄
  > print(f"切片 [1:3]: {fruits[1:3]}")  # ['香蕉', '橘子']
  > print(f"拼接: {fruits + ['西瓜']}")
  > fruits[1] = "梨"
  > print(f"修改后: {fruits}")  # ['苹果', '梨', '橘子', '葡萄']
  > ```

- [x] **2-7 元组操作练习** ❌
  创建文件 `test_tuple.py`，完成以下操作：
  - 创建元组 `colors = ("红", "绿", "蓝", "黄")`
  - 输出第一个元素和索引 1 到 3 的切片
  - 真的动手改一下元组里的某个元素，把报错信息看清楚（不要把这行注释掉）
  - 创建一个只有单个元素的元组并输出它（注意单元素元组的写法）

  > **批改（2026-09-28）**：❌ `test_tuple.py` 把单元素元组写成了列表：`single = [42,]` 实测输出 `[42]`（方括号，是列表），题面要的是元组，应写 `single = (42,)`；另外"尝试修改元组观察报错"那行 `# colors[0] = '紫'` 被注释掉了，没有真跑出 `TypeError: 'tuple' object does not support item assignment`，去掉注释跑一次才算做完。前两项（`colors[0]` 得 `红`、切片得 `('绿', '蓝')`）正确。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：元组的索引/切片和列表一样；区别在元素**不能改**——改它会当场报类型错误，这正是本题要看的现象；单元素元组要特别写，否则会被当成普通数字
  > **二级 · 方法**：`colors[0]`、`colors[1:3]`；改元素写 `colors[0] = "紫"`（会抛 `TypeError: 'tuple' object does not support item assignment`）；单元素元组写 `single = (42,)`（逗号不能省）
  > **三级 · 骨架**：`print(f"切片 [1:3]: {colors[____:____]}")` / `colors[____] = "紫"` / `single = (42,____)`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-7
  > colors = ("红", "绿", "蓝", "黄")
  >
  > print(f"第一个: {colors[0]}")      # 红
  > print(f"切片 [1:3]: {colors[1:3]}")  # ('绿', '蓝')
  >
  > # 尝试修改会报错：TypeError: 'tuple' object does not support item assignment
  > # colors[0] = "紫"
  >
  > single = (42,)
  > print(f"单元素元组: {single}")  # (42,)
  > ```

- [x] **2-8 集合操作练习**
  创建文件 `test_set.py`，完成以下操作：
  - 创建集合 `a = {1, 2, 3, 4}` 和 `b = {3, 4, 5, 6}`
  - 分别计算并集（两边的全部元素）、交集（两边都有的元素）、差集（在 a 中但不在 b 中的元素）并输出
  - 再测试 `2` 是不是 `a` 的成员，把测试结果输出

  > **批改（2026-09-28）**：✅ 正确（`test_set.py` 四项全对：并集 `{1, 2, 3, 4, 5, 6}`、交集 `{3, 4}`、差集 `{1, 2}`、`2 in a` 输出 `True`）。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：集合之间的三种运算各有一个运算符；"是不是成员"用成员运算符，结果直接就是布尔值
  > **二级 · 方法**：并集 `a | b`、交集 `a & b`、差集 `a - b`、成员测试 `2 in a`
  > **三级 · 骨架**：`print(f"并集 a | b = {a ____ b}")` / `print(f"交集 a & b = {a ____ b}")` / `print(f"差集 a - b = {a ____ b}")` / `print(f"2 in a = {2 ____ a}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-8
  > a = {1, 2, 3, 4}
  > b = {3, 4, 5, 6}
  >
  > print(f"并集 a | b = {a | b}")   # {1, 2, 3, 4, 5, 6}
  > print(f"交集 a & b = {a & b}")   # {3, 4}
  > print(f"差集 a - b = {a - b}")   # {1, 2}
  > print(f"2 in a = {2 in a}")      # True
  > ```

- [x] **2-9 字典操作练习**
  创建文件 `test_dict.py`，完成以下操作：
  - 创建字典 `student = {"name": "小明", "age": 18, "score": 95}`
  - 输出 `name` 对应的值（带上文字标签）
  - 添加一个键值对 `"class": "一班"`
  - 把 `score` 改成 `100`
  - 输出所有的键和所有的值（带上文字标签）

  > **批改（2026-09-28）**：⚠️ `test_dict.py` 五项操作都做了（打印 `name`、新增 `class`、把 `score` 改成 100、打印所有键/所有值），但初始字典里 `"age"` 存成了字符串 `"18"`（题面是整数 `18`），实测"所有值"输出 `['小明', '18', 100, '一班']`；另外四行都是裸 `print`，没有 `f"name: {...}"` 这类文字标签，输出不易读。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：按"键"取值和按"键"赋值是同一个写法——中括号里写键：读是取、写是新增或修改；要一次拿到所有键/所有值有现成的方法
  > **二级 · 方法**：取值/新增/修改都用 `字典[键] = 值` 的形式；所有键 `student.keys()`、所有值 `student.values()`（可以套一层 `list()` 看得更清楚）；输出带标签用 f-string
  > **三级 · 骨架**：`print(f"name: {student[____]}")` / `student["class"] = "____"` / `print(f"所有键: {list(student.____())}")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-9
  > student = {"name": "小明", "age": 18, "score": 95}
  >
  > print(f"name: {student['name']}")  # 小明
  > student["class"] = "一班"
  > student["score"] = 100
  > print(f"所有键: {list(student.keys())}")  # ['name', 'age', 'score', 'class']
  > print(f"所有值: {list(student.values())}")  # ['小明', 18, 100, '一班']
  > ```

- [x] **2-10 类型转换练习**
  创建文件 `test_convert.py`，把下面四项各转换一次并逐行输出（一行一项、带上文字标签）：
  - 字符串 `"123"` 转换成整数
  - 整数 `100` 转换成字符串
  - 列表 `[1, 2, 3]` 转换成元组
  - 字符串 `"hello"` 转换成 bytes 类型（用 utf-8 编码）

  > **批改（2026-09-28）**：⚠️ `test_convert.py` 四种转换都做了（`int("123")`、`str(100)`、`tuple(...)`、`bytes("hello", encoding="utf-8")`，实测输出 `123 100 (1, 3, 2, 4) b'hello'`）；两处偏差：① 列表写成了 `[1, 3, 2, 4]`，题面是 `[1, 2, 3]`，元组结果应为 `(1, 2, 3)`；② 四项挤在一行 `print(a, text, t, c)`，看不出哪项是哪个，参考写法是分成四行并带标签，如 `print(f"字符串转整数: {num}, 类型: {type(num)}")`。

  > [!TIP]- 提示（先自己想，实在想不出再点开）
  > **一级 · 思路**：转换就用"目标类型同名的内置函数"来包住原值；每项单独一行输出，标签写清"从什么转什么"
  > **二级 · 方法**：`int("123")`、`str(100)`、`tuple([1, 2, 3])`、`bytes("hello", encoding="utf-8")`；不确定结果类型时可以在标签里再查一次 `type(变量)`
  > **三级 · 骨架**：`num = ____("123")` / `t = ____([1, 2, 3])` / `b = ____("hello", encoding="____")`

  > [!TIP]- 参考答案（做完再点开）
  > ```python
  > # 2-10
  > num = int("123")
  > print(f"字符串转整数: {num}, 类型: {type(num)}")  # 123, <class 'int'>
  >
  > text = str(100)
  > print(f"整数转字符串: {text}, 类型: {type(text)}")  # 100, <class 'str'>
  >
  > t = tuple([1, 2, 3])
  > print(f"列表转元组: {t}")  # (1, 2, 3)
  >
  > b = bytes("hello", encoding="utf-8")
  > print(f"字符串转bytes: {b}")  # b'hello'
  > ```
