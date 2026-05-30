# 技术标准与注意事项

本文档是 CLAUDE.md 引入的约束规则的详细参考。约束（禁止什么）见 CLAUDE.md 及 `.claude/rules/`，本文档说明正确用法和注意事项。

## TypeScript 6（ESM + strict + erasable syntax）

### 核心原则

- 项目采用 ESM-only，不用 CommonJS（`require` / `module.exports`）
- 项目采用 strict mode + 可擦除 TypeScript（Erasable Syntax）
- TypeScript 仅用于类型系统，不依赖 TS Runtime 特性
- 优先兼容：Node 原生 TS、Turbopack、RSC / Edge Runtime

### tsconfig 基础配置

项目基础配置在 `tsconfig.base.json`，各包通过 `extends` 继承，仅增量覆盖：

```json
{
	"compilerOptions": {
		"target": "ES2024",
		"lib": ["ES2024", "DOM", "DOM.Iterable"],
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"jsx": "preserve",
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"exactOptionalPropertyTypes": true,
		"noImplicitOverride": true,
		"noFallthroughCasesInSwitch": true,
		"verbatimModuleSyntax": true,
		"isolatedModules": true,
		"moduleDetection": "force",
		"allowJs": false,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"esModuleInterop": true,
		"noEmit": true,
		"erasableSyntaxOnly": true
	}
}
```

> `jsx: "preserve"` — Next.js 自行处理 JSX 转换，不使用 `react-jsx`。

### 推荐用法

- 使用 `satisfies` 验证结构而不破坏推导：`const config = { retry: 3 } satisfies QueryOptions`
- 使用 `as const` 保留字面量类型：`const roles = ["admin", "user"] as const`
- 优先使用 discriminated union 处理多状态：
  ```ts
  type Result = { ok: true; data: Data } | { ok: false; error: Error }
  ```
- 使用 `import type` / `export type` 显式标记类型导入导出（`verbatimModuleSyntax` 强制要求）
- 使用 `unknown` 替代 `any`

### 禁止项

- **`enum`** — 与 bundler / isolatedModules / SWC 存在兼容问题，使用字面量联合类型替代
- **`namespace`** — 用模块系统替代
- **parameter properties**（构造器参数属性）— 用显式赋值替代
- **legacy decorators runtime 语法**
- **`const enum`** — 同 `enum`，跨文件隔离编译时会出错

### 注意事项

**`noUncheckedIndexedAccess`** — 数组/对象索引返回 `T | undefined`，必须显式处理：
```ts
const item = arr[i]
if (!item) return
```
禁止直接断言 `arr[i]!`，除非明确保证安全。

**`exactOptionalPropertyTypes`** — `{ foo?: string }` 不再允许 `{ foo: undefined }`，这是未来 TS 推荐行为。

**`noImplicitOverride`** — 子类覆盖父类方法必须显式写 `override`，避免父类 API 变更后子类静默失效。

**`noFallthroughCasesInSwitch`** — switch case 必须以 `break` / `return` / `throw` 结尾。

**`erasableSyntaxOnly`** — 确保所有 TS 语法都是可擦除的，兼容 Node 原生 TS。

**`moduleResolution: "Bundler"`** — 仅通过 `package.json exports` 解析模块，禁止 deep import（如 `import x from "pkg/dist/internal"`）。

### Node 类型配置

基础配置 `tsconfig.base.json` 不包含 `"types": ["node"]`。使用 `moduleResolution: "Bundler"` 时 TS 不会自动注入 Node 全局类型（`process`、`Buffer`、`__dirname` 等），这是现代前端配置的正常行为。

各包按需添加：

| 包 | 需要 `types: ["node"]` | 原因 |
|---|---|---|
| apps/web | ✅ 是 | Next.js Server Component、next.config.ts 需要 `process.env` |
| packages/infrastructure | ✅ 是 | `config.ts` 使用 `process.env` |
| services/api | ✅ 是 | Hono 服务端运行在 Node |
| packages/persistence | ❌ 否 | 纯浏览器 API（IndexedDB、OPFS） |
| packages/rule-engine | ✅ 是 | Node 实现文件（`xpath-eval.ts`、`dom-parse.ts`）用 `createRequire` 加载 CJS 模块 |
| packages/reader-engine | ❌ 否 | 纯计算，零 DOM 依赖 |
| packages/quickjs-runtime | ✅ 是 | peer dep 引用 rule-engine 源码时需要 `node:module` 类型 |

