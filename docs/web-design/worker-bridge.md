# Worker Bridge 架构指南

QuickJS 规则执行在 Web Worker 中运行（`@readerx/quickjs-runtime`）。Worker Bridge 是 web 应用与 Worker 之间的唯一通信层，所有 feature 通过它调用规则执行，不直接接触 comlink 或 Worker。

## 架构决策

**为什么需要 Bridge：**
- Feature 不应知道 Worker 的存在（comlink、MessageChannel、Transferable）
- Worker 生命周期需要统一管理（单例、懒初始化、销毁）
- 错误处理和超时策略需要集中，不散落在各 feature 中

**依赖方向：**

```text
features/* → worker-bridge → @readerx/quickjs-runtime/worker (comlink)
```

## API 设计

Bridge 暴露 async 函数，返回 Promise。Feature 调用方式与普通 async 函数无异。

```ts
// apps/web/lib/worker-bridge.ts

// 规则执行 — 最核心的 API
executeRule(rule: string, content: string, options?: RuleOptions): Promise<RuleResult>

// JS 规则执行
evalJs(code: string, context: JsEvalContext): Promise<JsEvalResult>

// 销毁连接（应用卸载时调用）
dispose(): void
```

## RuleOptions

```ts
type RuleOptions = {
  baseUrl?: string      // 用于 URL 解析
  timeout?: number      // 执行超时（ms），默认 10000
}
```

## 生命周期

```text
应用启动
  ↓
首次调用 executeRule / evalJs
  ↓
懒初始化 Worker（comlink.wrap）
  ↓
Worker 就绪，执行请求
  ↓
后续请求复用同一 Worker 连接
  ↓
应用卸载 / 页面关闭 → dispose()
```

关键点：
- **懒初始化**：不阻塞应用启动，首次使用时才创建 Worker
- **单例**：整个应用共享一个 Worker 连接
- **不重建**：Worker 创建后持续复用，除非 crash（见错误处理）

## 初始化位置

Bridge 在 `providers.tsx` 的 ClientApp 层初始化，通过 React Context 向下传递：

```text
<WorkerBridgeProvider>    ← 初始化 bridge，注入 Context
  <AppShell>
    <features/*>          ← 通过 useWorkerBridge() 获取 bridge
  </AppShell>
</WorkerBridgeProvider>
```

Provider 内部：
1. `useRef` 持有 bridge 实例（不随 re-render 重建）
2. `useEffect` cleanup 中调用 `dispose()`
3. Context value 稳定（bridge 实例不变）

## 错误处理

| 场景 | 处理方式 |
|---|---|
| Worker crash | 捕获错误 → 销毁旧连接 → 下次调用时自动重建 |
| 执行超时 | 抛出 `TimeoutError`，feature 层决定如何展示 |
| 规则语法错误 | 返回 `RuleResult` 含 error 字段，不抛异常 |
| Worker 不可用（旧浏览器） | Bridge 构造时检测，抛出明确错误 |

## 并发

Worker 是单线程的，多个 feature 同时调用时会排队执行。Bridge 内部管理请求队列：

- 同一时间只有一个请求在 Worker 中执行
- 后续请求排队等待
- 超时的请求从队列中移除并 reject

## 使用示例

```ts
// features/search/hooks/use-search.ts
const bridge = useWorkerBridge()

const results = await bridge.executeRule(searchRule, html)
```

```ts
// features/reader/session.ts
const bridge = useWorkerBridge()

const chapter = await bridge.executeRule(contentRule, chapterHtml)
```

## 禁止

- Feature 直接 `import` comlink 或 Worker 相关模块
- 在 Server Component 中调用 bridge
- 在 useEffect 中做 bridge 初始化（初始化在 Provider 中完成）
- 创建多个 bridge 实例
