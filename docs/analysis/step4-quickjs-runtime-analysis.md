# Step 4: quickjs-runtime — 与 Legado 对比分析

## 概述

Legado 使用 **Mozilla Rhino**（Java JS 引擎）执行书源中的 JavaScript 规则。ReaderX 改用 **QuickJS WASM** 沙箱，在 Web Worker 中运行，通过 comlink 暴露 RPC 接口。

## 改进项

### 1. WASM 沙箱替代 Java 引擎

**Legado**: Rhino 运行在 JVM 中，通过 ClassShutter + WrapFactory 限制 JS 访问 Java 类。安全依赖多层 Java 安全机制。

**ReaderX**: QuickJS 编译为 WASM，天然运行在隔离的沙箱内存空间中。JS 代码无法访问宿主环境的任何 API，只能通过显式注入的函数通信。

**优势**: 安全模型更简单可靠，不依赖黑名单（Legado 的 ClassShutter 维护了 80+ 个被屏蔽的 Java 类）。

### 2. Web Worker 线程隔离

**Legado**: JS 在主线程（或协程）中执行，依赖 instruction observer（每 10000 条指令检查一次）防止 UI 卡顿。

**ReaderX**: JS 在独立 Web Worker 中执行，主线程完全不阻塞。超时通过 QuickJS 的 `setInterruptHandler` 实现，精度更高。

### 3. comlink RPC 通信

**Legado**: 通过 Rhino 的 Java 对象包装直接调用 Kotlin 方法，同步阻塞。

**ReaderX**: 使用 comlink 的 async proxy 模式，Worker 与主线程通过 `postMessage` 通信，天然异步，不阻塞任何线程。

### 4. 内存限制在 WASM 层

**Legado**: 无直接内存限制，依赖 instruction count + stack depth 间接控制。

**ReaderX**: QuickJS WASM 支持 `setMemoryLimit(bytes)`，精确控制沙箱内存使用，防止恶意书源消耗过多内存。

### 5. 简化的上下文注入

**Legado**: 注入 12+ 个对象到 JS 作用域（java, cookie, cache, source, book, result, baseUrl, chapter, title, src, nextChapterUrl, rssArticle），其中 `java` 对象暴露 30+ 个方法。

**ReaderX**: 仅注入必要的最小接口。分为两层：
- **Sandbox 内置函数**: `ajax()`, `log()`, `base64Encode()`, `base64Decode()`
- **Rule context（由 rule-engine 提供）**: `result`, `baseUrl`, `source`, `book` 等

### 6. 类型安全的接口定义

**Legado**: JsExtensions 是 Kotlin 接口，JS 调用通过反射，无类型安全。

**ReaderX**: TypeScript 全链路类型安全。sandbox API、worker 消息、上下文对象全部有类型定义。

## 舍弃项

| 功能 | 原因 | 何时需要 |
|------|------|----------|
| `java.webView()` / `java.webViewGetSource()` | 浏览器环境不需要无头浏览器，直接 fetch + DOMParser 即可 | 如需执行页面内 JS（非书源规则），可用 iframe sandbox |
| `java.toast()` / `java.longToast()` | Worker 无法直接操作 UI，通过回调通知主线程 | apps/web 层处理 |
| `java.startBrowser()` / `java.openUrl()` | 非 Worker 职责 | apps/web 层处理 |
| `java.readFile()` / `java.deleteFile()` / `java.unzipFile()` 等 | 文件操作不在 sandbox 职责范围内 | persistence 层处理 |
| `java.downloadFile()` / `java.cacheFile()` | 下载由 infrastructure/fetch 处理 | reader-engine 或 apps/web 层 |
| Java ClassShutter / WrapFactory | WASM 沙箱天然隔离，无需黑名单 | 不需要 |
| SharedJsScope / jsLib 缓存 | 共享 JS 库机制复杂，MVP 不需要 | Step 1.5 或更晚 |
| Script 编译缓存 | Rhino 的 CompiledScript 缓存机制，QuickJS 有自己的字节码缓存 | 可在性能优化阶段添加 |
| Rhino 的 Continuation/Suspend 桥接 | JS 环境中直接使用 async/await，不需要 continuation 机制 | 不需要 |
| `cookie` 对象注入 | Cookie 管理应在 HTTP 客户端层处理 | infrastructure 层 |
| `cache` 对象注入 | 缓存操作通过 `put`/`get` 变量系统间接实现 | persistence 层 |
| 加密工具（AES/DES/RSA 等） | 大多数书源不需要，按需添加 | Step 1.5 视需求添加 |

## 保留的核心功能

| 功能 | 对应 Legado | ReaderX 实现 |
|------|-------------|-------------|
| `java.ajax(url)` | HTTP GET 返回字符串 | `ajax(url)` — 调用宿主提供的 fetch 函数 |
| `java.put(key, value)` | 存储变量 | `put(key, value)` — 变量映射表 |
| `java.get(key)` | 读取变量 | `get(key)` — 变量映射表 |
| `java.log(msg)` | 调试日志 | `log(msg)` — 通过回调输出 |
| `java.base64Encode(str)` | Base64 编码 | `base64Encode(str)` — 原生 btoa |
| `java.base64Decode(str)` | Base64 解码 | `base64Decode(str)` — 原生 atob |
| `result` 变量 | 前一步规则结果 | `result` — 上下文注入 |
| `baseUrl` 变量 | 当前页面的基础 URL | `baseUrl` — 上下文注入 |
| `source` 变量 | 当前书源配置 | `source` — 上下文注入 |
| 超时中断 | instruction observer (10000) | `setInterruptHandler` + 时间截止 |
| 内存限制 | 无直接支持 | `setMemoryLimit(bytes)` |
| 递归深度限制 | recursiveCount >= 10 | `setMaxStackSize(bytes)` |

## 依赖方向

```
quickjs-runtime（无内部依赖）
      ↑ peer dep
rule-engine（Step 1.5 使用 quickjs-runtime 执行 @js: 规则）
```

CLAUDE.md 约束：`quickjs-runtime 无内部依赖，禁止引入其他包`。