配置方式：在包的 `tsconfig.json` 中添加 `"compilerOptions": { "types": ["node"] }`，同时确保 `devDependencies` 中有 `@types/node`。

环境变量读取策略：

| 环境 | 推荐 API | 说明 |
|---|---|---|
| Next.js Server Component | `process.env` | 标准 Node 习惯 |
| 浏览器 Client Component | 禁止直接读环境变量 | 使用 `process.env.NEXT_PUBLIC_*` 由构建时注入 |
| 共享 package | `process.env`（加 typeof 守卫） | 保持 Node/Edge 兼容 |

**Barrel Export** — 允许 `export * from "./types"` 式的按领域聚合，禁止巨型 index.ts、跨领域 re-export、全局 barrel（降低 tree-shaking 效率、增加循环依赖概率）。

### 平台文件分离（Node / 浏览器双环境）

当 packages/ 中的模块需要同时支持 Node（测试/SSR）和浏览器时，采用**文件分离**模式，禁止在客户端 bundle 可达的文件中引用 Node 内置模块。

**推荐方式：`exports` 条件导出（2026 标准）**

```json
{
  "exports": {
    "./xpath-eval": {
      "browser": "./src/xpath-eval.browser.ts",
      "node": "./src/xpath-eval.ts",
      "default": "./src/xpath-eval.browser.ts"
    }
  }
}
```

Node / Bun / Vitest / Vite / Turborepo 共同支持 `exports` 条件导出，这是 2026 年的主流方向。

**兼容回退：`browser` 字段**

```json
{
  "browser": {
    "./src/xpath-eval.ts": "./src/xpath-eval.browser.ts"
  }
}
```

Turbopack 客户端构建时自动替换为 `.browser.ts` 版本；Node/Vitest 使用原始文件。公共 API 层只包含接口和共享逻辑，不直接引用任何 Node 模块。

**文件结构：**
```
src/
  xpath-eval.ts           # Node 实现（import node:module, xpath, xmldom）
  xpath-eval.browser.ts   # 浏览器实现（使用原生 DOMParser / document.evaluate）
  xpath.ts                # 公共 API — import from "./xpath-eval"
```

**适用场景：**
- DOM 解析（`linkedom` / `@xmldom/xmldom` ↔ 原生 `DOMParser`）
- XPath 求值（`xpath` 库 ↔ 原生 `document.evaluate`）
- 任何需要 CJS 模块加载的 Node fallback

**使用条件：**
- Node 实现文件可以顶层 `import { createRequire } from "node:module"`
- 公共 API 文件禁止任何 Node 模块引用
- 包必须有 `"types": ["node"]` 和 `@types/node` devDependency

### Promise 错误处理模式

禁止 `.then(onFulfilled, onRejected)` 双参数模式，推荐 `async/await + try/catch`。

```ts
// ❌ 禁止 — onFulfilled 内部 throw 不会被 onRejected 捕获
promise.then(
    (val) => { mightThrow(val); },
    (err) => { handleError(err); },
);

// ✅ 推荐 — 任何阶段异常都进入统一 catch
async function settle() {
    try {
        const val = await promise;
        mightThrow(val);
    } catch (err) {
        handleError(err);
    }
}
```

双参数模式的问题：
1. **错误传播语义不明确** — `.then(success, error)` 的第二参数只处理原 Promise reject，不捕获 fulfilled handler 内部 throw
2. **strict TS 类型困难** — onRejected 必须返回 `PromiseLike<never>`，`void` 不满足要求（`TS2345`）

## React 19（RSC-first）

### 核心原则

- Server Components 是默认的 — 负责数据获取、页面组装、SEO、Streaming，不仅限于 shell
- Client Component 尽可能下沉到叶子节点 — 仅在需要 hooks / 浏览器 API / DOM 交互时添加 `"use client"`
- 减少客户端 JS、减少 hydration、减少不必要的 `useEffect`

