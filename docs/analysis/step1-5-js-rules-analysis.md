# Step 1.5: Rule Engine JS 规则支持 — 架构分析

> 对照 Legado 的 JS 规则执行系统，设计适合 ReaderX 架构的实现方案。

## 一、Legado JS 规则系统概览

Legado 的 JS 规则贯穿整个书源解析管线，出现在三个位置：

1. **正文/搜索/详情规则**（`AnalyzeRule.evalJS()`）— 规则字符串中的 `<js>...</js>` 或 `@js:` 段
2. **URL 规则**（`AnalyzeUrl.evalJS()`）— 动态 URL 生成、`{{js}}` 内联表达式
3. **书源级 JS**（`BaseSource.evalJS()`）— 登录、请求头、jsLib 共享库

### 1.1 JS 规则语法

```
// 内联 JS 块
class.content<js>result.replace(/广告/g, '')</js>

// 前缀 JS
@js:JSON.parse(result).data.list.map(i => i.name).join('\n')

// URL 中的 JS
https://example.com/search?q={{encodeURI(key)}}@js:baseUrl + '&page=' + (page + 1)

// 混合规则：CSS → JS → CSS
class.content@js:result.replace(/<[^>]+>/g, '')##替换词##替换单
```

### 1.2 JS 上下文变量

| 变量 | AnalyzeRule 上下文 | AnalyzeUrl 上下文 | 类型 |
|------|-------------------|-------------------|------|
| `result` | ✅ 前序规则结果 | ✅ 中间 URL 结果 | `any` |
| `baseUrl` | ✅ 当前页基础 URL | ✅ 基础 URL | `string` |
| `src` | ✅ 原始页面内容 | — | `string` |
| `source` | ✅ 书源配置 | ✅ 书源配置 | `object` |
| `book` | ✅ 书籍信息 | ✅ 书籍信息 | `object` |
| `chapter` | ✅ 章节信息 | — | `object` |
| `key` | — | ✅ 搜索关键词 | `string` |
| `page` | — | ✅ 页码 | `number` |
| `java` | ✅ JsExtensions | ✅ JsExtensions | `object` |
| `cookie` | ✅ Cookie 读写 | ✅ Cookie 读写 | `object` |
| `cache` | ✅ 持久化 KV | ✅ 持久化 KV | `object` |

### 1.3 JsExtensions 完整方法表

Legado 通过 `java` 变量暴露 30+ 方法给 JS 规则：

| 分类 | 方法 | 说明 |
|------|------|------|
| **网络** | `ajax(url)` | HTTP GET，返回 body |
| | `ajaxAll(urls)` | 并发多 URL |
| | `connect(url, headers?)` | 返回完整 Response |
| | `get/post/head(url, ...)` | Jsoup HTTP 方法 |
| **规则回调** | `getString(rule)` | 从 JS 中调用规则引擎 |
| | `getStringList(rule)` | 同上，返回列表 |
| | `getElements(rule)` | 同上，返回元素 |
| **编码** | `base64Encode/Decode` | Base64 |
| | `hexEncode/Decode` | Hex |
| | `encodeURI(str)` | URI 编码 |
| **加密** | `md5Encode(str)` | MD5 |
| | `createSymmetricCrypto(...)` | AES/DES/3DES |
| | `createAsymmetricCrypto(...)` | RSA |
| | `HMacHex/HMacBase64` | HMAC |
| | `digestHex/digestBase64` | SHA 等 |
| **Cookie** | `getCookie(tag, key?)` | 读取 Cookie |
| **文件** | `cacheFile(url)` | 下载并缓存文件 |
| | `readFile/readTxtFile` | 读文件 |
| **WebView** | `webView(html, url, js)` | 无头浏览器渲染 |
| **文本** | `htmlFormat(str)` | HTML 格式化 |
| | `t2s/s2t(text)` | 简繁转换 |
| **工具** | `log(msg)` | 日志 |
| | `toast(msg)` | Toast 提示 |
| | `timeFormat(time)` | 时间格式化 |

---

## 二、ReaderX 现状与差距

### 2.1 已有的基础设施

| 组件 | 状态 | 说明 |
|------|------|------|
| `AnalyzeRule` JS 检测 | ✅ 已实现 | `detectMode()` 识别 `@js:` / `<js>`，`stripModePrefix()` 提取 JS 源码 |
| `QuickJSSandbox` | ✅ 已实现 | 沙箱执行、超时、内存限制、上下文注入 |
| 宿主函数 | ✅ 已实现 | `ajax`、`log`、`base64Encode`、`base64Decode`、`put`、`get` |
| Worker 通信 | ✅ 已实现 | comlink Worker + `createWorkerApi()` |
| 上下文变量类型 | ✅ 已定义 | `JsContext` 包含 `result`、`baseUrl`、`src`、`source` 等 |

