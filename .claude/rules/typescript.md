# TypeScript 约束

详细用法和代码示例见 `docs/tech-standards.md` TypeScript 章节。

## 编译选项

- strict mode + `erasableSyntaxOnly` + `verbatimModuleSyntax`
- `noUncheckedIndexedAccess` — 索引返回 `T | undefined`，必须处理
- `exactOptionalPropertyTypes` — `{ foo?: string }` 不允许 `{ foo: undefined }`
- `noImplicitOverride` — 子类覆盖必须写 `override`
- 路径别名：`@/*` → `apps/web/*`
- Tab 缩进，双引号
- Biome 负责 lint 和 format，禁止 ESLint / Prettier

## 禁止

- **禁止 `any`** — 使用 `unknown`
- **禁止 `enum`** — 使用联合类型（与 bundler / isolatedModules 不兼容）
- **禁止 `namespace`** — 使用模块
- **禁止 parameter properties** — 使用显式赋值（`erasableSyntaxOnly` 已在编译器层面强制）
- **禁止 non-null assertion (`!`)** — 使用可选链 `?.` 和空值合并 `??`
- 必须使用 `import type` / `export type` 标记类型导入导出
- 环境变量必须经过 Zod 校验（禁止裸 `process.env.MY_KEY!`）

## 约定

- 优先 `type` — 团队约定统一使用 `type`，保持风格一致（非技术限制）
- Node 22+ 可运行可擦除 TS（`--experimental-strip-types`），项目构建仍依赖 Turbopack
