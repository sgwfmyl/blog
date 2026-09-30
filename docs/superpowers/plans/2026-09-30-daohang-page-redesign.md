# 导航页（/projects/）改版实现计划

> **For agentic workers:** 本仓库无测试框架，验证手段固定为 `pnpm check`（astro check）+ `pnpm build` + biome（LF 版本）+ 浏览器实测；步骤用 `- [ ]` 勾选跟踪。

**Goal:** 把 `/projects/` 从「页头大标题 + 横向胶囊标签 + 卡片网格」改成「左栏分类（sticky）+ 满宽内容区 + 顶部输入即筛搜索 + 卡片图标跳动效」，只改这一页。

**Architecture:** 单个 Astro 页面内自包含（markup + 内联 `<style>` + 内联 `<script is:inline>`），与现有写法一致，不新增全局 CSS/JS；分类与卡片仍在构建期算好，搜索是纯前端筛选（全部 52 条本来就渲染在页面上，不发请求）。整页宽度沿用「逐页一条规则」的做法写在 `no-sidebar-pages.css`。

**Tech Stack:** Astro 7 + Tailwind v4（无 config）+ 原生 CSS/JS 内联脚本 + Swup SPA（`astro:page-load` / `swup:content:replaced` 重新绑定）。

## Global Constraints

- 设计稿：`docs/superpowers/specs/2026-09-30-daohang-page-redesign-design.md`（逐值规格以它为准）。
- 只动 `/projects/`：`src/pages/projects.astro` + `src/styles/features/no-sidebar-pages.css` 里 projects 那一条；其它页面零影响。
- 整页宽度：≥768px `max-width: 100%`，≥1280px `max-width: 80vw`（站长要求「占 4/5」）。
- 卡片图标动效 keyframes 原样复刻参考站（1.2s、`ease`、播 1 次），`prefers-reduced-motion: reduce` 下不播。
- 本页图标统一内联（加 `is:inline`），避免 astro-icon sprite 丢符号导致图标空白。
- 不做：右栏、子标签/两级分组、分区标语、搜索引擎式搜索。
- 收尾按 CLAUDE.md §20/§21：changelog 一条（feature → minor）+ CLAUDE.md 补节 + `pnpm build` 通过 + biome 干净。

---

### Task 1: 容器与宽度（先让 sticky 能生效）

**Files:**
- Modify: `src/styles/features/no-sidebar-pages.css:69-74`（projects 的宽度规则）
- Modify: `src/pages/projects.astro`（外层 `overflow-hidden` → `overflow: clip`）

**Interfaces:**
- Produces: 一个高度不受限、无滚动容器祖先的内容区，左栏 `position: sticky` 才能生效。

- [ ] **Step 1: 改宽度规则**

```css
/* 导航站 /projects/ —— 站长要求整页占 4/5（沿用动态页那套：% 会按上一级容器算，
   实际只有 70%，所以用 vw） */
@media (min-width: 768px) {
	html:has(#content-wrapper[data-no-sidebar="projects"]) #content-wrapper {
		max-width: 100%;
	}
}
@media (min-width: 1280px) {
	html:has(#content-wrapper[data-no-sidebar="projects"]) #content-wrapper {
		max-width: 80vw;
	}
}
```

- [ ] **Step 2: 解除 sticky 的祖先裁剪**

`#main-content-wrapper` 是 `overflow: hidden`，它自己成为「滚动容器」却不滚动 → 左栏 sticky 完全失效（动态页踩过）。在页面 `<style>` 里加本页专属覆盖：

```css
/* 左栏 sticky 生效的前提：祖先 overflow: hidden 会让它变成滚动容器（自身不滚），
   换成 clip —— 裁剪一样、但不产生滚动容器。外层卡片同理。 */
#main-content-wrapper:has(.nav-side) { overflow: clip; }
.nav-page-shell { overflow: clip; }   /* 替换原来的 overflow-hidden */
```

- [ ] **Step 3: 验证 sticky**（临时加左栏后测一次，或到 Task 2 一起测）

浏览器里滚到页面中部，量 `.nav-side` 的 `getBoundingClientRect().top` 两次（滚动前后差值应为 0）。

---

### Task 2: 左栏分类列表

