# Step 1.5: Rule Engine JS 规则支持 — 实现计划

> **Goal:** 让 rule-engine 的 AnalyzeRule 和 AnalyzeUrl 支持执行 JS 规则，通过依赖倒置接入 quickjs-runtime
>
> **Architecture:** rule-engine 定义 `JsExecutor` 接口（零运行时依赖），quickjs-runtime 提供实现。AnalyzeRule 的公共方法变为 async。新增宿主函数支持规则回调。
>
> **Tech Stack:** TypeScript 6 · QuickJS WASM · quickjs-emscripten-core · vitest

---

## Task 1: rule-engine — 定义 JsExecutor 接口和类型扩展

**Files:**
- Modify: `packages/rule-engine/src/types.ts`
- Modify: `packages/rule-engine/src/index.ts`

- [ ] **Step 1: 在 types.ts 末尾添加 JsExecutor 相关类型**

```typescript
/** JS 规则执行器接口 — 依赖倒置，由消费方注入实现 */
export interface JsExecutor {
	/** 在沙箱中执行 JS 代码，返回结果 */
	eval(code: string, context: JsEvalContext): Promise<JsEvalResult>;
}

/** JS 规则执行上下文 — 传入沙箱的变量 */
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

/** JS 规则执行结果 */
export interface JsEvalResult {
	success: boolean;
	value: unknown;
	error?: string;
}
```

- [ ] **Step 2: 在 index.ts 中导出新类型**

在 `export type` 块中添加 `JsExecutor`, `JsEvalContext`, `JsEvalResult`。

- [ ] **Step 3: 运行 typecheck 确认无报错**

Run: `pnpm --filter @readerx/rule-engine typecheck`
Expected: PASS

---

## Task 2: rule-engine — AnalyzeRule 异步化 + 连通 JsExecutor

**Files:**
- Modify: `packages/rule-engine/src/analyzer.ts`

这是核心变更。AnalyzeRule 需要三个改动：
1. 接受可选的 `JsExecutor` 注入
2. `getString`/`getStringList`/`getElements` 变为 async
3. `evaluateSegment` 中 JS 模式调用 executor

- [ ] **Step 1: 改造 AnalyzeRule 类**

关键变更点：

```typescript
import type { JsExecutor, JsEvalContext, ParseResult } from "./types";

export class AnalyzeRule {
	private content = "";
	private contentType: ContentType = "text";
	private jsExecutor: JsExecutor | null = null;
	private evalContext: Partial<JsEvalContext> = {};

	/** 注入 JS 执行器（依赖倒置） */
	setJsExecutor(executor: JsExecutor): void {
		this.jsExecutor = executor;
	}

	/** 设置 JS 执行上下文变量 */
	setEvalContext(ctx: Partial<JsEvalContext>): void {
		this.evalContext = ctx;
	}

	/** 解析规则，返回单个字符串结果（多值用 \n 连接） */
	async getString(rule: string): Promise<ParseResult> {
		return this.evaluate(rule, "string");
	}

	/** 解析规则，返回字符串列表 */
	async getStringList(rule: string): Promise<ParseResult> {
		return this.evaluate(rule, "list");
	}

	/** 解析规则，返回元素引用 */
	async getElements(rule: string): Promise<ParseResult> {
		return this.evaluate(rule, "elements");
	}

	/** 同步版本 — 仅支持非 JS 规则，含 JS 时抛错 */
	getStringSync(rule: string): ParseResult {
		if (this.containsJsRule(rule)) {
			return { ok: false, error: "Rule contains JS — use async getString() instead" };
		}
		return this.evaluateSync(rule, "string");
	}

	// evaluate 变为 async
	private async evaluate(
		rule: string,
		mode: "string" | "list" | "elements",
	): Promise<ParseResult> { ... }

	// evaluateSegment 中 JS 分支改为：
	private async evaluateSegment(
		segment: { rule: string; operator: CombineOperator | undefined },
		mode: "string" | "list" | "elements",
	): Promise<ParseResult> {
		// ... 现有逻辑 ...
		if (ruleMode === "js") {
			return this.evaluateJs(actualRule);
		}
		// ... 其余不变 ...
	}

	/** 执行 JS 规则 */
	private async evaluateJs(code: string): Promise<ParseResult> {
		if (!this.jsExecutor) {
			return { ok: false, error: "No JsExecutor configured — call setJsExecutor() first" };
		}
		const ctx: JsEvalContext = {
			result: undefined,
			baseUrl: undefined,
			src: this.content,
			...this.evalContext,
		};
		const result = await this.jsExecutor.eval(code, ctx);
		if (!result.success) {
			return { ok: false, error: result.error ?? "JS execution failed" };
		}
		// SandboxResult.value (unknown) → ParseResult
		return jsValueToParseResult(result.value);
	}
}
```

