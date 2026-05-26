# Step 4: quickjs-runtime 实现规划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 QuickJS WASM 沙箱运行时，在 Web Worker 中执行书源 JS 规则，提供类型安全的 eval/terminate API 和上下文注入能力。

**Architecture:** `quickjs-emscripten-core` + `@jitl/quickjs-wasmfile-release-sync` 在 Web Worker 中创建 QuickJS 沙箱。主线程通过 comlink proxy 调用 Worker 中的沙箱方法。沙箱内注入最小 API（ajax, log, base64, put/get 变量）。超时通过 QuickJS interrupt handler 实现，内存通过 `setMemoryLimit` 限制。

**Tech Stack:** quickjs-emscripten-core 0.31+, comlink 4.4+, Vitest, fake-indexeddb (不需要), TypeScript strict

---

## 文件结构

```
packages/quickjs-runtime/
├── src/
│   ├── index.ts           # 公开 API 导出
│   ├── types.ts           # 类型定义（SandboxOptions, JsContext, SandboxResult）
│   ├── sandbox.ts         # QuickJSSandbox 核心 — eval/terminate/context injection
│   ├── host-functions.ts  # 注入到沙箱的宿主函数（ajax, log, base64, put/get）
│   └── worker.ts          # Web Worker 入口 — comlink expose
├── __tests__/
│   ├── sandbox.test.ts    # sandbox 单元测试（直接实例化，不经过 Worker）
│   ├── host-functions.test.ts  # 宿主函数单元测试
│   └── worker.test.ts     # Worker 集成测试（通过 comlink wrap）
├── package.json
└── tsconfig.json
```

---

## Task 1: 安装依赖和更新 package.json

**Files:**
- Modify: `packages/quickjs-runtime/package.json`

- [ ] **Step 1: 安装 quickjs-emscripten-core 和变体包**

```bash
cd /Users/logan/Desktop/workspaces/front/readerx
pnpm --filter @readerx/quickjs-runtime add quickjs-emscripten-core @jitl/quickjs-wasmfile-release-sync
pnpm --filter @readerx/quickjs-runtime add -D vitest
```

- [ ] **Step 2: 更新 package.json scripts**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome check src __tests__",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: 验证安装**

```bash
pnpm --filter @readerx/quickjs-runtime exec tsc --noEmit
```

Expected: PASS

---

## Task 2: 类型定义（types.ts）

**Files:**
- Create: `packages/quickjs-runtime/src/types.ts`
- Modify: `packages/quickjs-runtime/src/index.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
/** 沙箱配置选项 */
export type SandboxOptions = {
	/** 执行超时（毫秒），默认 5000 */
	timeout?: number;
	/** 内存限制（字节），默认 8MB */
	memoryLimit?: number;
};

/** 注入到沙箱的 JS 上下文变量 */
export type JsContext = {
	/** 前一步规则结果 */
	result?: unknown;
	/** 当前页面基础 URL */
	baseUrl?: string;
	/** 当前书源配置 */
	source?: Record<string, unknown>;
	/** 当前书籍信息 */
	book?: Record<string, unknown>;
	/** 当前章节信息 */
	chapter?: Record<string, unknown>;
	/** 搜索关键词（URL 分析器场景） */
	key?: string;
	/** 页码（URL 分析器场景） */
	page?: number;
	/** 原始页面内容 */
	src?: string;
};

/** 沙箱执行结果 */
export type SandboxResult = {
	readonly success: boolean;
	readonly value: unknown;
	readonly error?: string;
};

/** 沙箱内向 JS 暴露的宿主函数接口 */
export type HostFunctions = {
	ajax(url: string): Promise<string>;
	log(message: string): void;
	base64Encode(str: string): string;
	base64Decode(str: string): string;
	put(key: string, value: string): void;
	get(key: string): string;
};
```

- [ ] **Step 2: 更新 index.ts 导出类型**

```typescript
export { QuickJSSandbox } from "./sandbox";
export type {
	HostFunctions,
	JsContext,
	SandboxOptions,
	SandboxResult,
} from "./types";
```

- [ ] **Step 3: 验证类型检查**

```bash
pnpm --filter @readerx/quickjs-runtime exec tsc --noEmit
```