### 2.2 核心差距

#### 差距 1：AnalyzeRule 与 sandbox 未连通

`analyzer.ts:115-121` — JS 模式直接返回错误，未调用 sandbox：

```typescript
if (ruleMode === "js") {
    return { ok: false, error: "JS rules require quickjs-runtime (Step 1.5)." };
}
```

**根因：** 依赖方向不允许 `rule-engine` 直接 import `quickjs-runtime`（roadmap 明确标注为 peer dep）。

**解决：** 依赖倒置 — rule-engine 定义 `JsExecutor` 接口，由消费方注入实现。

#### 差距 2：同步/异步阻抗不匹配

`AnalyzeRule.getString()` 是同步方法，但 `QuickJSSandbox.eval()` 是 `Promise<SandboxResult>`（因为 WASM 加载和 ajax 宿主函数）。

**解决：** 将 `getString()` / `getStringList()` / `getElements()` 改为 async。这是级联 API 变更，但不可避免 — JS 规则天然是异步的。

#### 差距 3：宿主函数不完整

当前 6 个宿主函数 vs Legado 的 30+ 方法：

| 缺失能力 | 优先级 | 理由 |
|----------|--------|------|
| 规则回调（`java.getString`） | 🔴 高 | 很多书源 JS 需要从 JS 中调用规则引擎 |
| HTTP 增强（method/headers/body） | 🟡 中 | POST 请求、自定义 Header |
| 加密（MD5/AES/RSA） | 🟡 中 | 加密章节、防爬虫 |
| Cookie 管理 | 🟢 低 | 大部分书源不需要 |
| WebView | ❌ 不实现 | Web 环境无头浏览器成本高，可用其他方案替代 |
| 文件操作 | ❌ 不实现 | 沙箱安全性考虑，不需要 |

#### 差距 4：URL 分析器缺 JS 支持

`url-analyzer.ts` 的管线中没有 JS 评估步骤。`UrlOption.webJs` 字段已定义但未使用。

#### 差距 5：SandboxResult → ParseResult 转换

sandbox 返回 `{ success, value: unknown, error? }`，规则引擎需要 `{ ok, value: string, values: string[] }`。需要转换层。

---

## 三、架构设计决策

### 3.1 依赖倒置：JsExecutor 接口

**禁止 rule-engine 直接依赖 quickjs-runtime。** 采用依赖倒置：

```typescript
// packages/rule-engine/src/types.ts — 新增接口
export interface JsExecutor {
    eval(code: string, context: JsEvalContext): Promise<JsEvalResult>;
}

export interface JsEvalContext {
    result?: unknown;
    baseUrl?: string;
    src?: string;
    source?: Record<string, unknown>;
    book?: Record<string, unknown>;
    chapter?: Record<string, unknown>;
    key?: string;
    page?: number;
}

export interface JsEvalResult {
    success: boolean;
    value: unknown;
    error?: string;
}
```

rule-engine 只定义接口，不知道也不关心实现是 QuickJS 还是其他引擎。消费方（reader-engine 或 apps/web）负责注入。

**优势：**
- rule-engine 保持零运行时依赖（只有 `peer dep` 类型声明）
- 可在测试中注入 mock executor
- 未来可替换 JS 引擎（如切换到 WASM QuickJS 变体）

### 3.2 AnalyzeRule 变为异步

```typescript
// 之前（同步）
getString(rule: string): ParseResult

// 之后（异步）
getString(rule: string): Promise<ParseResult>
getStringSync(rule: string): ParseResult  // 仅非 JS 规则
```

提供 `getStringSync()` 作为快捷方法 — 如果规则不含 JS，直接同步返回；含 JS 则抛错。这避免了简单规则（无 JS）被迫 await。

### 3.3 AnalyzeUrl 增加 JS 步骤

在 URL 分析管线中增加 JS 评估步骤：

```
当前管线：splitUrlOptions → replaceVariables → resolvePage → resolveRelativeUrl → buildResult
新管线：  splitUrlOptions → replaceVariables → resolveJs → resolvePage → resolveRelativeUrl → buildResult
                                                      ↑ 新增
```

### 3.4 宿主函数扩展策略

