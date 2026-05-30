# Rule Engine Complete Rewrite Design

> Date: 2026-05-30
> Status: Draft
> Scope: `packages/rule-engine/` — complete rewrite based on new ReaderX schemas

## 1. Overview

### 1.1 Goals

Rewrite the rule engine to match the redesigned ReaderX schemas (`schemas/readerx/*.schema.json`), replacing the Legado-format engine with a web-first, functional-pipeline architecture.

### 1.2 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Functional pipeline | Pure functions, tree-shakeable, testable |
| String shorthand | Not supported | Engine only handles structured RuleObject/RuleStep[] |
| Migration | Complete replacement | Delete old code, fresh start |
| Libraries | happy-dom + @swaggerexpert/jsonpath | Future-standard, RFC 9535 compliant, actively maintained |
| Intermediate data | RuntimeValue (not string[]) | Preserve DOM references, avoid re-parsing |
| Extract scope | "current" (default) / "root" | Support chained extraction |
| Compile phase | Yes | Pre-compile regex/JSONPath/XPath for repeated execution |
| Script safety | Opt-in via allowScript | Default off, explicit enable required |

### 1.3 Dependency Changes

| Old | New | Reason |
|-----|-----|--------|
| linkedom | happy-dom | CSS + XPath + DOM in one package |
| @xmldom/xmldom | (removed) | happy-dom replaces |
| xpath | (removed) | happy-dom built-in XPath |
| jsonpath-plus | @swaggerexpert/jsonpath | RFC 9535 compliant, maintained |
| zod | zod (kept) | Schema validation |

**Runtime deps: 5 → 3** (zod + happy-dom + @swaggerexpert/jsonpath)

## 2. Type System

### 2.1 Core Types

```typescript
// result.ts

type Result<T, E = RuleError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

type RuleErrorCode =
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

type RuleError = {
  readonly code: RuleErrorCode;
  readonly message: string;
  readonly step?: number;
  readonly rule?: string;
  readonly source?: string;
  readonly cause?: unknown;
};
```

### 2.2 Runtime Values

```typescript
type RuntimeValue =
  | string
  | Element
  | Document
  | unknown; // JSON values

type RuntimeResult = readonly RuntimeValue[];
```

`output` field is the serialization boundary: Element → string. Without `output`, DOM references are preserved through the pipeline.

### 2.3 Step Types

```typescript
type ExtractEngine = "css" | "xpath" | "jsonpath" | "regex";
type ExtractOutput = "html" | "text" | "outerHtml" | "attr";

type ExtractStep = {
  readonly type: "extract";
  readonly engine: ExtractEngine;
  readonly selector: string;
  readonly scope?: "current" | "root"; // default: "current"
  readonly output?: ExtractOutput;     // serialization boundary
  readonly attr?: string;              // only when output="attr"
  readonly baseUrl?: string;
};

type StringTransformStep = {
  readonly type: "transform";
  readonly category: "string";
  readonly action: "replace" | "match" | "split" | "template" | "trim";
  readonly pattern?: string;
  readonly replacement?: string;
  readonly flags?: string;
  readonly group?: number;       // match: capture group index
  readonly template?: string;    // template: {{result}} expansion
};

type DomTransformStep = {
  readonly type: "transform";
  readonly category: "dom";
  readonly action: "remove" | "unwrap" | "strip";
  readonly selector: string;
  readonly attributes?: readonly string[]; // strip only
};

type TransformStep = StringTransformStep | DomTransformStep;

type ScriptStep = {
  readonly type: "script";
  readonly code: string;
};

type RuleStep = ExtractStep | TransformStep | ScriptStep;
```

### 2.4 Rule Types

```typescript
// Rule = RuleStep[] only (no string shorthand, no RuleObject)
type Rule = readonly RuleStep[];
```

**Note**: RuleObject (with css/xpath/jsonpath fields) is normalized to RuleStep[] via `normalizeRule()`. The engine only processes RuleStep[].

```typescript
// For backward compat with schema JSON that uses RuleObject form:
type RuleObject = {
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

// Normalize RuleObject to RuleStep[]
function normalizeRule(rule: RuleObject): RuleStep[];
// Also handles: Rule = RuleStep[] pass-through
function toRule(rule: RuleObject | readonly RuleStep[]): Rule;
```