---

## Task 3: 宿主函数（host-functions.ts）

**Files:**
- Create: `packages/quickjs-runtime/src/host-functions.ts`
- Test: `packages/quickjs-runtime/__tests__/host-functions.test.ts`

这些函数在主线程定义，通过 comlink 传递给 Worker，再注入沙箱。

- [ ] **Step 1: 编写测试**

```typescript
import { describe, expect, it, vi } from "vitest";
import { createHostFunctions } from "../src/host-functions";

describe("createHostFunctions", () => {
	it("log calls onLog callback", () => {
		const onLog = vi.fn();
		const fns = createHostFunctions({ onLog, fetchFn: vi.fn() });
		fns.log("hello");
		expect(onLog).toHaveBeenCalledWith("hello");
	});

	it("base64Encode encodes string", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		expect(fns.base64Encode("hello")).toBe("aGVsbG8=");
	});

	it("base64Decode decodes string", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		expect(fns.base64Decode("aGVsbG8=")).toBe("hello");
	});

	it("put/get stores and retrieves values", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		fns.put("key1", "value1");
		expect(fns.get("key1")).toBe("value1");
	});

	it("get returns empty string for missing key", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		expect(fns.get("missing")).toBe("");
	});

	it("ajax calls fetchFn and returns text", async () => {
		const fetchFn = vi.fn().mockResolvedValue("response body");
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn });
		const result = await fns.ajax("https://example.com");
		expect(fetchFn).toHaveBeenCalledWith("https://example.com");
		expect(result).toBe("response body");
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @readerx/quickjs-runtime test
```

Expected: FAIL (module not found)

- [ ] **Step 3: 实现 host-functions.ts**

```typescript
import type { HostFunctions } from "./types";

export type HostFunctionOptions = {
	fetchFn: (url: string) => Promise<string>;
	onLog: (message: string) => void;
};

export function createHostFunctions(
	options: HostFunctionOptions,
): HostFunctions {
	const variables = new Map<string, string>();

	return {
		async ajax(url: string): Promise<string> {
			return options.fetchFn(url);
		},
		log(message: string): void {
			options.onLog(message);
		},
		base64Encode(str: string): string {
			return btoa(str);
		},
		base64Decode(str: string): string {
			return atob(str);
		},
		put(key: string, value: string): void {
			variables.set(key, value);
		},
		get(key: string): string {
			return variables.get(key) ?? "";
		},
	};
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter @readerx/quickjs-runtime test
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/quickjs-runtime/src/types.ts packages/quickjs-runtime/src/host-functions.ts packages/quickjs-runtime/__tests__/host-functions.test.ts packages/quickjs-runtime/src/index.ts
git commit -m "feat(quickjs-runtime): add types and host functions"
```

---

## Task 4: QuickJSSandbox 核心实现（sandbox.ts）

