# React 与状态约束

详细用法和代码示例见 `docs/tech-standards.md` React / Next.js / Zustand / TanStack Query 章节。

## React

- **RSC 是默认渲染模式** — Server Component 负责数据获取、页面组装、SEO、Streaming；Client Component 仅在需要交互 / 浏览器 API / 本地状态时使用 `"use client"`
- 优先 async Server Components 获取数据
- **禁止 `useEffect` 获取数据** — 数据获取优先 RSC fetch / TanStack Query / Server Action；仅在浏览器专属 API（`navigator.bluetooth`、`navigator.serial`、`BroadcastChannel`、`WebRTC`）场景允许 useEffect 初始化
- **禁止 `useEffect` 触发布局重排** — 阅读器的 layout invalidation 由 Render Scheduler 驱动，不在 useEffect 中触发
- **禁止在 render 中产生副作用**
- Client Components 必须下沉到叶子节点
- 优先 Server Actions 处理 mutation
- `<form action={fn}>` 替代手动 onSubmit + fetch
- React Compiler 兼容：保持纯函数 render，immutable update（禁止 `arr.push()`、`obj.x = 1`）
- `use()` hook 可用于在渲染中读取 Promise 和 Context，但非必须 — 多数场景 RSC fetch / TanStack Query 更合适

## 状态管理

- **Zustand 仅用于 client UI state** — 禁止用 Zustand 缓存 API 数据
- **TanStack Query 用于 server state**
- **禁止创建全局大 store** — store 按 feature 拆分
- **阅读器使用 ReaderSession** — 阅读器分页/游标/缓存由 session 对象管理，禁止使用全局 reader store。详见 `docs/development-guide.md`
- 禁止 selector 返回新对象导致重渲染 — 必须用 `useShallow`
- Query Key 必须稳定 — 使用原始值数组 `["user", id]`，禁止对象