**MVP（Step 1.5 必须）：**

| 函数 | 说明 |
|------|------|
| `ajax(url)` | 已有，保留 |
| `log(msg)` | 已有，保留 |
| `base64Encode/Decode` | 已有，保留 |
| `put/get` | 已有，保留 |
| `getString(rule)` | **新增** — 从 JS 中调用 AnalyzeRule |
| `getStringList(rule)` | **新增** — 同上 |
| `ajaxWithOption(url, options)` | **新增** — 支持 POST/Header |

**后续迭代：**

| 函数 | 时机 |
|------|------|
| `md5(str)` | Step 5 之后 |
| `encodeURI(str)` | Step 5 之后 |
| `hexEncode/Decode` | 按需 |

**不实现：**

| 函数 | 原因 |
|------|------|
| `webView` | Web 环境无头浏览器成本高 |
| 文件操作 | 沙箱安全性 |
| `t2s/s2t` | 非核心，可延后 |
| `toast` | Web 环境用 `window.alert` 代替，但沙箱内无 DOM |

### 3.5 规则回调：JS 中调用规则引擎

这是 Legado 最强大的特性之一 — JS 代码可以回调规则引擎：

```javascript
// Legado 书源中的 JS 规则示例
var html = java.ajax("https://example.com/api");
var list = java.getStringList("$.data[*].name@css:a");
```

ReaderX 的实现需要：
1. 在 `HostFunctions` 中新增 `evalRule` / `evalRuleList` 方法
2. 这些方法接收规则字符串和当前内容，调用外部的 `AnalyzeRule` 实例
3. 通过 `JsExecutor` 注入的回调闭包实现

```typescript
// HostFunctions 扩展
export type HostFunctions = {
    // 已有 6 个...
    ajax(url: string): Promise<string>;
    log(message: string): void;
    base64Encode(str: string): string;
    base64Decode(str: string): string;
    put(key: string, value: string): void;
    get(key: string): string;
    // 新增
    evalRule(rule: string): Promise<string>;
    evalRuleList(rule: string): Promise<string[]>;
    ajaxWithOption(url: string, options: string): Promise<string>;
};
```

### 3.6 不适用 / 应舍弃的 Legado 组件

| 组件 | 原因 | ReaderX 替代 |
|------|------|-------------|
| Rhino 引擎 | Android 专有 | QuickJS WASM |
| ClassShutter 安全 | Rhino 专有（Java 类访问控制） | QuickJS 天然隔离（无 Java/DOM 访问） |
| RhinoWrapFactory | 同上 | QuickJS 无外部对象注入 |
| SharedJsScope（jsLib 共享库） | Legado 的 jsLib 从 URL 下载 JS 并缓存 | 可后续实现，MVP 不需要 |
| ScriptBindings（NativeObject） | Rhino 专有 | QuickJS context 注入 |
| RhinoContext（协程感知） | Kotlin 协程 + Rhino 指令计数 | QuickJS interrupt handler（已有） |
| WebView 系列 | Android WebView | 不实现 |
| CookieStore | Android 专有 Cookie 管理 | fetch 自带 Cookie（或后续实现） |
| CacheManager | Room DB 持久化 | `put/get` 已有 Map 存储，后续接 persistence |
| 文件操作系列 | 安全风险 | 不实现 |
| 加密系列（AES/RSA/HMAC） | 增加包体积 | 后续按需引入 `crypto-js` |

---

## 四、实现范围

### MVP（Step 1.5 交付件）

1. **`JsExecutor` 接口** — rule-engine 中定义，解耦 sandbox 实现
2. **`AnalyzeRule` 异步化** — `getString`/`getStringList`/`getElements` 变为 async，连通 JS 执行
3. **`AnalyzeUrl` JS 支持** — URL 管线新增 `resolveJs` 步骤
4. **宿主函数扩展** — 新增 `evalRule`、`evalRuleList`、`ajaxWithOption`
5. **端到端测试** — 用含 JS 规则的真实 Legado 书源验证

### 非交付（后续迭代）

- jsLib 共享库加载
- 加密函数（MD5/AES）
- Cookie 管理
- 简繁转换
- WebView 渲染

---

## 五、与 CLAUDE.md 的一致性检查

| 约束 | 合规？ | 说明 |
|------|--------|------|
| quickjs-runtime peer dep | ✅ | rule-engine 定义接口，不直接 import |
| 按边界分包 | ✅ | JS 执行逻辑在 quickjs-runtime，规则调度在 rule-engine |
| 禁止 any | ✅ | 新接口使用具体类型 |
| ESM-only | ✅ | 所有新代码使用 ESM |
| Edge-compatible | ✅ | QuickJS WASM 在 Edge Runtime 可用 |
| 禁止循环依赖 | ✅ | rule-engine → (interface) ← quickjs-runtime |

