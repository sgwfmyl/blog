# 导航页（/projects/）改版设计稿

日期：2026-09-30 · 状态：待站长确认 · 范围：**只动 `/projects/` 这一页**（`src/pages/projects.astro`）

## 1. 目标

把导航页从「页头大标题 + 横向胶囊标签 + 卡片网格」改成参考站（kulayu.com）那种结构：

```
┌──────────────┬──────────────────────────────────────────────┐
│ 全部      52 │  🔍 搜索网站…                                 │
│ 我的网站   9 │                                              │
│ 常用网站   1 │  ▤ 我的网站  9                               │
│ 工具网站   8 │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ AI         3 │  │icon 名称│ │icon 名称│ │icon 名称│ │icon 名称│ │
│ …            │  │     描述│ │     描述│ │     描述│ │     描述│ │
│              │  └────────┘ └────────┘ └────────┘ └────────┘ │
│              │  ▤ 常用网站  1                               │
│              │  …（「全部」时所有分类依次往下排）            │
└──────────────┴──────────────────────────────────────────────┘
     13rem                        自适应（占满中间+右侧）
```

- 左栏：分类列表，粘住不随滚动走。
- 右栏（参考站的推广位 + 最新/随机列表）：**不做**。
- 两个已定的方向（站长 2026-09-30 选择）：
  1. 左栏先做**扁平**：11 个分类，不做两级分组、不做子标签。
  2. 搜索**输入即筛**（纯前端）。
  3. 左栏顶部**不放**本站入口，只有「全部」+ 分类。

## 2. 现状与数据

- 数据：`daohang` 集合，**11 个扁平文件夹**（无子目录），共 52 条；字段只有 `name` / `url` / `icon` / `description`。
- 分类顺序与图标写在页面里的 `CATEGORY_META` 映射表；`AI`、`开发者工具`、`开发者服务平台` 三个**还没登记**（会掉到列表尾部）。
- 卡片现状：图标 + 标题一行、描述一行、**域名脚注一行**；悬浮只有文字位移。
- 页面样式与脚本都在 `projects.astro` 内（`<style>` + `<script slot="head" is:inline>`），本次继续留在页内，不拆全局 CSS。

## 3. 参考站规格（逐值，已核对其 style.css）

| 元素 | 规格 |
|---|---|
| 卡片外框 | `padding: 15px`、圆角 M、`border: 1px solid`（用悬停底色同色系） |
| 卡片排版 | 左图标（约 25–32px、圆角）＋ 右列两行：标题 14px/600 单行省略、描述 12px/60% 单行省略 |
| 卡片悬浮 | 卡片 `translateY(-1px)`；底色变浅一档；右上角小图标由 0.2 透明度变 1 |
| 卡片列数 | 25%（一行 4 个） |
| 分区标题行 | `[分类图标 18px] 分类名 18px/600 ｜（2.5px×12px 竖条） 子标签…`，右侧对齐一句标语（这轮不做子标签与标语，只保留图标+名称+条数） |
| 左栏项 | 图标 + 名称；当前项浅底 + 左侧一小段竖向强调条；容器 `position: sticky` |
| **图标「蹦一蹦」** | 卡片悬浮时给图标播一次 1.2s 的关键帧（下压 → 起跳 → 落地 → 回弹），原样复刻： |

```css
/* 参考站原样：hover 时图标跳一次 */
@keyframes nav-icon-jumps {
  0%   { transform: translate(0); }
  10%  { transform: translateY(8px) scaleX(1.2) scaleY(0.8); }   /* 下压 */
  30%  { transform: translateY(-5px) scaleX(1) scaleY(1) rotate(5deg); }
  50%  { transform: translateY(3px) scale(1) rotate(0); }
  55%  { transform: translateY(0) scaleX(1.1) scaleY(0.9) rotate(0); }
  70%  { transform: translateY(-5px) scaleX(1) scaleY(1) rotate(-2deg); }
  80%  { transform: translateY(0) scaleX(1) scaleY(1) rotate(0); }
  85%  { transform: translateY(0) scaleX(1.05) scaleY(0.95) rotate(0); }
  100% { transform: translateY(0) scaleX(1) scaleY(1); }
}
.nav-card:hover .nav-card__icon,
.nav-card:focus-visible .nav-card__icon {
  animation: nav-icon-jumps 1.2s ease 1;
}
@media (prefers-reduced-motion: reduce) {
  .nav-card:hover .nav-card__icon { animation: none; }
}
```

动画挂在**图标外层容器**上（不是 `<img>`/`<svg>` 自己），这样图标无论是图片 URL、`/` 路径还是 Iconify 图标名都能跳。

## 4. 布局与交互