**Files:**
- Modify: `src/pages/projects.astro`（markup + 样式 + hash 同步脚本）

**Interfaces:**
- Consumes: `sortedCategories` / `sortedData` / `categoryCounts` / `allSites`（页面 frontmatter 已有）
- Produces: `.nav-side`（aside）、`.nav-side__item`（按钮，`data-nav-cat="<分类名|all>"`）、`ANCHOR_PREFIX = "#nav-"`

- [ ] **Step 1: 结构**

```astro
<div class="nav-layout">
  <aside class="nav-side" aria-label="分类导航">
    <button type="button" class="nav-side__item is-active" data-nav-cat="all">
      <Icon name="material-symbols:apps" is:inline />
      <span class="nav-side__label">全部</span>
      <span class="nav-side__count">{allSites.length}</span>
    </button>
    {sortedCategories.map((cat) => (
      <button type="button" class="nav-side__item" data-nav-cat={cat}>
        <Icon name={getCategoryIcon(cat)} is:inline />
        <span class="nav-side__label">{getCategoryDisplay(cat)}</span>
        <span class="nav-side__count">{categoryCounts[cat]}</span>
      </button>
    ))}
  </aside>
  <div class="nav-main">…（Task 3、4）…</div>
</div>
```

- [ ] **Step 2: 样式要点**

```css
.nav-layout { display: grid; grid-template-columns: 13rem minmax(0, 1fr); gap: 1.25rem; align-items: start; }
.nav-side { position: sticky; top: 5.5rem; display: flex; flex-direction: column; gap: 0.125rem;
  max-height: calc(100vh - 7rem); overflow-y: auto; overscroll-behavior: contain; }
.nav-side__item { display: flex; align-items: center; gap: 0.5rem; width: 100%;
  padding: 0.5rem 0.625rem; border: 0; border-radius: 0.625rem; background: transparent;
  color: var(--deep-text); font-size: 0.875rem; cursor: pointer; text-align: left;
  transition: background-color 150ms ease; }
.nav-side__item:hover { background: var(--btn-plain-bg-hover); }
.nav-side__item.is-active { background: var(--btn-plain-bg-hover); font-weight: 700; }
/* 活动项的短竖条（参考站同款，2px×1rem，不是粗条） */
.nav-side__item.is-active::before { content: ""; width: 2px; height: 1rem; border-radius: 2px;
  background: var(--primary); margin-left: -0.25rem; }
.nav-side__count { margin-left: auto; font-size: 0.75rem; color: var(--content-meta); }
```

- [ ] **Step 3: 点击 / hash 同步**（沿用现有 `#tools-` 机制，只换前缀）

```js
var ANCHOR = "#nav-";
function setActive(cat) {
  document.querySelectorAll("[data-nav-cat]").forEach(function (btn) {
    btn.classList.toggle("is-active", btn.dataset.navCat === cat);
  });
  document.querySelectorAll("[data-nav-section]").forEach(function (sec) {
    sec.classList.toggle("hidden", cat !== "all" && sec.dataset.navSection !== cat);
  });
  var next = ANCHOR + encodeURIComponent(cat);
  if (window.location.hash !== next) window.history.replaceState(null, "", next);
}
// 从 hash 恢复；hashchange 也响应
```

- [ ] **Step 4: 窄屏**：`@media (max-width: 1023px)` 把 `.nav-layout` 收成单列，`.nav-side` 改成横向可滑的胶囊条（复用现有 `.tools-tab-pill` 的写法与指示块），顶部对齐。

- [ ] **Step 5: 验证**：点分类只看该段；刷新回到同一分类；窄屏胶囊可横向滑动。

---

### Task 3: 内容区分区 + 卡片 + 图标跳动效

**Files:**
- Modify: `src/pages/projects.astro`

**Interfaces:**
- Consumes: `.nav-side__item` 的 `data-nav-cat`（Task 2）
- Produces: `[data-nav-section="<分类名>"]`（分区容器）、`.nav-card` / `.nav-card__icon`（卡片与图标容器，供搜索与动画使用）

- [ ] **Step 1: 分区与卡片结构**

