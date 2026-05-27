# CLAUDE.md — ReaderX AI Coding Rules

> 优先保持架构一致性，而不是局部代码便利性。

## 项目概述

ReaderX 是 [Legado（阅读）](https://github.com/gedoor/legado) 的 Web 重写增强项目。`docs/` 包含 Legado 原版架构文档作为参考。开发路线图见 [`docs/roadmap.md`](./docs/roadmap.md)。Web 前端设计方针见 [`docs/web-design-philosophy.md`](./docs/web-design-philosophy.md)。

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
│   ├── reader-engine/          # 阅读引擎（内容获取 / 净化 / 分页 — 纯逻辑，渲染在 apps/web）
│   ├── quickjs-runtime/        # QuickJS 沙箱运行时（独立，含 Worker）
│   ├── persistence/            # 数据持久层（IndexedDB + OPFS）
│   └── infrastructure/         # 跨域基础设施（fetch, logger, config）
├── services/
│   └── api/                    # Hono 后端服务（Drizzle + PostgreSQL）
└── docs/                       # 文档（含 Legado 原版参考）
```

## 技术栈

pnpm workspace · Turborepo · Next.js 16 (App Router, React 19) · shadcn/ui + Radix UI + Tailwind CSS 4 · Zustand 5 · TanStack Query 5 · Hono · PostgreSQL + Drizzle ORM · IndexedDB + OPFS · Zod 4 · QuickJS (Web Worker) · Biome 2

## 常用命令

```bash
pnpm install                  # 安装依赖
turbo dev                     # 启动开发
turbo build                   # 构建
turbo lint                    # Lint
turbo typecheck               # 类型检查
pnpm --filter web dev         # 仅启动 web
```

---

## Architecture Constraints

1. **按边界分包** — 每个包是完整领域，类型/逻辑/校验内聚，禁止按文件类型拆包
2. **Feature 和 Engine 分离** — Engine 是纯逻辑（packages/），Feature 是 UI 层（apps/web/features/），禁止交叉
3. **Runtime 独立** — quickjs-runtime 无内部依赖，禁止引入其他包
4. **shared 克制** — 禁止创建独立 shared 包；apps/web/lib/ 只放 infra helper（cn.ts, env.ts, fetch.ts）
5. **Store 随 Feature** — Zustand store 在 feature 内部，禁止全局 stores/
6. **Worker 随 Runtime** — Worker 入口在 runtime 包内，禁止放在 apps/web
7. **RSC-first** — Server Components 是默认的，Client Components 仅在需要 hooks / 浏览器 API / 交互时使用
8. **ESM-only** — 禁止 CommonJS（`require` / `module.exports`）
9. **Edge-compatible** — packages/ 中的代码必须兼容 Edge Runtime，禁止使用 Node 专有 API（除非有 `"types": ["node"]` 的包）

## 包依赖方向（禁止违反）

```text
infrastructure  ←  rule-engine  ←  reader-engine
                        ↑
                quickjs-runtime (peer dep)

rule-engine  ←  services/api
      ↑
  apps/web → reader-engine, persistence, infrastructure, quickjs-runtime
```

禁止：
- `persistence` 依赖 `rule-engine`
- 任何包循环依赖
- 从 `dist/` 导入
- 不通过 package.json exports 导入

## TypeScript Constraints

- strict mode + `erasableSyntaxOnly` + `verbatimModuleSyntax`
- **禁止 `any`** — 使用 `unknown`
- **禁止 `enum`** — 使用联合类型
- **禁止 `namespace`** — 使用模块
- **禁止 parameter properties** — 使用显式赋值
- **禁止 non-null assertion (`!`)** — 使用可选链 `?.` 和空值合并 `??`
- **禁止直接 `arr[i]` 不处理 undefined** — `noUncheckedIndexedAccess` 要求索引返回 `T | undefined`
- 必须使用 `import type` / `export type` 标记类型导入导出
- `exactOptionalPropertyTypes` — `{ foo?: string }` 不允许 `{ foo: undefined }`
- `noImplicitOverride` — 子类覆盖必须写 `override`
- 优先 `type` 而非 `interface`
- 环境变量必须经过 Zod 校验（禁止裸 `process.env.MY_KEY!`）
- Tab 缩进，双引号
- Biome 负责 lint 和 format，禁止 ESLint / Prettier
- 路径别名：`@/*` → `apps/web/*`

## React Constraints

- **禁止 `useEffect` 获取数据** — 数据必须在 Server Component / TanStack Query / Server Action 中获取
- **禁止在 render 中产生副作用**
- Client Components 必须下沉到叶子节点
- 优先 Server Actions 处理 mutation
- 优先 async Server Components 获取数据
- 优先 `use()` hook 读取 Promise 和 Context
- `<form action={fn}>` 替代手动 onSubmit + fetch
- React Compiler 兼容：保持纯函数 render，immutable update（禁止 `arr.push()`、`obj.x = 1`）

## State Constraints

- **Zustand 仅用于 client UI state** — 禁止用 Zustand 缓存 API 数据
- **TanStack Query 用于 server state**
- **禁止创建全局大 store** — store 按 feature 拆分
- 禁止 selector 返回新对象导致重渲染 — 必须用 `useShallow`
- Query Key 必须稳定 — 使用原始值数组 `["user", id]`，禁止对象

## Dependency Constraints

- **禁止跨 feature deep import** — `features/reader/` 不能 import `features/search/` 的内部文件
- **禁止循环依赖** — 特别是 package ↔ package、feature ↔ feature
- **禁止 giant barrel exports** — 允许按领域聚合 `export * from "./types"`，禁止巨型 index.ts
- **禁止 deep relative import** — 不允许 `../../../`
- **禁止 client-side database access** — Prisma/Drizzle/filesystem/secret 不能进入客户端 bundle
- 依赖必须显式声明在 package.json — 禁止依赖 hoisting 偶然工作

## File Organization

```text
features/{name}/
  components/     # React 组件
  hooks/          # React hooks
  actions/        # Server Actions
  store/          # Zustand store
  schemas/        # Zod schemas
  types/          # 类型定义
```

每个 feature 自包含，禁止跨 feature 引用内部文件。

## Forbidden Patterns

- `useEffect` fetch
- `any`
- `enum`
- `namespace`
- non-null assertion `!`
- global mutable singleton
- giant index.ts barrel
- default export（组件除外）
- `// @ts-ignore` / `// @ts-expect-error`（除非有注释说明原因）
- magic numbers（提取为命名常量）
- 直接 `process.env` 不做校验

## Review Checklist

提交代码前必须检查：

- [ ] 是否破坏 RSC 边界？（Server/Client Component 边界）
- [ ] 是否引入 client bundle 膨胀？
- [ ] 是否新增循环依赖？
- [ ] 是否新增 deep import？
- [ ] 是否新增 `any`？
- [ ] 是否新增 `useEffect` fetch？
- [ ] 是否违反 feature boundary？
- [ ] 是否兼容 strict TypeScript？
- [ ] 包依赖方向是否正确？

## Performance Constraints

- 避免不必要 Client Components
- 避免 hydration-heavy libraries
- 优先 tree-shakeable packages
- 优先 Web Standard APIs
- 共享 package 禁止使用 Node 专有 API，保持 Edge 兼容

---

## Tooling Constraints

- **优先 MCP 工具** — 查库文档用 Context7（`resolve-library-id` → `query-docs`）而非 WebSearch；读网页用 `webReader`；分析图片用 `analyze_image`；文件批量操作用 `mcp__filesystem__*`
- **优先 Plugin 技能** — 匹配场景时必须调用 superpowers 技能（brainstorming → writing-plans → subagent-driven-development），而非裸手实现
- **优先记忆检索** — 回忆历史决策用 `claude-mem` 的 `search` → `timeline` → `get_observations` 三步流程，而非重读代码

## 工作流程约束

每次任务结束前，必须检查并更新所有与本次任务相关的文件，保持高度一致性：

- **文档交叉引用**：CLAUDE.md、README.md、docs/ 下的所有文档，确保描述与实际代码状态一致
- **依赖关系**：package.json 依赖、tsconfig 引用、turbo.json 任务配置
- **类型与接口**：改动了接口或类型时，检查所有消费方的引用和用法
- **模块状态表**：`docs/roadmap.md` 中的模块状态和里程碑，反映最新进展

## AI 增强层

`packages/ai/` — 独立 AI 能力包，可选增强，不影响核心阅读流程。

- 优先云端 AI（用户自带 key）和本地部署（Ollama），暂不支持端侧推理
- 仅 peer dep 引用 rule-engine 类型，不依赖其他业务包
- 详细规划见 [`docs/roadmap.md`](./docs/roadmap.md) AI 增强规划章节

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