### 2.5 Book Source Types

```typescript
type BookSourceType = "novel" | "audio" | "comic" | "file";

type RequestConfig = {
  readonly url?: string;
  readonly method?: "GET" | "POST";
  readonly charset?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly responseType?: "html" | "json" | "xml" | "text";
};

type BookSource = {
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

type SearchModule = RequestConfig & {
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

type ExploreCategory = {
  readonly title: string;
  readonly url: string;
};

type ExploreModule = RequestConfig & {
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

type BookInfoModule = RequestConfig & {
  readonly name?: Rule;
  readonly author?: Rule;
  readonly coverUrl?: Rule;
  readonly intro?: Rule;
  readonly kind?: Rule;
  readonly lastChapter?: Rule;
  readonly wordCount?: Rule;
  readonly tocUrl?: Rule;
};

type TocModule = RequestConfig & {
  readonly list: Rule;
  readonly name: Rule;
  readonly url: Rule;
  readonly isVip?: Rule;
  readonly isVolume?: Rule;
  readonly updateTime?: Rule;
  readonly nextUrl?: Rule;
};

type ContentModule = RequestConfig & {
  readonly content: Rule;
  readonly nextUrl?: Rule;
  readonly replaceRegex?: readonly ReplacePair[];
};

type ReplacePair = {
  readonly pattern: string;
  readonly replacement: string;
};
```

### 2.6 Dict Rule Types

```typescript
type DictRuleFile = {
  readonly $schema: string;
  readonly authors: readonly string[];
  readonly description?: string;
  readonly updatedAt?: string;
  readonly rules: readonly DictRule[];
};

type DictRule = {
  readonly id: string;
  readonly name: string;
  readonly tags?: readonly string[];
  readonly enabled?: boolean;
  readonly weight?: number;
  readonly variables?: Readonly<Record<string, string>>;
  readonly request: DictRequest;
  readonly fields: Readonly<Record<string, DictField>>;
};

type DictRequest = {
  readonly url: string;
  readonly method?: "GET" | "POST";
  readonly charset?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
};

type FieldSchema = "html" | "string" | "html[]" | "string[]";

type DictField = {
  readonly schema: FieldSchema;
  readonly steps: readonly RuleStep[]; // Reuse ExtractStep/TransformStep/ScriptStep
};
```

### 2.7 Replace Rule Types

```typescript
type ReplaceRuleFile = {
  readonly $schema: string;
  readonly rules: readonly ReplaceRule[];
};

type ReplaceRule = {
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

type ReplaceScope = {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly target?: "content" | "title" | "both";
};
```

### 2.8 TXT TOC Rule Types

```typescript
type TxtTocRuleFile = {
  readonly $schema: string;
  readonly rules: readonly TxtTocRule[];
};

type TxtTocRule = {
  readonly name?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly enabled?: boolean;
  readonly order?: number;
  readonly pattern: string;
  readonly flags?: string;
};
```

### 2.9 Evaluation Context

```typescript
type EvalContext = {
  readonly baseUrl?: string;
  readonly variables?: Readonly<Record<string, string>>;
  readonly allowScript?: boolean; // default false, explicit opt-in
  readonly jsExecutor?: JsExecutor;
  readonly documentCache?: DocumentCache;
  // Upstream module context
  readonly source?: Readonly<Record<string, unknown>>;
  readonly book?: Readonly<Record<string, unknown>>;
  readonly chapter?: Readonly<Record<string, unknown>>;
  readonly key?: string;
  readonly page?: number;
};

type JsExecutor = {
  eval(code: string, context: JsEvalContext): Promise<JsEvalResult>;
};

type JsEvalContext = {
  readonly result: string;
  readonly baseUrl?: string;
  readonly src?: string;
  readonly source?: Readonly<Record<string, unknown>>;
  readonly book?: Readonly<Record<string, unknown>>;
  readonly chapter?: Readonly<Record<string, unknown>>;
  readonly key?: string;
  readonly page?: number;
};

type JsEvalResult = {
  readonly success: boolean;
  readonly value?: unknown;
  readonly error?: string;
};

type DocumentCache = {
  getHTML(html: string, url?: string): Document;
  getXML(xml: string): Document;
  getJSON(json: string): unknown;
  dispose(): void;
};
```

