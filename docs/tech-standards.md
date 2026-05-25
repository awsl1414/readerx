# 技术标准与注意事项

本文档描述 ReaderX 项目各技术栈的使用标准和推荐行为。所有代码必须遵循这些规范。

## TypeScript 6（strict + noUncheckedIndexedAccess）

- 开启 `noUncheckedIndexedAccess` 后，数组/对象索引返回 `T | undefined`，必须处理 undefined 情况
- 使用 `satisfies` 运算符验证类型而不拓宽推断：`const config = { ... } satisfies Config`
- 使用 `as const` 满足常量类型推断
- `moduleResolution: "bundler"` — 仅使用 `exports` 字段解析，不需要 `.js` 扩展名
- 包导出统一通过 package.json `exports` 字段，不使用 barrel index.ts 重导出无关内容
- `tsconfig.base.json` 是所有包共享的基础配置，各包 `tsconfig.json` 通过 `extends` 继承

## React 19

- **Server Components 是默认的** — 在 Next.js App Router 中，组件默认为 RSC，仅在需要 hooks / 浏览器 API / 交互时添加 `"use client"`
- `ref` 作为普通 prop 传递，不再需要 `forwardRef`
- 使用 `use()` hook 在渲染中读取 Promise 和 Context
- 使用 `<form action={fn}>` + Server Actions 处理表单提交
- 使用 `useActionState` 管理 action 状态，`useOptimistic` 管理乐观更新，`useFormStatus` 获取表单 pending 状态
- `<title>`、`<meta>` 等 SEO 标签可直接在组件中声明
- Context 通过 `createContext` + `useContext` 使用，或通过 `use(Context)` 在渲染中读取
- 优先在 server component 中获取数据，减少客户端请求

## Next.js 16（App Router）

- 页面放在 `app/` 目录，文件名即路由：`page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx`
- `layout.tsx` 是共享布局，不会在导航时重新渲染
- `loading.tsx` 自动包裹 Suspense，提供加载 UI
- Route Groups 用 `(folder)` 命名，不影响 URL 但可共享布局
- Server Actions 用 `"use server"` 标记的 async 函数，直接在 server 执行
- `generateMetadata` 用于动态 metadata，取代 `head` 里的硬编码
- 路径别名 `@/*` 映射到 `apps/web/*`（在 apps/web/tsconfig.json 中配置）
- 使用 `next/font` 加载字体，避免布局偏移
- 客户端组件尽量下沉到叶子节点，保持父组件为 RSC

## Tailwind CSS 4

- 使用 `@import "tailwindcss"` 替代旧版 `@tailwind base/components/utilities` 指令
- 设计令牌通过 `@theme inline { }` 定义，取代 `tailwind.config.js`（本项目已在 `globals.css` 中配置）
- 自定义变体使用 `@custom-variant`（如 `@custom-variant dark (&:is(.dark *))`）
- 颜色默认使用 `oklch` 色彩空间（本项目已采用）
- 不需要配置 `content` — Tailwind 4 自动检测文件
- 优先使用 utility classes 而非 `@apply`，保持 HTML 可读性
- CSS 变量命名遵循 `--color-{name}` / `--radius-{size}` / `--font-{name}` 模式

## shadcn/ui（radix-nova 样式，v4）

- 使用 `pnpm dlx shadcn@latest add <component>` 添加组件到 `components/ui/`
- 组件代码完全归项目所有，可直接修改
- 使用 `cn()` 工具函数（clsx + tailwind-merge）合并 className
- 组件通过 `data-slot`、`data-variant`、`data-size` 等 data attribute 样式化
- 使用 `Slot`（from `radix-ui`）实现多态渲染（替代已废弃的 `asChild` prop）
- 新组件使用 `React.ComponentProps<"element">` 获取 props 类型，不用手写

## Zustand 5

- 创建 store：`const useStore = create<State>((set, get) => ({ ... }))`
- 在组件中用 selector 订阅：`const x = useStore(s => s.x)` — 只在 `x` 变化时重渲染
- 多值订阅使用 `useShallow`：`const { a, b } = useStore(useShallow(s => ({ a: s.a, b: s.b })))`
- Store 文件放在 feature 目录内（`features/{name}/store.ts`），不设全局 store
- Actions 放在同目录 `actions.ts` 中，可操作 store 也可触发异步请求
- 使用 `persist` middleware 持久化需要的数据（如阅读进度）

## TanStack Query 5

- `useQuery({ queryKey, queryFn })` 获取数据，`queryKey` 是缓存标识
- `useMutation({ mutationFn })` 处理写入操作
- 设置合理的 `staleTime`（数据多久视为过期）和 `gcTime`（缓存多久清理）
- Server Component 中用 `prefetchQuery` 预取数据，结合 `useSuspenseQuery` 实现流式加载
- mutation 成功后用 `queryClient.invalidateQueries()` 刷新相关查询
- Query hooks 放在 feature 目录的 `hooks/` 或 `actions.ts` 中

## Zod 4

- Schema 定义：`z.string()`、`z.number()`、`z.object({})`、`z.array()`、`z.enum([])` 等
- 类型推导：`type T = z.infer<typeof schema>` — 不手写重复的类型
- 校验调用：`.parse(data)` 抛错，`.safeParse(data)` 返回 `{ success, data, error }`
- 数据变换：`.transform()` 在校验后转换数据
- 在 `rule-engine` 中已用于 BookSource 校验（`schemas.ts`）
- 新增 schema 时同步导出类型（`export type X = z.infer<typeof XSchema>`）

## Biome 2

- `biome check` 同时执行 lint + format 检查
- `biome check --write` 自动修复（格式化 + 可安全修复的 lint 问题）
- `biome format --write` 仅格式化
- 已启用 `assist.actions.source.organizeImports: "on"` 自动排序 imports
- 配置统一在根目录 `biome.json`，所有包共享
- Tab 缩进 + 双引号 — 不要在代码中使用空格缩进或单引号

## Bun 运行时

- `package.json` 中 `"type": "module"` — 使用 ESM，不用 CommonJS（`require` / `module.exports`）
- Bun 原生支持 TypeScript，无需 `ts-node` 或编译步骤
- 使用 `Bun.env` 读取环境变量（兼容 `process.env`）
- 测试使用 Vitest（已配置），不使用 Bun test runner

## 包管理（pnpm workspace）

- workspace 包引用使用 `"workspace:*"` 版本号
- 添加依赖到指定包：`pnpm --filter <pkg> add <dep>`
- 不要使用 `npm`、`yarn` 或 `bun install`
- `pnpm-workspace.yaml` 定义了三个 workspace：`apps/*`、`packages/*`、`services/*`
