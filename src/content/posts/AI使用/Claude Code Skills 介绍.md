---
title: Claude Code Skills 介绍：我正在使用的 18 个实用技能
image: "api"
published: 2026-07-15
tags:
  - claudecode
  - skills
  - AI工具
description: 介绍我在 Claude Code 中安装和使用的 18 个 Skills，涵盖创意构思、代码审查、前端设计、Vercel 部署优化、系统化调试、并行开发等工作流，来自 Anthropic、Vercel 和 Superpowers 三个来源。
---

## 什么是 Claude Code Skills？

Claude Code Skills 是 Claude Code 的扩展能力系统，通过在 `.claude/skills/` 目录下放置 Markdown 文件，可以为 Claude 添加特定领域的工作流程和专业知识。每个 Skill 由一个 `SKILL.md` 文件定义，包含触发条件、工作流程和详细指南。

### Skills 来源

| 来源 | 说明 | 安装方式 |
|------|------|---------|
| **Anthropic 官方** | Claude Code 自带或官方维护 | `npx add-skill anthropics/claude-code` |
| **Vercel 官方** | Vercel 团队维护的部署和前端 Skills | `npx add-skill vercel-labs/agent-skills` |
| **Superpowers** | 社区维护的开发工作流 Skills | `npx add-skill obra/superpowers` |
| **社区/自建** | 第三方或自己创建 | 手动放入 `.claude/skills/` 或用 `skill-creator` 创建 |

---

## 我当前安装的 18 个 Skills 总览

| # | Skill 名称 | 来源 | 一句话描述 |
|---|-----------|------|-----------|
| 1 | brainstorming | Superpowers | 将创意转化为完整设计方案 |
| 2 | code-reviewer | 社区 | 全面的代码审查，聚焦安全与性能 |
| 3 | deploy-to-vercel | Vercel | 一键部署项目到 Vercel |
| 4 | dispatching-parallel-agents | Superpowers | 调度并行子代理执行任务 |
| 5 | executing-plans | Superpowers | 按计划逐步执行实现 |
| 6 | finishing-a-development-branch | Superpowers | 完成开发分支的收尾流程 |
| 7 | frontend-design | 社区 | 打造独特、有辨识度的视觉设计 |
| 8 | receiving-code-review | Superpowers | 处理收到的代码审查反馈 |
| 9 | skill-creator | Anthropic | 创建和优化自定义 Skills |
| 10 | subagent-driven-development | Superpowers | 子代理驱动的开发模式 |
| 11 | systematic-debugging | Superpowers | 系统化的调试方法论 |
| 12 | ui-ux-pro-max | 社区 | 50+ 样式、161 色板的 UI/UX 知识库 |
| 13 | vercel-composition-patterns | Vercel | 组件组合模式，构建可扩展架构 |
| 14 | vercel-optimize | Vercel | Vercel 性能与成本优化审计 |
| 15 | verification-before-completion | Superpowers | 完成前验证，防止提交半成品 |
| 16 | web-design-guidelines | Vercel | Web 界面设计规范审查 |
| 17 | writing-guidelines | Vercel | 文档写作规范审查 |
| 18 | writing-plans | Superpowers | 编写实现计划 |

---

## 一、通用开发 Skills

### 1. brainstorming — 创意构思

**来源**：Superpowers

在任何创意工作开始之前，通过结构化的对话流程将模糊的想法转化为完整的设计方案。

#### 工作流程

1. **探索项目上下文** — 检查文件、文档、最近的提交
2. **逐一提出澄清问题** — 理解目的、约束和成功标准
3. **提出 2-3 种方案** — 带上权衡分析和推荐
4. **分节呈现设计** — 每节获得用户确认后再继续
5. **输出设计文档** — 保存到 `docs/superpowers/specs/` 目录

#### 核心原则

- 一次只问一个问题，不给用户造成信息过载
- 优先使用多选题，降低回答门槛
- YAGNI 原则，从设计中移除不必要的功能
- 必须获得设计批准，才能进入实现阶段

```
/brainstorming
```

---

### 2. code-reviewer — 代码审查