- [ ] **Step 2: 添加 SandboxResult → ParseResult 转换函数**

```typescript
/** 将 JS 返回值转换为 ParseResult */
function jsValueToParseResult(value: unknown): ParseResult {
	if (value === null || value === undefined) {
		return { ok: true, value: "", values: [] };
	}
	if (Array.isArray(value)) {
		const strings = value.map((v) => String(v));
		return { ok: true, value: strings.join("\n"), values: strings };
	}
	if (typeof value === "string") {
		return { ok: true, value, values: [value] };
	}
	const str = String(value);
	return { ok: true, value: str, values: [str] };
}
```

- [ ] **Step 3: 添加 containsJsRule 检测方法和 evaluateSync 同步路径**

```typescript
/** 检测规则是否包含 JS 段 */
private containsJsRule(rule: string): boolean {
	const segments = splitRuleByOperators(rule);
	return segments.some((s) => {
		const { rule: cleanRule } = parseReplaceChain(s.rule);
		return detectMode(cleanRule) === "js";
	});
}

/** 同步评估（不含 JS） */
private evaluateSync(
	rule: string,
	mode: "string" | "list" | "elements",
): ParseResult {
	// 与 evaluate 逻辑相同但同步，且不处理 JS
	// 将现有 evaluate 的同步逻辑提取到此
}
```

- [ ] **Step 4: 运行现有测试确认不破坏**

Run: `pnpm --filter @readerx/rule-engine exec vitest run`
Expected: 全部通过（现有测试用 getStringSync 或不含 JS 的规则）

注意：现有测试可能调用 `getString()` 同步，需要改为 `await getString()`。如果测试中没有 JS 规则，可以用新的 `getStringSync()` 或 await 版本。

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/
git commit -m "feat(rule-engine): add JsExecutor interface and async AnalyzeRule"
```

---

## Task 3: rule-engine — AnalyzeUrl 添加 JS 支持

**Files:**
- Modify: `packages/rule-engine/src/url-analyzer.ts`

- [ ] **Step 1: 给 analyzeUrl 函数添加可选的 jsExecutor 参数**

```typescript
export interface AnalyzeUrlOptions extends AnalyzeUrlContext {
	jsExecutor?: JsExecutor;
}

/**
 * 纯函数：完整 URL 规则解析管线（异步版本，支持 JS）。
 */
export async function analyzeUrlAsync(
	rule: string,
	options: AnalyzeUrlOptions = {},
): Promise<AnalyzeUrlResult> {
	const { jsExecutor, ...context } = options;
	const { urlPart, optionJson } = splitUrlOptions(rule);
	let url = replaceVariables(urlPart, context.variables ?? {});

	// 新增：解析 URL 中的 @js: 和 <js> 段
	if (jsExecutor && containsJs(url)) {
		const jsResult = await resolveJsInUrl(url, jsExecutor, context);
		if (jsResult !== null) url = jsResult;
	}

	url = resolvePage(url, context.page);
	url = resolveRelativeUrl(url, context.baseUrl);
	return buildResult(url, optionJson, context);
}
```

- [ ] **Step 2: 实现 containsJs 和 resolveJsInUrl**

```typescript
const JS_PATTERN = /<js>([\w\W]*?)<\/js>|@js:([\w\W]*)/i;

function containsJs(url: string): boolean {
	return JS_PATTERN.test(url);
}

