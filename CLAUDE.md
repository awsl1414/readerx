# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ReaderX 是 [Legado（阅读）](https://github.com/gedoor/legado) 的 Web 重写增强项目。基于 Legado 的书源规则引擎和 Web API，使用 TypeScript/Web 全栈技术重新实现并增强。`docs/` 目录包含 Legado 原版完整架构文档作为开发参考。

**当前阶段**：脚手架搭建完成，packages 以类型定义和接口为主，核心解析逻辑待实现。开发路线图见 [`docs/roadmap.md`](./docs/roadmap.md)。

## Monorepo 结构

```
readerx/
├── apps/web/                   # Next.js 前端（Feature 层）
│   ├── app/                    # Next.js App Router
│   ├── components/             # 通用 UI 组件（含 shadcn ui/）
│   ├── features/               # 功能模块（每个自含 components/hooks/store.ts/actions.ts）
│   ├── providers/              # React Context providers
│   └── lib/                    # 仅 infra helpers（cn.ts, env.ts, fetch.ts）
├── packages/
│   ├── rule-engine/            # 规则引擎
│   ├── reader-engine/          # 阅读引擎（分页 / 渲染 / 内容处理）
│   ├── quickjs-runtime/        # QuickJS 沙箱运行时（独立，含 Worker）
│   ├── persistence/            # 数据持久层（IndexedDB + OPFS）
│   └── infrastructure/         # 跨域基础设施（fetch, logger, config）
├── services/
│   └── api/                    # Hono 后端服务（Drizzle + PostgreSQL）
└── docs/                       # Legado 原版参考文档
```

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Bun |
| 包管理 | pnpm (workspace) |
| 构建 | Turborepo + Turbopack |
| 前端 | Next.js 16 (App Router, React 19) |
| UI | shadcn/ui (radix-nova) + Radix UI + Tailwind CSS 4 |
| 状态管理 | Zustand 5（随 feature 组织）+ TanStack Query 5 |
| 服务端 | Hono |
| 数据库（服务端） | PostgreSQL + Drizzle ORM |
| 数据库（客户端） | IndexedDB + OPFS |
| 校验 | Zod 4 |
| JS 沙箱 | QuickJS（Web Worker） |
| Lint/Format | Biome 2（tab 缩进, double quotes） |

## 常用命令

```bash
pnpm install                  # 安装依赖
turbo dev                     # 启动开发
turbo build                   # 构建
turbo lint                    # Lint
turbo typecheck               # 类型检查
pnpm --filter web dev         # 仅启动 web
pnpm --filter web format      # 格式化
```

## 架构原则

1. **按边界分包** — 每个包是完整领域，类型/逻辑/校验内聚，不按文件类型拆
2. **Feature 和 Engine 分离** — Engine 是纯逻辑（packages/），Feature 是 UI 层（apps/web/features/）
3. **Runtime 独立** — quickjs-runtime 无内部依赖，独立运行
4. **shared 克制** — 无独立 shared 包；apps/web/lib/ 只放 infra helper（cn.ts, env.ts, fetch.ts）
5. **Store 随 Feature** — Zustand store 在 feature 内部，不设全局 stores/
6. **Worker 随 Runtime** — Worker 入口在 runtime 包内，不在 apps/web

## 包依赖方向

```
infrastructure  ←  rule-engine  ←  reader-engine
                        ↑
                quickjs-runtime (peer dep)

rule-engine  ←  services/api
      ↑
  apps/web → reader-engine, persistence, infrastructure, quickjs-runtime
```

> `persistence` 不依赖 `rule-engine` — 数据层独立，内部定义自己的数据模型类型。

## 规则引擎

核心功能是兼容 Legado 的书源规则引擎（`docs/book-source-rule-engine.md`）。包含完整的类型定义、Zod 校验、5 种解析模式（CSS/XPath/JSONPath/JS/Regex）、URL 规则解析和组合运算符处理。

## 数据层

- **客户端**（`persistence`）：IndexedDB + OPFS，数据模型参考 `docs/database-schema.md`
- **服务端**（`services/api/db/`）：PostgreSQL + Drizzle ORM

## 代码规范

- TypeScript strict mode + `erasableSyntaxOnly` + `verbatimModuleSyntax`
- 禁止 `enum`、`namespace`、parameter properties（用联合类型和模块替代）
- `noUncheckedIndexedAccess` — 索引返回 `T | undefined`，必须处理
- `exactOptionalPropertyTypes` — `{ foo?: string }` 不允许 `{ foo: undefined }`
- `noImplicitOverride` — 子类覆盖必须写 `override`
- Tab 缩进，双引号
- Biome 负责 lint 和 format，不使用 ESLint/Prettier
- 路径别名：`@/*` → `apps/web/*`

各技术栈的详细标准、注意事项和推荐行为见 [`docs/tech-standards.md`](./docs/tech-standards.md)。

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