## 3. Core Evaluation Pipeline

### 3.1 Two-Phase Architecture

```
Phase 1: Compile (once per rule definition)
  Rule → compileRule() → CompiledRule

Phase 2: Evaluate (per execution, e.g. per chapter)
  CompiledRule + content + ctx → evaluateCompiled() → Result<RuntimeValue[]>

### 3.1.1 Initial Content Parsing

Before the pipeline runs, `content: string` is parsed based on detected content type:

```
content: string
  │
  ├─ HTML/XML → Document (via parseHTML/parseXML + DocumentCache)
  ├─ JSON     → parsed object (via JSON.parse)
  └─ text     → string (no parsing)
  │
  v
Initial RuntimeResult: [Document] or [object] or [string]
```

This parsed form is the `rootDocument` / root value used by ExtractStep with `scope="root"`.
```

### 3.2 Compile Phase

```typescript
type CompiledRule = {
  readonly steps: readonly CompiledStep[];
};

type CompiledStep =
  | CompiledExtractStep
  | CompiledTransformStep
  | CompiledScriptStep;

type CompiledExtractStep = ExtractStep & {
  // Pre-compiled artifacts (engine-specific)
  readonly compiledSelector?: unknown;
};

type CompiledTransformStep = TransformStep & {
  readonly compiledRegex?: RegExp; // for replace/match/split
};

type CompiledScriptStep = ScriptStep; // No compilation needed

function compileRule(rule: Rule): Result<CompiledRule>;
function compileSteps(steps: readonly RuleStep[]): Result<CompiledStep[]>;
```

Compile validates and pre-compiles:
1. CSS selectors — validated against the selector syntax
2. XPath expressions — validated syntax
3. JSONPath expressions — parsed via @swaggerexpert/jsonpath
4. Regex patterns — compiled to RegExp objects
5. Template strings — validated placeholder syntax

Compile is **strict**: invalid selectors/expressions/patterns cause compile errors, not runtime errors. This catches rule authoring mistakes early.

### 3.3 Evaluate Phase

```typescript
async function evaluateCompiled(
  compiled: CompiledRule,
  content: string,
  ctx: EvalContext,
): Promise<Result<RuntimeValue[]>>;

// Convenience: compile + evaluate in one call (for one-shot execution)
async function evaluateRule(
  rule: Rule,
  content: string,
  ctx: EvalContext,
): Promise<Result<RuntimeValue[]>>;

// Serialize final result to strings
function serializeResult(values: RuntimeResult): string[];
```

### 3.4 Pipeline Semantics

```
Input: RuntimeValue[] (initially [content] or [parsed Document])

For each CompiledStep:

  ExtractStep (scope="current", no output):
    For each RuntimeValue in input:
      Element/Document → querySelectorAll(selector) → Element[]
    Flatten → RuntimeValue[] (Elements preserved)

  ExtractStep (scope="current", output="text"):
    Same query, but each Element → element.textContent
    Result: RuntimeValue[] (strings)

  ExtractStep (scope="root"):
    Ignore input, query from root Document
    Apply output serialization if specified

  StringTransformStep:
    If input contains Elements → auto-serialize to .textContent
    Apply string operation → string[]

  DomTransformStep:
    Input must be Element[] (error if not)
    Apply DOM operation → Element[] (preserved)

  ScriptStep:
    If allowScript is false → RuleError { code: "SCRIPT_DISABLED" }
    If no jsExecutor → RuleError { code: "NO_JS_EXECUTOR" }
    Serialize input to string for JS context
    Execute JS → RuntimeValue[]
```

### 3.5 Extract Scope Example

```json
[
  { "type": "extract", "engine": "css", "selector": ".book" },
  { "type": "extract", "engine": "css", "selector": ".title", "output": "text" }
]
```

Given:
```html
<div class="book"><h1 class="title">A</h1></div>
<div class="book"><h1 class="title">B</h1></div>
```

Execution:
1. `extract(css, ".book")` from root → `[Element(.book#1), Element(.book#2)]`
2. `extract(css, ".title", scope=current)` from each → `[Element(.title#1), Element(.title#2)]`
3. `output: "text"` serializes → `["A", "B"]`