### 推荐用法

- `ref` 作为普通 prop 传递，不再需要 `forwardRef`
- `use()` hook 可用于在渲染中读取 Promise 和 Context（非必须 — 多数场景 RSC fetch / TanStack Query 更合适）
- 使用 `<form action={fn}>` + Server Actions 处理表单提交
- 使用 `useActionState` 管理 action 状态、`useOptimistic` 管理乐观更新、`useFormStatus` 获取表单 pending 状态
- `<title>`、`<meta>` 等 SEO 标签可直接在组件中声明
- 优先在 server component 中获取数据，减少客户端请求

### 注意事项

- 不要滥用 Client Component — `"use client"` 会导致 bundle 增大、hydration 增加、streaming 失效
- 避免 `useEffect` 获取数据 — 优先 RSC fetch / TanStack Query / Server Action；仅在浏览器专属 API（`navigator.bluetooth`、`navigator.serial`、`BroadcastChannel`、`WebRTC`）场景允许 useEffect 初始化
- React Compiler 兼容 — 保持纯函数、无副作用 render、immutable update（禁止 `arr.push()`、`obj.x = 1` 等直接变异）

## Next.js 16（App Router + RSC）

### 文件规范

| 文件 | 用途 |
|---|---|
| `page.tsx` | 路由页面 |
| `layout.tsx` | 共享布局（导航时不重新渲染） |
| `loading.tsx` | 自动包裹 Suspense 的加载 UI |
| `error.tsx` | 错误边界 UI |

### 路由规范

- Route Groups 用 `(folder)` 命名 — 不影响 URL，用于 layout 分组（如 `(auth)`、`(dashboard)`）
- Server Actions 用 `"use server"` 标记的 async 函数
- `generateMetadata` 用于动态 metadata，禁止使用 `<Head>` 或 `react-helmet`
- 路径别名 `@/*` 映射到 `apps/web/*`
- 使用 `next/font` 加载字体，避免布局偏移

### 注意事项

- **不要把数据库客户端放进 Client Component** — Prisma、Drizzle、filesystem、secret env 不能进入客户端 bundle
- **Server Action 不等于 RPC** — 适合 UI mutation，复杂逻辑放 `services/` 或 domain layer
- 缓存策略优先使用 `fetch(url, { next: { revalidate: 3600 } })` 和 cache tag

## Tailwind CSS 4

- 使用 `@import "tailwindcss"` 替代旧版 `@tailwind` 指令
- 设计令牌通过 `@theme inline { }` 定义，取代 `tailwind.config.js`（本项目已在 `globals.css` 中配置）
- 自定义变体使用 `@custom-variant`（如 `@custom-variant dark (&:is(.dark *))`）
- 颜色使用 `oklch` 色彩空间（本项目已采用）
- 不需要配置 `content` — Tailwind 4 自动检测文件
- CSS 变量命名遵循 `--color-{name}` / `--radius-{size}` / `--font-{name}` 模式
- 优先使用 utility classes，避免滥用 `@apply`（仅在 prose、third-party override、repetitive pattern 时使用）
- 超过 10~15 个 utility 时提取 component 或 variant

## shadcn/ui（radix-nova 样式，v4）

- 使用 `pnpm dlx shadcn@latest add <component>` 添加组件到 `components/ui/`
- 组件代码完全归项目所有，可直接修改
- 使用 `cn()` 工具函数（clsx + tailwind-merge）合并 className
- 组件通过 `data-slot`、`data-variant`、`data-size` 等 data attribute 样式化（推荐 `data-[state=open]:animate-in`，不手写 JS state class）
- 使用 `Slot`（from `radix-ui`）实现多态渲染（替代已废弃的 `asChild` prop）
- 新组件使用 `React.ComponentProps<"element">` 获取 props 类型，不用手写
- 不要直接修改 Radix primitive — 应包装、compose，而不是 fork primitive

## Zustand 5

