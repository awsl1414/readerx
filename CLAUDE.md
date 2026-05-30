# ReaderX

> 优先保持架构一致性，而不是局部代码便利性。

ReaderX 是 [Legado（阅读）](https://github.com/gedoor/legado) 的 Web 重写增强项目。`docs/` 包含 Legado 原版架构文档作为参考。

## 技术栈

pnpm workspace · Turborepo · Next.js 16 (App Router, React 19) · shadcn/ui + Radix UI + Tailwind CSS 4 · Zustand 5 · TanStack Query 5 · Hono · PostgreSQL + Drizzle ORM · IndexedDB + OPFS · Zod 4 · QuickJS (Web Worker) · Biome 2

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `turbo dev` | 启动开发 |
| `turbo build` | 构建 |
| `turbo lint` | Lint |
| `turbo typecheck` | 类型检查 |
| `pnpm --filter web dev` | 仅启动 web |

## Monorepo 结构

```text
readerx/
├── apps/web/                   # Next.js 前端（Feature 层）
│   ├── app/                    # Next.js App Router
│   ├── components/             # 通用 UI 组件（含 shadcn ui/）
│   ├── features/               # 功能模块（每个自含 components/hooks/store.ts/actions.ts）
│   └── lib/                    # 仅 infra helpers（cn.ts）
├── packages/
│   ├── rule-engine/            # 规则引擎
│   ├── reader-engine/          # 阅读引擎（内容获取 / 净化 / 分页）
│   ├── quickjs-runtime/        # QuickJS 沙箱运行时（独立，含 Worker）
│   ├── persistence/            # 数据持久层（IndexedDB + OPFS）
│   └── infrastructure/         # 跨域基础设施（fetch, logger, config）
├── services/
│   └── api/                    # Hono 后端服务（Drizzle + PostgreSQL）
├── schemas/                    # 规则 Schema 定义（JSON Schema + 示例数据 + Legado 参考）
│   ├── readerx/                # ReaderX 规则 schema（.schema.json）+ examples/
│   └── legado/                 # Legado 参考数据 + DDL
└── docs/                       # 文档（含 Legado 原版参考）
```

## 关键文档

| 文档 | 说明 |
|------|------|
| [`docs/development-guide.md`](./docs/development-guide.md) | Web 架构模式（RSC 边界、ReaderSession、Worker Bridge） |
| [`docs/roadmap.md`](./docs/roadmap.md) | 7 阶段开发计划、模块进度 |
| [`docs/tech-standards.md`](./docs/tech-standards.md) | TypeScript / React / Next.js 技术栈用法 |
| [`docs/schema/`](./docs/schema/) | 规则 Schema 设计文档（book-source-rule / dict-rule / replace-rule / txt-toc-rule） |
| [`docs/web-design/`](./docs/web-design/) | Web 设计（PRD · IA · User Flow · Wireframes · Design Tokens · Component Tree） |

## 规则

@.claude/rules/architecture.md
@.claude/rules/typescript.md
@.claude/rules/react.md
@.claude/rules/code-organization.md
@.claude/rules/workflow.md
