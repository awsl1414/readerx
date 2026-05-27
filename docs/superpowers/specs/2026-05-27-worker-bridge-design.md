# Worker Bridge 设计文档

> Step 6.0 基础设施 — features 与 QuickJS Worker 之间的统一通信层

## 决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| Bridge 范围 | 统一入口，覆盖所有规则类型 | Features 不需要知道执行模型 |
| 返回类型 | Discriminated union Result | 类型安全，feature 层可穷尽处理 |
| 实现方案 | 单类 WorkerBridge | 总量 ~200 行，拆分增加理解成本 |
| 文件组织 | 2 文件（bridge + provider） | 职责清晰，不过度拆分 |
| 错误模型 | programmer error throw / execution error Result | 不混合 throw 和 Result |
| 取消机制 | AbortSignal | 搜索/阅读器都需要取消能力 |
| Worker 类型 | Dedicated Worker | 见 ADR 章节 |

## 文件结构

```text
apps/web/lib/
  worker-bridge.ts            # WorkerBridge class + 类型定义
apps/web/components/
  worker-bridge-provider.tsx  # React Context + Provider + useWorkerBridge() hook
```

新增依赖：`apps/web/package.json` 添加 `comlink`。

## 类型定义

```ts
type RuleOptions = {
  baseUrl?: string
  timeout?: number       // 默认 10000ms
  signal?: AbortSignal   // 调用方可取消
}

// Discriminated union — feature 层可穷尽处理
type RuleResult =
  | { ok: true; value: string | string[] }
  | { ok: false; error: RuleError }

// 执行错误分类
type RuleError =
  | { type: "timeout"; message: string }
  | { type: "syntax"; message: string }
  | { type: "runtime"; message: string }
  | { type: "worker_crash"; message: string }
```

## WorkerBridge Class

```ts
class WorkerBridge {
  // 私有状态
  #worker: Worker | null
  #api: Comlink.Remote<WorkerApi>
  #queue: Promise<unknown>         // 串行队列链
  #disposed: boolean
  #hostFunctions: HostFunctionOptions | null  // 注入 Worker 的宿主回调

  // 公共 API
  executeRule(rule: string, content: string, options?: RuleOptions): Promise<RuleResult>
  evalJs(code: string, context: JsEvalContext): Promise<JsEvalResult>
  dispose(): void

  // 私有方法
  #ensureWorker(): Promise<void>
  #enqueue<T>(fn: () => Promise<T>, timeout?: number): Promise<T>
  #handleCrash(error: unknown): never
  #detectMode(rule: string): RuleMode
  #executeMainThread(rule, content, options): RuleResult
  #executeWorker(rule, content, options): Promise<RuleResult>
}
```

### executeRule 流程

1. `#detectMode(rule)` 检测规则类型
2. 非 JS（CSS/XPath/JSONPath）→ `#executeMainThread()` 用 AnalyzeRule 执行
3. JS → `#enqueue(() => #executeWorker(...), timeout)` 走 Worker 串行队列

### Worker 初始化

- 懒初始化：首次需要 Worker 时才创建（`#ensureWorker`）
- `new Worker(new URL('@readerx/quickjs-runtime/worker', import.meta.url))` + `Comlink.wrap`
- 创建后调用 `setHostFunctions()` 注入宿主函数：
  - `fetchFn(url)` → infrastructure 的 HTTP 客户端
  - `fetchWithOptions(url, options)` → 同上
  - `evalRule(rule)` → Worker 内 JS 代码调用 `evalRule()` 时回调到 bridge 的 `executeRule`
  - `evalRuleList(rule)` → 同上，返回 string[]
  - `onLog(msg)` → console.log
- 单例复用：创建后持续使用，不重建

### 取消机制

- `RuleOptions.signal: AbortSignal` 支持调用方取消
- Worker 执行期间 signal abort → reject `AbortError`
- 主线程执行期间 signal abort → 同步检查 `signal.aborted`
- 取消遵循 Web 标准（AbortController/AbortSignal），不包装为 Result

### 请求队列

- `#queue` 是一个 Promise 链，新请求 `.then()` 追加到末尾
- 同一时间只有一个请求在 Worker 中执行
- 超时的请求从链中被 reject