- 创建 store：`const useStore = create<State>((set, get) => ({ ... }))`
- 在组件中用 selector 订阅：`const x = useStore(s => s.x)` — 只在 `x` 变化时重渲染
- 多值订阅使用 `useShallow`：`const { a, b } = useStore(useShallow(s => ({ a: s.a, b: s.b })))`
- Store 文件放在 feature 目录内（`features/{name}/store.ts`），不设全局 store
- Actions 放在同目录 `actions.ts` 中，可操作 store 也可触发异步请求
- 使用 `persist` middleware 持久化需要的数据（如阅读进度）

### 注意事项

- **Zustand 不替代 Server State** — 禁止用 Zustand 缓存 API 数据，服务端数据使用 TanStack Query 或 RSC fetch
- **避免 selector 返回新对象** — `useStore(s => ({ a: s.a }))` 每次渲染都创建新对象导致重渲染，必须用 `useShallow` 包裹

## TanStack Query 5

- `useQuery({ queryKey, queryFn })` 获取数据，`queryKey` 是缓存标识
- `useMutation({ mutationFn })` 处理写入操作
- 设置合理的 `staleTime`（数据多久视为过期）和 `gcTime`（缓存多久清理）
- Server Component 中用 `prefetchQuery` 预取数据，结合 `useSuspenseQuery` 实现流式加载
- mutation 成功后用 `queryClient.invalidateQueries()` 刷新相关查询
- Query hooks 放在 feature 目录的 `hooks/` 或 `actions.ts` 中

### 注意事项

- **Query Key 必须稳定** — 使用原始值数组 `["user", id]`，不要用对象 `["user", { id }]`（对象结构不稳定可能导致缓存问题）
- **RSC 优先** — 优先使用 Server Component fetch，TanStack Query 用于 client cache、实时交互、optimistic UI

## Zod 4

- Schema 定义：`z.string()`、`z.number()`、`z.object({})`、`z.array()`、`z.enum([])` 等
- 类型推导：`type T = z.infer<typeof schema>` — 不手写重复的类型
- 校验调用：`.parse(data)` 抛错，`.safeParse(data)` 返回 `{ success, data, error }`
- 数据变换：`.transform()` 在校验后转换数据
- 在 `rule-engine` 中已用于 BookSource 校验（`schemas.ts`）
- 新增 schema 时同步导出类型（`export type X = z.infer<typeof XSchema>`）

### 注意事项

- **不要手写重复类型** — 禁止同时写 `type User = {}` 和 `const UserSchema = ...`，应从 schema 推导类型
- **用户输入场景优先 `safeParse()`** — `.parse()` 直接抛错，`.safeParse()` 返回 result object 便于处理

## Biome 2

- `biome check` 同时执行 lint + format 检查
- `biome check --write` 自动修复（格式化 + 可安全修复的 lint 问题）
- `biome format --write` 仅格式化
- 已启用 `assist.actions.source.organizeImports: "on"` 自动排序 imports
- 配置统一在根目录 `biome.json`，所有包共享
- Tab 缩进 + 双引号 — 不要在代码中使用空格缩进或单引号
- **不同时使用 ESLint + Prettier** — Biome 已完全替代，避免规则冲突

## Node 运行时

- `package.json` 中 `"type": "module"` — 使用 ESM，不用 CommonJS
- Node 22+ 可运行可擦除 TypeScript（`--experimental-strip-types`），仅支持类型注解擦除，不理解 path alias / JSX / decorator metadata
- 项目构建仍依赖 Turbopack（Next.js）完成完整编译，不依赖 Node 原生 TS
- 测试使用 Vitest（已配置）

### 注意事项

- 共享 package（`packages/`）中不使用 Node 专有 API（除非有 `"types": ["node"]`），保持 Edge 兼容

## 包管理（pnpm workspace）

- workspace 包引用使用 `"workspace:*"` 版本号
- 添加依赖到指定包：`pnpm --filter <pkg> add <dep>`
- 不要使用 `npm` 或 `yarn`
- `pnpm-workspace.yaml` 定义了三个 workspace：`apps/*`、`packages/*`、`services/*`

### 注意事项

- **禁止循环依赖** — 特别是 package ↔ package、feature ↔ feature 之间
- **依赖必须显式声明** — 每个 package 必须声明自己的 dependencies，禁止依赖 hoisting 偶然工作