---

## 六、代码审查修复记录

Step 1.5 代码审查发现 5 个问题，全部已修复。记录修复方案供后续参考。

### 6.1 `result` 未传递给 JS 上下文（严重）

**问题**：`evaluate()` 循环独立评估每个段，但从不将前序段的输出作为 `result` 传递给后续 JS 段。链式规则 `div.title&&@js:result.trim()` 中，JS 收到 `result: undefined`。

**修复**：循环中跟踪 `accumulatedResult`，通过 `evaluateSegment()` → `evaluateJs()` 传递给 JS 上下文。

```typescript
// analyzer.ts evaluate() 循环
let accumulatedResult: string | undefined;
for (const segment of segments) {
    const result = await this.evaluateSegment(segment, mode, accumulatedResult);
    // ...
    if (replaced.length > 0) {
        accumulatedResult = replaced.join("\n");
    }
}
```

### 6.2 `evalContext` 可覆盖 `src`（中等）

**问题**：`evaluateJs` 展开顺序 `{ src: this.content, ...this.evalContext }` 允许 `evalContext.src` 静默覆盖页面内容。

**修复**：反转展开顺序，`src`（页面内容）始终优先。

```typescript
const ctx: JsEvalContext = {
    ...this.evalContext,
    src: this.content,
    ...(priorResult !== undefined ? { result: priorResult } : {}),
};
```

### 6.3 `evalRuleList` 返回 JSON 字符串而非原生数组（严重）

**问题**：sandbox.ts 中 `vm.newString(JSON.stringify(vals))` 将数组序列化为字符串返回给 QuickJS。JS 规则代码收到 `'["a","b"]'` 而非 `["a","b"]`。

**修复**：用 `vm.newArray()` + `vm.setProp()` 构建原生 QuickJS 数组。

```typescript
const arr = vm.newArray();
for (let i = 0; i < vals.length; i++) {
    const el = vm.newString(vals[i] ?? "");
    vm.setProp(arr, i, el);
    el.dispose();
}
deferred.resolve(arr);
```

### 6.4 异步宿主函数 use-after-free（严重）

**问题**：`evalCode()` 同步返回后 `finally` 立即 dispose VM，但异步宿主回调（ajax/evalRule 等）的 deferred promise 尚未 resolve。回调中的 `vm.newString()` 操作已释放的 VM。

**修复**：三层防护机制：

1. **`hostCompletions` 追踪** — `settleHostPromise()` 用 `async/await + try/catch` 桥接宿主 Promise，completion Promise 始终 settle
2. **超时保护** — `Promise.race([allSettled, setTimeout(3s)])` 防止宿主 Promise 永不 resolve 时无限等待
3. **错误容错** — `onReject` 内部异常（VM 已释放）被内层 `catch` 静默吞掉，避免 unhandled rejection

```typescript
async function settleHostPromise(
    promise: Promise<unknown>,
    onResolve: (val: unknown) => void,
    onReject: (err: unknown) => void,
): Promise<void> {
    try {
        const val = await promise;
        onResolve(val);
    } catch (err: unknown) {
        try {
            onReject(err);
        } catch {
            // VM 已释放，静默吞掉
        }
    }
}
```

### 6.5 ESM 兼容性：`require` 改为 `createRequire`（编译错误）

**问题**：`erasableSyntaxOnly` + `verbatimModuleSyntax` 配置下，`dom-utils.ts` 和 `xpath.ts` 中的裸 `require()` 调用无法通过 typecheck。

**修复**：用 `import { createRequire } from "node:module"` + `createRequire(import.meta.url)` 替代，符合 ESM 规范。

### 设计决策：为什么不使用 `.then(onFulfilled, onRejected)`

在现代 TypeScript（5.7+ / strict）中，`.then(success, error)` 模式存在两个问题：

1. **错误传播语义不明确** — `onFulfilled` 内部 throw 不会进入 `onRejected`（Promise 规范行为，第二参数只处理原 promise reject）
2. **类型推断复杂化** — `TS2345: Type 'void' is not assignable to parameter of type '(reason: any) => PromiseLike<never>'`

推荐使用 `async/await + try/catch`（最终采用）或 `.then(success).catch(error)` 链式模式。
