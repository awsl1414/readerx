# Rule Engine Step 2: URL 分析器 + Schema 实现规划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善 rule-engine 的 URL 分析器（纯函数管线解析 URL 规则为请求配置）和 Zod Schema（完整 BookSource 校验体系）。

**Architecture:** URL 分析器拆为 5 个纯函数步骤（split → replace → page → resolve → build）组成管线，输出 `AnalyzeUrlResult`。Zod Schema 为每个嵌套规则类型定义 schema，导出 `validateBookSource` / `parseBookSource` / `parseUrlOption`。

**Tech Stack:** TypeScript (strict mode), Zod 4, Vitest

**Spec:** `docs/superpowers/specs/2026-05-26-rule-engine-step2-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/rule-engine/package.json` | Modify | 添加 zod 依赖 |
| `packages/rule-engine/src/types.ts` | Modify | 新增 UrlOption、AnalyzeUrlContext，更新 AnalyzeUrlResult |
| `packages/rule-engine/src/url-analyzer.ts` | Rewrite | 纯函数管线 + AnalyzeUrl 类 |
| `packages/rule-engine/src/schemas.ts` | Rewrite | 完整 Zod schema 体系 |
| `packages/rule-engine/src/index.ts` | Modify | 导出新接口和类型 |
| `packages/rule-engine/__tests__/url-analyzer.test.ts` | Rewrite | URL 分析器完整测试 |
| `packages/rule-engine/__tests__/schemas.test.ts` | Create | Schema 校验测试 |
| `docs/rule-engine-changes.md` | Modify | 记录 Step 2 改进和舍弃项 |
| `docs/roadmap.md` | Modify | 更新 Step 2 状态 |

---

## Task 1: 添加 zod 依赖

**Files:**
- Modify: `packages/rule-engine/package.json`

- [ ] **Step 1: 安装 zod**

Run:
```bash
cd /Users/logan/Desktop/workspaces/front/readerx && pnpm --filter @readerx/rule-engine add zod
```

Expected: zod ^4.x 添加到 dependencies

- [ ] **Step 2: 验证安装成功**

Run:
```bash
pnpm --filter @readerx/rule-engine typecheck
```

Expected: 仍然 PASS（无代码变更）

- [ ] **Step 3: Commit**

```bash
git add packages/rule-engine/package.json pnpm-lock.yaml
git commit -m "chore(rule-engine): add zod dependency for schema validation"
```

---

## Task 2: 更新类型定义

**Files:**
- Modify: `packages/rule-engine/src/types.ts`

- [ ] **Step 1: 在 types.ts 末尾添加新类型，更新 AnalyzeUrlResult 导出位置**

在 `types.ts` 文件末尾添加：

```typescript
/** URL 选项 JSON 结构 — 书源 URL 规则中逗号后的 JSON 配置 */
export interface UrlOption {
	method?: string;
	charset?: string;
	headers?: Record<string, string>;
	body?: string;
	retry?: number;
	webJs?: string;
	type?: string;
	webView?: boolean;
}

/** URL 分析器输入上下文 */
export interface AnalyzeUrlContext {
	variables?: Record<string, string>;
	page?: number;
	baseUrl?: string;
	headers?: Record<string, string>;
}
```

- [ ] **Step 2: 验证类型检查通过**

Run:
```bash
pnpm --filter @readerx/rule-engine typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/rule-engine/src/types.ts
git commit -m "feat(rule-engine): add UrlOption and AnalyzeUrlContext types"
```

---

## Task 3: URL 分析器 — splitUrlOptions

**Files:**
- Modify: `packages/rule-engine/__tests__/url-analyzer.test.ts`
- Modify: `packages/rule-engine/src/url-analyzer.ts`

- [ ] **Step 1: 写 splitUrlOptions 的失败测试**

在 `__tests__/url-analyzer.test.ts` 中添加测试组：

```typescript
import { describe, expect, it } from "vitest";
import { splitUrlOptions } from "../src/url-analyzer";

describe("splitUrlOptions", () => {
	it("returns null optionJson for plain URL", () => {
		const result = splitUrlOptions("https://example.com/api");
		expect(result).toEqual({ urlPart: "https://example.com/api", optionJson: null });
	});

	it("separates URL and JSON option", () => {
		const result = splitUrlOptions(
			'https://example.com/search,{"method":"POST","body":"k=v"}',
		);
		expect(result.urlPart).toBe("https://example.com/search");
		expect(result.optionJson).toBe('{"method":"POST","body":"k=v"}');
	});

	it("handles space between comma and JSON", () => {
		const result = splitUrlOptions(
			'  https://example.com/api , {"method":"POST"}  ',
		);
		expect(result.urlPart).toBe("  https://example.com/api ");
		expect(result.optionJson).toBe('{"method":"POST"}');
	});

	it("does not split on JSON inside URL query params", () => {
		const result = splitUrlOptions('https://example.com/search?q={"a":1}');
		expect(result.urlPart).toBe('https://example.com/search?q={"a":1}');
		expect(result.optionJson).toBeNull();
	});

	it("handles empty string", () => {
		const result = splitUrlOptions("");
		expect(result).toEqual({ urlPart: "", optionJson: null });
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: FAIL — `splitUrlOptions` is not exported

- [ ] **Step 3: 实现 splitUrlOptions**

重写 `src/url-analyzer.ts`，先只写这个函数和已有的旧接口（保持兼容）：

```typescript
/**
 * AnalyzeUrl — URL 规则解析（纯函数管线）
 */