async function resolveJsInUrl(
	url: string,
	executor: JsExecutor,
	context: AnalyzeUrlContext,
): Promise<string | null> {
	const match = url.match(JS_PATTERN);
	if (!match) return null;
	const jsCode = match[2] ?? match[1] ?? "";
	if (!jsCode.trim()) return url.replace(JS_PATTERN, "");

	const ctx: JsEvalContext = {
		...context,
		src: url.replace(JS_PATTERN, ""),
	};
	const result = await executor.eval(jsCode.trim(), ctx);
	if (!result.success || result.value == null) return null;
	return String(result.value);
}
```

- [ ] **Step 3: AnalyzeUrl 类添加 async analyzeAsync 方法**

```typescript
export class AnalyzeUrl {
	analyze(rule: string, ...): AnalyzeUrlResult { /* 保持不变 */ }

	async analyzeAsync(
		rule: string,
		options: AnalyzeUrlOptions = {},
	): Promise<AnalyzeUrlResult> {
		return analyzeUrlAsync(rule, options);
	}
}
```

- [ ] **Step 4: 处理 option.webJs（URL 选项中的 JS）**

在 `buildResult` 之后、返回之前，如果 `result.webJs` 有值且提供了 jsExecutor，执行 webJs：

```typescript
// analyzeUrlAsync 末尾
if (jsExecutor && result.webJs) {
	const jsResult = await jsExecutor.eval(result.webJs, {
		...context,
		result: result.url,
	});
	if (jsResult.success && jsResult.value != null) {
		result.url = String(jsResult.value);
	}
}
```

- [ ] **Step 5: 运行 typecheck**

Run: `pnpm --filter @readerx/rule-engine typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/rule-engine/src/
git commit -m "feat(rule-engine): add JS support to AnalyzeUrl"
```

---

## Task 4: quickjs-runtime — 扩展宿主函数

**Files:**
- Modify: `packages/quickjs-runtime/src/types.ts`
- Modify: `packages/quickjs-runtime/src/host-functions.ts`
- Modify: `packages/quickjs-runtime/src/sandbox.ts`

- [ ] **Step 1: 扩展 HostFunctions 类型**

```typescript
export type HostFunctions = {
	ajax(url: string): Promise<string>;
	log(message: string): void;
	base64Encode(str: string): string;
	base64Decode(str: string): string;
	put(key: string, value: string): void;
	get(key: string): string;
	/** 新增：从 JS 中调用规则引擎 */
	evalRule(rule: string): Promise<string>;
	/** 新增：从 JS 中调用规则引擎，返回列表 */
	evalRuleList(rule: string): Promise<string[]>;
	/** 新增：带选项的 HTTP 请求 */
	ajaxWithOption(url: string, optionJson: string): Promise<string>;
};
```

- [ ] **Step 2: 更新 createHostFunctions 工厂**

```typescript
export type HostFunctionOptions = {
	fetchFn: (url: string) => Promise<string>;
	fetchWithOptions: (url: string, options: Record<string, unknown>) => Promise<string>;
	onLog: (message: string) => void;
	evalRule: (rule: string) => Promise<string>;
	evalRuleList: (rule: string) => Promise<string[]>;
};
```

`createHostFunctions` 中实现新增函数，委托给 options 中的回调。

- [ ] **Step 3: 在 sandbox.ts 的 injectHostFunctions 中注入新函数**

为 `evalRule`、`evalRuleList`、`ajaxWithOption` 添加 `vm.newFunction()` 注入。`evalRule` 和 `evalRuleList` 返回 Promise（与 ajax 类似的 deferred 模式）。

- [ ] **Step 4: 更新现有测试**

现有测试中的 `HostFunctions` mock 对象需要添加新字段。新字段在不需要时可以返回空值：

```typescript
// 测试中
const hostFns = createHostFunctions({
	fetchFn: async () => "",
	fetchWithOptions: async () => "",
	onLog: () => {},
	evalRule: async () => "",
	evalRuleList: async () => [],
});
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @readerx/quickjs-runtime exec vitest run`
Expected: 全部通过

- [ ] **Step 6: Commit**

```bash
git add packages/quickjs-runtime/src/
git commit -m "feat(quickjs-runtime): extend host functions with evalRule and ajaxWithOption"
```

---

## Task 5: 集成层 — QuickJS 实现 JsExecutor 接口

**Files:**
- Create: `packages/quickjs-runtime/src/js-executor.ts`
- Modify: `packages/quickjs-runtime/src/index.ts`

- [ ] **Step 1: 创建 QuickJS 版 JsExecutor 实现**

```typescript
import type { JsEvalContext, JsEvalResult, JsExecutor } from "@readerx/rule-engine";
import { QuickJSSandbox } from "./sandbox";
import { createHostFunctions, type HostFunctionOptions } from "./host-functions";

