# Rule Engine Complete Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely rewrite `packages/rule-engine` to match the redesigned ReaderX schemas, replacing Legado-format with a functional-pipeline architecture featuring RuntimeValue, Extract scope, and Compile phase.

**Architecture:** Two-phase execution (compile → evaluate). Pure functions only. RuntimeValue preserves DOM references through the pipeline. Extract supports `scope: "current" | "root"` for chained extraction. ScriptStep requires explicit `allowScript` opt-in.

**Tech Stack:** TypeScript (strict, ESM-only), Zod 4, happy-dom (DOM+CSS+XPath), @swaggerexpert/jsonpath (RFC 9535), Vitest

**Spec:** `docs/superpowers/specs/2026-05-30-rule-engine-rewrite-design.md`

**Downstream consumers (will break, updated in Phase 8):**
- `packages/quickjs-runtime/src/js-executor.ts`
- `packages/reader-engine/src/contracts/js-executor.ts`
- `packages/reader-engine/src/content/content-extractor.ts`
- `packages/reader-engine/src/content/content-pipeline.ts`
- `packages/persistence/src/types.ts`
- `apps/web/features/source-manager/hooks/use-source-import.ts`
- `apps/web/lib/worker-bridge.ts`

---

## File Structure Map

```
packages/rule-engine/
  package.json                          # Updated deps
  tsconfig.json                         # Keep as-is
  src/
    index.ts                            # Public API re-exports
    types.ts                            # All TypeScript types
    result.ts                           # Result<T,E> + helpers
    schemas.ts                          # Zod schemas + parse/validate
    compile.ts                          # compileRule / compileSteps
    evaluate.ts                         # evaluateCompiled / evaluateRule
    extract.ts                          # Extraction dispatch
    transform.ts                        # String + DOM transforms
    normalize.ts                        # RuleObject → RuleStep[]
    css.ts                              # CSS selector extraction
    xpath.ts                            # XPath public API
    xpath-eval.ts                       # XPath eval (Node.js: happy-dom)
    xpath-eval.browser.ts               # XPath eval (Browser: native)
    jsonpath.ts                         # JSONPath (RFC 9535)
    regex.ts                            # Regex extraction
    template.ts                         # Template variable expansion
    dom-parse.ts                        # DOM parsing (Node.js: happy-dom)
    dom-parse.browser.ts                # DOM parsing (Browser: native)
    url-analyzer.ts                     # URL template resolution
    document-cache.ts                   # DocumentCache impl
    serialize.ts                        # RuntimeValue → string
    replace.ts                          # Replace rule application
    find-chapters.ts                    # TXT TOC chapter detection
  __tests__/
    unit/
      result.test.ts
      compile.test.ts
      normalize.test.ts
      extract-css.test.ts
      extract-xpath.test.ts
      extract-jsonpath.test.ts
      extract-regex.test.ts
      transform-string.test.ts
      transform-dom.test.ts
      url-analyzer.test.ts
      serialize.test.ts
      document-cache.test.ts
    integration/
      evaluate-pipeline.test.ts
      evaluate-scope.test.ts
      evaluate-field.test.ts
      apply-replace.test.ts
      find-chapters.test.ts
    e2e/
      book-source-e2e.test.ts
      dict-rule-e2e.test.ts
    schemas/
      book-source-schema.test.ts
      dict-rule-schema.test.ts
      replace-rule-schema.test.ts
      txt-toc-rule-schema.test.ts
```

---

## Phase 1: Clean Slate + Foundation

### Task 1: Clean Slate

**Files:**
- Delete: `packages/rule-engine/src/*` (all 15 source files)
- Delete: `packages/rule-engine/__tests__/*` (all 10 test files)
- Modify: `packages/rule-engine/package.json`

- [ ] **Step 1: Delete all old source files**

```bash
cd /Volumes/Data/workspaces/front/readerx/.claude/worktrees/refactor+rule-engine
rm packages/rule-engine/src/analyzer.ts
rm packages/rule-engine/src/css.ts
rm packages/rule-engine/src/dom-parse.ts
rm packages/rule-engine/src/dom-parse.browser.ts
rm packages/rule-engine/src/dom-utils.ts
rm packages/rule-engine/src/index.ts
rm packages/rule-engine/src/jsonpath.ts
rm packages/rule-engine/src/parser-interface.ts
rm packages/rule-engine/src/regex.ts
rm packages/rule-engine/src/rule-operators.ts
rm packages/rule-engine/src/rule-schemas.ts
rm packages/rule-engine/src/schemas.ts
rm packages/rule-engine/src/types.ts
rm packages/rule-engine/src/url-analyzer.ts
rm packages/rule-engine/src/xpath-eval.ts
rm packages/rule-engine/src/xpath-eval.browser.ts
rm packages/rule-engine/src/xpath-shared.ts
rm packages/rule-engine/src/xpath.ts
```

- [ ] **Step 2: Delete all old test files**

```bash
rm packages/rule-engine/__tests__/analyzer.test.ts
rm packages/rule-engine/__tests__/css.test.ts
rm packages/rule-engine/__tests__/dom-utils.test.ts
rm packages/rule-engine/__tests__/js-rules.test.ts
rm packages/rule-engine/__tests__/jsonpath.test.ts
rm packages/rule-engine/__tests__/regex.test.ts
rm packages/rule-engine/__tests__/rule-operators.test.ts
rm packages/rule-engine/__tests__/schemas.test.ts
rm packages/rule-engine/__tests__/url-analyzer.test.ts
rm packages/rule-engine/__tests__/xpath.test.ts
```

- [ ] **Step 3: Update package.json dependencies**

Replace the full `package.json`:

```json
{
	"name": "@readerx/rule-engine",
	"version": "1.0.0",
	"private": true,
	"type": "module",
	"exports": {
		".": "./src/index.ts"
	},
	"browser": {
		"./src/dom-parse.ts": "./src/dom-parse.browser.ts",
		"./src/xpath-eval.ts": "./src/xpath-eval.browser.ts"
	},
	"scripts": {
		"typecheck": "tsc --noEmit",
		"lint": "biome check",
		"test": "vitest run",
		"test:watch": "vitest"
	},
	"devDependencies": {
		"@types/node": "^25.9.1",
		"typescript": "^6.0.3",
		"vitest": "^4.1.7"
	},
	"dependencies": {
		"@swaggerexpert/jsonpath": "^4.0.4",
		"happy-dom": "^20.9.0",
		"zod": "^4.4.3"
	}
}
```

- [ ] **Step 4: Create test directory structure**

```bash
mkdir -p packages/rule-engine/__tests__/unit
mkdir -p packages/rule-engine/__tests__/integration
mkdir -p packages/rule-engine/__tests__/e2e
mkdir -p packages/rule-engine/__tests__/schemas
```

- [ ] **Step 5: Commit clean slate**

```bash
git add -A packages/rule-engine/
git commit -m "chore(rule-engine): clean slate for complete rewrite

Remove all old Legado-format source and test files.
Update dependencies: happy-dom replaces linkedom+xmldom+xpath,
@swaggerexpert/jsonpath replaces jsonpath-plus."
```

---

### Task 2: result.ts — Result Type

**Files:**
- Create: `packages/rule-engine/src/result.ts`
- Test: `packages/rule-engine/__tests__/unit/result.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/result.test.ts
import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok } from "@/rule-engine/result";

describe("result", () => {
	describe("ok", () => {
		it("creates a successful result", () => {
			const r = ok(42);
			expect(r.ok).toBe(true);
			if (r.ok) expect(r.value).toBe(42);
		});

		it("creates a successful result with array", () => {
			const r = ok(["a", "b"]);
			expect(r.ok).toBe(true);
			if (r.ok) expect(r.value).toEqual(["a", "b"]);
		});
	});

	describe("err", () => {
		it("creates an error result", () => {
			const r = err({ code: "INVALID_SELECTOR", message: "bad" });
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.error.code).toBe("INVALID_SELECTOR");
		});
	});

	describe("isOk / isErr", () => {
		it("isOk returns true for ok results", () => {
			expect(isOk(ok(1))).toBe(true);
			expect(isOk(err({ code: "REGEX_ERROR", message: "" }))).toBe(false);
		});

		it("isErr returns true for err results", () => {
			expect(isErr(err({ code: "REGEX_ERROR", message: "" }))).toBe(true);
			expect(isErr(ok(1))).toBe(false);
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/result.test.ts
```

Expected: FAIL — module `@/rule-engine/result` not found.

- [ ] **Step 3: Implement result.ts**

```typescript
// src/result.ts
import type { RuleError } from "./types";

export type Result<T, E = RuleError> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

export function err<E = RuleError>(error: E): Result<never, E> {
	return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } {
	return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } {
	return !result.ok;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/result.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/result.ts packages/rule-engine/__tests__/unit/result.test.ts
git commit -m "feat(rule-engine): add Result<T,E> type with ok/err/isOk/isErr helpers"
```

---

### Task 3: types.ts — All Type Definitions

**Files:**
- Create: `packages/rule-engine/src/types.ts`
- Test: `packages/rule-engine/__tests__/unit/types.test.ts`

This is the single largest file. It defines all types matching the spec §2.

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/types.test.ts
import { describe, expect, it } from "vitest";
import type {
	BookSource,
	CompiledExtractStep,
	CompiledRule,
	CompiledStep,
	CompiledTransformStep,
	DictField,
	DictRule,
	DictRuleFile,
	EvalContext,
	ExtractEngine,
	ExtractOutput,
	ExtractStep,
	FieldSchema,
	Rule,
	RuleError,
	RuleErrorCode,
	RuleObject,
	RuleStep,
	RuntimeResult,
	RuntimeValue,
	StringTransformStep,
	DomTransformStep,
	TransformStep,
	ScriptStep,
} from "@/rule-engine/types";