/** URL 选项 JSON 与 URL 的分隔正则 */
const URL_OPTION_RE = /,\s*(?=\{)/;

/**
 * Step 1: 分离 URL 和 JSON 选项
 * 格式：url, {"method":"POST","body":"..."}
 * 注意：只匹配 `,{`（逗号后紧跟花括号），不匹配 URL 查询参数中的 JSON
 */
export function splitUrlOptions(
	ruleUrl: string,
): { urlPart: string; optionJson: string | null } {
	const match = ruleUrl.match(URL_OPTION_RE);
	if (!match?.index) {
		return { urlPart: ruleUrl, optionJson: null };
	}
	return {
		urlPart: ruleUrl.substring(0, match.index),
		optionJson: ruleUrl.substring(match.index + 1).trim(),
	};
}

// --- 旧接口兼容（后续 Task 7 重写） ---
export interface AnalyzeUrlResult {
	url: string;
	method?: string;
	charset?: string;
	headers?: Record<string, string>;
	body?: string;
	webJs?: string;
	retry?: number;
}

export class AnalyzeUrl {
	analyze(
		rule: string,
		variables: Record<string, string> = {},
	): AnalyzeUrlResult {
		let url = rule;
		for (const [key, value] of Object.entries(variables)) {
			url = url.replaceAll(`{{${key}}}`, value);
		}
		return { url };
	}
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/url-analyzer.ts packages/rule-engine/__tests__/url-analyzer.test.ts
git commit -m "feat(rule-engine): implement splitUrlOptions for URL/option separation"
```

---

## Task 4: URL 分析器 — replaceVariables

**Files:**
- Modify: `packages/rule-engine/__tests__/url-analyzer.test.ts`
- Modify: `packages/rule-engine/src/url-analyzer.ts`

- [ ] **Step 1: 写 replaceVariables 测试**

在 `url-analyzer.test.ts` 中添加测试组：

```typescript
import { replaceVariables } from "../src/url-analyzer";

describe("replaceVariables", () => {
	it("replaces single variable", () => {
		expect(replaceVariables("https://example.com?q={{key}}", { key: "三体" }))
			.toBe("https://example.com?q=三体");
	});

	it("replaces multiple different variables", () => {
		expect(
			replaceVariables("https://example.com/{{cat}}/{{id}}", {
				cat: "book",
				id: "123",
			}),
		).toBe("https://example.com/book/123");
	});

	it("replaces repeated variables", () => {
		expect(
			replaceVariables("{{base}}/search?from={{base}}", {
				base: "https://example.com",
			}),
		).toBe("https://example.com/search?from=https://example.com");
	});

	it("leaves unreferenced variables as-is", () => {
		expect(replaceVariables("https://example.com/{{page}}", {}))
			.toBe("https://example.com/{{page}}");
	});

	it("handles empty variables map", () => {
		expect(replaceVariables("https://example.com", {}))
			.toBe("https://example.com");
	});

	it("ignores extra variables not in URL", () => {
		expect(replaceVariables("https://example.com/page", { unused: "val" }))
			.toBe("https://example.com/page");
	});

	it("handles special characters in variable values", () => {
		expect(replaceVariables("https://example.com?q={{query}}", { query: "a&b=c" }))
			.toBe("https://example.com?q=a&b=c");
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: FAIL — `replaceVariables` is not exported

- [ ] **Step 3: 实现 replaceVariables**

在 `src/url-analyzer.ts` 中，在 `splitUrlOptions` 之后添加：

```typescript
/**
 * Step 2: 替换 {{key}} 占位符
 */
export function replaceVariables(
	url: string,
	variables: Record<string, string>,
): string {
	let result = url;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replaceAll(`{{${key}}}`, value);
	}
	return result;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/url-analyzer.ts packages/rule-engine/__tests__/url-analyzer.test.ts
git commit -m "feat(rule-engine): implement replaceVariables for {{key}} placeholders"
```

---

## Task 5: URL 分析器 — resolvePage

**Files:**
- Modify: `packages/rule-engine/__tests__/url-analyzer.test.ts`
- Modify: `packages/rule-engine/src/url-analyzer.ts`

- [ ] **Step 1: 写 resolvePage 测试**

在 `url-analyzer.test.ts` 中添加测试组：

```typescript
import { resolvePage } from "../src/url-analyzer";

describe("resolvePage", () => {
	it("replaces <page> with page number", () => {
		expect(resolvePage("https://example.com/page<page>", 3))
			.toBe("https://example.com/page3");
	});

	it("replaces <1,2,3> list with indexed value", () => {
		expect(resolvePage("https://example.com/<1,2,3>", 2))
			.toBe("https://example.com/2");
	});

	it("uses last value when page exceeds list length", () => {
		expect(resolvePage("https://example.com/<a,b,c>", 5))
			.toBe("https://example.com/c");
	});

	it("uses first item for page 1 in list mode", () => {
		expect(resolvePage("https://example.com/<first,second,third>", 1))
			.toBe("https://example.com/first");
	});

	it("returns URL unchanged when page is undefined", () => {
		expect(resolvePage("https://example.com/<page>", undefined))
			.toBe("https://example.com/<page>");
	});

	it("handles multiple page placeholders", () => {
		expect(resolvePage("https://example.com/<1,2>&p=<page>", 2))
			.toBe("https://example.com/2&p=2");
	});

	it("handles single-item list", () => {
		expect(resolvePage("https://example.com/<only>", 1))
			.toBe("https://example.com/1");
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: FAIL — `resolvePage` is not exported

- [ ] **Step 3: 实现 resolvePage**

在 `src/url-analyzer.ts` 中，在 `replaceVariables` 之后添加：

```typescript
const PAGE_RE = /<([^>]+)>/g;

/**
 * Step 3: 处理 <page> 和 <p1,p2,...> 分页占位符
 *
 * 两种格式：
 * - <page> 或任何单值 → 替换为 page 数字
 * - <val1,val2,...> → 按 page 索引取值（1-based），超出范围取最后一项
 */
export function resolvePage(url: string, page: number | undefined): string {
	if (page === undefined) return url;
	return url.replace(PAGE_RE, (_match, content: string) => {
		const parts = content.split(",").map((s: string) => s.trim());
		if (parts.length === 1) {
			return String(page);
		}
		const index = Math.min(page - 1, parts.length - 1);
		return parts[index] ?? parts[parts.length - 1];
	});
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/url-analyzer.ts packages/rule-engine/__tests__/url-analyzer.test.ts
git commit -m "feat(rule-engine): implement resolvePage for <page> placeholders"
```

---

## Task 6: URL 分析器 — resolveRelativeUrl

**Files:**
- Modify: `packages/rule-engine/__tests__/url-analyzer.test.ts`
- Modify: `packages/rule-engine/src/url-analyzer.ts`

- [ ] **Step 1: 写 resolveRelativeUrl 测试**

在 `url-analyzer.test.ts` 中添加测试组：

```typescript
import { resolveRelativeUrl } from "../src/url-analyzer";

describe("resolveRelativeUrl", () => {
	it("returns absolute URL unchanged", () => {
		expect(resolveRelativeUrl("https://example.com/page", undefined))
			.toBe("https://example.com/page");
	});

	it("resolves relative path against base URL", () => {
		expect(resolveRelativeUrl("/books/123", "https://example.com"))
			.toBe("https://example.com/books/123");
	});

	it("resolves relative path without leading slash", () => {
		expect(resolveRelativeUrl("books/123", "https://example.com/catalog/"))
			.toBe("https://example.com/catalog/books/123");
	});

	it("resolves protocol-relative URL", () => {
		expect(resolveRelativeUrl("//cdn.example.com/img.jpg", "https://example.com"))
			.toBe("https://cdn.example.com/img.jpg");
	});

	it("returns URL as-is when no baseUrl provided and URL is absolute", () => {
		expect(resolveRelativeUrl("https://other.com/page", undefined))
			.toBe("https://other.com/page");
	});

	it("returns URL as-is when no baseUrl and URL is relative", () => {
		expect(resolveRelativeUrl("/books/123", undefined))
			.toBe("/books/123");
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: FAIL — `resolveRelativeUrl` is not exported

- [ ] **Step 3: 实现 resolveRelativeUrl**

在 `src/url-analyzer.ts` 中，在 `resolvePage` 之后添加：

```typescript
/**
 * Step 4: 相对 URL → 绝对 URL
 */
export function resolveRelativeUrl(
	url: string,
	baseUrl: string | undefined,
): string {
	if (!baseUrl) return url;
	try {
		return new URL(url, baseUrl).href;
	} catch {
		return url;
	}
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/url-analyzer.ts packages/rule-engine/__tests__/url-analyzer.test.ts
git commit -m "feat(rule-engine): implement resolveRelativeUrl for URL resolution"
```

---

## Task 7: URL 分析器 — 完整管线重写

**Files:**
- Modify: `packages/rule-engine/__tests__/url-analyzer.test.ts`
- Modify: `packages/rule-engine/src/url-analyzer.ts`

- [ ] **Step 1: 写完整管线集成测试**

在 `url-analyzer.test.ts` 中添加测试组：

```typescript
import { describe, expect, it } from "vitest";
import { analyzeUrl, AnalyzeUrl } from "../src/url-analyzer";

describe("analyzeUrl (full pipeline)", () => {
	it("returns plain URL with defaults", () => {
		const result = analyzeUrl("https://example.com/api");
		expect(result.url).toBe("https://example.com/api");
		expect(result.method).toBe("GET");
		expect(result.retry).toBe(0);
		expect(result.headers).toEqual({});
	});

	it("replaces variables and resolves page", () => {
		const result = analyzeUrl(
			"https://example.com/search?q={{key}}&p=<page>",
			{ variables: { key: "三体" }, page: 2 },
		);
		expect(result.url).toBe("https://example.com/search?q=三体&p=2");
	});

	it("parses POST method from URL option", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"method":"POST","body":"key={{key}}"}',
			{ variables: { key: "test" } },
		);
		expect(result.url).toBe("https://example.com/api");
		expect(result.method).toBe("POST");
		expect(result.body).toBe("key=test");
	});

	it("merges headers from context and URL option", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"headers":{"X-Custom":"yes"}}',
			{ headers: { Authorization: "Bearer token" } },
		);
		expect(result.headers).toEqual({
			Authorization: "Bearer token",
			"X-Custom": "yes",
		});
	});

	it("URL option headers override context headers", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"headers":{"Authorization":"new"}}',
			{ headers: { Authorization: "old" } },
		);
		expect(result.headers.Authorization).toBe("new");
	});

	it("resolves relative URL against baseUrl", () => {
		const result = analyzeUrl("/books/123", { baseUrl: "https://example.com" });
		expect(result.url).toBe("https://example.com/books/123");
	});

	it("handles empty rule string", () => {
		const result = analyzeUrl("");
		expect(result.url).toBe("");
		expect(result.method).toBe("GET");
	});

	it("handles invalid JSON option gracefully (no options)", () => {
		const result = analyzeUrl('https://example.com/api,{invalid}');
		expect(result.url).toBe("https://example.com/api");
		expect(result.method).toBe("GET");
	});

	it("extracts charset and retry", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"charset":"gbk","retry":3}',
		);
		expect(result.charset).toBe("gbk");
		expect(result.retry).toBe(3);
	});

	it("extracts webJs", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"webJs":"document.title"}',
		);
		expect(result.webJs).toBe("document.title");
	});
});

describe("AnalyzeUrl class (backward compat)", () => {
	it("works with old two-arg API", () => {
		const analyzer = new AnalyzeUrl();
		const result = analyzer.analyze("https://example.com/search?q={{key}}", {
			key: "test",
		});
		expect(result.url).toBe("https://example.com/search?q=test");
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: FAIL — `analyzeUrl` is not exported, `AnalyzeUrl.analyze` signature mismatch

- [ ] **Step 3: 重写 url-analyzer.ts 完整管线**

替换 `src/url-analyzer.ts` 全部内容：

```typescript
/**
 * AnalyzeUrl — URL 规则解析（纯函数管线）
 *
 * 管线：splitUrlOptions → replaceVariables → resolvePage → resolveRelativeUrl → buildResult
 * 参考 docs/superpowers/specs/2026-05-26-rule-engine-step2-design.md
 */

import type { AnalyzeUrlContext, UrlOption } from "./types";

// ── 导出接口 ──────────────────────────────────────────────

export interface AnalyzeUrlResult {
	url: string;
	method: "GET" | "POST";
	charset?: string;
	headers: Record<string, string>;
	body?: string;
	webJs?: string;
	retry: number;
	type?: string;
}

// ── Step 1: 分离 URL 和 JSON 选项 ─────────────────────────

const URL_OPTION_RE = /,\s*(?=\{)/;

export function splitUrlOptions(
	ruleUrl: string,
): { urlPart: string; optionJson: string | null } {
	const match = ruleUrl.match(URL_OPTION_RE);
	if (!match?.index) {
		return { urlPart: ruleUrl, optionJson: null };
	}
	return {
		urlPart: ruleUrl.substring(0, match.index),
		optionJson: ruleUrl.substring(match.index + 1).trim(),
	};
}

// ── Step 2: 替换 {{key}} 占位符 ───────────────────────────

export function replaceVariables(
	url: string,
	variables: Record<string, string>,
): string {
	let result = url;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replaceAll(`{{${key}}}`, value);
	}
	return result;
}

// ── Step 3: 处理 <page> 和 <p1,p2,...> 分页占位符 ─────────

const PAGE_RE = /<([^>]+)>/g;

export function resolvePage(url: string, page: number | undefined): string {
	if (page === undefined) return url;
	return url.replace(PAGE_RE, (_match, content: string) => {
		const parts = content.split(",").map((s: string) => s.trim());
		if (parts.length === 1) {
			return String(page);
		}
		const index = Math.min(page - 1, parts.length - 1);
		return parts[index] ?? parts[parts.length - 1];
	});
}

// ── Step 4: 相对 URL → 绝对 URL ────────────────────────────

export function resolveRelativeUrl(
	url: string,
	baseUrl: string | undefined,
): string {
	if (!baseUrl) return url;
	try {
		return new URL(url, baseUrl).href;
	} catch {
		return url;
	}
}

// ── Step 5: 构建 AnalyzeUrlResult ──────────────────────────

function buildResult(
	url: string,
	optionJson: string | null,
	context: AnalyzeUrlContext,
): AnalyzeUrlResult {
	const result: AnalyzeUrlResult = {
		url,
		method: "GET",
		headers: { ...context.headers },
		retry: 0,
	};

	if (!optionJson) return result;

	let option: UrlOption;
	try {
		option = JSON.parse(optionJson) as UrlOption;
	} catch {
		return result;
	}

	if (option.method?.toUpperCase() === "POST") {
		result.method = "POST";
	}
	if (option.charset) result.charset = option.charset;
	if (option.body) result.body = option.body;
	if (option.webJs) result.webJs = option.webJs;
	if (option.type) result.type = option.type;
	if (typeof option.retry === "number" && option.retry >= 0) {
		result.retry = option.retry;
	}
	if (option.headers) {
		result.headers = { ...result.headers, ...option.headers };
	}

	return result;
}

// ── 主入口 ────────────────────────────────────────────────

/** 纯函数：分析 URL 规则字符串 */
export function analyzeUrl(
	rule: string,
	context: AnalyzeUrlContext = {},
): AnalyzeUrlResult {
	const { urlPart, optionJson } = splitUrlOptions(rule);
	const withVars = replaceVariables(urlPart, context.variables ?? {});
	const withPage = resolvePage(withVars, context.page);
	const resolved = resolveRelativeUrl(withPage, context.baseUrl);
	return buildResult(resolved, optionJson, context);
}

/** 类形式（向后兼容旧 API） */
export class AnalyzeUrl {
	analyze(
		rule: string,
		variablesOrContext?: Record<string, string> | AnalyzeUrlContext,
	): AnalyzeUrlResult {
		if (
			variablesOrContext === undefined ||
			"variables" in variablesOrContext ||
			"page" in variablesOrContext ||
			"baseUrl" in variablesOrContext ||
			"headers" in variablesOrContext
		) {
			return analyzeUrl(rule, variablesOrContext);
		}
		// 旧 API：第二个参数是 variables map
		return analyzeUrl(rule, { variables: variablesOrContext });
	}
}
```

- [ ] **Step 4: 运行全部 URL 分析器测试**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/url-analyzer.test.ts
```

Expected: PASS（所有 splitUrlOptions + replaceVariables + resolvePage + resolveRelativeUrl + analyzeUrl + AnalyzeUrl class 测试）

- [ ] **Step 5: 运行类型检查**

Run:
```bash
pnpm --filter @readerx/rule-engine typecheck
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/rule-engine/src/url-analyzer.ts packages/rule-engine/__tests__/url-analyzer.test.ts
git commit -m "feat(rule-engine): rewrite URL analyzer as pure function pipeline"
```

---

## Task 8: Zod Schema — urlOptionSchema

**Files:**
- Create: `packages/rule-engine/__tests__/schemas.test.ts`
- Modify: `packages/rule-engine/src/schemas.ts`

- [ ] **Step 1: 写 urlOptionSchema 和 parseUrlOption 的测试**

创建 `__tests__/schemas.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { parseUrlOption } from "../src/schemas";

describe("parseUrlOption", () => {
	it("parses valid POST option", () => {
		const result = parseUrlOption('{"method":"POST","body":"key=val"}');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.method).toBe("POST");
		expect(result.data.body).toBe("key=val");
	});

	it("parses option with headers", () => {
		const result = parseUrlOption('{"headers":{"X-Token":"abc"}}');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.headers).toEqual({ "X-Token": "abc" });
	});

	it("parses option with retry and charset", () => {
		const result = parseUrlOption('{"retry":3,"charset":"gbk"}');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.retry).toBe(3);
		expect(result.data.charset).toBe("gbk");
	});

	it("parses empty JSON object", () => {
		const result = parseUrlOption("{}");
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.method).toBeUndefined();
	});

	it("rejects invalid JSON", () => {
		const result = parseUrlOption("{invalid}");
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error).toContain("Invalid");
	});

	it("rejects negative retry", () => {
		const result = parseUrlOption('{"retry":-1}');
		expect(result.success).toBe(false);
	});

	it("allows unknown fields (passthrough)", () => {
		const result = parseUrlOption('{"customField":"value"}');
		expect(result.success).toBe(true);
	});

	it("allows webView boolean", () => {
		const result = parseUrlOption('{"webView":true}');
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.webView).toBe(true);
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/schemas.test.ts
```

Expected: FAIL — `parseUrlOption` is not exported

- [ ] **Step 3: 实现 urlOptionSchema 和 parseUrlOption**

重写 `src/schemas.ts`：

```typescript
/**
 * Zod Schema — BookSource 及嵌套规则类型校验
 */
import { z } from "zod";

// ── URL 选项 Schema ───────────────────────────────────────

export const urlOptionSchema = z
	.object({
		method: z.enum(["GET", "POST", "get", "post"]).optional(),
		charset: z.string().optional(),
		headers: z.record(z.string(), z.string()).optional(),
		body: z.string().optional(),
		retry: z.number().int().nonnegative().optional(),
		webJs: z.string().optional(),
		type: z.string().optional(),
		webView: z.boolean().optional(),
	})
	.passthrough();

/** 解析 URL 选项 JSON 字符串 */
export function parseUrlOption(
	json: string,
): { success: true; data: z.infer<typeof urlOptionSchema> } | { success: false; error: string } {
	try {
		const raw = JSON.parse(json);
		const result = urlOptionSchema.safeParse(raw);
		if (result.success) {
			return { success: true, data: result.data };
		}
		return { success: false, error: result.error.issues.map((i) => i.message).join("; ") };
	} catch {
		return { success: false, error: "Invalid JSON" };
	}
}

// ── 旧接口兼容 ────────────────────────────────────────────

export function isValidBookSourceType(value: number): boolean {
	return value === 0 || value === 1 || value === 2 || value === 3;
}

export function validateBookSource(source: unknown): source is Record<string, unknown> {
	if (typeof source !== "object" || source === null) return false;
	const s = source as Record<string, unknown>;
	if (typeof s.bookSourceUrl !== "string" || !s.bookSourceUrl) return false;
	if (typeof s.bookSourceName !== "string" || !s.bookSourceName) return false;
	if (!isValidBookSourceType(s.bookSourceType as number)) return false;
	return true;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/schemas.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/schemas.ts packages/rule-engine/__tests__/schemas.test.ts
git commit -m "feat(rule-engine): implement urlOptionSchema with parseUrlOption"
```

---

## Task 9: Zod Schema — 规则 Schema

**Files:**
- Modify: `packages/rule-engine/__tests__/schemas.test.ts`
- Modify: `packages/rule-engine/src/schemas.ts`

- [ ] **Step 1: 写规则 schema 的测试**

在 `schemas.test.ts` 顶部 import 更新，添加新测试组：

```typescript
import { describe, expect, it } from "vitest";
import {
	parseUrlOption,
	searchRuleSchema,
	exploreRuleSchema,
	bookInfoRuleSchema,
	tocRuleSchema,
	contentRuleSchema,
	reviewRuleSchema,
} from "../src/schemas";

// ... parseUrlOption tests unchanged ...

describe("searchRuleSchema", () => {
	it("accepts valid SearchRule with required fields", () => {
		const result = searchRuleSchema.safeParse({
			bookList: "div.book-list > div",
			name: "h3.title",
			author: "span.author",
			bookUrl: "a@href",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing bookList", () => {
		const result = searchRuleSchema.safeParse({
			name: "h3.title",
			author: "span.author",
			bookUrl: "a@href",
		});
		expect(result.success).toBe(false);
	});

	it("allows optional fields", () => {
		const result = searchRuleSchema.safeParse({
			bookList: "div.list",
			name: "h3",
			author: "span",
			bookUrl: "a",
			intro: "p.intro",
			coverUrl: "img@src",
		});
		expect(result.success).toBe(true);
	});
});

describe("exploreRuleSchema", () => {
	it("accepts same fields as SearchRule without checkKeyWord", () => {
		const result = exploreRuleSchema.safeParse({
			bookList: "div.list",
			name: "h3",
			author: "span",
			bookUrl: "a",
		});
		expect(result.success).toBe(true);
	});
});

describe("tocRuleSchema", () => {
	it("accepts valid TocRule with required fields", () => {
		const result = tocRuleSchema.safeParse({
			chapterList: "div.chapters > div",
			chapterName: "a",
			chapterUrl: "a@href",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing chapterList", () => {
		const result = tocRuleSchema.safeParse({
			chapterName: "a",
			chapterUrl: "a@href",
		});
		expect(result.success).toBe(false);
	});
});

describe("contentRuleSchema", () => {
	it("accepts valid ContentRule with required content field", () => {
		const result = contentRuleSchema.safeParse({
			content: "div.content",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing content", () => {
		const result = contentRuleSchema.safeParse({
			nextContentUrl: "a.next@href",
		});
		expect(result.success).toBe(false);
	});
});

describe("reviewRuleSchema", () => {
	it("accepts empty object (all fields optional)", () => {
		const result = reviewRuleSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts partial fields", () => {
		const result = reviewRuleSchema.safeParse({
			reviewUrl: "div.comment",
			contentRule: "p.text",
		});
		expect(result.success).toBe(true);
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/schemas.test.ts
```

Expected: FAIL — `searchRuleSchema` 等未导出

- [ ] **Step 3: 实现规则 schemas**

在 `src/schemas.ts` 中，在 `urlOptionSchema` 之后、`parseUrlOption` 之前添加：

```typescript
// ── 规则 Schema ───────────────────────────────────────────

const stringRule = z.string();

export const searchRuleSchema = z
	.object({
		checkKeyWord: stringRule.optional(),
		bookList: z.string(),
		name: z.string(),
		author: z.string(),
		intro: stringRule.optional(),
		kind: stringRule.optional(),
		lastChapter: stringRule.optional(),
		updateTime: stringRule.optional(),
		bookUrl: z.string(),
		coverUrl: stringRule.optional(),
		wordCount: stringRule.optional(),
	})
	.passthrough();

export const exploreRuleSchema = searchRuleSchema.omit({ checkKeyWord: true });

export const bookInfoRuleSchema = z
	.object({
		init: stringRule.optional(),
		name: stringRule.optional(),
		author: stringRule.optional(),
		intro: stringRule.optional(),
		kind: stringRule.optional(),
		lastChapter: stringRule.optional(),
		updateTime: stringRule.optional(),
		coverUrl: stringRule.optional(),
		tocUrl: stringRule.optional(),
		wordCount: stringRule.optional(),
		canReName: stringRule.optional(),
		downloadUrls: stringRule.optional(),
	})
	.passthrough();

export const tocRuleSchema = z
	.object({
		preUpdateJs: stringRule.optional(),
		chapterList: z.string(),
		chapterName: z.string(),
		chapterUrl: z.string(),
		formatJs: stringRule.optional(),
		isVolume: stringRule.optional(),
		isVip: stringRule.optional(),
		isPay: stringRule.optional(),
		updateTime: stringRule.optional(),
		nextTocUrl: stringRule.optional(),
	})
	.passthrough();

export const contentRuleSchema = z
	.object({
		content: z.string(),
		title: stringRule.optional(),
		nextContentUrl: stringRule.optional(),
		webJs: stringRule.optional(),
		sourceRegex: stringRule.optional(),
		replaceRegex: stringRule.optional(),
		imageStyle: stringRule.optional(),
		imageDecode: stringRule.optional(),
		payAction: stringRule.optional(),
	})
	.passthrough();

export const reviewRuleSchema = z
	.object({
		reviewUrl: stringRule.optional(),
		avatarRule: stringRule.optional(),
		contentRule: stringRule.optional(),
		postTimeRule: stringRule.optional(),
		reviewQuoteUrl: stringRule.optional(),
		voteUpUrl: stringRule.optional(),
		voteDownUrl: stringRule.optional(),
		postReviewUrl: stringRule.optional(),
		postQuoteUrl: stringRule.optional(),
		deleteUrl: stringRule.optional(),
	})
	.passthrough();
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/schemas.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/schemas.ts packages/rule-engine/__tests__/schemas.test.ts
git commit -m "feat(rule-engine): implement rule schemas (search, explore, toc, content, review)"
```

---

## Task 10: Zod Schema — bookSourceSchema + parseBookSource

**Files:**
- Modify: `packages/rule-engine/__tests__/schemas.test.ts`
- Modify: `packages/rule-engine/src/schemas.ts`

- [ ] **Step 1: 写 bookSourceSchema 和 parseBookSource 的测试**

在 `schemas.test.ts` 添加新 import 和测试组：

```typescript
import {
	// ... existing imports ...
	bookSourceSchema,
	parseBookSource,
	validateBookSource,
} from "../src/schemas";

describe("bookSourceSchema", () => {
	const minimalSource = {
		bookSourceUrl: "https://example.com",
		bookSourceName: "测试书源",
		bookSourceType: 0,
		enabled: true,
		enabledExplore: true,
		customOrder: 0,
		weight: 0,
		lastUpdateTime: 0,
		respondTime: 180000,
	};

	it("accepts minimal valid BookSource", () => {
		const result = bookSourceSchema.safeParse(minimalSource);
		expect(result.success).toBe(true);
	});

	it("accepts full BookSource with nested rules", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			searchUrl: "https://example.com/search?q={{key}}",
			ruleSearch: {
				bookList: "div.list > div",
				name: "h3",
				author: "span.author",
				bookUrl: "a@href",
			},
			ruleToc: {
				chapterList: "div.chapters > div",
				chapterName: "a",
				chapterUrl: "a@href",
			},
			ruleContent: {
				content: "div.content",
			},
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing bookSourceUrl", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			bookSourceUrl: undefined,
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty bookSourceUrl", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			bookSourceUrl: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid bookSourceType", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			bookSourceType: 5,
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid nested ruleSearch", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			ruleSearch: { name: "h3" }, // missing bookList, author, bookUrl
		});
		expect(result.success).toBe(false);
	});

	it("allows extra fields (passthrough)", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			customUnknownField: "value",
		});
		expect(result.success).toBe(true);
	});
});

describe("parseBookSource", () => {
	it("returns success with data for valid source", () => {
		const result = parseBookSource({
			bookSourceUrl: "https://example.com",
			bookSourceName: "test",
			bookSourceType: 0,
			enabled: true,
			enabledExplore: true,
			customOrder: 0,
			weight: 0,
			lastUpdateTime: 0,
			respondTime: 180000,
		});
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.bookSourceName).toBe("test");
	});

	it("returns errors for invalid source", () => {
		const result = parseBookSource({ bookSourceUrl: "" });
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.issues.length).toBeGreaterThan(0);
	});
});

describe("validateBookSource", () => {
	it("returns true for valid source", () => {
		expect(
			validateBookSource({
				bookSourceUrl: "https://example.com",
				bookSourceName: "test",
				bookSourceType: 0,
			}),
		).toBe(true);
	});

	it("returns false for non-object", () => {
		expect(validateBookSource("not an object")).toBe(false);
	});

	it("returns false for null", () => {
		expect(validateBookSource(null)).toBe(false);
	});

	it("returns false for missing required fields", () => {
		expect(validateBookSource({ bookSourceName: "test" })).toBe(false);
	});
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/schemas.test.ts
```

Expected: FAIL — `bookSourceSchema` / `parseBookSource` 未导出

- [ ] **Step 3: 实现 bookSourceSchema + parseBookSource + validateBookSource**

在 `src/schemas.ts` 中：
1. 在规则 schema 之后添加 bookSourceSchema
2. 替换旧的 `validateBookSource` 为基于 schema 的版本

在 `reviewRuleSchema` 之后添加：

```typescript
// ── BookSource Schema ─────────────────────────────────────

export const bookSourceSchema = z
	.object({
		bookSourceUrl: z.string().min(1),
		bookSourceName: z.string().min(1),
		bookSourceGroup: z.string().optional(),
		bookSourceType: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
		bookUrlPattern: z.string().optional(),
		bookSourceComment: z.string().optional(),
		variableComment: z.string().optional(),

		enabled: z.boolean(),
		enabledExplore: z.boolean(),
		customOrder: z.number(),
		weight: z.number(),
		lastUpdateTime: z.number(),
		respondTime: z.number(),

		header: z.string().optional(),
		loginUrl: z.string().optional(),
		loginUi: z.string().optional(),
		loginCheckJs: z.string().optional(),
		enabledCookieJar: z.boolean().optional(),
		concurrentRate: z.string().optional(),
		jsLib: z.string().optional(),
		coverDecodeJs: z.string().optional(),

		searchUrl: z.string().optional(),
		exploreUrl: z.string().optional(),
		exploreScreen: z.string().optional(),

		ruleSearch: searchRuleSchema.optional(),
		ruleExplore: exploreRuleSchema.optional(),
		ruleBookInfo: bookInfoRuleSchema.optional(),
		ruleToc: tocRuleSchema.optional(),
		ruleContent: contentRuleSchema.optional(),
		ruleReview: reviewRuleSchema.optional(),
	})
	.passthrough();

/** 带错误详情的 BookSource 解析 */
export function parseBookSource(
	source: unknown,
):
	| { success: true; data: z.infer<typeof bookSourceSchema> }
	| { success: false; errors: z.ZodError } {
	const result = bookSourceSchema.safeParse(source);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, errors: result.error };
}

/** 快速布尔校验（兼容旧接口） */
export function validateBookSource(source: unknown): source is Record<string, unknown> {
	return bookSourceSchema.safeParse(source).success;
}

/** 校验书源类型值（兼容旧接口） */
export function isValidBookSourceType(value: number): boolean {
	return value === 0 || value === 1 || value === 2 || value === 3;
}
```

然后删除文件末尾的旧版 `validateBookSource` 和 `isValidBookSourceType`（被新版本替代）。

- [ ] **Step 4: 运行全部 Schema 测试**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run __tests__/schemas.test.ts
```

Expected: PASS

- [ ] **Step 5: 运行类型检查**

Run:
```bash
pnpm --filter @readerx/rule-engine typecheck
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/rule-engine/src/schemas.ts packages/rule-engine/__tests__/schemas.test.ts
git commit -m "feat(rule-engine): implement bookSourceSchema with parseBookSource"
```

---

## Task 11: 更新 index.ts 导出

**Files:**
- Modify: `packages/rule-engine/src/index.ts`

- [ ] **Step 1: 更新导出**

替换 `src/index.ts` 全部内容：

```typescript
// 主入口 — 导出所有公开 API

// 分析器
export { AnalyzeRule } from "./analyzer";

// 解析器（独立使用）
export {
	cssParser,
	getElements as cssGetElements,
	getString as cssGetString,
	getStringList as cssGetStringList,
	parseCssRule,
} from "./css";
export {
	getElements as jsonpathGetElements,
	getString as jsonpathGetString,
	getStringList as jsonpathGetStringList,
	jsonpathParser,
} from "./jsonpath";
export type { RuleParser } from "./parser-interface";
// 解析器辅助
export { fail, ok, okList } from "./parser-interface";
export { applyReplacements, parseReplaceChain } from "./regex";
// 操作符和正则
export { combineResults, splitRuleByOperators } from "./rule-operators";
// 校验
export {
	bookSourceSchema,
	contentRuleSchema,
	exploreRuleSchema,
	isValidBookSourceType,
	bookInfoRuleSchema,
	parseBookSource,
	parseUrlOption,
	reviewRuleSchema,
	searchRuleSchema,
	tocRuleSchema,
	urlOptionSchema,
	validateBookSource,
} from "./schemas";
// 类型
export type {
	AnalyzeRuleMode,
	AnalyzeUrlContext,
	BookInfoRule,
	BookSource,
	BookSourceType,
	CombineOperator,
	ContentRule,
	ContentType,
	ExploreRule,
	ParseFailure,
	ParseResult,
	ParseSuccess,
	ReviewRule,
	RuleOperator,
	RuleSegment,
	SearchRule,
	TocRule,
	UrlOption,
} from "./types";
// URL 分析器
export {
	analyzeUrl,
	AnalyzeUrl,
	replaceVariables,
	resolvePage,
	resolveRelativeUrl,
	splitUrlOptions,
} from "./url-analyzer";
export type { AnalyzeUrlResult } from "./url-analyzer";
export {
	getElements as xpathGetElements,
	getString as xpathGetString,
	getStringList as xpathGetStringList,
	xpathParser,
} from "./xpath";
```

- [ ] **Step 2: 运行全量 typecheck**

Run:
```bash
pnpm turbo typecheck
```

Expected: 全部 7 packages PASS

- [ ] **Step 3: 运行全部测试**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run
```

Expected: 所有测试 PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/src/index.ts
git commit -m "feat(rule-engine): update exports for URL analyzer and schema APIs"
```

---

## Task 12: 更新文档

**Files:**
- Modify: `docs/rule-engine-changes.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: 更新 rule-engine-changes.md**

在文件末尾追加 Step 2 章节：

```markdown
## Step 2: URL 分析器 + Schema

### 改进

| 领域 | Legado（原版） | ReaderX（改进） |
|------|---------------|----------------|
| URL 解析 | 851 行 AnalyzeUrl 类，混合网络请求、Cookie、WebView | ~150 行纯函数管线，仅输出请求配置 |
| URL 选项 | UrlOption data class + Gson 宽松解析 | Zod urlOptionSchema 严格校验 |
| 请求配置 | 内部直接 OkHttpClient 发请求 | 输出 AnalyzeUrlResult，调用方决定请求方式 |
| 页码解析 | 混在 replaceKeyPageJs() 中 | 独立 resolvePage() 纯函数 |
| 变量替换 | 混在 replaceKeyPageJs() 中 | 独立 replaceVariables() 纯函数 |
| 相对 URL | NetworkUtils.getAbsoluteURL（Android） | 标准 new URL(path, base)（Web 兼容） |
| Schema | 无校验（Kotlin 默认值兜底） | Zod 全量校验 + parseBookSource 错误详情 |
| BookSource 校验 | 导入时静默忽略坏数据 | 导入时立即报错，人类可读错误消息 |

### 舍弃项

| 项 | 原因 |
|----|------|
| getStrResponse / getResponse / getByteArray | 网络请求职责，由 infrastructure HttpClient 处理 |
| Cookie 管理（CookieStore / CookieManager） | Web 端由浏览器/HTTP 客户端处理 |
| WebView 渲染（BackstageWebView） | Web 端不需要（浏览器本身就是渲染引擎） |
| Proxy 配置 | 服务端关注，URL 解析不需要 |
| ConcurrentRateLimiter | 并发控制由调用方处理 |
| Base64 Data URI | 低优先级，后续按需添加 |
| GlideUrl / ExoPlayer | Android 图片/音频加载库，Web 端无用 |
| @js: / {{js}} 执行 | 延迟到 Step 1.5（quickjs-runtime） |
| @put/@get 变量 | 延迟到 Step 5（reader-engine 运行时） |
| serverID | Legado 服务器功能，ReaderX 暂不需要 |
| webViewDelayTime | WebView 功能的一部分，随 WebView 一起舍弃 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `__tests__/schemas.test.ts` | Schema 校验测试 |
```

- [ ] **Step 2: 更新 roadmap.md 模块状态表**

在 `docs/roadmap.md` 的模块状态表中，更新 rule-engine 行：

```markdown
| rule-engine | CSS/XPath/JSONPath 解析器、操作符拆分、正则替换、URL 分析器管线、完整 Zod Schema、70+ 测试通过 | ✅ Step 1+2 完成 |
```

- [ ] **Step 3: Commit**

```bash
git add docs/rule-engine-changes.md docs/roadmap.md
git commit -m "docs: update rule-engine-changes and roadmap for Step 2 completion"
```

---

## Task 13: 最终验证

- [ ] **Step 1: 全量 typecheck**

Run:
```bash
pnpm turbo typecheck
```

Expected: 7/7 packages PASS

- [ ] **Step 2: 全量 lint**

Run:
```bash
pnpm turbo lint
```

Expected: 0 errors, 0 warnings

- [ ] **Step 3: 全量测试**

Run:
```bash
pnpm --filter @readerx/rule-engine exec vitest run
```

Expected: 所有测试 PASS（原有 ~44 个 + 新增 ~40 个 ≈ 84 个测试）