**Files:**
- Modify: `packages/quickjs-runtime/src/sandbox.ts`
- Test: `packages/quickjs-runtime/__tests__/sandbox.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, expect, it, vi } from "vitest";
import { QuickJSSandbox } from "../src/sandbox";

// QuickJS WASM 加载可能较慢，增加超时
describe("QuickJSSandbox", () => {
	it("evaluates simple expression", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("1 + 1");
		expect(result.success).toBe(true);
		expect(result.value).toBe(2);
		await sandbox.terminate();
	});

	it("returns string result", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("'hello' + ' ' + 'world'");
		expect(result.success).toBe(true);
		expect(result.value).toBe("hello world");
		await sandbox.terminate();
	});

	it("returns error on syntax error", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("invalid {{{");
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
		await sandbox.terminate();
	});

	it("returns error on runtime error", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("throw new Error('test error')");
		expect(result.success).toBe(false);
		expect(result.error).toContain("test error");
		await sandbox.terminate();
	});

	it("injects context variables", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("result", { result: "hello" });
		expect(result.success).toBe(true);
		expect(result.value).toBe("hello");
		await sandbox.terminate();
	});

	it("injects multiple context variables", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval(
			"baseUrl + '?page=' + page",
			{ baseUrl: "https://example.com", page: 2 },
		);
		expect(result.success).toBe(true);
		expect(result.value).toBe("https://example.com?page=2");
		await sandbox.terminate();
	});

	it("times out on infinite loop", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("while(true) {}", undefined, {
			timeout: 500,
		});
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
		await sandbox.terminate();
	});

	it("enforces memory limit", async () => {
		const sandbox = new QuickJSSandbox();
		// 尝试分配大量内存
		const result = await sandbox.eval(
			"const arr = []; for(let i = 0; i < 100000; i++) arr.push(new Array(1000)); arr.length",
			undefined,
			{ memoryLimit: 1024 * 1024 },
		);
		expect(result.success).toBe(false);
		await sandbox.terminate();
	});

	it("injects host functions and allows calling them", async () => {
		const sandbox = new QuickJSSandbox();
		const logFn = vi.fn();
		sandbox.setHostFunctions({
			ajax: async (url: string) => `response from ${url}`,
			log: logFn,
			base64Encode: (s: string) => btoa(s),
			base64Decode: (s: string) => atob(s),
			put: () => {},
			get: () => "",
		});
		const result = await sandbox.eval("log('test message'); 'done'");
		expect(result.success).toBe(true);
		expect(logFn).toHaveBeenCalledWith("test message");
		await sandbox.terminate();
	});

	it("reuses sandbox across multiple eval calls", async () => {
		const sandbox = new QuickJSSandbox();
		const r1 = await sandbox.eval("var x = 42; x");
		expect(r1.value).toBe(42);
		// 同一 sandbox 实例不共享状态（每次 eval 创建新 context）
		const r2 = await sandbox.eval("typeof x === 'undefined' ? 'fresh' : 'stale'");
		expect(r2.value).toBe("fresh");
		await sandbox.terminate();
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @readerx/quickjs-runtime test
```

Expected: FAIL

- [ ] **Step 3: 实现 sandbox.ts**

