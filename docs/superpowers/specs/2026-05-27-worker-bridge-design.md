# Worker Bridge 设计文档

> Step 6.0 基础设施 — features 与 QuickJS Worker 之间的统一通信层

## 决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| Bridge 范围 | 统一入口，覆盖所有规则类型 | Features 不需要知道执行模型 |
| 返回类型 | 统一 RuleResult | 调用方语义清晰，不需要区分 getString/getStringList |
| 实现方案 | 单类 WorkerBridge | 总量 ~200 行，拆分增加理解成本 |
| 文件组织 | 2 文件（bridge + provider） | 职责清晰，不过度拆分 |

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
}

type RuleResult = {
  value: string | string[]
  error?: string
}
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
  const bridgeRef = useRef<WorkerBridge | null>(null)
  if (!bridgeRef.current) {
    bridgeRef.current = new WorkerBridge()
  }
  useEffect(() => () => bridgeRef.current?.dispose(), [])
  return (
    <WorkerBridgeContext value={bridgeRef.current}>
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

| 场景 | 处理 |
|---|---|
| Worker crash | 销毁旧连接，下次调用自动重建 |
| 执行超时 | reject TimeoutError，feature 层决定 UI |
| 规则语法错误 | RuleResult.error，不抛异常 |
| Worker 不可用 | 构造时 throw 明确错误 |
| dispose 后调用 | throw "WorkerBridge disposed" |
| 并发请求 | Promise 链串行化 |

## 测试策略

- Worker crash 恢复：模拟 crash → 验证自动重建
- 超时：mock 长时间执行 → 验证 TimeoutError
- 串行队列：并发调用 → 验证执行顺序
- 规则路由：CSS → 主线程，JS → Worker

## 约束遵守

- RSC 边界：WorkerBridge 仅在 Client Component 中使用
- 禁止 features 直接 import comlink 或 Worker
- 禁止多个 bridge 实例（Provider 单例）
- Worker 初始化不在 useEffect 中（Provider useRef 中创建）