With `scope: "root"` on step 2 instead:
- `extract(css, ".title", scope=root)` → all `.title` in document → `["A", "B"]`
- Behaves the same here but differs when selectors have different nesting patterns.

### 3.6 Extraction Dispatch

```typescript
async function extract(
  step: CompiledExtractStep,
  input: RuntimeResult,
  rootDocument: Document,
  ctx: EvalContext,
): Promise<Result<RuntimeResult>> {
  const targets = step.scope === "root"
    ? [rootDocument]
    : input;

  const results: RuntimeValue[] = [];
  for (const target of targets) {
    if (!isQueryable(target)) continue;
    const matched = dispatchByEngine(step, target);
    if (!matched.ok) return matched;
    results.push(...matched.value);
  }

  // Apply output serialization if specified
  if (step.output) {
    return ok(results.map(v => serialize(v, step.output!, step.attr)));
  }
  return ok(results);
}
```

### 3.7 Transform Implementation

```typescript
function applyStringTransform(
  step: CompiledTransformStep,
  input: RuntimeResult,
): Result<RuntimeResult> {
  // Auto-serialize Elements to text
  const strings = input.map(v =>
    typeof v === "string" ? v : elementToText(v)
  );

  const def = step; // ExtractStep fields
  switch (def.action) {
    case "replace":
      return ok(strings.map(s =>
        s.replaceAll(step.compiledRegex!, def.replacement ?? "")
      ));
    case "match":
      return ok(strings.flatMap(s => {
        const matches = [...s.matchAll(step.compiledRegex!)];
        return matches.map(m => m[def.group ?? 0] ?? "");
      }));
    case "split":
      return ok(strings.flatMap(s =>
        s.split(step.compiledRegex!)
      ));
    case "template":
      return ok(strings.map(s =>
        (def.template ?? "").replaceAll("{{result}}", s)
      ));
    case "trim":
      return ok(strings.map(s => s.trim()));
  }
}

function applyDomTransform(
  step: DomTransformStep,
  input: RuntimeResult,
): Result<RuntimeResult> {
  // Verify input is Element[]
  const elements = input.filter(isElement);
  if (elements.length !== input.length) {
    return err({
      code: "TYPE_MISMATCH",
      message: "DomTransform requires Element input",
    });
  }

  switch (step.action) {
    case "remove":
      // Deep clone each element, remove matching children, return clones
      return ok(elements.map(el => domRemove(el, step.selector)));
    case "unwrap":
      return ok(elements.map(el => domUnwrap(el, step.selector)));
    case "strip":
      return ok(elements.map(el => domStrip(el, step.selector, step.attributes)));
  }
}
```

> **Schema Note**: The `category: "string" | "dom"` field on TransformStep is new and not in the current `schemas/readerx/*.schema.json`. The JSON Schemas should be updated to match this design. Alternatively, the engine can infer `category` from `action` at compile time (string actions: replace/match/split/template/trim, DOM actions: remove/unwrap/strip), keeping the JSON Schema unchanged. The compile-time inference approach is preferred — no schema change needed.

## 4. Platform Dual Implementation

### 4.1 Architecture

```
src/dom-parse.ts          → Node.js: happy-dom
src/dom-parse.browser.ts  → Browser: native DOMParser

src/xpath-eval.ts         → Node.js: happy-dom document.evaluate()
src/xpath-eval.browser.ts → Browser: native document.evaluate()
```

### 4.2 DOM Parse Interface

```typescript
type ParsedDocument = {
  readonly document: Document;
  readonly dispose: () => void;
};

function parseHTML(html: string, url?: string): ParsedDocument;
function parseXML(xml: string): ParsedDocument;
```

Node.js implementation uses happy-dom's `Window`, browser implementation uses native `DOMParser`.

### 4.3 Resource Management

```typescript
function extractCss(selector: string, content: string, options?: {...}): Result<RuntimeResult> {
  const { document, dispose } = parseHTML(content);
  try {
    const elements = document.querySelectorAll(selector);
    return ok(Array.from(elements));
  } catch (e) {
    return err({ code: "INVALID_SELECTOR", message: "...", cause: e });
  } finally {
    dispose();
  }
}
```

### 4.4 DocumentCache