**来源**：[awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | **版本**：2.0.0 | **许可证**：MIT

专业的代码审查工具，按照优先级从高到低检查代码质量。

| 优先级 | 检查维度 | 具体内容 |
|--------|---------|---------|
| 🔴 CRITICAL | 安全性 | SQL 注入、XSS、认证绕过、硬编码密钥 |
| 🟠 HIGH | 性能 | N+1 查询、缺失索引、低效算法、内存泄漏 |
| 🟠 HIGH | 正确性 | 错误处理、竞态条件、边界情况、空值处理 |
| 🟡 MEDIUM | 可维护性 | 命名规范、类型安全、DRY 原则、单一职责 |

```
/code-reviewer
```

---

### 3. frontend-design — 前端设计

**来源**：社区

以小型设计工作室设计总监的视角，为每个项目打造**独特且有辨识度**的视觉方案。

#### 核心理念

- **从主题出发**：颜色、字体、布局都源于产品本身的特质
- **拒绝模板化**：避免 AI 生成设计的三大俗套
- **一次冒险**：每个设计选择一个记忆点，其余保持克制
- **字体即个性**：展示字体和正文字体的搭配是页面性格的载体

```
/frontend-design
```

---

### 4. skill-creator — 技能创建器

**来源**：Anthropic 官方 | **许可证**：Apache 2.0

创建新的 Claude Code Skills 并迭代优化，包含完整的测试、评估、打包流程。

#### 工作流程

```
想法 → 草稿 → 测试用例 → 运行评估 → 用户评审 → 改进 → 重复 → 打包
```

```
/skill-creator
```

---

### 5. ui-ux-pro-max — UI/UX 设计智能

**来源**：社区

超级全面的 UI/UX 设计知识库，内置 Python 搜索脚本。

| 内容 | 数量 |
|------|------|
| 设计风格 | 50+ 种 |
| 色彩方案 | 161 套 |
| 字体搭配 | 57 组 |
| UX 指南 | 99 条 |
| 图表类型 | 25 种 |

```
/ui-ux-pro-max
```

---

## 二、Superpowers 开发工作流 Skills

> 以下 8 个 Skills 来自 [obra/superpowers](https://github.com/obra/superpowers)，使用 `npx add-skill obra/superpowers` 安装。

### 6. dispatching-parallel-agents — 调度并行子代理

当任务可以拆分为多个独立子任务时，调度多个子代理并行执行，大幅提升效率。

#### 使用场景

- 大规模代码审查（多个文件同时审查）
- 批量重构（多个模块同时修改）
- 并行测试（多个测试套件同时运行）

```
/dispatching-parallel-agents
```

---

### 7. executing-plans — 执行实现计划

按照 `writing-plans` 生成的计划逐步执行实现，确保每一步都有明确的输入输出和验证标准。

#### 使用场景

- 按照设计文档实现功能
- 执行架构重构计划
- 按步骤完成复杂任务

```
/executing-plans
```

---

### 8. finishing-a-development-branch — 完成开发分支

开发分支的收尾流程，确保代码质量、测试通过、文档更新后再合并。

#### 收尾检查清单

- 代码审查通过
- 测试全部通过
- 文档已更新
- 提交信息规范
- 无遗留的 TODO/FIXME

```
/finishing-a-development-branch
```

---

### 9. receiving-code-review — 处理代码审查反馈

收到代码审查反馈后的处理流程：理解反馈、评估建议、实施修改、回复审查者。

#### 处理流程

1. **理解**：仔细阅读每条反馈
2. **评估**：判断是否需要修改
3. **实施**：按优先级逐一修改
4. **回复**：说明修改内容或解释不修改的原因

```
/receiving-code-review
```

---

### 10. subagent-driven-development — 子代理驱动开发

使用子代理来执行开发任务，主代理负责规划和协调，子代理负责具体实现。

#### 优势

- **专注**：每个子代理只关注一个子任务
- **并行**：多个子代理可以同时工作
- **隔离**：子代理之间的错误互不影响
- **可追踪**：每个子代理的输出可以独立审查

```
/subagent-driven-development
```

---

### 11. systematic-debugging — 系统化调试

结构化的调试方法论，避免盲目试错，用科学方法定位和修复 Bug。

#### 调试流程

1. **复现**：确认 Bug 可以稳定复现
2. **缩小范围**：通过二分法定位问题代码
3. **形成假设**：基于观察提出可能的原因
4. **验证假设**：用最小化测试验证
5. **修复并验证**：实施修复并确认问题解决
6. **防止回归**：添加测试防止问题再次出现

```
/systematic-debugging
```

---

### 12. verification-before-completion — 完成前验证

在标记任务完成之前，执行一系列验证检查，确保交付质量。

#### 验证清单

- 功能是否按需求实现
- 边界情况是否处理
- 是否引入了新的 Bug
- 代码是否符合项目规范
- 文档是否需要更新

```
/verification-before-completion
```

---

### 13. writing-plans — 编写实现计划

将设计方案转化为可执行的实现计划，明确每个步骤的具体操作、预期输出和验证标准。

#### 计划结构

```
1. 目标描述
2. 实现步骤（每步含：操作、输出、验证）
3. 依赖关系
4. 风险点
5. 回滚方案
```

```
/writing-plans
```

---

## 三、Vercel 官方 Skills

> 以下 5 个 Skills 来自 [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)，使用 `npx add-skill vercel-labs/agent-skills` 安装。

### 14. deploy-to-vercel — 部署到 Vercel

**版本**：3.0.0

一键将项目部署到 Vercel。**默认部署为预览环境**，除非用户明确要求生产部署。

#### 部署流程

1. 收集项目状态（Git 远程、Vercel 链接、CLI 认证）
2. 选择部署方式
3. 执行部署
4. 返回预览链接

```
/deploy-to-vercel
```

---

### 15. vercel-composition-patterns — 组件组合模式

**版本**：1.0.0 | **许可证**：MIT

组件组合模式指南，帮助构建灵活、可维护的组件架构。虽然是 React 示例为主，但组合思想适用于所有组件化框架。

| 优先级 | 类别 | 关键指导 |
|--------|------|---------|
| 1 | 组件架构 | 避免布尔 Prop 泛滥、使用复合组件 |
| 2 | 状态管理 | 提升状态、共享上下文 |
| 3 | 实现模式 | Render Props、组件组合 |

```
/vercel-composition-patterns
```

---

### 16. vercel-optimize — Vercel 性能优化

**版本**：1.2.0

基于可观测数据的 Vercel 优化审计。**先看数据，再给建议**。

#### 框架支持

| 框架 | 支持程度 |
|------|---------|
| Next.js App Router | ✅ 完整 |
| SvelteKit | ✅ 完整 |
| Nuxt | ✅ 完整 |
| Astro | ⚠️ 有限 |

#### 优化维度

- 函数调用次数、构建时间、数据传输
- Core Web Vitals
- 成本分解

```
/vercel-optimize
```

---

### 17. web-design-guidelines — Web 界面设计规范

**版本**：1.0.0

审查 UI 代码是否符合 Web Interface Guidelines。每次审查时从源头获取最新规范。

```
/web-design-guidelines
```

---

### 18. writing-guidelines — 文档写作规范

**版本**：1.0.0

审查文档/文案是否符合 Writing Guidelines。适合博客、技术文档的写作质量审查。

```
/writing-guidelines
```

---

## Skills 工作流组合

### 🎨 前端开发全流程

```
brainstorming → writing-plans → executing-plans → frontend-design → verification-before-completion → code-reviewer
```

### 🚀 Vercel 部署优化

```
vercel-optimize → deploy-to-vercel
```

### 🐛 Bug 修复流程

```
systematic-debugging → verification-before-completion → code-reviewer
```

### 🧩 复杂功能开发

```
brainstorming → writing-plans → subagent-driven-development → dispatching-parallel-agents → verification-before-completion
```

### ✍️ 博客内容创作

```
brainstorming → writing-guidelines
```

### 🔀 Git 分支管理

```
executing-plans → finishing-a-development-branch → receiving-code-review
```

---

## 安装方式

### 安装 Vercel 官方 Skills

```bash
npx add-skill vercel-labs/agent-skills
```

### 安装 Superpowers Skills

```bash
npx add-skill obra/superpowers
```

### 手动安装

将 Skill 文件夹放入项目的 `.claude/skills/` 目录：

```bash
mkdir -p .claude/skills
cp -r /path/to/skill .claude/skills/
```

### 创建自定义 Skill

```
/skill-creator
```

---

## 总结

| 分类 | Skills | 核心价值 |
|------|--------|---------|
| **创意与规划** | brainstorming, writing-plans | 把想法变成可执行方案 |
| **开发执行** | executing-plans, subagent-driven-development, dispatching-parallel-agents | 高效执行开发任务 |
| **质量保障** | code-reviewer, verification-before-completion, systematic-debugging | 确保代码质量 |
| **设计与 UI** | frontend-design, ui-ux-pro-max, web-design-guidelines | 打造优质界面 |
| **Git 工作流** | finishing-a-development-branch, receiving-code-review | 规范的分支管理 |
| **部署与优化** | deploy-to-vercel, vercel-optimize, vercel-composition-patterns | Vercel 全链路 |
| **内容与文档** | writing-guidelines, skill-creator | 写作质量和 Skill 创建 |

18 个 Skills 覆盖了从构思到部署的完整开发生命周期。不需要一次全装，按需选择才是正道。