```typescript
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import RELEASE_SYNC from "@jitl/quickjs-wasmfile-release-sync";
import type {
	QuickJSContext,
	QuickJSHandle,
	QuickJSWASMModule,
} from "quickjs-emscripten-core";
import type { HostFunctions, JsContext, SandboxOptions, SandboxResult } from "./types";

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_MEMORY_LIMIT = 8 * 1024 * 1024;

let modulePromise: Promise<QuickJSWASMModule> | null = null;

async function getModule(): Promise<QuickJSWASMModule> {
	if (!modulePromise) {
		modulePromise = newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
	}
	return modulePromise;
}

export class QuickJSSandbox {
	private module: QuickJSWASMModule | null = null;
	private hostFunctions: HostFunctions | null = null;

	async eval(
		code: string,
		context: JsContext = {},
		options: SandboxOptions = {},
	): Promise<SandboxResult> {
		if (!this.module) {
			this.module = await getModule();
		}

		const timeout = options.timeout ?? DEFAULT_TIMEOUT;
		const memoryLimit = options.memoryLimit ?? DEFAULT_MEMORY_LIMIT;
		const deadline = Date.now() + timeout;

		const runtime = this.module.newRuntime();
		runtime.setMemoryLimit(memoryLimit);
		runtime.setMaxStackSize(1024 * 320);
		runtime.setInterruptHandler(() => Date.now() > deadline);

		const vm = runtime.newContext();
		const global = vm.global;

		try {
			// 注入上下文变量
			for (const [key, value] of Object.entries(context)) {
				if (value === undefined) continue;
				const handle = vm.unwrapResult(vm.evalCode(`(${JSON.stringify(value)})`));
				vm.setProp(global, key, handle);
				handle.dispose();
			}

			// 注入宿主函数
			if (this.hostFunctions) {
				await this.injectHostFunctions(vm, global);
			}

			const result = vm.evalCode(code);
			if (result.error) {
				const errorVal = result.error.consume(
					(vm) => vm.dump(vm) as string,
				);
				return { success: false, value: undefined, error: String(errorVal) };
			}

			const value = result.value.consume((vm) => vm.dump(vm));
			return { success: true, value };
		} catch (err) {
			return {
				success: false,
				value: undefined,
				error: err instanceof Error ? err.message : String(err),
			};
		} finally {
			vm.dispose();
			runtime.dispose();
		}
	}

	setHostFunctions(fns: HostFunctions): void {
		this.hostFunctions = fns;
	}

	async terminate(): Promise<void> {
		this.module = null;
		modulePromise = null;
	}

	private async injectHostFunctions(
		vm: QuickJSContext,
		global: QuickJSHandle,
	): Promise<void> {
		if (!this.hostFunctions) return;

		const fns = this.hostFunctions;

		// ajax (async — 沙箱内同步调用，宿主侧异步执行)
		const ajaxHandle = vm.newFunction("ajax", (urlHandle) => {
			const url = vm.dump(urlHandle) as string;
			const promise = fns.ajax(url);
			const deferred = vm.newPromise();
			promise.then(
				(val) => {
					const strHandle = vm.newString(val);
					deferred.resolve(strHandle);
					strHandle.dispose();
				},
				(err) => {
					const errHandle = vm.newString(
						err instanceof Error ? err.message : String(err),
					);
					deferred.reject(errHandle);
					errHandle.dispose();
				},
			);
			deferred.settled.then(() => deferred.dispose());
			vm.executePendingJobs();
			return deferred.handle;
		});
		vm.setProp(global, "ajax", ajaxHandle);
		ajaxHandle.dispose();

		// log
		const logHandle = vm.newFunction("log", (msgHandle) => {
			fns.log(vm.dump(msgHandle) as string);
		});
		vm.setProp(global, "log", logHandle);
		logHandle.dispose();

		// base64Encode
		const b64eHandle = vm.newFunction("base64Encode", (strHandle) => {
			return vm.newString(fns.base64Encode(vm.dump(strHandle) as string));
		});
		vm.setProp(global, "base64Encode", b64eHandle);
		b64eHandle.dispose();

		// base64Decode
		const b64dHandle = vm.newFunction("base64Decode", (strHandle) => {
			return vm.newString(fns.base64Decode(vm.dump(strHandle) as string));
		});
		vm.setProp(global, "base64Decode", b64dHandle);
		b64dHandle.dispose();

		// put
		const putHandle = vm.newFunction("put", (keyHandle, valHandle) => {
			fns.put(vm.dump(keyHandle) as string, vm.dump(valHandle) as string);
		});
		vm.setProp(global, "put", putHandle);
		putHandle.dispose();

		// get
		const getHandle = vm.newFunction("get", (keyHandle) => {
			return vm.newString(fns.get(vm.dump(keyHandle) as string));
		});
		vm.setProp(global, "get", getHandle);
		getHandle.dispose();
	}
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter @readerx/quickjs-runtime test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/quickjs-runtime/src/sandbox.ts packages/quickjs-runtime/__tests__/sandbox.test.ts
git commit -m "feat(quickjs-runtime): implement QuickJSSandbox with context injection and resource limits"
```

---

## Task 5: Web Worker 入口（worker.ts）

**Files:**
- Modify: `packages/quickjs-runtime/src/worker.ts`
- Test: `packages/quickjs-runtime/__tests__/worker.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, expect, it, vi } from "vitest";
import * as Comlink from "comlink";
import { createWorkerApi } from "../src/worker";

// 不启动真实 Worker，直接测试 API 对象
describe("createWorkerApi", () => {
	it("evaluates code and returns result", async () => {
		const api = createWorkerApi();
		const result = await api.eval("1 + 2");
		expect(result.success).toBe(true);
		expect(result.value).toBe(3);
		await api.terminate();
	});

	it("evaluates with context", async () => {
		const api = createWorkerApi();
		const result = await api.eval("result + 10", { result: 5 });
		expect(result.success).toBe(true);
		expect(result.value).toBe(15);
		await api.terminate();
	});

	it("evaluates with custom options", async () => {
		const api = createWorkerApi();
		const result = await api.eval("while(true){}", undefined, {
			timeout: 200,
		});
		expect(result.success).toBe(false);
		await api.terminate();
	});

	it("sets and uses host functions", async () => {
		const api = createWorkerApi();
		const logs: string[] = [];
		// 模拟 comlink 回调 — 在 Worker 中 host functions 通过 comlink 传递
		api.setHostFunctions({
			ajax: async (url: string) => `mock: ${url}`,
			log: (msg: string) => { logs.push(msg); },
			base64Encode: (s: string) => btoa(s),
			base64Decode: (s: string) => atob(s),
			put: () => {},
			get: () => "",
		});
		const result = await api.eval("log('worker test'); 'ok'");
		expect(result.success).toBe(true);
		expect(logs).toContain("worker test");
		await api.terminate();
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @readerx/quickjs-runtime test
```