export interface QuickJsExecutorOptions extends HostFunctionOptions {
	timeout?: number;
	memoryLimit?: number;
}

export class QuickJsExecutor implements JsExecutor {
	private sandbox = new QuickJSSandbox();
	private options: QuickJsExecutorOptions;

	constructor(options: QuickJsExecutorOptions) {
		this.options = options;
		this.sandbox.setHostFunctions(createHostFunctions(options));
	}

	async eval(code: string, context: JsEvalContext): Promise<JsEvalResult> {
		const result = await this.sandbox.eval(code, context, {
			timeout: this.options.timeout,
			memoryLimit: this.options.memoryLimit,
		});
		return {
			success: result.success,
			value: result.value,
			error: result.error,
		};
	}

	async terminate(): Promise<void> {
		await this.sandbox.terminate();
	}
}
```

- [ ] **Step 2: 从 index.ts 导出**

```typescript
export { QuickJsExecutor } from "./js-executor";
export type { QuickJsExecutorOptions } from "./js-executor";
```

- [ ] **Step 3: 确保 rule-engine 是 quickjs-runtime 的 peer dependency**

检查 `packages/quickjs-runtime/package.json`，确认：
```json
"peerDependencies": {
	"@readerx/rule-engine": "workspace:*"
}
```

- [ ] **Step 4: typecheck**

Run: `pnpm --filter @readerx/quickjs-runtime typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/quickjs-runtime/src/
git commit -m "feat(quickjs-runtime): implement JsExecutor interface"
```

---

## Task 6: 测试 — 规则引擎 JS 规则端到端

**Files:**
- Create: `packages/rule-engine/__tests__/js-rules.test.ts`
- Create: `packages/quickjs-runtime/__tests__/js-executor.test.ts`

- [ ] **Step 1: 创建 AnalyzeRule JS 规则测试**

```typescript
// packages/rule-engine/__tests__/js-rules.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AnalyzeRule } from "../src/analyzer";
import type { JsExecutor } from "../src/types";

// Mock JsExecutor
function createMockExecutor(impl?: (code: string) => unknown): JsExecutor {
	return {
		async eval(code: string, context) {
			try {
				const value = impl ? impl(code) : undefined;
				return { success: true, value };
			} catch (e) {
				return { success: false, value: undefined, error: String(e) };
			}
		},
	};
}

describe("AnalyzeRule JS rules", () => {
	it("returns error when JS rule has no executor", async () => {
		const analyzer = new AnalyzeRule();
		analyzer.setContent("<div>hello</div>");
		const result = await analyzer.getString("@js:result.toUpperCase()");
		expect(result.ok).toBe(false);
		expect(result.error).toContain("No JsExecutor");
	});

	it("executes JS rule with executor", async () => {
		const executor = createMockExecutor((code) => {
			// 简单模拟：返回固定值
			if (code.includes("toUpperCase")) return "HELLO";
			return null;
		});
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div>hello</div>");
		const result = await analyzer.getString("@js:result.toUpperCase()");
		expect(result.ok).toBe(true);
	});

	it("chains CSS then JS", async () => {
		const executor = createMockExecutor(() => "JS_RESULT");
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div>text</div>");
		// CSS 规则先执行，结果传给 JS
		const result = await analyzer.getString("div<js>result</js>");
		// CSS "div" 提取到 "text"，然后 JS 收到 result="text"
		// mock executor 不使用 context，返回 "JS_RESULT"
		expect(result.ok).toBe(true);
	});

	it("getStringSync returns error for JS rules", () => {
		const analyzer = new AnalyzeRule();
		analyzer.setContent("<div>hello</div>");
		const result = analyzer.getStringSync("@js:test");
		expect(result.ok).toBe(false);
	});

	it("getStringSync works for non-JS rules", () => {
		const analyzer = new AnalyzeRule();
		analyzer.setContent("<div>hello</div>");
		const result = analyzer.getStringSync("div");
		expect(result.ok).toBe(true);
		expect(result.value).toBe("hello");
	});

	it("passes context variables to executor", async () => {
		let receivedCtx: any = null;
		const executor: JsExecutor = {
			async eval(code, context) {
				receivedCtx = context;
				return { success: true, value: "ok" };
			},
		};
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setEvalContext({ baseUrl: "https://example.com" });
		analyzer.setContent("<div>text</div>");
		await analyzer.getString("@js:test");
		expect(receivedCtx.baseUrl).toBe("https://example.com");
	});
});
```

- [ ] **Step 2: 创建 JsExecutor 集成测试**

```typescript
// packages/quickjs-runtime/__tests__/js-executor.test.ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { QuickJsExecutor } from "../src/js-executor";