```astro
{sortedCategories.map((cat) => (
  <section class="nav-section" data-nav-section={cat}>
    <div class="nav-section__head">
      <Icon name={getCategoryIcon(cat)} is:inline />
      <h2 class="nav-section__title">{getCategoryDisplay(cat)}</h2>
      <span class="nav-section__count">{categoryCounts[cat]}</span>
      <div class="nav-section__line" />
    </div>
    <div class="nav-grid">
      {sortedData.get(cat)!.map((site) => (
        <a href={site.data.url} target="_blank" rel="noopener noreferrer" class="nav-card"
           data-name={site.data.name} data-desc={site.data.description} data-host={hostOf(site.data.url)}>
          <span class="nav-card__icon">
            {/* 图片 URL / / 路径 → <img>；否则 → <Icon is:inline> */}
          </span>
          <span class="nav-card__body">
            <span class="nav-card__title">{site.data.name}</span>
            <span class="nav-card__desc">{site.data.description}</span>
          </span>
        </a>
      ))}
    </div>
  </section>
))}
```

- [ ] **Step 2: 卡片样式（两行式，去掉域名脚注）**

```css
.nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(12.5rem, 1fr)); gap: 0.75rem; }
.nav-card { display: flex; align-items: flex-start; gap: 0.625rem; padding: 0.75rem;
  border: 1px solid var(--line-divider); border-radius: 0.75rem; background: transparent;
  text-decoration: none; transition: background-color 200ms ease, transform 200ms ease, border-color 200ms ease; }
.nav-card:hover, .nav-card:focus-visible { background: var(--btn-plain-bg-hover);
  border-color: var(--btn-plain-bg-hover); transform: translateY(-1px); }
.nav-card__icon { display: inline-flex; width: 2rem; height: 2rem; flex: 0 0 auto; }
.nav-card__icon img, .nav-card__icon svg { width: 2rem; height: 2rem; border-radius: 0.5rem; object-fit: contain; }
.nav-card__title { display: block; font-size: 0.875rem; font-weight: 600; color: var(--deep-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-card__desc { display: block; font-size: 0.75rem; color: var(--content-meta);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

- [ ] **Step 3: 图标跳动效（原样复刻，挂在图标容器上）**

```css
.nav-card:hover .nav-card__icon,
.nav-card:focus-visible .nav-card__icon { animation: nav-icon-jumps 1.2s ease 1; }
@keyframes nav-icon-jumps {
  0%   { transform: translate(0); }
  10%  { transform: translateY(8px) scaleX(1.2) scaleY(0.8); }
  30%  { transform: translateY(-5px) scaleX(1) scaleY(1) rotate(5deg); }
  50%  { transform: translateY(3px) scale(1) rotate(0); }
  55%  { transform: translateY(0) scaleX(1.1) scaleY(0.9) rotate(0); }
  70%  { transform: translateY(-5px) scaleX(1) scaleY(1) rotate(-2deg); }
  80%  { transform: translateY(0) scaleX(1) scaleY(1) rotate(0); }
  85%  { transform: translateY(0) scaleX(1.05) scaleY(0.95) rotate(0); }
  100% { transform: translateY(0) scaleX(1) scaleY(1); }
}
@media (prefers-reduced-motion: reduce) { .nav-card:hover .nav-card__icon { animation: none; } }
```

- [ ] **Step 4: 验证**：悬浮卡片时用 `getAnimations()` 确认 `nav-icon-jumps` 在跑（`playState: "running"`），并截图看图标位移。

---

### Task 4: 搜索（输入即筛）

**Files:**
- Modify: `src/pages/projects.astro`

**Interfaces:**
- Consumes: Task 2 的 `setActive()`、Task 3 的 `.nav-card[data-name|data-desc|data-host]`
- Produces: `#nav-search`（输入框）、`#nav-search-clear`、`#nav-search-count`、`#nav-search-empty`

- [ ] **Step 1: 结构**

```astro
<div class="nav-search">
  <span class="nav-search__icon"><Icon name="material-symbols:search-rounded" is:inline /></span>
  <input id="nav-search" type="search" class="nav-search__input" placeholder="搜索网站…" autocomplete="off" />
  <button id="nav-search-clear" type="button" class="nav-search__clear" hidden aria-label="清空搜索">
    <Icon name="material-symbols:close-rounded" is:inline />
  </button>
  <span class="nav-search__count" id="nav-search-count"></span>
</div>
<p class="nav-search__empty" id="nav-search-empty" hidden>没找到匹配的网站</p>
```

