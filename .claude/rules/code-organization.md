# 代码组织

详细用法见 `docs/tech-standards.md` Barrel Export / 平台文件分离 / 包管理章节。

## Feature 结构

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

## 依赖约束

- **禁止跨 feature deep import** — `features/reader/` 不能 import `features/search/` 的内部文件
- **禁止循环依赖** — 特别是 package ↔ package、feature ↔ feature
- **禁止 giant barrel exports** — 允许按领域聚合 `export * from "./types"`，禁止巨型 index.ts
- **禁止 deep relative import** — 不允许 `../../../`
- **禁止 client-side database access** — Prisma/Drizzle/filesystem/secret 不能进入客户端 bundle
- 依赖必须显式声明在 package.json — 禁止依赖 hoisting 偶然工作

## 包边界

每个 package 必须：
- 通过 `package.json exports` 显式定义公开 API — 禁止外部导入未导出的路径
- 包含 `README.md` 说明用途和公开接口
- `tsconfig.json` 通过 `extends` 继承 `tsconfig.base.json`，仅增量覆盖

禁止：
- 导出 internal API（标记为 `@internal` 的可例外）
- 跨包直接引用源文件路径（如 `packages/rule-engine/src/internal/xxx`）

## 禁止模式

- `useEffect` fetch（浏览器专属 API 除外，见 react.md）
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

## 测试

- 测试框架：Vitest
- 测试文件位置：对应包的 `__tests__/` 或同级 `*.test.ts`
- 优先行为测试而非覆盖率数字 — 测试「做了什么」而非「覆盖了多少行」
- 组件测试使用 React Testing Library，禁止测试实现细节（如内部 state）
- API mock 使用 MSW（Mock Service Worker）
- E2E 测试使用 Playwright

## 性能

- 避免不必要 Client Components
- 避免 hydration-heavy libraries
- 优先 tree-shakeable packages
- 优先 Web Standard APIs
- 共享 package 禁止使用 Node 专有 API，保持 Edge 兼容

## 提交前 Review Checklist

- [ ] 是否破坏 RSC 边界？（RSC = 数据获取/组装/Streaming，Client = 交互/浏览器 API）
- [ ] 是否引入 client bundle 膨胀？
- [ ] 是否新增循环依赖？
- [ ] 是否新增 deep import？
- [ ] 是否新增 `any`？
- [ ] 是否新增 `useEffect` fetch？（浏览器专属 API 除外）
- [ ] 阅读器是否使用了全局 store？（应使用 ReaderSession）
- [ ] 是否违反 feature boundary？
- [ ] 是否兼容 strict TypeScript？
- [ ] 包依赖方向是否正确？
- [ ] 新增类型/接口是否检查了所有消费方？