```typescript
function createDocumentCache(): DocumentCache {
  const htmlCache = new Map<string, Document>();
  const xmlCache = new Map<string, Document>();

  return {
    getHTML(html, url) {
      const cached = htmlCache.get(html);
      if (cached) return cached;
      const { document } = parseHTML(html, url);
      htmlCache.set(html, document);
      return document;
    },
    getXML(xml) {
      const cached = xmlCache.get(xml);
      if (cached) return cached;
      const { document } = parseXML(xml);
      xmlCache.set(xml, document);
      return document;
    },
    dispose() {
      htmlCache.clear();
      xmlCache.clear();
    },
  };
}
```

When `ctx.documentCache` is provided, the extraction functions use it instead of creating fresh DOM trees per call.

## 5. URL Resolution

```typescript
function resolveUrl(template: string, ctx: EvalContext): string {
  let url = template;

  const variables: Record<string, string | undefined> = {
    ...ctx.variables,
    key: ctx.key,
    page: ctx.page !== undefined ? String(ctx.page) : undefined,
  };

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      url = url.replaceAll(`{{${key}}}`, value);
    }
  }

  if (ctx.baseUrl && !url.startsWith("http")) {
    url = new URL(url, ctx.baseUrl).href;
  }

  return url;
}
```

## 6. Replace Rules

```typescript
function applyReplaceRules(
  text: string,
  rules: readonly ReplaceRule[],
  options?: {
    readonly sourceId?: string;
    readonly sourceName?: string;
    readonly target?: "content" | "title";
    readonly jsExecutor?: JsExecutor;
    readonly allowScript?: boolean; // required for replacementJs
  },
): string | Promise<string>;

function matchesScope(
  scope: ReplaceScope | undefined,
  sourceId?: string,
  sourceName?: string,
  target?: "content" | "title",
): boolean;
```

## 7. TXT TOC Rules

```typescript
type ChapterBoundary = {
  readonly lineIndex: number;
  readonly title: string;
  readonly ruleName: string;
};

function findChapterBoundaries(
  lines: readonly string[],
  rules: readonly TxtTocRule[],
): ChapterBoundary[];
```

Rules are sorted by `order` ascending. First match per line wins. Empty pattern matches all non-empty lines (fallback).

## 8. Zod Schemas

All schemas map 1:1 to `schemas/readerx/*.schema.json`. Use `.strict()` (additionalProperties: false).

```typescript
// Schemas correspond to:
// schemas/readerx/book-source-rule.schema.json  → bookSourceSchema
// schemas/readerx/dict-rule.schema.json          → dictRuleFileSchema
// schemas/readerx/replace-rule.schema.json       → replaceRuleFileSchema
// schemas/readerx/txt-toc-rule.schema.json       → txtTocRuleFileSchema

function parseBookSource(data: unknown): BookSource;       // throws
function validateBookSource(data: unknown): Result<BookSource>; // returns Result

function parseDictRuleFile(data: unknown): DictRuleFile;
function validateDictRuleFile(data: unknown): Result<DictRuleFile>;

function parseReplaceRuleFile(data: unknown): ReplaceRuleFile;
function validateReplaceRuleFile(data: unknown): Result<ReplaceRuleFile>;

function parseTxtTocRuleFile(data: unknown): TxtTocRuleFile;
function validateTxtTocRuleFile(data: unknown): Result<TxtTocRuleFile>;
```

## 9. Package Structure

