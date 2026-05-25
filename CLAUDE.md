# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ReaderX 是 [Legado（阅读）](https://github.com/gedoor/legado) 的 Web 重写增强项目。基于 Legado 的书源规则引擎和 Web API，使用 TypeScript/Web 全栈技术重新实现并增强。`docs/` 目录包含 Legado 原版完整架构文档作为开发参考。

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
│   ├── rule-engine/            # 规则引擎（完整：类型+解析+校验+URL解析）
│   ├── reader-engine/          # 阅读引擎（内部子模块：pagination/ renderer/ content/）
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
| 前端 | Next.js (App Router, React 19) |
| UI | shadcn/ui (radix-nova) + Radix UI + Tailwind CSS 4 |
| 状态管理 | Zustand（随 feature 组织）+ TanStack Query |
| 服务端 | Hono |
| 数据库（服务端） | PostgreSQL + Drizzle ORM |
| 数据库（客户端） | IndexedDB + OPFS |
| 校验 | Zod |
| JS 沙箱 | QuickJS（Web Worker） |
| Lint/Format | Biome（tab 缩进, double quotes） |

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
                        ↑               ↑
                quickjs-runtime    persistence
                        ↑
                   (peer dep)

rule-engine  ←  services/api
      ↑
  apps/web → reader-engine, persistence, infrastructure, quickjs-runtime
```

## 规则引擎

核心功能是兼容 Legado 的书源规则引擎（`docs/book-source-rule-engine.md`）。`rule-engine` 包含完整的类型定义、Zod 校验、5 种解析模式（CSS/XPath/JSONPath/JS/Regex）、URL 规则解析和组合运算符处理。

## 数据层

- **客户端**（`persistence`）：IndexedDB + OPFS，数据模型参考 `docs/database-schema.md`
- **服务端**（`services/api/db/`）：PostgreSQL + Drizzle ORM

## 代码规范

- TypeScript strict mode（`noUncheckedIndexedAccess`）
- Tab 缩进，双引号
- Biome 负责 lint 和 format，不使用 ESLint/Prettier
- 路径别名：`@/*` → `apps/web/*`