### 超时

- `Promise.race([fn(), timeoutPromise])` 实现超时
- 默认 10000ms
- 超时 reject `TimeoutError`

### Crash 恢复

- `#handleCrash` 销毁旧 Worker（`#worker.terminate()`）
- 清空 `#api`、`#worker`
- 抛出错误让调用方感知
- 下次调用时 `#ensureWorker` 自动重建

## Provider 集成

```tsx
// worker-bridge-provider.tsx
"use client"

const WorkerBridgeContext = createContext<WorkerBridge | null>(null)

function WorkerBridgeProvider({ children }: { children: ReactNode }) {
  // useState 初始化函数 — React strict mode 安全
  const [bridge] = useState(() => new WorkerBridge())
  useEffect(() => () => bridge.dispose(), [bridge])
  return (
    <WorkerBridgeContext value={bridge}>
      {children}
    </WorkerBridgeContext>
  )
}

function useWorkerBridge(): WorkerBridge {
  const bridge = useContext(WorkerBridgeContext)
  if (!bridge) throw new Error("useWorkerBridge must be used within WorkerBridgeProvider")
  return bridge
}
```

嵌入位置（providers.tsx）：

```tsx
<QueryProvider>
  <WorkerBridgeProvider>
    <AppShell>{children}</AppShell>
  </WorkerBridgeProvider>
</QueryProvider>
```

## 错误处理

**统一错误模型**：programmer error → throw，execution error → Result。

| 场景 | 分类 | 处理 |
|---|---|---|
| dispose 后调用 | programmer | throw `BridgeDisposedError` |
| Worker 不可用 | programmer | throw `WorkerUnavailableError` |
| 执行超时 | execution | `RuleResult { ok: false, error: { type: "timeout" } }` |
| 规则语法错误 | execution | `RuleResult { ok: false, error: { type: "syntax" } }` |
| Worker crash | execution | 销毁旧连接 + `RuleResult { ok: false, error: { type: "worker_crash" } }` |
| 运行时错误 | execution | `RuleResult { ok: false, error: { type: "runtime" } }` |
| 并发请求 | — | Promise 链串行化 |
| 取消 | execution | signal abort → reject `AbortError`（不包装为 Result，与 Web 标准一致） |

Feature 层使用模式：

```ts
const result = await bridge.executeRule(rule, content, { signal })
if (result.ok) {
  // result.value: string | string[]
} else {
  switch (result.error.type) {
    case "timeout": /* 提示重试 */
    case "syntax": /* 规则错误 */
    case "runtime": /* 执行失败 */
    case "worker_crash": /* 自动恢复中 */
  }
}
```

## 测试策略

- Worker crash 恢复：模拟 crash → 验证自动重建
- 超时：mock 长时间执行 → 验证 TimeoutError
- 串行队列：并发调用 → 验证执行顺序
- 规则路由：CSS → 主线程，JS → Worker

## 约束遵守

- RSC 边界：WorkerBridge 仅在 Client Component 中使用
- 禁止 features 直接 import comlink 或 Worker
- 禁止多个 bridge 实例（Provider 单例）
- Worker 初始化不在 useEffect 中（Provider useState 初始化函数中创建）

## 运行环境限制

WorkerBridge **禁止**在以下环境使用：

| 环境 | 原因 |
|---|---|
| Server Components | 无 Worker API |
| Edge Runtime | 不支持 Web Worker |
| Route Handlers | 服务端无 Worker |
| Server Actions | 服务端执行 |

仅限：Client Components（浏览器环境）。

## ADR: 为什么用 Dedicated Worker

| 选项 | 结论 | 理由 |
|---|---|---|
| Dedicated Worker | **选择** | 单标签页使用，生命周期随页面，API 简单，comlink 原生支持 |
| SharedWorker | 不选 | 多标签页共享场景不存在（每标签页独立阅读），增加复杂度 |
| Service Worker | 不选 | 设计用于网络拦截和缓存，不适合计算沙箱 |
| Worker Pool | 不选 | 原型阶段单 Worker 足够，后续按需扩展 |