```
packages/rule-engine/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts                    # Public API re-exports
    types.ts                    # All TypeScript types
    schemas.ts                  # Zod schemas + parse/validate functions
    result.ts                   # Result<T,E> type + helpers (ok, err, isOk, isErr)

    # Core evaluation
    compile.ts                  # compileRule / compileSteps
    evaluate.ts                 # evaluateCompiled / evaluateRule / evaluatePipeline
    extract.ts                  # Extraction dispatch (routes to engine-specific impl)
    transform.ts                # String transform + DOM transform implementations
    normalize.ts                # RuleObject → RuleStep[] normalization

    # Extraction engines
    css.ts                      # CSS selector extraction
    xpath.ts                    # XPath public API
    xpath-eval.ts               # XPath evaluation (Node.js: happy-dom)
    xpath-eval.browser.ts       # XPath evaluation (Browser: native)
    jsonpath.ts                 # JSONPath extraction (@swaggerexpert/jsonpath)
    regex.ts                    # Regex extraction
    template.ts                 # Template variable expansion

    # Platform dual implementations
    dom-parse.ts                # DOM parsing (Node.js: happy-dom)
    dom-parse.browser.ts        # DOM parsing (Browser: native DOMParser)

    # URL handling
    url-analyzer.ts             # URL template resolution

    # Utilities
    document-cache.ts           # DocumentCache implementation
    serialize.ts                # RuntimeValue → string serialization

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
    integration/
      evaluate-rule.test.ts
      evaluate-pipeline.test.ts
      evaluate-scope.test.ts
      evaluate-field.test.ts
      apply-replace.test.ts
      find-chapters.test.ts
    e2e/
      book-source-e2e.test.ts   # Uses schemas/readerx/examples/ real data
      dict-rule-e2e.test.ts
    schemas/
      book-source-schema.test.ts
      dict-rule-schema.test.ts
      replace-rule-schema.test.ts
      txt-toc-rule-schema.test.ts
```

## 10. Public API Surface

```typescript
// === Types ===
export type {
  Result, RuleError, RuleErrorCode,
  RuntimeValue, RuntimeResult,
  BookSource, BookSourceType, RequestConfig,
  SearchModule, ExploreModule, BookInfoModule, TocModule, ContentModule,
  ExploreCategory, ReplacePair,
  Rule, RuleObject, RuleStep,
  ExtractStep, ExtractEngine, ExtractOutput,
  StringTransformStep, DomTransformStep, TransformStep,
  ScriptStep,
  DictRuleFile, DictRule, DictRequest, DictField, FieldSchema,
  ReplaceRuleFile, ReplaceRule, ReplaceScope,
  TxtTocRuleFile, TxtTocRule,
  ChapterBoundary,
  EvalContext, JsExecutor, JsEvalContext, JsEvalResult,
  DocumentCache,
  CompiledRule, CompiledStep,
} from "./types.ts";

// === Compile ===
export { compileRule, compileSteps } from "./compile.ts";

// === Evaluate ===
export {
  evaluateRule,
  evaluateCompiled,
  evaluatePipeline,
  evaluateField,
  serializeResult,
} from "./evaluate.ts";

// === Replace / TXT TOC ===
export { applyReplaceRules, matchesScope } from "./replace.ts";
export { findChapterBoundaries } from "./find-chapters.ts";

// === URL ===
export { resolveUrl } from "./url-analyzer.ts";

// === Normalize ===
export { normalizeRule, toRule } from "./normalize.ts";

// === DocumentCache ===
export { createDocumentCache } from "./document-cache.ts";

// === Zod Schemas ===
export {
  bookSourceSchema, parseBookSource, validateBookSource,
  dictRuleFileSchema, parseDictRuleFile, validateDictRuleFile,
  replaceRuleFileSchema, parseReplaceRuleFile, validateReplaceRuleFile,
  txtTocRuleFileSchema, parseTxtTocRuleFile, validateTxtTocRuleFile,
} from "./schemas.ts";
```

## 11. Testing Strategy

### 11.1 Test Data

Use `schemas/readerx/examples/*.json` as test fixtures. These contain real rule definitions that the engine must handle correctly.

### 11.2 Test Categories

1. **Unit tests** — Each extraction engine (CSS/XPath/JSONPath/Regex), each transform action, compile phase, normalization
2. **Integration tests** — Full pipeline evaluation, scope semantics, error handling
3. **E2E tests** — Real book source and dict rule examples with mock HTML/JSON responses
4. **Schema tests** — Zod schema validation against example data

### 11.3 Key Test Scenarios

- Chained extract with scope="current" (book → title mapping)
- Extract with scope="root" (independent queries)
- String transform on Element input (auto-serialization)
- DOM transform preservation (Element in → Element out)
- ScriptStep with allowScript=false → SCRIPT_DISABLED error
- Compile phase: invalid selector → compile error
- DocumentCache: same HTML parsed once, reused across extracts
- ReplaceRule scope matching (include/exclude/target)
- TxtTocRule ordering and first-match semantics

## 12. package.json

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
  "dependencies": {
    "zod": "^4",
    "happy-dom": "^20",
    "@swaggerexpert/jsonpath": "^4"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  }
}
```