describe("QuickJsExecutor", () => {
	beforeAll(() => {
		vi.setConfig({ testTimeout: 30000 });
	});

	it("implements JsExecutor interface", async () => {
		const executor = new QuickJsExecutor({
			fetchFn: async () => "",
			fetchWithOptions: async () => "",
			onLog: () => {},
			evalRule: async () => "",
			evalRuleList: async () => [],
		});
		const result = await executor.eval("1 + 1", {});
		expect(result.success).toBe(true);
		expect(result.value).toBe(2);
		await executor.terminate();
	});

	it("passes context as globals", async () => {
		const executor = new QuickJsExecutor({
			fetchFn: async () => "",
			fetchWithOptions: async () => "",
			onLog: () => {},
			evalRule: async () => "",
			evalRuleList: async () => [],
		});
		const result = await executor.eval("baseUrl + '/api'", {
			baseUrl: "https://example.com",
		});
		expect(result.success).toBe(true);
		expect(result.value).toBe("https://example.com/api");
		await executor.terminate();
	});

	it("returns error on JS exception", async () => {
		const executor = new QuickJsExecutor({
			fetchFn: async () => "",
			fetchWithOptions: async () => "",
			onLog: () => {},
			evalRule: async () => "",
			evalRuleList: async () => [],
		});
		const result = await executor.eval("throw new Error('boom')", {});
		expect(result.success).toBe(false);
		expect(result.error).toContain("boom");
		await executor.terminate();
	});
});
```

- [ ] **Step 3: 运行全部测试**

Run: `pnpm --filter @readerx/rule-engine exec vitest run && pnpm --filter @readerx/quickjs-runtime exec vitest run`
Expected: 全部通过

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/__tests__/ packages/quickjs-runtime/__tests__/
git commit -m "test: add JS rules tests for AnalyzeRule and QuickJsExecutor"
```

---

## Task 7: 更新现有测试适配 async API

**Files:**
- Modify: `packages/rule-engine/__tests__/analyzer.test.ts`（如存在）

- [ ] **Step 1: 将所有 AnalyzeRule 测试中的 getString 改为 await**

现有测试不包含 JS 规则，所以两种方案：
1. 全部改为 `await analyzer.getString()` — 最安全
2. 用 `getStringSync()` — 不改变异步模式

推荐方案 1：改为 await，因为 `getString()` 现在是 async 函数，调用不 await 在 vitest 中可能通过但不验证结果。

- [ ] **Step 2: 运行测试确认全部通过**

Run: `pnpm --filter @readerx/rule-engine exec vitest run`
Expected: 全部通过（230+ 测试）

- [ ] **Step 3: Commit**

```bash
git add packages/rule-engine/__tests__/
git commit -m "test(rule-engine): migrate tests to async API"
```

---

## Task 8: 文档更新与最终验证

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `CLAUDE.md`（如需要）

- [ ] **Step 1: 运行全量 typecheck + 测试**

Run: `turbo typecheck && turbo lint`
Expected: PASS

- [ ] **Step 2: 更新 roadmap.md 模块状态表**

将 Step 1.5 状态从"待规划"更新为对应状态。

- [ ] **Step 3: 提交分析文档和计划**

```bash
git add docs/
git commit -m "docs: add Step 1.5 JS rules analysis and implementation plan"
```