### 左栏（`.nav-side`）
- `width: 13rem`、`position: sticky; top: 5.5rem`、`max-height: calc(100vh - 7rem)`、自身可滚动。
- 项：`[图标] 分类名 … 条数`；当前项＝浅底（`--btn-plain-bg-hover`）+ 左侧 2px×1rem 圆角强调条 + 文字加重。
- 首项固定为「全部」（把 11 个分类的条数合计）。
- 点击写 URL：`window.history.replaceState` 到 `#nav-<分类名>`，刷新/分享可回到同一分类（沿用现有 hash 机制，只换前缀）。

### 内容区（`.nav-main`）
- 顶部搜索条：圆角 0.75rem、`1px solid var(--line-divider)`、左侧放大镜图标、聚焦时边框变 `--deep-text`（与动态页左栏搜索框同一套语言）；右侧在有关键词时出现清空按钮；下方右侧显示「找到 N 个」。
- 分区：`[分类图标] 分类名 + 条数` + 一条横向细线（沿用现有样式语言），下面是卡片网格。
- 「全部」＝所有分类依次往下排；选中某分类＝只显示那一段。

### 搜索（纯前端筛卡片）
- 输入即筛（150ms 防抖），匹配 **名称 / 描述 / 域名**，不区分大小写；命中项显示，未命中隐藏；整段无命中就隐藏该段。
- **开始输入时自动切到「全部」**（保证搜的是整站收藏，不是当前分类里的），清空后回到「全部」视图。
- 全部无命中 → 空态：「没找到匹配的网站」+「清空搜索」按钮。
- Esc 清空搜索框。

### 分类顺序（`CATEGORY_META` 补齐，建议值）
`我的网站 0 · 常用网站 1 · 工具网站 2 · 开发者工具 3 · 开发者服务平台 4 · AI 5 · 学习网站 6 · 文档 7 · 设计资源 8 · 实用项目 9 · API 10 · 未分类 13`
（`AI` / `开发者工具` / `开发者服务平台` 三个补上 `display` + `order` + `icon`；顺序可随时改，改一处只影响左栏与分区的先后。）

### 响应式
- ≥1024px：左右两栏如上。
- ≤1023px：左栏收成**顶部横向可滑的胶囊条**（沿用现有 `tools-tab-pill` 那套交互：指示块跟随、hash 同步），搜索条在它下面；卡片 2 列。
- ≤640px：卡片 1 列；分区标题右边不再放标语/条数换行。

### 卡片
- 两行式：`[图标] 名称` / `描述`；去掉现有域名脚注。
- 网格：`repeat(auto-fill, minmax(12.5rem, 1fr))`，间距 0.75rem。
- 目标仍是 `target="_blank" rel="noopener noreferrer"`；`focus-visible` 也给同样的悬浮效果（键盘可达）。

## 5. 实现要点（踩坑提醒）

- **sticky 失效**：`#main-content-wrapper` 与页面外层卡片都有 `overflow: hidden`，会让左栏的 sticky 完全失效（动态页踩过一次）。本页需要 `#main-content-wrapper:has(.nav-side) { overflow: clip; }`，页面外层那个 `overflow-hidden` 也换成 `overflow: clip`（只在本页生效）。
- **图标空白**：本页图标若走 astro-icon 的 sprite（`<use href="#ai:…">`）会碰到"丢符号"问题（动态页踩过）——本页涉及图标较多，统一用 `@/components/common/Icon.astro`（强制内联）或给 `<Icon>` 加 `is:inline`。
- 脚本按现有约定：内联 + `astro:page-load` / `swup:content:replaced` 重新绑定，不碰 `swup-lifecycle-controller.ts`。
- 交互脚本必须放在 Swup 容器内（现状如此，保持）。

## 6. 不做（YAGNI）

- 右侧栏（推广位、最新/随机列表）：站长明确不要。
- 子标签 / 两级分组：本轮扁平；以后要做，走"子文件夹数据驱动"那条路（页面侧已按可扩展结构写）。
- 分区标语（参考站那句右侧文案）：没有数据来源，先不做。
- 搜索引擎式搜索框（选引擎跳百度/必应）：本站收藏量小，输入即筛更实用。

## 7. 验证清单

- `pnpm check` 0 错误；`pnpm build` 通过；biome（LF 版本）干净。
- 浏览器实测：1440 / 900 / 390 三档布局；左栏 sticky（滚动时不动）；点分类只看该段 + hash 生效 + 刷新回到同一分类；搜索筛名称/描述/域名、无命中空态、清空还原；悬浮卡片图标跳一次（截图 + 逐帧确认动画在跑）；键盘 Tab 能到卡片。
- 回归：其它页面（首页/动态/归档/文章页）布局与分类顺序不受影响。