- [ ] **Step 3: 实现 worker.ts**

```typescript
import * as Comlink from "comlink";
import type { HostFunctions, JsContext, SandboxOptions, SandboxResult } from "./types";
import { QuickJSSandbox } from "./sandbox";

const sandbox = new QuickJSSandbox();

const workerApi = {
	async eval(
		code: string,
		context?: JsContext,
		options?: SandboxOptions,
	): Promise<SandboxResult> {
		return sandbox.eval(code, context, options);
	},

	setHostFunctions(fns: HostFunctions): void {
		sandbox.setHostFunctions(fns);
	},

	async terminate(): Promise<void> {
		await sandbox.terminate();
	},
};

export type WorkerApi = typeof workerApi;

/** 创建 Worker API 对象（用于测试和 Worker 入口） */
export function createWorkerApi(): WorkerApi {
	const instance = new QuickJSSandbox();
	return {
		async eval(
			code: string,
			context?: JsContext,
			options?: SandboxOptions,
		): Promise<SandboxResult> {
			return instance.eval(code, context, options);
		},
		setHostFunctions(fns: HostFunctions): void {
			instance.setHostFunctions(fns);
		},
		async terminate(): Promise<void> {
			await instance.terminate();
		},
	};
}

Comlink.expose(workerApi);
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm --filter @readerx/quickjs-runtime test
```

- [ ] **Step 5: Commit**

```bash
git add packages/quickjs-runtime/src/worker.ts packages/quickjs-runtime/__tests__/worker.test.ts
git commit -m "feat(quickjs-runtime): add Worker entry with comlink expose"
```

---

## Task 6: 更新 index.ts 导出和 package.json 配置

**Files:**
- Modify: `packages/quickjs-runtime/src/index.ts`
- Modify: `packages/quickjs-runtime/package.json`

- [ ] **Step 1: 更新 index.ts**

```typescript
export { QuickJSSandbox } from "./sandbox";
export { createHostFunctions } from "./host-functions";
export type { HostFunctionOptions } from "./host-functions";
export { createWorkerApi } from "./worker";
export type { WorkerApi } from "./worker";
export type {
	HostFunctions,
	JsContext,
	SandboxOptions,
	SandboxResult,
} from "./types";
```

- [ ] **Step 2: 更新 package.json exports（如果 Worker 入口需要单独导出）**

确保 package.json exports 包含 Worker 入口：

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./worker": "./src/worker.ts"
  }
}
```

- [ ] **Step 3: 运行全量检查**

```bash
pnpm --filter @readerx/quickjs-runtime exec tsc --noEmit
pnpm --filter @readerx/quickjs-runtime exec biome check --write --unsafe src __tests__
pnpm --filter @readerx/quickjs-runtime test
```

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/quickjs-runtime/src/index.ts packages/quickjs-runtime/package.json
git commit -m "feat(quickjs-runtime): finalize exports and package config"
```

---

## Task 7: 更新文档

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: 更新 roadmap.md 模块状态表**

将 quickjs-runtime 行从 `🔴 仅类型` 改为 `✅ Step 4 完成`。

- [ ] **Step 2: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs: update roadmap for Step 4 completion"
```

---

## Task 8: Lint 和最终验证

- [ ] **Step 1: 运行全项目类型检查**

```bash
turbo typecheck
```

- [ ] **Step 2: 运行全项目 lint**

```bash
turbo lint
```

- [ ] **Step 3: 运行全项目测试**

```bash
turbo test
```

Expected: ALL PASS

- [ ] **Step 4: 最终 commit**

```bash
git add -A
git commit -m "test(quickjs-runtime): add comprehensive tests for sandbox and host functions"
```