- [ ] **Step 2: 筛选逻辑**（150ms 防抖；命中＝名称/描述/域名任一包含，小写比较）

```js
function applySearch() {
  var q = (input.value || "").trim().toLowerCase();
  clear.hidden = !q;
  if (!q) {  // 清空 → 回到「全部」视图、恢复全部卡片
    setActive("all");
    cards.forEach(function (c) { c.classList.remove("hidden"); });
    count.textContent = ""; empty.hidden = true;
    return;
  }
  if (currentCat !== "all") setActive("all");   // 一开始输入就切到「全部」，搜的是整站收藏
  var hits = 0;
  cards.forEach(function (c) {
    var hit = (c.dataset.name + " " + c.dataset.desc + " " + c.dataset.host).toLowerCase().indexOf(q) >= 0;
    c.classList.toggle("hidden", !hit);
    if (hit) hits++;
  });
  // 无命中的分区整段隐藏；区块内无命中项也隐藏标题
  sections.forEach(function (sec) {
    var visible = sec.querySelectorAll(".nav-card:not(.hidden)").length;
    sec.classList.toggle("hidden", visible === 0);
  });
  count.textContent = "找到 " + hits + " 个";
  empty.hidden = hits > 0;
}
input.addEventListener("input", debounce(applySearch, 150));
input.addEventListener("keydown", function (e) { if (e.key === "Escape") { input.value = ""; applySearch(); } });
clear.addEventListener("click", function () { input.value = ""; applySearch(); input.focus(); });
```

- [ ] **Step 3: 验证**：搜「deep」命中 DeepSeek 系列；搜域名片段（如 `github`）命中；搜无意义串 → 空态 + 计数 0；清空 → 恢复全部；带分类时开始输入 → 自动切「全部」。

---

### Task 5: 分类顺序补齐 + 收尾

**Files:**
- Modify: `src/pages/projects.astro`（`CATEGORY_META`）
- Create: `src/content/changelog/2026-09-30-daohang-redesign.md`
- Modify: `CLAUDE.md`（补一节：导航页布局与搜索，含 sticky/图标两个坑）

- [ ] **Step 1: 补齐 `CATEGORY_META`**

`AI`（`material-symbols:smart-toy`）、`开发者工具`（`material-symbols:terminal`）、`开发者服务平台`（`material-symbols:cloud`）三个补上 `display`/`order`/`icon`，顺序按设计稿：`我的网站 0 · 常用网站 1 · 工具网站 2 · 开发者工具 3 · 开发者服务平台 4 · AI 5 · 学习网站 6 · 文档 7 · 设计资源 8 · 实用项目 9 · API 10 · 未分类 13`。

- [ ] **Step 2: changelog（v1.52.0，feature/minor）**：写清左栏 + 4/5 宽度 + 搜索 + 图标动效 + 两个坑。

- [ ] **Step 3: CLAUDE.md**：补「导航页（/projects/）布局」小节：sticky 的祖先裁剪、图标必须内联、搜索与左栏的 `data-*` 契约、整页宽度逐页一条规则。

- [ ] **Step 4: 全量验证**

```bash
pnpm check                            # 期望 0 errors
pnpm exec biome check <LF 副本>        # 期望无报错（CRLF 假象要用 git 导出的 LF 版本判）
pnpm build                            # 期望 exit 0
```

浏览器实测 1440 / 900 / 390：布局、sticky、分类切换 + hash、搜索四种情形、悬浮动画、键盘 Tab；并回归首页/动态/归档/文章页无变化。

- [ ] **Step 5: 提交**（精确路径暂存，不动站长的笔记改动；不推送）

```bash
git add src/pages/projects.astro src/styles/features/no-sidebar-pages.css CLAUDE.md src/content/changelog/2026-09-30-daohang-redesign.md
git commit -m "feat(projects): 导航页改版（左栏分类 + 输入即筛 + 卡片图标跳动效，整页占 4/5）"
```
