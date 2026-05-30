# ReaderX 开发指南

本文档面向参与 ReaderX 开发的工程师，涵盖环境搭建、项目架构、开发工作流和测试。

编码规范见 [`CLAUDE.md`](../CLAUDE.md)（约束清单）和 [`tech-standards.md`](./tech-standards.md)（各技术栈正确用法）。UI 设计决策见 [`web-design-guide.md`](./web-design-guide.md)。

## 环境要求

| 工具 | 最低版本 | 说明 |
|---|---|---|
| Node.js | >= 22 | 项目使用 ES2024 特性 |
| pnpm | >= 11 | `corepack enable && corepack prepare pnpm@latest --activate` |
| Git | >= 2.40 | 建议较新版本 |

PostgreSQL 仅后端服务需要，前端开发不依赖。

## 快速开始

```bash
git clone <repo-url> && cd readerx
pnpm install
pnpm dev                    # 启动全量开发（Turbopack）
pnpm --filter web dev       # 仅启动前端 → http://localhost:3000
```

首次安装可能需要批准构建脚本：`pnpm approve-builds`。

## 常用命令

所有命令在项目根目录执行。`--filter` 可指定单个 workspace。

```bash
# 开发
pnpm dev                    # 所有包 dev 模式（Turborepo 编排）
pnpm --filter web dev       # 仅前端

# 构建
pnpm build                  # 拓扑序构建所有包

# 质量检查
pnpm typecheck              # TypeScript 类型检查（依赖 build）
pnpm lint                   # Biome lint
pnpm test                   # Vitest 单次运行
pnpm test:watch             # Vitest 监听模式

# 格式化
pnpm format                 # Biome format --write

# 单包操作
pnpm --filter @readerx/rule-engine test    # 仅测试规则引擎
pnpm --filter @readerx/persistence lint    # 仅 lint 持久层
```

## Monorepo 结构

```
readerx/
├── apps/web/                   # Next.js 16 前端（Feature 层）
├── packages/
│   ├── infrastructure/         # 基础设施（HTTP / 日志 / 配置）
│   ├── rule-engine/            # 规则解析引擎（CSS / XPath / JSONPath / JS / Regex）
│   ├── reader-engine/          # 阅读引擎（排版 / 渲染模型 / 净化）
│   ├── quickjs-runtime/        # QuickJS 沙箱运行时（Web Worker）
│   └── persistence/            # 数据持久层（IndexedDB + OPFS）
├── services/api/               # Hono 后端 API
└── docs/                       # 开发文档 + Legado 原版参考
```

### 包依赖方向

```
infrastructure  ←  rule-engine  ←  reader-engine
                        ↑
                quickjs-runtime (peer dep)

rule-engine  ←  services/api
      ↑
  apps/web → reader-engine, persistence, infrastructure, quickjs-runtime
```

**禁止反向依赖和循环依赖。** 所有跨包导入必须通过 `package.json` 的 `exports` 字段，禁止直接引用源文件或 `dist/`。

### 各包概览

| 包 | 导出名 | 入口 | 测试 | 说明 |
|---|---|---|---|---|
| infrastructure | `@readerx/infrastructure` | `src/index.ts` | Vitest | HTTP 客户端、Logger、Config |
| rule-engine | `@readerx/rule-engine` | `src/index.ts` | Vitest (281 tests) | 书源规则解析，5 种模式 |
| reader-engine | `@readerx/reader-engine` | `src/index.ts` | Vitest (114 tests) | Document AST → 排版 → 渲染模型 |
| quickjs-runtime | `@readerx/quickjs-runtime` | `src/index.ts` + `src/worker.ts` | Vitest (31 tests) | QuickJS WASM 沙箱 |
| persistence | `@readerx/persistence` | `src/index.ts` | Vitest (57 tests) | Dexie IndexedDB + OPFS |
| api | `@readerx/api` | `src/index.ts` | — | Hono + Drizzle + PostgreSQL |

## Web 应用架构（apps/web）

### 目录结构

```
apps/web/
├── app/                    # Next.js App Router
│   ├── layout.tsx          #   根布局（async RSC，providers inline）
│   ├── globals.css         #   Tailwind v4 + shadcn tokens + reader themes
│   ├── page.tsx            #   首页
│   ├── library/            #   书库
│   ├── search/             #   搜索
│   └── settings/           #   设置
├── components/
│   ├── layout/             #   布局组件（AppShell, NavItems）
│   ├── providers.tsx       #   QueryProvider（client boundary）
│   └── ui/                 #   shadcn/ui 组件
├── features/               #   功能模块（每个自含 components/hooks/store/schemas/types）
│   ├── reader/             #   阅读器
│   ├── bookshelf/          #   书架
│   ├── search/             #   搜索
│   └── source-manager/     #   书源管理（Scraping Workspace）
├── i18n/
│   └── request.ts          #   next-intl 服务端配置（cookie → Accept-Language）
├── messages/               #   翻译文件
│   ├── zh.json
│   └── en.json
└── lib/                    #   仅 infra helpers（cn.ts）
```

### Provider 架构

Root layout 是 async Server Component，直接渲染 Client Component providers：

```text
RootLayout (RSC)
└── NextIntlClientProvider    ← next-intl，传递 messages
    └── ThemeProvider          ← next-themes，class 模式，system 感知
        └── QueryProvider      ← TanStack Query，useState 单例
            └── AppShell       ← 导航 + topbar + 内容区
                └── {page}     ← 页面内容
```