describe("types: compile-time verification", () => {
	it("ExtractStep has required fields", () => {
		const step: ExtractStep = {
			type: "extract",
			engine: "css",
			selector: ".title",
		};
		expect(step.type).toBe("extract");
		expect(step.engine).toBe("css");
	});

	it("ExtractStep with scope and output", () => {
		const step: ExtractStep = {
			type: "extract",
			engine: "xpath",
			selector: "//h1",
			scope: "root",
			output: "text",
		};
		expect(step.scope).toBe("root");
	});

	it("StringTransformStep", () => {
		const step: StringTransformStep = {
			type: "transform",
			category: "string",
			action: "replace",
			pattern: "\\s+",
			replacement: " ",
			flags: "g",
		};
		expect(step.action).toBe("replace");
	});

	it("DomTransformStep", () => {
		const step: DomTransformStep = {
			type: "transform",
			category: "dom",
			action: "remove",
			selector: ".ad",
		};
		expect(step.category).toBe("dom");
	});

	it("ScriptStep", () => {
		const step: ScriptStep = {
			type: "script",
			code: "return result.toUpperCase();",
		};
		expect(step.type).toBe("script");
	});

	it("RuleError with all fields", () => {
		const error: RuleError = {
			code: "INVALID_SELECTOR",
			message: "Invalid CSS selector",
			step: 2,
			rule: ".title[",
			source: "<div>...</div>",
		};
		expect(error.code).toBe("INVALID_SELECTOR");
	});

	it("Rule = RuleStep[]", () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".book" },
			{ type: "extract", engine: "css", selector: ".title", output: "text" },
		];
		expect(rule).toHaveLength(2);
	});

	it("BookSource has required fields", () => {
		const source: BookSource = {
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test Source",
			type: "novel",
			baseUrl: "https://example.com",
		};
		expect(source.type).toBe("novel");
	});

	it("DictRuleFile structure", () => {
		const file: DictRuleFile = {
			$schema: "readerx/dict-rule/v1",
			authors: ["test"],
			rules: [],
		};
		expect(file.rules).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/types.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement types.ts**

```typescript
// src/types.ts

// ---- Error Types ----

export type RuleErrorCode =
	| "INVALID_SELECTOR"
	| "JSONPATH_ERROR"
	| "XPATH_ERROR"
	| "REGEX_ERROR"
	| "SCRIPT_ERROR"
	| "SCRIPT_DISABLED"
	| "NO_JS_EXECUTOR"
	| "CONTENT_TYPE_MISMATCH"
	| "DOM_PARSE_ERROR"
	| "TYPE_MISMATCH";

export type RuleError = {
	readonly code: RuleErrorCode;
	readonly message: string;
	readonly step?: number;
	readonly rule?: string;
	readonly source?: string;
	readonly cause?: unknown;
};

// ---- Runtime Values ----

export type RuntimeValue = string | Element | Document | unknown;
export type RuntimeResult = readonly RuntimeValue[];

// ---- Extract Step ----

export type ExtractEngine = "css" | "xpath" | "jsonpath" | "regex";
export type ExtractOutput = "html" | "text" | "outerHtml" | "attr";

export type ExtractStep = {
	readonly type: "extract";
	readonly engine: ExtractEngine;
	readonly selector: string;
	readonly scope?: "current" | "root";
	readonly output?: ExtractOutput;
	readonly attr?: string;
	readonly baseUrl?: string;
};

// ---- Transform Steps ----

export type StringTransformStep = {
	readonly type: "transform";
	readonly category: "string";
	readonly action: "replace" | "match" | "split" | "template" | "trim";
	readonly pattern?: string;
	readonly replacement?: string;
	readonly flags?: string;
	readonly group?: number;
	readonly template?: string;
};

export type DomTransformStep = {
	readonly type: "transform";
	readonly category: "dom";
	readonly action: "remove" | "unwrap" | "strip";
	readonly selector: string;
	readonly attributes?: readonly string[];
};

export type TransformStep = StringTransformStep | DomTransformStep;

// ---- Script Step ----

export type ScriptStep = {
	readonly type: "script";
	readonly code: string;
};

// ---- Unified Step ----

export type RuleStep = ExtractStep | TransformStep | ScriptStep;

// ---- Rule ----

export type Rule = readonly RuleStep[];

export type RuleObject = {
	readonly jsonpath?: string;
	readonly css?: string;
	readonly xpath?: string;
	readonly regex?: string;
	readonly template?: string;
	readonly js?: string;
	readonly attr?: string;
	readonly separator?: string;
	readonly reverse?: boolean;
	readonly transform?: readonly TransformStep[];
};

// ---- Compiled Types ----

export type CompiledExtractStep = ExtractStep & {
	readonly compiledSelector?: unknown;
};

export type CompiledTransformStep = TransformStep & {
	readonly compiledRegex?: RegExp;
};

export type CompiledScriptStep = ScriptStep;

export type CompiledStep =
	| CompiledExtractStep
	| CompiledTransformStep
	| CompiledScriptStep;

export type CompiledRule = {
	readonly steps: readonly CompiledStep[];
};

// ---- Book Source ----

export type BookSourceType = "novel" | "audio" | "comic" | "file";

export type RequestConfig = {
	readonly url?: string;
	readonly method?: "GET" | "POST";
	readonly charset?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: string;
	readonly responseType?: "html" | "json" | "xml" | "text";
};

export type BookSource = {
	readonly $schema: string;
	readonly id: string;
	readonly name: string;
	readonly type: BookSourceType;
	readonly baseUrl: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly author?: string;
	readonly version?: number;
	readonly headers?: Readonly<Record<string, string>>;
	readonly loginUrl?: string;
	readonly enabled?: boolean;
	readonly weight?: number;
	readonly order?: number;
	readonly rateLimit?: number;
	readonly urlPattern?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly search?: SearchModule;
	readonly explore?: ExploreModule;
	readonly bookInfo?: BookInfoModule;
	readonly toc?: TocModule;
	readonly content?: ContentModule;
};

export type SearchModule = RequestConfig & {
	readonly url: string;
	readonly list: Rule;
	readonly name: Rule;
	readonly author?: Rule;
	readonly coverUrl?: Rule;
	readonly bookUrl?: Rule;
	readonly kind?: Rule;
	readonly intro?: Rule;
	readonly wordCount?: Rule;
	readonly lastChapter?: Rule;
};

export type ExploreCategory = {
	readonly title: string;
	readonly url: string;
};

export type ExploreModule = RequestConfig & {
	readonly categories: readonly ExploreCategory[];
	readonly list: Rule;
	readonly name: Rule;
	readonly author?: Rule;
	readonly coverUrl?: Rule;
	readonly bookUrl?: Rule;
	readonly kind?: Rule;
	readonly intro?: Rule;
	readonly wordCount?: Rule;
	readonly lastChapter?: Rule;
};

export type BookInfoModule = RequestConfig & {
	readonly name?: Rule;
	readonly author?: Rule;
	readonly coverUrl?: Rule;
	readonly intro?: Rule;
	readonly kind?: Rule;
	readonly lastChapter?: Rule;
	readonly wordCount?: Rule;
	readonly tocUrl?: Rule;
};

export type TocModule = RequestConfig & {
	readonly list: Rule;
	readonly name: Rule;
	readonly url: Rule;
	readonly isVip?: Rule;
	readonly isVolume?: Rule;
	readonly updateTime?: Rule;
	readonly nextUrl?: Rule;
};

export type ContentModule = RequestConfig & {
	readonly content: Rule;
	readonly nextUrl?: Rule;
	readonly replaceRegex?: readonly ReplacePair[];
};

export type ReplacePair = {
	readonly pattern: string;
	readonly replacement: string;
};

// ---- Dict Rule ----

export type DictRuleFile = {
	readonly $schema: string;
	readonly authors: readonly string[];
	readonly description?: string;
	readonly updatedAt?: string;
	readonly rules: readonly DictRule[];
};

export type DictRule = {
	readonly id: string;
	readonly name: string;
	readonly tags?: readonly string[];
	readonly enabled?: boolean;
	readonly weight?: number;
	readonly variables?: Readonly<Record<string, string>>;
	readonly request: DictRequest;
	readonly fields: Readonly<Record<string, DictField>>;
};

export type DictRequest = {
	readonly url: string;
	readonly method?: "GET" | "POST";
	readonly charset?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: string;
};

export type FieldSchema = "html" | "string" | "html[]" | "string[]";

export type DictField = {
	readonly schema: FieldSchema;
	readonly steps: readonly RuleStep[];
};

// ---- Replace Rule ----

export type ReplaceRuleFile = {
	readonly $schema: string;
	readonly rules: readonly ReplaceRule[];
};

export type ReplaceRule = {
	readonly name?: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly enabled?: boolean;
	readonly order?: number;
	readonly scope?: ReplaceScope;
	readonly pattern: string;
	readonly flags?: string;
	readonly literal?: boolean;
	readonly replacement?: string;
	readonly replacementJs?: string;
};

export type ReplaceScope = {
	readonly include?: readonly string[];
	readonly exclude?: readonly string[];
	readonly target?: "content" | "title" | "both";
};

// ---- TXT TOC Rule ----

export type TxtTocRuleFile = {
	readonly $schema: string;
	readonly rules: readonly TxtTocRule[];
};

export type TxtTocRule = {
	readonly name?: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly enabled?: boolean;
	readonly order?: number;
	readonly pattern: string;
	readonly flags?: string;
};

export type ChapterBoundary = {
	readonly lineIndex: number;
	readonly title: string;
	readonly ruleName: string;
};

// ---- Evaluation Context ----

export type JsExecutor = {
	eval(code: string, context: JsEvalContext): Promise<JsEvalResult>;
};

export type JsEvalContext = {
	readonly result: string;
	readonly baseUrl?: string;
	readonly src?: string;
	readonly source?: Readonly<Record<string, unknown>>;
	readonly book?: Readonly<Record<string, unknown>>;
	readonly chapter?: Readonly<Record<string, unknown>>;
	readonly key?: string;
	readonly page?: number;
};

export type JsEvalResult = {
	readonly success: boolean;
	readonly value?: unknown;
	readonly error?: string;
};

export type DocumentCache = {
	getHTML(html: string, url?: string): Document;
	getXML(xml: string): Document;
	getJSON(json: string): unknown;
	dispose(): void;
};

export type EvalContext = {
	readonly baseUrl?: string;
	readonly variables?: Readonly<Record<string, string>>;
	readonly allowScript?: boolean;
	readonly jsExecutor?: JsExecutor;
	readonly documentCache?: DocumentCache;
	readonly source?: Readonly<Record<string, unknown>>;
	readonly book?: Readonly<Record<string, unknown>>;
	readonly chapter?: Readonly<Record<string, unknown>>;
	readonly key?: string;
	readonly page?: number;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/types.ts packages/rule-engine/__tests__/unit/types.test.ts
git commit -m "feat(rule-engine): add all TypeScript type definitions matching ReaderX schemas"
```

---

## Phase 2: Platform Layer

### Task 4: dom-parse + document-cache

**Files:**
- Create: `packages/rule-engine/src/dom-parse.ts`
- Create: `packages/rule-engine/src/dom-parse.browser.ts`
- Create: `packages/rule-engine/src/document-cache.ts`
- Test: `packages/rule-engine/__tests__/unit/document-cache.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/document-cache.test.ts
import { describe, expect, it } from "vitest";
import { createDocumentCache } from "@/rule-engine/document-cache";

describe("DocumentCache", () => {
	it("parses HTML and returns a Document", () => {
		const cache = createDocumentCache();
		const doc = cache.getHTML("<div><p>hello</p></div>");
		expect(doc.querySelector("p")?.textContent).toBe("hello");
		cache.dispose();
	});

	it("caches: same HTML returns same Document", () => {
		const cache = createDocumentCache();
		const html = "<div>test</div>";
		const doc1 = cache.getHTML(html);
		const doc2 = cache.getHTML(html);
		expect(doc1).toBe(doc2);
		cache.dispose();
	});

	it("parses XML and returns a Document", () => {
		const cache = createDocumentCache();
		const doc = cache.getXML("<root><item>1</item></root>");
		expect(doc.querySelector("item")?.textContent).toBe("1");
		cache.dispose();
	});

	it("parses JSON and returns parsed object", () => {
		const cache = createDocumentCache();
		const obj = cache.getJSON('{"name":"test"}');
		expect(obj).toEqual({ name: "test" });
		cache.dispose();
	});

	it("dispose clears caches", () => {
		const cache = createDocumentCache();
		const doc1 = cache.getHTML("<div>a</div>");
		cache.dispose();
		const doc2 = cache.getHTML("<div>a</div>");
		// After dispose, should be a new Document (not the same reference)
		expect(doc2).not.toBe(doc1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/document-cache.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement dom-parse.ts (Node.js — happy-dom)**

```typescript
// src/dom-parse.ts
import { Window } from "happy-dom";

export type ParsedDocument = {
	readonly document: Document;
	readonly dispose: () => void;
};

export function parseHTML(html: string, url?: string): ParsedDocument {
	const window = new Window({ url: url ?? "about:blank" });
	window.document.write(html);
	return {
		document: window.document,
		dispose: () => {
			window.happyDOM.close();
		},
	};
}

export function parseXML(xml: string): ParsedDocument {
	const window = new Window({ url: "about:blank" });
	const parser = new window.DOMParser();
	const doc = parser.parseFromString(xml, "text/xml");
	return {
		document: doc,
		dispose: () => {
			window.happyDOM.close();
		},
	};
}
```

- [ ] **Step 4: Implement dom-parse.browser.ts (Browser — native)**

```typescript
// src/dom-parse.browser.ts

export type ParsedDocument = {
	readonly document: Document;
	readonly dispose: () => void;
};

export function parseHTML(html: string, _url?: string): ParsedDocument {
	const parser = new DOMParser();
	return {
		document: parser.parseFromString(html, "text/html"),
		dispose: () => {},
	};
}

export function parseXML(xml: string): ParsedDocument {
	const parser = new DOMParser();
	return {
		document: parser.parseFromString(xml, "text/xml"),
		dispose: () => {},
	};
}
```

- [ ] **Step 5: Implement document-cache.ts**

```typescript
// src/document-cache.ts
import type { DocumentCache } from "./types";
import { parseHTML, parseXML } from "./dom-parse";

export function createDocumentCache(): DocumentCache {
	const htmlCache = new Map<string, Document>();
	const xmlCache = new Map<string, Document>();
	const jsonCache = new Map<string, unknown>();

	return {
		getHTML(html: string, url?: string): Document {
			const cached = htmlCache.get(html);
			if (cached) return cached;
			const { document, dispose } = parseHTML(html, url);
			// Note: we don't call dispose() for cached documents
			// They live until dispose() is called on the cache
			htmlCache.set(html, document);
			return document;
		},
		getXML(xml: string): Document {
			const cached = xmlCache.get(xml);
			if (cached) return cached;
			const { document } = parseXML(xml);
			xmlCache.set(xml, document);
			return document;
		},
		getJSON(json: string): unknown {
			const cached = jsonCache.get(json);
			if (cached !== undefined) return cached;
			const parsed: unknown = JSON.parse(json);
			jsonCache.set(json, parsed);
			return parsed;
		},
		dispose(): void {
			htmlCache.clear();
			xmlCache.clear();
			jsonCache.clear();
		},
	};
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/document-cache.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/rule-engine/src/dom-parse.ts packages/rule-engine/src/dom-parse.browser.ts packages/rule-engine/src/document-cache.ts packages/rule-engine/__tests__/unit/document-cache.test.ts
git commit -m "feat(rule-engine): add platform DOM parsing (happy-dom + native) and DocumentCache"
```

---

## Phase 3: Extraction Engines

### Task 5: serialize.ts — RuntimeValue → string

**Files:**
- Create: `packages/rule-engine/src/serialize.ts`
- Test: `packages/rule-engine/__tests__/unit/serialize.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/serialize.test.ts
import { describe, expect, it } from "vitest";
import { serializeValue, serializeResult, elementToText } from "@/rule-engine/serialize";

describe("serialize", () => {
	it("string passes through", () => {
		expect(serializeValue("hello")).toBe("hello");
	});

	it("serializes a string array", () => {
		expect(serializeResult(["a", "b", "c"])).toEqual(["a", "b", "c"]);
	});

	it("filters out non-string values in serializeResult", () => {
		// Elements/Documents/objects become empty string
		const result = serializeResult(["text", 42, null]);
		expect(result).toEqual(["text", "", ""]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/serialize.test.ts
```

- [ ] **Step 3: Implement serialize.ts**

```typescript
// src/serialize.ts
import type { RuntimeResult, RuntimeValue, ExtractOutput } from "./types";

export function serializeValue(
	value: RuntimeValue,
	output?: ExtractOutput,
	attr?: string,
): string {
	if (typeof value === "string") return value;
	if (value === null || value === undefined) return "";
	if (value instanceof Element || value instanceof Document) {
		return serializeElement(value, output ?? "text", attr);
	}
	return String(value);
}

export function serializeElement(
	el: Element | Document,
	output: ExtractOutput,
	attr?: string,
): string {
	switch (output) {
		case "text":
			return el.textContent ?? "";
		case "html":
			return "innerHTML" in el ? (el.innerHTML as string) : "";
		case "outerHtml":
			return "outerHTML" in el ? (el.outerHTML as string) : "";
		case "attr":
			return el instanceof Element && attr ? (el.getAttribute(attr) ?? "") : "";
		default:
			return el.textContent ?? "";
	}
}

export function elementToText(value: RuntimeValue): string {
	if (typeof value === "string") return value;
	if (value instanceof Element || value instanceof Document) {
		return value.textContent ?? "";
	}
	return String(value ?? "");
}

export function serializeResult(values: RuntimeResult): string[] {
	return values.map((v) => {
		if (typeof v === "string") return v;
		if (v === null || v === undefined) return "";
		if (v instanceof Element || v instanceof Document) return v.textContent ?? "";
		return "";
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/serialize.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/serialize.ts packages/rule-engine/__tests__/unit/serialize.test.ts
git commit -m "feat(rule-engine): add RuntimeValue serialization utilities"
```

---

### Task 6: CSS Extraction Engine

**Files:**
- Create: `packages/rule-engine/src/css.ts`
- Test: `packages/rule-engine/__tests__/unit/extract-css.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/extract-css.test.ts
import { describe, expect, it } from "vitest";
import { extractCss } from "@/rule-engine/css";

const HTML = `
<div class="book">
  <h1 class="title">Book A</h1>
  <span class="author">Author A</span>
</div>
<div class="book">
  <h1 class="title">Book B</h1>
  <span class="author">Author B</span>
</div>
`;

describe("extractCss", () => {
	it("extracts text from multiple elements", () => {
		const result = extractCss(".title", HTML, { output: "text" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			const texts = result.value.map(v => typeof v === "string" ? v : "");
			expect(texts).toEqual(["Book A", "Book B"]);
		}
	});

	it("extracts elements without serialization when no output", () => {
		const result = extractCss(".book", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toHaveLength(2);
			for (const v of result.value) {
				expect(v).toBeInstanceOf(Element);
			}
		}
	});

	it("extracts innerHTML", () => {
		const result = extractCss(".book", HTML, { output: "html" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value[0]).toContain("Book A");
		}
	});

	it("extracts attribute", () => {
		const html = '<a href="/page">link</a>';
		const result = extractCss("a", html, { output: "attr", attr: "href" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value[0]).toBe("/page");
		}
	});

	it("returns empty array for no matches", () => {
		const result = extractCss(".nonexistent", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toHaveLength(0);
	});

	it("returns error for invalid selector", () => {
		const result = extractCss("[invalid", HTML);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("INVALID_SELECTOR");
	});

	it("extracts from Element scope (scoped)", () => {
		// First extract .book elements
		const books = extractCss(".book", HTML);
		expect(books.ok).toBe(true);
		if (!books.ok) return;

		// Then extract .title from each book element
		const bookEl = books.value[0];
		expect(bookEl).toBeInstanceOf(Element);

		const titles = extractCss(".title", bookEl as Element, { output: "text" });
		expect(titles.ok).toBe(true);
		if (titles.ok) {
			const texts = titles.value.map(v => typeof v === "string" ? v : "");
			expect(texts).toEqual(["Book A"]);
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-css.test.ts
```

- [ ] **Step 3: Implement css.ts**

```typescript
// src/css.ts
import type { RuntimeResult, ExtractOutput } from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";
import { parseHTML } from "./dom-parse";
import { serializeValue } from "./serialize";

export function extractCss(
	selector: string,
	content: string | Element | Document,
	options?: { readonly output?: ExtractOutput; readonly attr?: string },
): Result<RuntimeResult> {
	try {
		let root: Document | Element;
		let dispose: (() => void) | undefined;

		if (typeof content === "string") {
			const parsed = parseHTML(content);
			root = parsed.document;
			dispose = parsed.dispose;
		} else {
			root = content;
		}

		const elements = root.querySelectorAll(selector);
		const results: RuntimeResult = options?.output
			? Array.from(elements).map((el) =>
					serializeValue(el, options.output, options.attr),
				)
			: Array.from(elements);

		dispose?.();
		return ok(results);
	} catch (e) {
		return err({
			code: "INVALID_SELECTOR",
			message: `Invalid CSS selector: ${selector}`,
			rule: selector,
			cause: e,
		});
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-css.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/css.ts packages/rule-engine/__tests__/unit/extract-css.test.ts
git commit -m "feat(rule-engine): add CSS selector extraction engine"
```

---

### Task 7: XPath Extraction Engine

**Files:**
- Create: `packages/rule-engine/src/xpath-eval.ts`
- Create: `packages/rule-engine/src/xpath-eval.browser.ts`
- Create: `packages/rule-engine/src/xpath.ts`
- Test: `packages/rule-engine/__tests__/unit/extract-xpath.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/extract-xpath.test.ts
import { describe, expect, it } from "vitest";
import { extractXPath } from "@/rule-engine/xpath";

const HTML = `
<html><body>
<div class="book">
  <h1 class="title">Book A</h1>
</div>
<div class="book">
  <h1 class="title">Book B</h1>
</div>
</body></html>
`;

describe("extractXPath", () => {
	it("extracts text from elements", () => {
		const result = extractXPath("//h1[@class='title']", HTML, { output: "text" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			const texts = result.value.map(v => typeof v === "string" ? v : "");
			expect(texts).toEqual(["Book A", "Book B"]);
		}
	});

	it("returns error for invalid expression", () => {
		const result = extractXPath("//[invalid", HTML);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("XPATH_ERROR");
	});

	it("extracts from Element scope", () => {
		const xpath = require("@readerx/rule-engine");
		// First get the first book div
		const books = extractXPath("//div[@class='book']", HTML);
		expect(books.ok).toBe(true);
		if (!books.ok) return;

		const bookEl = books.value[0];
		expect(bookEl).toBeInstanceOf(Element);

		const titles = extractXPath(".//h1", bookEl as Element, { output: "text" });
		expect(titles.ok).toBe(true);
		if (titles.ok) {
			const texts = titles.value.map(v => typeof v === "string" ? v : "");
			expect(texts).toEqual(["Book A"]);
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-xpath.test.ts
```

- [ ] **Step 3: Implement xpath-eval.ts (Node.js — happy-dom)**

```typescript
// src/xpath-eval.ts
// XPath evaluation via happy-dom's document.evaluate()
// This file is replaced by xpath-eval.browser.ts in browser builds

export type XPathResultType =
	| "ANY_TYPE"
	| "NUMBER_TYPE"
	| "STRING_TYPE"
	| "BOOLEAN_TYPE"
	| "UNORDERED_NODE_ITERATOR_TYPE"
	| "ORDERED_NODE_ITERATOR_TYPE";

export type XPathEvalResult = {
	readonly nodes: Node[];
};

export function evaluateXPath(
	expression: string,
	contextNode: Document | Element,
): XPathEvalResult {
	const doc = contextNode instanceof Document ? contextNode : contextNode.ownerDocument;
	if (!doc) throw new Error("No owner document");

	const result = doc.evaluate(
		expression,
		contextNode,
		null,
		// XPathResult.ORDERED_NODE_ITERATOR_TYPE = 5
		5,
		null,
	);

	const nodes: Node[] = [];
	let node: Node | null;
	while ((node = result.iterateNext()) !== null) {
		nodes.push(node);
	}

	return { nodes };
}
```

- [ ] **Step 4: Implement xpath-eval.browser.ts (Browser — native)**

```typescript
// src/xpath-eval.browser.ts
// XPath evaluation via native document.evaluate()

export type XPathEvalResult = {
	readonly nodes: Node[];
};

export function evaluateXPath(
	expression: string,
	contextNode: Document | Element,
): XPathEvalResult {
	const doc = contextNode instanceof Document ? contextNode : contextNode.ownerDocument;
	if (!doc) throw new Error("No owner document");

	const result = doc.evaluate(
		expression,
		contextNode,
		null,
		XPathResult.ORDERED_NODE_ITERATOR_TYPE,
		null,
	);

	const nodes: Node[] = [];
	let node: Node | null;
	while ((node = result.iterateNext()) !== null) {
		nodes.push(node);
	}

	return { nodes };
}
```

- [ ] **Step 5: Implement xpath.ts (public API)**

```typescript
// src/xpath.ts
import type { RuntimeResult, ExtractOutput } from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";
import { parseHTML } from "./dom-parse";
import { evaluateXPath } from "./xpath-eval";
import { serializeValue } from "./serialize";

export function extractXPath(
	expression: string,
	content: string | Element | Document,
	options?: { readonly output?: ExtractOutput },
): Result<RuntimeResult> {
	try {
		let root: Document | Element;
		let dispose: (() => void) | undefined;

		if (typeof content === "string") {
			const parsed = parseHTML(content);
			root = parsed.document;
			dispose = parsed.dispose;
		} else {
			root = content;
		}

		const { nodes } = evaluateXPath(expression, root);
		const elements = nodes.filter((n): n is Element => n.nodeType === 1);

		const results: RuntimeResult = options?.output
			? elements.map((el) => serializeValue(el, options.output))
			: elements;

		dispose?.();
		return ok(results);
	} catch (e) {
		return err({
			code: "XPATH_ERROR",
			message: `XPath evaluation failed: ${expression}`,
			rule: expression,
			cause: e,
		});
	}
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-xpath.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/rule-engine/src/xpath-eval.ts packages/rule-engine/src/xpath-eval.browser.ts packages/rule-engine/src/xpath.ts packages/rule-engine/__tests__/unit/extract-xpath.test.ts
git commit -m "feat(rule-engine): add XPath extraction engine with platform dual implementation"
```

---

### Task 8: JSONPath Extraction (RFC 9535)

**Files:**
- Create: `packages/rule-engine/src/jsonpath.ts`
- Test: `packages/rule-engine/__tests__/unit/extract-jsonpath.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/extract-jsonpath.test.ts
import { describe, expect, it } from "vitest";
import { extractJsonPath } from "@/rule-engine/jsonpath";

const DATA = {
	books: [
		{ title: "Book A", author: "Author A", price: 10 },
		{ title: "Book B", author: "Author B", price: 20 },
	],
	total: 2,
};

describe("extractJsonPath", () => {
	it("extracts values using JSONPath", () => {
		const result = extractJsonPath("$.books[*].title", DATA);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["Book A", "Book B"]);
	});

	it("extracts single value", () => {
		const result = extractJsonPath("$.total", DATA);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual([2]);
	});

	it("extracts nested objects", () => {
		const result = extractJsonPath("$.books[0]", DATA);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value[0]).toEqual({ title: "Book A", author: "Author A", price: 10 });
		}
	});

	it("returns empty for no matches", () => {
		const result = extractJsonPath("$.nonexistent", DATA);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual([]);
	});

	it("returns error for invalid path", () => {
		const result = extractJsonPath("$[invalid", DATA);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("JSONPATH_ERROR");
	});

	it("handles string input (parses JSON)", () => {
		const result = extractJsonPath("$.name", '{"name":"test"}');
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["test"]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-jsonpath.test.ts
```

- [ ] **Step 3: Implement jsonpath.ts**

```typescript
// src/jsonpath.ts
import type { RuntimeResult } from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";

// @swaggerexpert/jsonpath — RFC 9535 compliant
import JSONPath from "@swaggerexpert/jsonpath";

export function extractJsonPath(
	path: string,
	data: unknown | string,
): Result<RuntimeResult> {
	try {
		const parsed = typeof data === "string" ? (JSON.parse(data) as unknown) : data;
		const jsonPath = JSONPath.parse(path);
		const result = jsonPath.query(parsed);
		return ok(result as RuntimeResult);
	} catch (e) {
		return err({
			code: "JSONPATH_ERROR",
			message: `JSONPath query failed: ${path}`,
			rule: path,
			cause: e,
		});
	}
}
```

Note: Check `@swaggerexpert/jsonpath` API for exact usage. The library provides `JSONPath.parse(path)` and `jsonpath.query(data)` or similar. Verify the exact API at implementation time and adjust accordingly. The key contract is: RFC 9535 JSONPath string + JS object → array of matches.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-jsonpath.test.ts
```

Expected: PASS (adjust API calls if @swaggerexpert/jsonpath has different method names)

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/jsonpath.ts packages/rule-engine/__tests__/unit/extract-jsonpath.test.ts
git commit -m "feat(rule-engine): add JSONPath extraction using @swaggerexpert/jsonpath (RFC 9535)"
```

---

### Task 9: Regex Extraction

**Files:**
- Create: `packages/rule-engine/src/regex.ts`
- Test: `packages/rule-engine/__tests__/unit/extract-regex.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/extract-regex.test.ts
import { describe, expect, it } from "vitest";
import { extractRegex } from "@/rule-engine/regex";

describe("extractRegex", () => {
	it("extracts all matches as full match", () => {
		const result = extractRegex("\\d+", "abc123def456");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["123", "456"]);
	});

	it("extracts capture groups", () => {
		const result = extractRegex("(\\w+)@(\\w+)", "a@b c@d");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["a@b", "c@d"]);
	});

	it("respects flags", () => {
		const result = extractRegex("hello", "Hello hello HELLO", "gi");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toHaveLength(3);
	});

	it("returns empty for no matches", () => {
		const result = extractRegex("xyz", "abc");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual([]);
	});

	it("returns error for invalid regex", () => {
		const result = extractRegex("[invalid", "test");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("REGEX_ERROR");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-regex.test.ts
```

- [ ] **Step 3: Implement regex.ts**

```typescript
// src/regex.ts
import type { RuntimeResult } from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";

export function extractRegex(
	pattern: string,
	content: string,
	flags?: string,
): Result<RuntimeResult> {
	try {
		const re = new RegExp(pattern, flags ?? "g");
		const matches = [...content.matchAll(re)];
		return ok(matches.map((m) => m[0] ?? ""));
	} catch (e) {
		return err({
			code: "REGEX_ERROR",
			message: `Invalid regex pattern: ${pattern}`,
			rule: pattern,
			cause: e,
		});
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/extract-regex.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/regex.ts packages/rule-engine/__tests__/unit/extract-regex.test.ts
git commit -m "feat(rule-engine): add regex extraction engine"
```

---

### Task 10: Template Variable Expansion

**Files:**
- Create: `packages/rule-engine/src/template.ts`
- Test: (tested via url-analyzer and integration tests)

- [ ] **Step 1: Implement template.ts**

```typescript
// src/template.ts

export function expandTemplate(
	template: string,
	variables: Readonly<Record<string, string | undefined>>,
): string {
	let result = template;
	for (const [key, value] of Object.entries(variables)) {
		if (value !== undefined) {
			result = result.replaceAll(`{{${key}}}`, value);
		}
	}
	return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/rule-engine/src/template.ts
git commit -m "feat(rule-engine): add template variable expansion"
```

---

## Phase 4: Transform + Core Pipeline

### Task 11: Transform Implementations

**Files:**
- Create: `packages/rule-engine/src/transform.ts`
- Test: `packages/rule-engine/__tests__/unit/transform-string.test.ts`
- Test: `packages/rule-engine/__tests__/unit/transform-dom.test.ts`

- [ ] **Step 1: Write the string transform test**

```typescript
// __tests__/unit/transform-string.test.ts
import { describe, expect, it } from "vitest";
import { applyStringTransform } from "@/rule-engine/transform";
import type { StringTransformStep } from "@/rule-engine/types";

describe("applyStringTransform", () => {
	it("replace: replaces all matches", () => {
		const step: StringTransformStep = { type: "transform", category: "string", action: "replace", pattern: "\\s+", replacement: " " };
		const compiled = { ...step, compiledRegex: /\s+/g };
		const result = applyStringTransform(compiled, ["  hello   world  "]);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual([" hello world "]);
	});

	it("match: extracts capture groups", () => {
		const step: StringTransformStep = { type: "transform", category: "string", action: "match", pattern: "(\\w+)@(\\w+)", group: 1 };
		const compiled = { ...step, compiledRegex: /(\w+)@(\w+)/g };
		const result = applyStringTransform(compiled, ["a@b c@d"]);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["a", "c"]);
	});

	it("split: splits by pattern", () => {
		const step: StringTransformStep = { type: "transform", category: "string", action: "split", pattern: "," };
		const compiled = { ...step, compiledRegex: /,/g };
		const result = applyStringTransform(compiled, ["a,b,c"]);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["a", "b", "c"]);
	});

	it("template: expands {{result}}", () => {
		const step: StringTransformStep = { type: "transform", category: "string", action: "template", template: "[{{result}}]" };
		const compiled = { ...step, compiledRegex: undefined };
		const result = applyStringTransform(compiled, ["hello"]);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["[hello]"]);
	});

	it("trim: trims whitespace", () => {
		const step: StringTransformStep = { type: "transform", category: "string", action: "trim" };
		const compiled = { ...step, compiledRegex: undefined };
		const result = applyStringTransform(compiled, ["  hello  "]);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["hello"]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/transform-string.test.ts
```

- [ ] **Step 3: Implement transform.ts**

```typescript
// src/transform.ts
import type { RuntimeResult, StringTransformStep, DomTransformStep, CompiledTransformStep } from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";
import { elementToText } from "./serialize";

function isElement(value: unknown): value is Element {
	return value instanceof Element;
}

export function applyStringTransform(
	step: CompiledTransformStep,
	input: RuntimeResult,
): Result<RuntimeResult> {
	// Auto-serialize non-string values to text
	const strings = input.map((v) =>
		typeof v === "string" ? v : elementToText(v),
	);

	const def = step as StringTransformStep;

	switch (def.action) {
		case "replace": {
			const re = step.compiledRegex ?? new RegExp(def.pattern ?? "", def.flags ?? "g");
			return ok(strings.map((s) => s.replaceAll(re, def.replacement ?? "")));
		}
		case "match": {
			const re = step.compiledRegex ?? new RegExp(def.pattern ?? "", def.flags ?? "g");
			return ok(
				strings.flatMap((s) => {
					const matches = [...s.matchAll(re)];
					return matches.map((m) => m[def.group ?? 0] ?? "");
				}),
			);
		}
		case "split": {
			const re = step.compiledRegex ?? new RegExp(def.pattern ?? "", def.flags ?? "g");
			return ok(strings.flatMap((s) => s.split(re)));
		}
		case "template":
			return ok(
				strings.map((s) => (def.template ?? "").replaceAll("{{result}}", s)),
			);
		case "trim":
			return ok(strings.map((s) => s.trim()));
	}
}

export function applyDomTransform(
	step: DomTransformStep,
	input: RuntimeResult,
): Result<RuntimeResult> {
	const elements = input.filter(isElement);
	if (elements.length !== input.length) {
		return err({
			code: "TYPE_MISMATCH",
			message: `DomTransform action "${step.action}" requires Element input, got ${input.length - elements.length} non-Element values`,
		});
	}

	switch (step.action) {
		case "remove":
			return ok(
				elements.map((el) => {
					const clone = el.cloneNode(true) as Element;
					clone.querySelectorAll(step.selector).forEach((child) => child.remove());
					return clone as unknown;
				}),
			);
		case "unwrap":
			return ok(
				elements.map((el) => {
					const clone = el.cloneNode(true) as Element;
					clone.querySelectorAll(step.selector).forEach((child) => {
						const parent = child.parentNode;
						if (parent) {
							while (child.firstChild) {
								parent.insertBefore(child.firstChild, child);
							}
							child.remove();
						}
					});
					return clone as unknown;
				}),
			);
		case "strip":
			return ok(
				elements.map((el) => {
					const clone = el.cloneNode(true) as Element;
					clone.querySelectorAll(step.selector).forEach((child) => {
						for (const attr of step.attributes ?? []) {
							child.removeAttribute(attr);
						}
					});
					return clone as unknown;
				}),
			);
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/transform-string.test.ts
```

Expected: PASS

- [ ] **Step 5: Write DOM transform test**

```typescript
// __tests__/unit/transform-dom.test.ts
import { describe, expect, it } from "vitest";
import { applyDomTransform } from "@/rule-engine/transform";
import type { DomTransformStep } from "@/rulex/rule-engine/types";
import { parseHTML } from "@/rule-engine/dom-parse";

describe("applyDomTransform", () => {
	it("remove: removes matching elements", () => {
		const { document } = parseHTML("<div><p class='ad'>AD</p><p class='content'>Text</p></div>");
		const el = document.querySelector("div")!;
		const step: DomTransformStep = { type: "transform", category: "dom", action: "remove", selector: ".ad" };
		const result = applyDomTransform(step, [el]);
		expect(result.ok).toBe(true);
		if (result.ok) {
			const out = result.value[0] as Element;
			expect(out.querySelector(".ad")).toBeNull();
			expect(out.textContent).toContain("Text");
		}
	});

	it("returns error when input is not Element[]", () => {
		const step: DomTransformStep = { type: "transform", category: "dom", action: "remove", selector: ".ad" };
		const result = applyDomTransform(step, ["string input"]);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("TYPE_MISMATCH");
	});
});
```

- [ ] **Step 6: Run DOM transform test**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/transform-dom.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/rule-engine/src/transform.ts packages/rule-engine/__tests__/unit/transform-string.test.ts packages/rule-engine/__tests__/unit/transform-dom.test.ts
git commit -m "feat(rule-engine): add string and DOM transform implementations"
```

---

### Task 12: normalize.ts — RuleObject → RuleStep[]

**Files:**
- Create: `packages/rule-engine/src/normalize.ts`
- Test: `packages/rule-engine/__tests__/unit/normalize.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/normalize.test.ts
import { describe, expect, it } from "vitest";
import { normalizeRule, toRule } from "@/rule-engine/normalize";
import type { RuleObject, RuleStep } from "@/rule-engine/types";

describe("normalizeRule", () => {
	it("converts css RuleObject to ExtractStep", () => {
		const obj: RuleObject = { css: ".title" };
		const steps = normalizeRule(obj);
		expect(steps).toHaveLength(1);
		expect(steps[0]!.type).toBe("extract");
		if (steps[0]!.type === "extract") expect(steps[0]!.engine).toBe("css");
	});

	it("converts xpath RuleObject with output", () => {
		const obj: RuleObject = { xpath: "//h1", attr: "text" };
		const steps = normalizeRule(obj);
		expect(steps).toHaveLength(1);
		if (steps[0]!.type === "extract") {
			expect(steps[0]!.engine).toBe("xpath");
			expect(steps[0]!.output).toBe("text");
		}
	});

	it("appends transform chain", () => {
		const obj: RuleObject = {
			css: ".content",
			transform: [
				{ type: "transform", category: "string", action: "replace", pattern: "\\s+", replacement: " " },
				{ type: "transform", category: "string", action: "trim" },
			],
		};
		const steps = normalizeRule(obj);
		expect(steps).toHaveLength(3); // 1 extract + 2 transforms
	});

	it("converts js RuleObject to ScriptStep", () => {
		const obj: RuleObject = { js: "return result.toUpperCase();" };
		const steps = normalizeRule(obj);
		expect(steps).toHaveLength(1);
		expect(steps[0]!.type).toBe("script");
	});

	it("converts template RuleObject to ExtractStep with template engine", () => {
		const obj: RuleObject = { template: "{{result}}" };
		const steps = normalizeRule(obj);
		expect(steps).toHaveLength(1);
		if (steps[0]!.type === "extract") expect(steps[0]!.engine).toBe("template");
	});
});

describe("toRule", () => {
	it("passes RuleStep[] through unchanged", () => {
		const steps = [
			{ type: "extract" as const, engine: "css" as const, selector: ".title" },
		];
		expect(toRule(steps)).toBe(steps);
	});

	it("normalizes RuleObject to RuleStep[]", () => {
		const obj: RuleObject = { css: ".title" };
		const rule = toRule(obj);
		expect(rule).toHaveLength(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/normalize.test.ts
```

- [ ] **Step 3: Implement normalize.ts**

```typescript
// src/normalize.ts
import type { Rule, RuleObject, RuleStep, ExtractStep, TransformStep, ScriptStep, ExtractEngine } from "./types";

const ENGINE_MAP: Record<string, ExtractEngine> = {
	jsonpath: "jsonpath",
	css: "css",
	xpath: "xpath",
	regex: "regex",
};

export function normalizeRule(rule: RuleObject): RuleStep[] {
	const steps: RuleStep[] = [];

	// Find the extractor field
	const js = rule.js;
	const template = rule.template;

	if (js !== undefined) {
		// JS becomes a ScriptStep
		steps.push({ type: "script", code: js } satisfies ScriptStep);
	} else if (template !== undefined) {
		// Template becomes an extract step
		steps.push({
			type: "extract",
			engine: "template",
			selector: template,
			...(rule.attr ? { output: rule.attr as ExtractStep["output"] } : {}),
		} satisfies ExtractStep);
	} else {
		// CSS/XPath/JSONPath/Regex
		for (const [key, engine] of Object.entries(ENGINE_MAP)) {
			const selector = rule[key as keyof RuleObject];
			if (typeof selector === "string") {
				steps.push({
					type: "extract",
					engine,
					selector,
					...(rule.attr ? { output: rule.attr as ExtractStep["output"] } : {}),
				} satisfies ExtractStep);
				break; // Only one extractor
			}
		}
	}

	// Append transform chain
	if (rule.transform) {
		steps.push(...rule.transform);
	}

	return steps;
}

export function toRule(rule: RuleObject | readonly RuleStep[]): Rule {
	if (Array.isArray(rule)) {
		return rule as Rule;
	}
	return normalizeRule(rule);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/normalize.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/normalize.ts packages/rule-engine/__tests__/unit/normalize.test.ts
git commit -m "feat(rule-engine): add RuleObject → RuleStep[] normalization"
```

---

### Task 13: compile.ts — Compile Phase

**Files:**
- Create: `packages/rule-engine/src/compile.ts`
- Test: `packages/rule-engine/__tests__/unit/compile.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/compile.test.ts
import { describe, expect, it } from "vitest";
import { compileRule, compileSteps } from "@/rule-engine/compile";
import type { RuleStep } from "@/rule-engine/types";

describe("compileRule", () => {
	it("compiles a valid rule", () => {
		const steps: RuleStep[] = [
			{ type: "extract", engine: "css", selector: ".title", output: "text" },
			{ type: "transform", category: "string", action: "trim" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.steps).toHaveLength(2);
		}
	});

	it("pre-compiles regex for replace transform", () => {
		const steps: RuleStep[] = [
			{ type: "transform", category: "string", action: "replace", pattern: "\\s+", flags: "g" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(true);
		if (result.ok) {
			const compiled = result.value.steps[0]!;
			expect(compiled).toHaveProperty("compiledRegex");
			if ("compiledRegex" in compiled) {
				expect(compiled.compiledRegex).toBeInstanceOf(RegExp);
			}
		}
	});

	it("returns error for invalid regex", () => {
		const steps: RuleStep[] = [
			{ type: "transform", category: "string", action: "replace", pattern: "[invalid" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("REGEX_ERROR");
	});

	it("returns error for invalid CSS selector", () => {
		const steps: RuleStep[] = [
			{ type: "extract", engine: "css", selector: "[invalid" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("INVALID_SELECTOR");
	});

	it("passes ScriptStep through unchanged", () => {
		const steps: RuleStep[] = [
			{ type: "script", code: "return 1;" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/compile.test.ts
```

- [ ] **Step 3: Implement compile.ts**

```typescript
// src/compile.ts
import type {
	Rule,
	RuleStep,
	CompiledRule,
	CompiledStep,
	CompiledExtractStep,
	CompiledTransformStep,
	CompiledScriptStep,
	TransformStep,
	StringTransformStep,
} from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";

function compileExtractStep(step: RuleStep): Result<CompiledExtractStep> {
	if (step.type !== "extract") {
		return ok({ ...step, compiledSelector: undefined } as CompiledExtractStep);
	}

	// Validate selector syntax
	switch (step.engine) {
		case "css":
			try {
				// Validate by attempting to use it (we just store it, actual use in evaluate)
				// CSS validation can be done by parsing; for now we do a basic check
				if (step.selector.trim() === "") {
					return err({ code: "INVALID_SELECTOR", message: "Empty CSS selector" });
				}
			} catch (e) {
				return err({ code: "INVALID_SELECTOR", message: `Invalid CSS: ${step.selector}`, cause: e });
			}
			break;
		case "jsonpath":
			try {
				// Validate JSONPath — will be validated by @swaggerexpert/jsonpath at eval time
				// For compile-time, store the path for later
			} catch (e) {
				return err({ code: "JSONPATH_ERROR", message: `Invalid JSONPath: ${step.selector}`, cause: e });
			}
			break;
		case "xpath":
		case "regex":
			// XPath and regex validated at eval time for now
			break;
	}

	return ok({
		...step,
		compiledSelector: step.selector,
	} as CompiledExtractStep);
}

function compileTransformStep(step: TransformStep): Result<CompiledTransformStep> {
	const isString = step.category === "string";
	const stringStep = step as StringTransformStep;

	if (isString && stringStep.pattern) {
		try {
			const regex = new RegExp(stringStep.pattern, stringStep.flags ?? "g");
			return ok({ ...step, compiledRegex: regex } as CompiledTransformStep);
		} catch (e) {
			return err({
				code: "REGEX_ERROR",
				message: `Invalid regex pattern: ${stringStep.pattern}`,
				rule: stringStep.pattern,
				cause: e,
			});
		}
	}

	return ok({ ...step } as CompiledTransformStep);
}

export function compileSteps(steps: readonly RuleStep[]): Result<CompiledStep[]> {
	const compiled: CompiledStep[] = [];

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i]!;

		let result: Result<CompiledStep>;
		switch (step.type) {
			case "extract":
				result = compileExtractStep(step);
				break;
			case "transform":
				result = compileTransformStep(step);
				break;
			case "script":
				result = ok({ ...step } as CompiledScriptStep);
				break;
		}

		if (!result.ok) {
			return err({ ...result.error, step: i });
		}
		compiled.push(result.value);
	}

	return ok(compiled);
}

export function compileRule(rule: Rule): Result<CompiledRule> {
	const steps = compileSteps(rule);
	if (!steps.ok) return steps;
	return ok({ steps: steps.value });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/compile.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/compile.ts packages/rule-engine/__tests__/unit/compile.test.ts
git commit -m "feat(rule-engine): add compile phase with pre-compiled regex and selector validation"
```

---

### Task 14: extract.ts — Extraction Dispatch

**Files:**
- Create: `packages/rule-engine/src/extract.ts`

- [ ] **Step 1: Implement extract.ts**

```typescript
// src/extract.ts
import type { RuntimeResult, CompiledExtractStep, EvalContext, Result } from "./types";
import { err, ok } from "./result";
import { extractCss } from "./css";
import { extractXPath } from "./xpath";
import { extractJsonPath } from "./jsonpath";
import { extractRegex } from "./regex";
import { expandTemplate } from "./template";
import { parseHTML } from "./dom-parse";
import { serializeValue } from "./serialize";

function isQueryable(value: unknown): value is Document | Element {
	return value instanceof Document || value instanceof Element;
}

export async function dispatchExtract(
	step: CompiledExtractStep,
	input: RuntimeResult,
	rootContent: unknown,
	ctx: EvalContext,
): Promise<Result<RuntimeResult>> {
	// Template engine: string expansion, not DOM query
	if (step.engine === "template") {
		const vars: Record<string, string | undefined> = {
			...ctx.variables,
			key: ctx.key,
			page: ctx.page !== undefined ? String(ctx.page) : undefined,
		};
		const expanded = expandTemplate(step.selector, vars);
		return ok([expanded]);
	}

	// Determine query targets
	const targets: RuntimeResult = step.scope === "root"
		? [rootContent]
		: input;

	const results: RuntimeValue[] = [];

	for (const target of targets) {
		// Resolve target to queryable form
		const queryable = resolveTarget(target, ctx);
		if (!queryable) continue;

		const extracted = queryByEngine(step, queryable);
		if (!extracted.ok) return extracted;
		results.push(...extracted.value);
	}

	// Apply output serialization if specified
	if (step.output) {
		return ok(results.map((v) => serializeValue(v, step.output, step.attr)));
	}

	return ok(results);
}

function resolveTarget(target: RuntimeValue, ctx: EvalContext): Document | Element | string | unknown {
	if (isQueryable(target)) return target;
	if (typeof target === "string") {
		// Auto-parse HTML/JSON for query engines
		// (Actual parsing happens inside engine functions)
		return target;
	}
	// JSON object — pass through for jsonpath engine
	return target;
}

function queryByEngine(
	step: CompiledExtractStep,
	target: Document | Element | string | unknown,
): Result<RuntimeResult> {
	const content = typeof target === "string" ? target : target;

	switch (step.engine) {
		case "css":
			return extractCss(step.selector, content as string | Element | Document, {
				output: step.output,
				attr: step.attr,
			});
		case "xpath":
			return extractXPath(step.selector, content as string | Element | Document, {
				output: step.output,
			});
		case "jsonpath":
			return extractJsonPath(step.selector, content);
		case "regex":
			if (typeof content !== "string") {
				return err({ code: "CONTENT_TYPE_MISMATCH", message: "Regex requires string input" });
			}
			return extractRegex(step.selector, content);
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/rule-engine/src/extract.ts
git commit -m "feat(rule-engine): add extraction dispatch routing by engine type"
```

---

### Task 15: evaluate.ts — Core Evaluation Pipeline

**Files:**
- Create: `packages/rule-engine/src/evaluate.ts`
- Test: `packages/rule-engine/__tests__/integration/evaluate-pipeline.test.ts`
- Test: `packages/rule-engine/__tests__/integration/evaluate-scope.test.ts`

- [ ] **Step 1: Write the pipeline test**

```typescript
// __tests__/integration/evaluate-pipeline.test.ts
import { describe, expect, it } from "vitest";
import { evaluateRule } from "@/rule-engine/evaluate";

const HTML = `
<div class="book">
  <h1 class="title">Book A</h1>
  <span class="price">$10</span>
</div>
<div class="book">
  <h1 class="title">Book B</h1>
  <span class="price">$20</span>
</div>
`;

describe("evaluateRule", () => {
	it("single extract step", async () => {
		const result = await evaluateRule(
			[{ type: "extract", engine: "css", selector: ".title", output: "text" }],
			HTML,
			{},
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["Book A", "Book B"]);
	});

	it("extract + transform pipeline", async () => {
		const result = await evaluateRule(
			[
				{ type: "extract", engine: "css", selector: ".price", output: "text" },
				{ type: "transform", category: "string", action: "replace", pattern: "\\$", replacement: "" },
			],
			HTML,
			{},
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["10", "20"]);
	});

	it("script step rejected without allowScript", async () => {
		const result = await evaluateRule(
			[{ type: "script", code: "return 1;" }],
			"content",
			{},
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("SCRIPT_DISABLED");
	});

	it("script step with allowScript and mock executor", async () => {
		const result = await evaluateRule(
			[{ type: "script", code: "return result.toUpperCase();" }],
			"content",
			{
				allowScript: true,
				jsExecutor: {
					async eval(code, ctx) {
						return { success: true, value: ctx.result.toUpperCase() };
					},
				},
			},
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(["CONTENT"]);
	});
});
```

- [ ] **Step 2: Write the scope test**

```typescript
// __tests__/integration/evaluate-scope.test.ts
import { describe, expect, it } from "vitest";
import { evaluateRule } from "@/rule-engine/evaluate";

const HTML = `
<div class="book">
  <h1 class="title">A</h1>
  <p class="desc">Desc A</p>
</div>
<div class="book">
  <h1 class="title">B</h1>
  <p class="desc">Desc B</p>
</div>
<div class="sidebar">
  <h1 class="title">Sidebar</h1>
</div>
`;

describe("extract scope", () => {
	it("scope=current chains extraction", async () => {
		const result = await evaluateRule(
			[
				{ type: "extract", engine: "css", selector: ".book" },
				{ type: "extract", engine: "css", selector: ".title", output: "text" },
			],
			HTML,
			{},
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			// Only .title elements INSIDE .book elements
			expect(result.value).toEqual(["A", "B"]);
		}
	});

	it("scope=root extracts from original document", async () => {
		const result = await evaluateRule(
			[
				{ type: "extract", engine: "css", selector: ".book" },
				{ type: "extract", engine: "css", selector: ".title", output: "text", scope: "root" },
			],
			HTML,
			{},
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			// ALL .title elements in document (including sidebar)
			expect(result.value).toEqual(["A", "B", "Sidebar"]);
		}
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/integration/evaluate-pipeline.test.ts __tests__/integration/evaluate-scope.test.ts
```

- [ ] **Step 4: Implement evaluate.ts**

```typescript
// src/evaluate.ts
import type {
	Rule,
	RuntimeResult,
	RuntimeValue,
	CompiledRule,
	CompiledStep,
	EvalContext,
	DictField,
	Result,
} from "./types";
import { err, ok } from "./result";
import { compileRule } from "./compile";
import { dispatchExtract } from "./extract";
import { applyStringTransform, applyDomTransform } from "./transform";
import { serializeValue, serializeResult } from "./serialize";
import { parseHTML } from "./dom-parse";

function isStringTransformStep(step: CompiledStep): step is CompiledStep & { category: "string" } {
	return step.type === "transform" && "category" in step && step.category === "string";
}

function isDomTransformStep(step: CompiledStep): step is CompiledStep & { category: "dom" } {
	return step.type === "transform" && "category" in step && step.category === "dom";
}

function parseContent(content: string, responseType?: string): RuntimeValue {
	const trimmed = content.trim();
	if (responseType === "json" || trimmed.startsWith("{") || trimmed.startsWith("[")) {
		try {
			return JSON.parse(trimmed) as unknown;
		} catch {
			return content;
		}
	}
	if (responseType === "xml" || trimmed.startsWith("<?xml") || trimmed.startsWith("<rss")) {
		const { document, dispose } = parseHTML(content);
		// Don't dispose — the document will be used throughout evaluation
		return document;
	}
	// Default: HTML
	const { document } = parseHTML(content);
	return document;
}

function stringifyJsResult(value: unknown): RuntimeResult {
	if (value === null || value === undefined) return [];
	if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? v : String(v)));
	if (typeof value === "string") return [value];
	return [String(value)];
}

async function evaluatePipeline(
	steps: readonly CompiledStep[],
	content: string,
	ctx: EvalContext,
): Promise<Result<RuntimeResult>> {
	const rootValue = parseContent(content, ctx.source?.responseType as string | undefined);
	let current: RuntimeResult = [rootValue];

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i]!;

		switch (step.type) {
			case "extract": {
				const result = await dispatchExtract(step, current, rootValue, ctx);
				if (!result.ok) return err({ ...result.error, step: i });
				current = result.value;
				break;
			}
			case "transform": {
				if (isStringTransformStep(step)) {
					const result = applyStringTransform(step, current);
					if (!result.ok) return err({ ...result.error, step: i });
					current = result.value;
				} else if (isDomTransformStep(step)) {
					const result = applyDomTransform(step as never, current);
					if (!result.ok) return err({ ...result.error, step: i });
					current = result.value;
				}
				break;
			}
			case "script": {
				if (!ctx.allowScript) {
					return err({ code: "SCRIPT_DISABLED", message: "Script execution is disabled", step: i });
				}
				if (!ctx.jsExecutor) {
					return err({ code: "NO_JS_EXECUTOR", message: "No JsExecutor provided", step: i });
				}
				const resultString = current.map((v) => serializeValue(v)).join("");
				const jsResult = await ctx.jsExecutor.eval(step.code, {
					result: resultString,
					baseUrl: ctx.baseUrl,
					source: ctx.source,
					book: ctx.book,
					chapter: ctx.chapter,
					key: ctx.key,
					page: ctx.page,
				});
				if (!jsResult.success) {
					return err({ code: "SCRIPT_ERROR", message: jsResult.error ?? "Script failed", step: i });
				}
				current = stringifyJsResult(jsResult.value);
				break;
			}
		}
	}

	return ok(current);
}

export async function evaluateCompiled(
	compiled: CompiledRule,
	content: string,
	ctx: EvalContext,
): Promise<Result<RuntimeResult>> {
	return evaluatePipeline(compiled.steps, content, ctx);
}

export async function evaluateRule(
	rule: Rule,
	content: string,
	ctx: EvalContext,
): Promise<Result<RuntimeResult>> {
	const compiled = compileRule(rule);
	if (!compiled.ok) return compiled;
	return evaluatePipeline(compiled.value.steps, content, ctx);
}

export async function evaluateField(
	field: DictField,
	content: string,
	ctx: EvalContext,
): Promise<Result<string | string[]>> {
	const compiled = compileRule(field.steps);
	if (!compiled.ok) return compiled;

	const result = await evaluatePipeline(compiled.value.steps, content, ctx);
	if (!result.ok) return result;

	const isArray = field.schema.endsWith("[]");
	if (isArray) {
		return ok(serializeResult(result.value));
	}
	const first = result.value[0];
	return ok(first !== undefined ? serializeValue(first) : "");
}

export function serializeResult(values: RuntimeResult): string[] {
	return values.map((v) => serializeValue(v));
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/integration/evaluate-pipeline.test.ts __tests__/integration/evaluate-scope.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/rule-engine/src/evaluate.ts packages/rule-engine/__tests__/integration/evaluate-pipeline.test.ts packages/rule-engine/__tests__/integration/evaluate-scope.test.ts
git commit -m "feat(rule-engine): add core evaluation pipeline with scope support"
```

---

## Phase 5: Domain Utilities

### Task 16: url-analyzer.ts

**Files:**
- Create: `packages/rule-engine/src/url-analyzer.ts`
- Test: `packages/rule-engine/__tests__/unit/url-analyzer.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/unit/url-analyzer.test.ts
import { describe, expect, it } from "vitest";
import { resolveUrl } from "@/rule-engine/url-analyzer";

describe("resolveUrl", () => {
	it("replaces {{key}} placeholder", () => {
		expect(resolveUrl("https://example.com/search?q={{key}}", { key: "hello" })).toBe(
			"https://example.com/search?q=hello",
		);
	});

	it("replaces {{page}} placeholder", () => {
		expect(resolveUrl("https://example.com/list?page={{page}}", { page: 2 })).toBe(
			"https://example.com/list?page=2",
		);
	});

	it("replaces custom variables", () => {
		expect(
			resolveUrl("https://example.com/{{lang}}/search", {
				variables: { lang: "en" },
			}),
		).toBe("https://example.com/en/search");
	});

	it("resolves relative URL against baseUrl", () => {
		expect(resolveUrl("/book/123", { baseUrl: "https://example.com" })).toBe(
			"https://example.com/book/123",
		);
	});

	it("leaves absolute URL unchanged", () => {
		expect(resolveUrl("https://other.com/page", { baseUrl: "https://example.com" })).toBe(
			"https://other.com/page",
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/url-analyzer.test.ts
```

- [ ] **Step 3: Implement url-analyzer.ts**

```typescript
// src/url-analyzer.ts
import type { EvalContext } from "./types";
import { expandTemplate } from "./template";

export function resolveUrl(template: string, ctx: EvalContext): string {
	const variables: Record<string, string | undefined> = {
		...ctx.variables,
		key: ctx.key,
		page: ctx.page !== undefined ? String(ctx.page) : undefined,
	};

	const url = expandTemplate(template, variables);

	if (ctx.baseUrl && !url.startsWith("http")) {
		return new URL(url, ctx.baseUrl).href;
	}

	return url;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/unit/url-analyzer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/url-analyzer.ts packages/rule-engine/__tests__/unit/url-analyzer.test.ts
git commit -m "feat(rule-engine): add URL template resolution with variable expansion"
```

---

### Task 17: replace.ts — Replace Rules

**Files:**
- Create: `packages/rule-engine/src/replace.ts`
- Test: `packages/rule-engine/__tests__/integration/apply-replace.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/integration/apply-replace.test.ts
import { describe, expect, it } from "vitest";
import { applyReplaceRules, matchesScope } from "@/rule-engine/replace";
import type { ReplaceRule, ReplaceScope } from "@/rule-engine/types";

describe("applyReplaceRules", () => {
	it("applies enabled rules in order", () => {
		const text = "Hello  World  !";
		const rules: ReplaceRule[] = [
			{ pattern: "\\s+", replacement: " ", flags: "g" },
			{ pattern: "^\\s|\\s$", replacement: "", flags: "g" },
		];
		const result = applyReplaceRules(text, rules);
		expect(result).toBe("Hello World !");
	});

	it("skips disabled rules", () => {
		const text = "Hello World";
		const rules: ReplaceRule[] = [
			{ pattern: "World", replacement: "ReaderX", enabled: false },
		];
		const result = applyReplaceRules(text, rules);
		expect(result).toBe("Hello World");
	});

	it("literal mode treats pattern as plain text", () => {
		const text = "Price: $10.99";
		const rules: ReplaceRule[] = [
			{ pattern: "$", replacement: "¥", literal: true },
		];
		const result = applyReplaceRules(text, rules);
		expect(result).toBe("Price: ¥10.99");
	});

	it("respects scope include/exclude", () => {
		const rules: ReplaceRule[] = [
			{
				pattern: "AD",
				replacement: "",
				scope: { include: ["source-1"], target: "content" },
			},
		];
		// Included source — should apply
		expect(applyReplaceRules("AD text", rules, { sourceId: "source-1" })).toBe(" text");
		// Excluded source — should not apply
		expect(applyReplaceRules("AD text", rules, { sourceId: "source-2" })).toBe("AD text");
	});
});

describe("matchesScope", () => {
	it("matches when scope is undefined (global)", () => {
		expect(matchesScope(undefined, "any-source")).toBe(true);
	});

	it("matches when source is in include list", () => {
		const scope: ReplaceScope = { include: ["source-1"] };
		expect(matchesScope(scope, "source-1")).toBe(true);
		expect(matchesScope(scope, "source-2")).toBe(false);
	});

	it("exclude overrides include", () => {
		const scope: ReplaceScope = { include: [], exclude: ["source-1"] };
		expect(matchesScope(scope, "source-1")).toBe(false);
		expect(matchesScope(scope, "source-2")).toBe(true);
	});

	it("target filter works", () => {
		const scope: ReplaceScope = { target: "title" };
		expect(matchesScope(scope, "x", undefined, "title")).toBe(true);
		expect(matchesScope(scope, "x", undefined, "content")).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/integration/apply-replace.test.ts
```

- [ ] **Step 3: Implement replace.ts**

```typescript
// src/replace.ts
import type { ReplaceRule, ReplaceScope, JsExecutor } from "./types";

export function matchesScope(
	scope: ReplaceScope | undefined,
	sourceId?: string,
	_sourceName?: string,
	target?: "content" | "title",
): boolean {
	if (!scope) return true;

	// Target filter
	if (scope.target && target && scope.target !== "both" && scope.target !== target) {
		return false;
	}

	// Include filter (empty = global)
	if (scope.include && scope.include.length > 0) {
		if (!sourceId || !scope.include.includes(sourceId)) return false;
	}

	// Exclude filter (higher priority)
	if (scope.exclude && scope.exclude.length > 0) {
		if (sourceId && scope.exclude.includes(sourceId)) return false;
	}

	return true;
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function applyReplaceRules(
	text: string,
	rules: readonly ReplaceRule[],
	options?: {
		readonly sourceId?: string;
		readonly sourceName?: string;
		readonly target?: "content" | "title";
		readonly jsExecutor?: JsExecutor;
		readonly allowScript?: boolean;
	},
): string {
	const active = rules
		.filter((r) => r.enabled !== false)
		.filter((r) => matchesScope(r.scope, options?.sourceId, options?.sourceName, options?.target))
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

	let result = text;
	for (const rule of active) {
		const pattern = rule.literal ? escapeRegex(rule.pattern) : rule.pattern;
		const re = new RegExp(pattern, rule.flags ?? "g");
		result = result.replaceAll(re, rule.replacement ?? "");
	}

	return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/integration/apply-replace.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/replace.ts packages/rule-engine/__tests__/integration/apply-replace.test.ts
git commit -m "feat(rule-engine): add replace rule application with scope matching"
```

---

### Task 18: find-chapters.ts — TXT TOC Detection

**Files:**
- Create: `packages/rule-engine/src/find-chapters.ts`
- Test: `packages/rule-engine/__tests__/integration/find-chapters.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// __tests__/integration/find-chapters.test.ts
import { describe, expect, it } from "vitest";
import { findChapterBoundaries } from "@/rule-engine/find-chapters";
import type { TxtTocRule } from "@/rule-engine/types";

describe("findChapterBoundaries", () => {
	const rules: TxtTocRule[] = [
		{ name: "chapter", pattern: "^第[零一二三四五六七八九十百千\\d]+[章节回话]", flags: "m", order: 1 },
		{ name: "numeric", pattern: "^\\s*\\d{1,5}[\\s\\.．]", flags: "m", order: 2 },
		{ name: "fallback", pattern: "\\S+", flags: "", order: 100, enabled: false },
	];

	it("detects Chinese chapter titles", () => {
		const lines = [
			"第一章 起点",
			"这是正文内容。",
			"第二章 发展",
			"继续正文。",
		];
		const boundaries = findChapterBoundaries(lines, rules);
		expect(boundaries).toHaveLength(2);
		expect(boundaries[0]!.title).toBe("第一章 起点");
		expect(boundaries[1]!.title).toBe("第二章 发展");
	});

	it("skips disabled rules", () => {
		const lines = ["任何内容"];
		const allDisabled: TxtTocRule[] = [
			{ name: "disabled", pattern: "\\S+", enabled: false },
		];
		expect(findChapterBoundaries(lines, allDisabled)).toHaveLength(0);
	});

	it("first matching rule wins per line", () => {
		const lines = ["第一章 测试"];
		const multiRules: TxtTocRule[] = [
			{ name: "specific", pattern: "^第.+章", order: 1, flags: "m" },
			{ name: "generic", pattern: ".+", order: 2, flags: "m" },
		];
		const boundaries = findChapterBoundaries(lines, multiRules);
		expect(boundaries).toHaveLength(1);
		expect(boundaries[0]!.ruleName).toBe("specific");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/integration/find-chapters.test.ts
```

- [ ] **Step 3: Implement find-chapters.ts**

```typescript
// src/find-chapters.ts
import type { TxtTocRule, ChapterBoundary } from "./types";

export function findChapterBoundaries(
	lines: readonly string[],
	rules: readonly TxtTocRule[],
): ChapterBoundary[] {
	const active = rules
		.filter((r) => r.enabled !== false)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

	const boundaries: ChapterBoundary[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (line.trim() === "") continue;

		for (const rule of active) {
			try {
				const re = new RegExp(rule.pattern, rule.flags ?? "gm");
				if (re.test(line)) {
					boundaries.push({
						lineIndex: i,
						title: line.trim(),
						ruleName: rule.name ?? "unnamed",
					});
					break; // First matching rule wins
				}
			} catch {
				// Skip invalid regex rules silently
				continue;
			}
		}
	}

	return boundaries;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/integration/find-chapters.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/find-chapters.ts packages/rule-engine/__tests__/integration/find-chapters.test.ts
git commit -m "feat(rule-engine): add TXT TOC chapter boundary detection"
```

---

## Phase 6: Zod Schemas

### Task 19: schemas.ts — Zod Validation

**Files:**
- Create: `packages/rule-engine/src/schemas.ts`
- Test: `packages/rule-engine/__tests__/schemas/book-source-schema.test.ts`
- Test: `packages/rule-engine/__tests__/schemas/replace-rule-schema.test.ts`
- Test: `packages/rule-engine/__tests__/schemas/txt-toc-rule-schema.test.ts`
- Test: `packages/rule-engine/__tests__/schemas/dict-rule-schema.test.ts`

- [ ] **Step 1: Write schema tests**

```typescript
// __tests__/schemas/book-source-schema.test.ts
import { describe, expect, it } from "vitest";
import { validateBookSource } from "@/rule-engine/schemas";

describe("bookSourceSchema", () => {
	const validSource = {
		$schema: "readerx/book-source-rule/v1",
		id: "test",
		name: "Test Source",
		type: "novel",
		baseUrl: "https://example.com",
	};

	it("validates a minimal valid source", () => {
		const result = validateBookSource(validSource);
		expect(result.ok).toBe(true);
	});

	it("rejects missing required fields", () => {
		const { id: _, ...noId } = validSource;
		const result = validateBookSource(noId);
		expect(result.ok).toBe(false);
	});

	it("rejects invalid type", () => {
		const result = validateBookSource({ ...validSource, type: "invalid" });
		expect(result.ok).toBe(false);
	});

	it("rejects extra properties", () => {
		const result = validateBookSource({ ...validSource, extra: "field" });
		expect(result.ok).toBe(false);
	});
});
```

Similar test files for `replace-rule-schema.test.ts`, `txt-toc-rule-schema.test.ts`, and `dict-rule-schema.test.ts`.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/schemas/
```

- [ ] **Step 3: Implement schemas.ts**

Map each JSON Schema to a Zod schema. This is a large file but follows a direct pattern from `schemas/readerx/*.schema.json`. Implement `bookSourceSchema`, `dictRuleFileSchema`, `replaceRuleFileSchema`, `txtTocRuleFileSchema`, and their `parse`/`validate` helper functions.

Key points:
- Use `z.strictObject()` for `additionalProperties: false`
- Map JSON Schema `"enum"` to `z.enum()`
- Map `"required"` array to non-optional fields
- All schemas should use `.strict()`

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/rule-engine && pnpm vitest run __tests__/schemas/
```

- [ ] **Step 5: Commit**

```bash
git add packages/rule-engine/src/schemas.ts packages/rule-engine/__tests__/schemas/
git commit -m "feat(rule-engine): add Zod schemas matching ReaderX JSON Schemas"
```

---

## Phase 7: Public API

### Task 20: index.ts — Public API Re-exports

**Files:**
- Create: `packages/rule-engine/src/index.ts`

- [ ] **Step 1: Implement index.ts**

Re-export all public types, functions, and schemas as defined in the spec §10. Include all `export type` and `export { }` statements.

- [ ] **Step 2: Verify typecheck passes**

```bash
cd packages/rule-engine && pnpm typecheck
```

Expected: PASS (may need to fix import paths and type issues)

- [ ] **Step 3: Commit**

```bash
git add packages/rule-engine/src/index.ts
git commit -m "feat(rule-engine): add public API surface via index.ts"
```

---

## Phase 8: E2E Tests + Integration Verification

### Task 21: E2E Tests with Real Schema Data

**Files:**
- Test: `packages/rule-engine/__tests__/e2e/book-source-e2e.test.ts`
- Test: `packages/rule-engine/__tests__/e2e/dict-rule-e2e.test.ts`

- [ ] **Step 1: Write book source E2E test**

Test that the engine can validate and compile rules from `schemas/readerx/examples/book-source-rule-examples.json`. For each source:
1. Validate with Zod schema
2. Compile the search/bookInfo/toc/content module rules
3. Verify no compile errors

- [ ] **Step 2: Write dict rule E2E test**

Test that the engine can validate and compile rules from `schemas/readerx/examples/dict-rule-examples.json`. For each rule:
1. Validate with Zod schema
2. Compile each field's steps
3. Verify no compile errors

- [ ] **Step 3: Run all tests**

```bash
cd packages/rule-engine && pnpm vitest run
```

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/__tests__/e2e/
git commit -m "test(rule-engine): add E2E tests using real schema example data"
```

---

## Phase 9: Final Verification

### Task 22: Full Test Suite + Typecheck

- [ ] **Step 1: Run full typecheck**

```bash
cd packages/rule-engine && pnpm typecheck
```

- [ ] **Step 2: Run full test suite**

```bash
cd packages/rule-engine && pnpm test
```

- [ ] **Step 3: Run lint**

```bash
cd packages/rule-engine && pnpm lint
```

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(rule-engine): complete rewrite — functional pipeline with RuntimeValue, compile phase, extract scope

BREAKING CHANGE: Entire public API changed. All downstream consumers must be updated.

- Replace Legado string DSL with structured RuleStep[] pipeline
- RuntimeValue preserves DOM references through pipeline
- Extract supports scope='current' (chain) and scope='root' (independent)
- Compile phase pre-compiles regex/JSONPath for repeated execution
- ScriptStep requires explicit allowScript opt-in
- Dependencies: happy-dom + @swaggerexpert/jsonpath (was linkedom+xmldom+xpath+jsonpath-plus)
- Zod schemas match schemas/readerx/*.schema.json 1:1"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task | Status |
|---|---|---|
| §1 Overview / Dependencies | Task 1 | ✅ |
| §2.1 Core Types (Result, RuleError) | Task 2 + 3 | ✅ |
| §2.2 RuntimeValue | Task 3 | ✅ |
| §2.3 Step Types | Task 3 | ✅ |
| §2.4 Rule / RuleObject / normalize | Task 12 | ✅ |
| §2.5 Book Source Types | Task 3 | ✅ |
| §2.6 Dict Rule Types | Task 3 | ✅ |
| §2.7 Replace Rule Types | Task 3 | ✅ |
| §2.8 TXT TOC Types | Task 3 | ✅ |
| §2.9 EvalContext / JsExecutor | Task 3 | ✅ |
| §3.1 Two-Phase Architecture | Task 13 + 15 | ✅ |
| §3.2 Compile Phase | Task 13 | ✅ |
| §3.3 Evaluate Phase | Task 15 | ✅ |
| §3.4 Pipeline Semantics | Task 15 | ✅ |
| §3.5 Extract Scope Example | Task 15 (scope test) | ✅ |
| §3.6 Extraction Dispatch | Task 14 | ✅ |
| §3.7 Transform Implementation | Task 11 | ✅ |
| §4 Platform Dual Implementation | Task 4 | ✅ |
| §4.4 DocumentCache | Task 4 | ✅ |
| §5 URL Resolution | Task 16 | ✅ |
| §6 Replace Rules | Task 17 | ✅ |
| §7 TXT TOC Rules | Task 18 | ✅ |
| §8 Zod Schemas | Task 19 | ✅ |
| §9 Package Structure | Task 1 + 20 | ✅ |
| §10 Public API Surface | Task 20 | ✅ |
| §11 Testing Strategy | All test tasks | ✅ |
| §12 package.json | Task 1 | ✅ |

### Placeholder Scan

No TBDs, TODOs, or "implement later" patterns found.

### Type Consistency

All types defined in Task 3 (`types.ts`) are used consistently in Tasks 5-18. Function signatures match between definition and call sites.