- 不使用 ComposeProviders 或 Provider 文件夹
- `QueryProvider` 用 `useState(() => new QueryClient())` 创建客户端单例
- `ThemeProvider` 使用 `attribute="class"` + `suppressHydrationWarning` 避免 hydration 闪烁

### RSC 边界

Server Components 负责数据获取、页面组装、SEO、Streaming。Client Components 仅在需要交互 / 浏览器 API / 本地状态时使用。所有运行时（IndexedDB、Web Worker、QuickJS）必须在 Client Component 中。

```text
Server Component 职责：              Client Component 职责：
- 数据获取（async RSC fetch）        - providers.tsx (QueryClient, Theme)
- 页面组装与 Streaming              - features/* (所有交互)
- layout.tsx (HTML 结构)            - Worker bridge (QuickJS 通信)
- metadata (title, description)     - IndexedDB 访问
```

**禁止**：Server Component 接触 runtime（IndexedDB / Worker / QuickJS / Dexie）。

### ReaderSession 模式

阅读器状态使用 session 对象，不使用全局 Zustand store。Session 拥有分页状态、游标、章节缓存、预取队列的完整生命周期。

```text
features/reader/
├── components/         # React 渲染组件（Page, Line, Run）
├── hooks/              # useReaderSession, usePage
├── session.ts          # ReaderSession 类
├── render-scheduler.ts # 布局失效调度器
└── types/              # 类型定义
```

Session 生命周期：
1. 进入阅读器 → `session = openSession(bookId)` → 加载章节 → 排版 → 渲染
2. 翻页 → `session.getPage(cursor)` → 直接取缓存或加载下一章
3. 设置变更（字号/行距）→ `session.invalidateLayout()` → Render Scheduler 调度重排
4. 退出阅读器 → `session.dispose()` → 清理 Worker 连接和缓存

**禁止**：useEffect 触发布局重排。布局计算由 session 内部的 Render Scheduler 驱动。

### Worker Bridge

QuickJS Worker 通信封装为 async API。feature 不直接接触 comlink 或 Worker。

```ts
// feature 层调用
const result = await ruleExecutor.execute(rule, content)
// 内部走 Worker RPC，feature 无感知
```

Worker bridge 位于 features 层或 lib/ 中的统一模块，负责：
- Worker 初始化和连接管理
- comlink RPC 封装为 Promise 接口
- 错误处理和超时

> **Turbopack 注意**：`packages/rule-engine` 中需要双环境的模块采用平台文件分离模式。Node 专有代码放在 `*.ts` 文件（如 `xpath-eval.ts`、`dom-parse.ts`），浏览器代码放在 `*.browser.ts` 文件，通过 `package.json` 的 `browser` 字段让 Turbopack 自动路由。禁止在客户端 bundle 可达的文件中引用 Node 内置模块。

### 主题系统

- **UI 主题**：light / dark / system，由 next-themes 管理，`.dark` class 切换
- **阅读器主题**：5 套 CSS class（`reader-theme-warm-white` / `beige` / `green` / `sepia` / `black`），由 ReaderSession 管理，独立于 UI 主题
- 所有颜色使用 oklch 色彩空间

### 国际化

- next-intl，支持中文（zh）和英文（en）
- 无 URL 前缀，locale 通过 cookie（`locale`）或 `Accept-Language` 头检测
- Server Components 用 `getTranslations()`，Client Components 用 `useTranslations()`

### 响应式策略

CSS-only，不使用 JS breakpoint hooks：
- 桌面：`hidden md:flex`（侧边栏 w-14，图标导航）
- 移动：`md:hidden`（底部标签栏）

### Feature 模块规范

每个 feature 自包含：

```
features/{name}/
  components/     # React 组件
  hooks/          # React hooks
  actions/        # Server Actions
  store/          # Zustand store（仅 UI 状态）
  schemas/        # Zod schemas
  types/          # 类型定义
```

**禁止跨 feature 引用内部文件。**

## 开发工作流

### 创建功能分支

```bash
git checkout -b feat/your-feature main
```

### 开发循环

```bash
pnpm --filter web dev       # 启动前端开发服务器
pnpm typecheck              # 类型检查
pnpm lint                   # Lint
pnpm test                   # 运行相关测试
```

### 添加依赖

```bash
pnpm --filter web add <package>                    # 添加到前端
pnpm --filter @readerx/rule-engine add <package>   # 添加到包
```

跨包依赖需要同时在消费方的 `package.json` 中声明 `workspace:*`。

### 添加 shadcn/ui 组件

```bash
cd apps/web && pnpm dlx shadcn@latest add <component>
```

### 提交前检查

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm lint` 通过
- [ ] 相关测试通过
- [ ] 未破坏 RSC 边界（RSC = 数据获取/组装/Streaming，Client = 交互/浏览器 API）
- [ ] 未引入 client bundle 膨胀
- [ ] 未新增循环依赖或 `any`
- [ ] 包依赖方向正确

完整审查清单见 [`.claude/rules/code-organization.md`](../.claude/rules/code-organization.md) 的提交前 Review Checklist。

## 测试

项目使用 Vitest。测试文件放在对应包的 `__tests__/` 或 `src/` 下（`*.test.ts`）。

```bash
pnpm test                   # 运行所有测试
pnpm test:watch             # 监听模式
pnpm --filter @readerx/rule-engine test    # 仅测试特定包
```

客户端持久层测试使用 `fake-indexeddb` 模拟 IndexedDB 环境。
