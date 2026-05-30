# Import Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an import module to `@readerx/rule-engine` that imports ReaderX native rules (via Zod) and converts Legado legacy rules (with `@deprecated` + `ConversionReport`).

**Architecture:** Isolated `src/import/` directory containing types, a single-level DSL parser, per-rule-type converters, and a report aggregator. Legado code is fully self-contained for future deletion.

**Tech Stack:** TypeScript, Zod 4, Vitest, existing `@readerx/rule-engine` types (`RuleStep`, `Result`, etc.)

**Spec:** `docs/superpowers/specs/2026-05-31-import-module-design.md`

---

## File Structure

```
packages/rule-engine/src/import/
  index.ts                    # Public API barrel
  types.ts                    # Legado types + ImportError + ConversionReport + ImportOptions + ImportedResult
  parser.ts                   # convertLegadoRule() — single-level DSL → ConversionResult
  converters/
    txt-toc.ts                # LegadoTxtTocRule[] → TxtTocRuleFile
    replace-rule.ts           # LegadoReplaceRule[] → ReplaceRuleFile
    dict-rule.ts              # LegadoDictRule[] → DictRuleFile
    book-source.ts            # LegadoBookSource → BookSource
  report.ts                   # createReport() + mergeReports()

packages/rule-engine/__tests__/unit/import/
  parser.test.ts
  converters/
    txt-toc.test.ts
    replace-rule.test.ts
    dict-rule.test.ts
    book-source.test.ts
  import-api.test.ts
```

**Modified files:**
- `packages/rule-engine/src/index.ts` — add import re-exports
- `packages/rule-engine/package.json` — no changes needed (imports via `./src/index.ts`)

---

## Task 1: Import Types (`types.ts`)

**Files:**
- Create: `packages/rule-engine/src/import/types.ts`

- [ ] **Step 1: Write `types.ts` with all Legado types and import result types**

```typescript
import type { RuleStep } from "../types.js";

// ── Legado Raw Types ──────────────────────────────────────

export type LegadoBookSource = {
	bookSourceUrl?: string;
	bookSourceName?: string;
	bookSourceType?: number;
	bookSourceGroup?: string;
	bookSourceComment?: string;
	bookUrlPattern?: string;
	customOrder?: number;
	enabled?: boolean;
	enabledExplore?: boolean;
	exploreUrl?: string;
	header?: string;
	lastUpdateTime?: number;
	weight?: number;
	concurrentRate?: string;
	loginUrl?: string;
	searchUrl?: string;
	enabledCookieJar?: boolean;
	loginUi?: string;
	loginCheckJs?: string;
	respondTime?: number;
	ruleSearch?: LegadoRuleFields;
	ruleExplore?: LegadoRuleFields;
	ruleBookInfo?: LegadoRuleBookInfo;
	ruleToc?: LegadoRuleToc;
	ruleContent?: LegadoRuleContent;
};

export type LegadoRuleFields = {
	bookList?: string;
	name?: string;
	author?: string;
	bookUrl?: string;
	coverUrl?: string;
	intro?: string;
	kind?: string;
	lastChapter?: string;
	wordCount?: string;
	checkKeyWord?: string;
};

export type LegadoRuleBookInfo = {
	init?: string;
	name?: string;
	author?: string;
	coverUrl?: string;
	intro?: string;
	kind?: string;
	lastChapter?: string;
	tocUrl?: string;
	wordCount?: string;
};

export type LegadoRuleToc = {
	chapterList?: string;
	chapterName?: string;
	chapterUrl?: string;
	isVip?: string;
	isVolume?: string;
	updateTime?: string;
	nextTocUrl?: string;
};

export type LegadoRuleContent = {
	content?: string;
	nextContentUrl?: string;
	replaceRegex?: string;
};

export type LegadoDictRule = {
	name?: string;
	urlRule?: string;
	showRule?: string;
	enabled?: boolean;
	sortNumber?: number;
};

export type LegadoReplaceRule = {
	id?: number;
	name?: string;
	group?: string;
	pattern?: string;
	replacement?: string;
	scope?: string;
	scopeTitle?: boolean;
	scopeContent?: boolean;
	excludeScope?: string;
	isEnabled?: boolean;
	isRegex?: boolean;
	timeoutMillisecond?: number;
	sortOrder?: number;
};

export type LegadoTxtTocRule = {
	id?: number;
	name?: string;
	rule?: string;
	example?: string;
	serialNumber?: number;
	enable?: boolean;
};

// ── Import Result Types ───────────────────────────────────

export type ImportError = {
	readonly kind: "parse_error" | "convert_error" | "unsupported_feature";
	readonly message: string;
	readonly path?: string;
	readonly original?: unknown;
};

export type ImportOptions = {
	readonly collectWarnings?: boolean;
};

export type ConversionResult = {
	readonly steps?: readonly RuleStep[];
	readonly legacyScript?: string;
	readonly unsupported: readonly string[];
};

export type ConversionReport = {
	readonly totalRules: number;
	readonly convertedRules: number;
	readonly partialConvertedRules: number;
	readonly scriptFallbackRules: number;
	readonly unsupportedFeatures: readonly string[];
};

export type ImportedResult<T> = {
	readonly data: T;
	readonly report: ConversionReport;
	readonly warnings: readonly ImportError[];
};

export type RuleFormatKind =
	| "readerx-book-source"
	| "readerx-dict"
	| "readerx-replace"
	| "readerx-txt-toc"
	| "legado-book-source"
	| "legado-dict"
	| "legado-replace"
	| "legado-txt-toc"
	| "unknown";
```

- [ ] **Step 2: Commit**

```bash
git add packages/rule-engine/src/import/types.ts
git commit -m "feat(rule-engine/import): add Legado types and import result types"
```

---

## Task 2: ConversionReport Utilities (`report.ts`)

**Files:**
- Create: `packages/rule-engine/src/import/report.ts`

- [ ] **Step 1: Write `report.ts`**

```typescript
import type { ConversionReport, ConversionResult } from "./types.js";

export function createReport(results: readonly ConversionResult[]): ConversionReport {
	let convertedRules = 0;
	let partialConvertedRules = 0;
	let scriptFallbackRules = 0;
	const featureSet = new Set<string>();

	for (const result of results) {
		if (result.unsupported.length === 0 && result.steps && !result.legacyScript) {
			convertedRules++;
		} else if (result.legacyScript && (!result.steps || result.steps.length === 0)) {
			scriptFallbackRules++;
		} else {
			partialConvertedRules++;
		}

		for (const feature of result.unsupported) {
			featureSet.add(feature);
		}
	}

	return {
		totalRules: results.length,
		convertedRules,
		partialConvertedRules,
		scriptFallbackRules,
		unsupportedFeatures: [...featureSet],
	};
}

export function mergeReports(reports: readonly ConversionReport[]): ConversionReport {
	let totalRules = 0;
	let convertedRules = 0;
	let partialConvertedRules = 0;
	let scriptFallbackRules = 0;
	const featureSet = new Set<string>();

	for (const report of reports) {
		totalRules += report.totalRules;
		convertedRules += report.convertedRules;
		partialConvertedRules += report.partialConvertedRules;
		scriptFallbackRules += report.scriptFallbackRules;
		for (const feature of report.unsupportedFeatures) {
			featureSet.add(feature);
		}
	}

	return {
		totalRules,
		convertedRules,
		partialConvertedRules,
		scriptFallbackRules,
		unsupportedFeatures: [...featureSet],
	};
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/rule-engine/src/import/report.ts
git commit -m "feat(rule-engine/import): add ConversionReport utilities"
```

---

## Task 3: Legado DSL Parser (`parser.ts` + tests)

**Files:**
- Create: `packages/rule-engine/src/import/parser.ts`
- Create: `packages/rule-engine/__tests__/unit/import/parser.test.ts`

This is the core of the import module. It takes a single Legado rule string and produces a `ConversionResult`.

### 3.1 Write the test first

- [ ] **Step 1: Write `parser.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { convertLegadoRule, wrapAsLegacyScript } from "../../../src/import/parser.js";

describe("convertLegadoRule", () => {
	// ── Simple CSS selectors ───────────────────────────────
	it("converts a simple class selector (@css: prefix)", () => {
		const result = convertLegadoRule("@css:.book-title");
		expect(result.steps).toBeDefined();
		expect(result.steps!.length).toBe(1);
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-title",
		});
		expect(result.unsupported).toEqual([]);
		expect(result.legacyScript).toBeUndefined();
	});

	it("converts a simple class.xxx JSoup selector", () => {
		const result = convertLegadoRule("class.book-title");
		expect(result.steps).toBeDefined();
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-title",
		});
	});

	it("converts class.xxx@text to output: text", () => {
		const result = convertLegadoRule("class.book-title@text");
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-title",
			output: "text",
		});
	});

	it("converts class.xxx@html to output: html", () => {
		const result = convertLegadoRule("class.content@html");
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".content",
			output: "html",
		});
	});

	it("converts class.xxx@href to output: attr, attr: href", () => {
		const result = convertLegadoRule("class.book-url@href");
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-url",
			output: "attr",
			attr: "href",
		});
	});

	it("converts id.xxx to #xxx", () => {
		const result = convertLegadoRule("id.content");
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "#content",
		});
	});

	it("converts tag.div to div", () => {
		const result = convertLegadoRule("tag.div");
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "div",
		});
	});

	// ── XPath selectors ────────────────────────────────────
	it("converts XPath starting with //", () => {
		const result = convertLegadoRule("//meta[@property='og:novel:author']/@content");
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "xpath",
			selector: "//meta[@property='og:novel:author']/@content",
		});
	});

	// ── JSONPath selectors ─────────────────────────────────
	it("converts JSONPath starting with $.", () => {
		const result = convertLegadoRule("$.data.content");
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "jsonpath",
			selector: "$.data.content",
		});
	});

	// ── ## replace ─────────────────────────────────────────
	it("converts selector##replacePattern into extract + replace transform", () => {
		const result = convertLegadoRule("class.title##prefix\\.");
		expect(result.steps!.length).toBe(2);
		expect(result.steps![0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".title",
		});
		expect(result.steps![1]).toEqual({
			type: "transform",
			category: "string",
			action: "replace",
			pattern: "prefix\\.",
			with: "",
		});
	});

	it("converts multiple ## replacements", () => {
		const result = convertLegadoRule("$.name##^##\\s+$");
		expect(result.steps!.length).toBe(3);
		expect(result.steps![1]).toEqual({
			type: "transform",
			category: "string",
			action: "replace",
			pattern: "^",
			with: "",
		});
		expect(result.steps![2]).toEqual({
			type: "transform",
			category: "string",
			action: "replace",
			pattern: "\\s+$",
			with: "",
		});
	});

	// ── @js: → ScriptStep fallback ─────────────────────────
	it("falls back to legacyScript for @js: expressions", () => {
		const result = convertLegadoRule("@js:baseUrl.replace('/txt','')");
		expect(result.legacyScript).toBeDefined();
		expect(result.unsupported).toContain("js-expression");
	});

	// ── Unsupported features → ScriptStep fallback ─────────
	it("falls back for @put expressions", () => {
		const result = convertLegadoRule("$.data@put:{book:$.id}");
		expect(result.legacyScript).toBeDefined();
		expect(result.unsupported).toContain("variable-system");
	});

	it("falls back for && merge operator", () => {
		const result = convertLegadoRule("class.a&&class.b");
		expect(result.legacyScript).toBeDefined();
		expect(result.unsupported).toContain("merge-operator");
	});

	it("falls back for @get expressions", () => {
		const result = convertLegadoRule("@get:{book}");
		expect(result.legacyScript).toBeDefined();
		expect(result.unsupported).toContain("variable-system");
	});

	// ── Unknown format → fallback ──────────────────────────
	it("falls back for unrecognizable expressions", () => {
		const result = convertLegadoRule("something weird no engine");
		expect(result.legacyScript).toBeDefined();
		expect(result.unsupported).toContain("unknown-engine");
	});

	// ── Edge cases ─────────────────────────────────────────
	it("returns empty steps for empty string", () => {
		const result = convertLegadoRule("");
		expect(result.steps).toEqual([]);
		expect(result.unsupported).toEqual([]);
	});

	it("handles plain text as regex engine fallback", () => {
		const result = convertLegadoRule("text");
		// "text" doesn't match any known engine prefix, so it falls back
		expect(result.legacyScript).toBeDefined();
	});
});
```

- [ ] **Step 2: Write `parser.ts` implementation**

```typescript
import type { ConversionResult } from "./types.js";
import type { RuleStep } from "../types.js";

// ── Unsupported feature detection ─────────────────────────

const UNSUPPORTED_PATTERNS: readonly (readonly [RegExp, string])[] = [
	[/@put:\{/, "variable-system"],
	[/@get:\{/, "variable-system"],
	[/&&/, "merge-operator"],
	[/@js:/, "js-expression"],
] as const;

function detectUnsupportedFeatures(expression: string): string[] {
	const features: string[] = [];
	for (const [pattern, name] of UNSUPPORTED_PATTERNS) {
		if (pattern.test(expression)) {
			features.push(name);
		}
	}
	return features;
}

function containsUnsupported(expression: string): boolean {
	return UNSUPPORTED_PATTERNS.some(([pattern]) => pattern.test(expression));
}

// ── Legacy script wrapper ─────────────────────────────────

export function wrapAsLegacyScript(expression: string): string {
	return `/* legado-legacy */ return (function() { /* original: ${expression.replace(/\*\//g, "*\\/")} */ throw new Error("Legado legacy rule not yet executable: upgrade or remove this rule"); })()`;
}

// ── JSoup simple selector conversion ──────────────────────

type JsoupResult = {
	selector: string;
	output?: "text" | "html" | "outerHtml" | "attr";
	attr?: string;
};

/**
 * Converts simple one-level JSoup selectors only:
 *   class.xxx → .xxx
 *   id.xxx    → #xxx
 *   tag.div   → div
 * Plus @text / @html / @href / @src / @data-* output suffix.
 * Returns null for anything more complex (indices, chains, slices).
 */
function parseSimpleJsoup(input: string): JsoupResult | null {
	// Match: (class|id|tag).(name)@(output) or (class|id|tag).(name)
	const match = input.match(/^(?:class|id|tag)\.([a-zA-Z0-9_-]+)(?:@(text|html|href|src|data-[a-zA-Z0-9_-]+))?$/);
	if (!match) return null;

	const name = match[1];
	const outputSuffix = match[2];

	const prefix = input.startsWith("class.")
		? "."
		: input.startsWith("id.")
			? "#"
			: "";

	const result: JsoupResult = { selector: `${prefix}${name}` };

	if (outputSuffix === "text") {
		result.output = "text";
	} else if (outputSuffix === "html") {
		result.output = "html";
	} else if (outputSuffix === "href" || outputSuffix === "src") {
		result.output = "attr";
		result.attr = outputSuffix;
	} else if (outputSuffix?.startsWith("data-")) {
		result.output = "attr";
		result.attr = outputSuffix;
	}

	return result;
}

// ── Engine inference ───────────────────────────────────────

type InferredEngine = {
	engine: "css" | "xpath" | "jsonpath";
	selector: string;
	output?: "text" | "html" | "outerHtml" | "attr";
	attr?: string;
};

function inferEngine(selector: string): InferredEngine | null {
	// Explicit prefixes
	if (selector.startsWith("@css:")) {
		return { engine: "css", selector: selector.slice(5) };
	}
	if (selector.startsWith("@xpath:")) {
		return { engine: "xpath", selector: selector.slice(7) };
	}
	if (selector.startsWith("@json:")) {
		return { engine: "jsonpath", selector: selector.slice(6) };
	}

	// Pattern inference
	if (selector.startsWith("//") || selector.startsWith("./")) {
		return { engine: "xpath", selector };
	}
	if (selector.startsWith("$.")) {
		return { engine: "jsonpath", selector };
	}

	// Simple JSoup
	const jsoup = parseSimpleJsoup(selector);
	if (jsoup) {
		return { engine: "css", selector: jsoup.selector, output: jsoup.output, attr: jsoup.attr };
	}

	return null;
}

// ── Main conversion function ──────────────────────────────

export function convertLegadoRule(expression: string): ConversionResult {
	if (!expression) {
		return { steps: [], unsupported: [] };
	}

	// 1. Check unsupported features
	if (containsUnsupported(expression)) {
		return {
			legacyScript: wrapAsLegacyScript(expression),
			unsupported: detectUnsupportedFeatures(expression),
		};
	}

	// 2. Split on ## for replacement patterns
	const parts = expression.split("##");
	const mainRule = parts[0];

	// 3. Infer engine
	const inferred = inferEngine(mainRule);
	if (!inferred) {
		return {
			legacyScript: wrapAsLegacyScript(expression),
			unsupported: ["unknown-engine"],
		};
	}

	// 4. Build steps
	const steps: RuleStep[] = [];

	// Extract step
	const extractStep: RuleStep = {
		type: "extract",
		engine: inferred.engine,
		selector: inferred.selector,
	};
	if (inferred.output) {
		(extractStep as Record<string, unknown>).output = inferred.output;
	}
	if (inferred.attr) {
		(extractStep as Record<string, unknown>).attr = inferred.attr;
	}
	steps.push(extractStep);

	// Replace transforms from ## suffixes
	for (const replacePattern of parts.slice(1)) {
		steps.push({
			type: "transform",
			category: "string",
			action: "replace",
			pattern: replacePattern,
			with: "",
		});
	}

	return { steps, unsupported: [] };
}
```

- [ ] **Step 3: Run tests**

Run: `cd packages/rule-engine && pnpm vitest run __tests__/unit/import/parser.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/src/import/parser.ts packages/rule-engine/__tests__/unit/import/parser.test.ts
git commit -m "feat(rule-engine/import): add Legado DSL parser with single-level conversion"
```

---

## Task 4: TXT TOC Converter (`converters/txt-toc.ts` + tests)

**Files:**
- Create: `packages/rule-engine/src/import/converters/txt-toc.ts`
- Create: `packages/rule-engine/__tests__/unit/import/converters/txt-toc.test.ts`

The simplest converter — nearly 1:1 field mapping.

- [ ] **Step 1: Write `txt-toc.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { convertLegadoTxtTocRules } from "../../../../src/import/converters/txt-toc.js";

describe("convertLegadoTxtTocRules", () => {
	it("converts an array of Legado txt-toc rules to ReaderX format", () => {
		const legadoRules = [
			{
				id: -1,
				name: "标准章节",
				rule: "^第[零一二三四五六七八九十百千万\\d]+章\\s+.+",
				example: "第一章 开端",
				serialNumber: 0,
				enable: true,
			},
			{
				id: -100,
				name: "默认分章规则",
				rule: "",
				example: "",
				serialNumber: 99,
				enable: true,
			},
		];

		const result = convertLegadoTxtTocRules(legadoRules);

		expect(result.data.$schema).toBe("readerx/txt-toc-rule/v1");
		expect(result.data.rules).toHaveLength(2);

		const first = result.data.rules[0];
		expect(first.name).toBe("标准章节");
		expect(first.pattern).toBe("^第[零一二三四五六七八九十百千万\\d]+章\\s+.+");
		expect(first.description).toBe("第一章 开端");
		expect(first.order).toBe(0);
		expect(first.enabled).toBe(true);

		const fallback = result.data.rules[1];
		expect(fallback.name).toBe("默认分章规则");
		expect(fallback.pattern).toBe("");
		expect(fallback.order).toBe(99);
	});

	it("extracts inline regex flags (?mi) into flags field", () => {
		const legadoRules = [
			{
				id: -5,
				name: "English Chapter",
				rule: "(?mi)^Chapter\\s+\\d+",
				example: "Chapter 1",
				serialNumber: 3,
				enable: true,
			},
		];

		const result = convertLegadoTxtTocRules(legadoRules);
		const rule = result.data.rules[0];
		expect(rule.flags).toBe("gmi");
		// Pattern should have inline flags stripped
		expect(rule.pattern).toBe("^Chapter\\s+\\d+");
	});

	it("uses defaults for missing optional fields", () => {
		const legadoRules = [
			{ id: -1, name: "Minimal", rule: ".*", serialNumber: 0 },
		];

		const result = convertLegadoTxtTocRules(legadoRules);
		const rule = result.data.rules[0];
		expect(rule.enabled).toBe(true);
		expect(rule.flags).toBe("gm");
	});

	it("reports conversion stats correctly", () => {
		const legadoRules = [
			{ id: -1, name: "Rule 1", rule: "pattern1", serialNumber: 0, enable: true },
			{ id: -2, name: "Rule 2", rule: "pattern2", serialNumber: 1, enable: false },
		];

		const result = convertLegadoTxtTocRules(legadoRules);
		expect(result.report.totalRules).toBe(2);
		expect(result.report.convertedRules).toBe(2);
		expect(result.report.scriptFallbackRules).toBe(0);
	});

	it("handles empty input array", () => {
		const result = convertLegadoTxtTocRules([]);
		expect(result.data.rules).toHaveLength(0);
		expect(result.report.totalRules).toBe(0);
	});
});
```

- [ ] **Step 2: Write `txt-toc.ts` implementation**

```typescript
import type { LegadoTxtTocRule, ImportedResult, ImportError } from "../types.js";
import type { TxtTocRule, TxtTocRuleFile } from "../../types.js";
import { createReport } from "../report.js";
import type { ConversionResult } from "../types.js";

const SCHEMA_ID = "readerx/txt-toc-rule/v1";

function extractInlineFlags(pattern: string): { pattern: string; flags: string } {
	// Match inline flags like (?mi), (?g), (?gm) at the start
	const inlineFlagMatch = pattern.match(/^\(\?([gimsuy]+)\)/);
	if (inlineFlagMatch) {
		const inlineFlags = inlineFlagMatch[1];
		const cleanedPattern = pattern.slice(inlineFlagMatch[0].length);
		// Merge with default "gm", ensure 'g' is always present
		const flagSet = new Set(["g", ...inlineFlags.split("")]);
		return { pattern: cleanedPattern, flags: [...flagSet].sort().join("") };
	}
	return { pattern, flags: "gm" };
}

function convertOne(rule: LegadoTxtTocRule): TxtTocRule {
	const { pattern, flags } = extractInlineFlags(rule.rule ?? "");

	return {
		name: rule.name ?? "",
		pattern,
		description: rule.example || undefined,
		enabled: rule.enable ?? true,
		order: rule.serialNumber ?? 0,
		flags,
	};
}

export function convertLegadoTxtTocRules(
	rules: readonly LegadoTxtTocRule[],
): ImportedResult<TxtTocRuleFile> {
	const warnings: ImportError[] = [];
	const conversionResults: ConversionResult[] = [];
	const convertedRules: TxtTocRule[] = [];

	for (const rule of rules) {
		convertedRules.push(convertOne(rule));
		conversionResults.push({ steps: [], unsupported: [] });
	}

	return {
		data: {
			$schema: SCHEMA_ID,
			rules: convertedRules,
		},
		report: createReport(conversionResults),
		warnings,
	};
}
```

- [ ] **Step 3: Run tests**

Run: `cd packages/rule-engine && pnpm vitest run __tests__/unit/import/converters/txt-toc.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/src/import/converters/txt-toc.ts packages/rule-engine/__tests__/unit/import/converters/txt-toc.test.ts
git commit -m "feat(rule-engine/import): add Legado TXT TOC converter"
```

---

## Task 5: Replace Rule Converter (`converters/replace-rule.ts` + tests)

**Files:**
- Create: `packages/rule-engine/src/import/converters/replace-rule.ts`
- Create: `packages/rule-engine/__tests__/unit/import/converters/replace-rule.test.ts`

- [ ] **Step 1: Write `replace-rule.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { convertLegadoReplaceRules } from "../../../../src/import/converters/replace-rule.js";

describe("convertLegadoReplaceRules", () => {
	it("converts basic replace rules with field mapping", () => {
		const legado = [
			{
				id: 1,
				name: "#01 空行压缩",
				group: "格式",
				pattern: "\\n{3,}",
				replacement: "\\n\\n",
				isRegex: true,
				isEnabled: true,
				scopeContent: true,
				scopeTitle: false,
				sortOrder: 1,
			},
		];

		const result = convertLegadoReplaceRules(legado);

		expect(result.data.$schema).toBe("readerx/replace-rule/v1");
		expect(result.data.rules).toHaveLength(1);

		const rule = result.data.rules[0];
		expect(rule.name).toBe("#01 空行压缩");
		expect(rule.tags).toEqual(["格式"]);
		expect(rule.pattern).toBe("\\n{3,}");
		expect(rule.replacement).toBe("\\n\\n");
		expect(rule.literal).toBeUndefined();
		expect(rule.enabled).toBe(true);
		expect(rule.order).toBe(1);
		expect(rule.scope?.target).toBe("content");
	});

	it("converts isRegex:false to literal:true", () => {
		const legado = [
			{
				name: "Literal fix",
				pattern: "错别字",
				replacement: "正确字",
				isRegex: false,
				isEnabled: true,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		expect(result.data.rules[0].literal).toBe(true);
	});

	it("converts @js: replacement to replacementJs", () => {
		const legado = [
			{
				name: "JS rule",
				pattern: "pattern",
				replacement: "@js:return result.replace(/a/g,'b');",
				isRegex: true,
				isEnabled: true,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = result.data.rules[0];
		expect(rule.replacement).toBeUndefined();
		expect(rule.replacementJs).toBe("return result.replace(/a/g,'b');");
	});

	it("converts scope string to scope.include array", () => {
		const legado = [
			{
				name: "Scoped rule",
				pattern: "ad",
				scope: "https://source1.com,https://source2.com",
				excludeScope: "https://source1.com/clean",
				isRegex: true,
				isEnabled: true,
				scopeContent: true,
				scopeTitle: true,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = result.data.rules[0];
		expect(rule.scope?.include).toEqual(["https://source1.com", "https://source2.com"]);
		expect(rule.scope?.exclude).toEqual(["https://source1.com/clean"]);
		expect(rule.scope?.target).toBe("both");
	});

	it("handles empty scope (global rule)", () => {
		const legado = [
			{
				name: "Global rule",
				pattern: "cleanup",
				isRegex: true,
				isEnabled: true,
				scopeContent: true,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = result.data.rules[0];
		expect(rule.scope?.include).toBeUndefined();
		expect(rule.scope?.target).toBe("content");
	});

	it("records timeoutMillisecond as unsupported warning", () => {
		const legado = [
			{
				name: "Timeout rule",
				pattern: "p",
				isRegex: true,
				isEnabled: true,
				timeoutMillisecond: 5000,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings[0].kind).toBe("unsupported_feature");
	});
});
```

- [ ] **Step 2: Write `replace-rule.ts` implementation**

```typescript
import type { LegadoReplaceRule, ImportedResult, ImportError, ConversionResult } from "../types.js";
import type { ReplaceRule, ReplaceRuleFile, ReplaceScope } from "../../types.js";
import { createReport } from "../report.js";

const SCHEMA_ID = "readerx/replace-rule/v1";

function inferTarget(scopeTitle?: boolean, scopeContent?: boolean): "content" | "title" | "both" {
	if (scopeTitle && scopeContent) return "both";
	if (scopeTitle) return "title";
	return "content";
}

function splitScope(scope?: string): string[] | undefined {
	if (!scope) return undefined;
	const parts = scope.split(",").map((s) => s.trim()).filter(Boolean);
	return parts.length > 0 ? parts : undefined;
}

function convertOne(rule: LegadoReplaceRule, warnings: ImportError[]): ConversionResult & { rule: ReplaceRule } {
	const unsupported: string[] = [];

	// Handle replacement: check for @js: prefix
	let replacement: string | undefined;
	let replacementJs: string | undefined;
	if (rule.replacement?.startsWith("@js:")) {
		replacementJs = rule.replacement.slice(4);
	} else {
		replacement = rule.replacement ?? "";
	}

	// Handle scope
	const scope: ReplaceScope = {};
	const include = splitScope(rule.scope);
	const exclude = splitScope(rule.excludeScope);
	if (include) scope.include = include;
	if (exclude) scope.exclude = exclude;
	scope.target = inferTarget(rule.scopeTitle, rule.scopeContent);

	// Unsupported features
	if (rule.timeoutMillisecond !== undefined) {
		unsupported.push("timeout-millisecond");
		warnings.push({
			kind: "unsupported_feature",
			message: `Rule "${rule.name}" uses timeoutMillisecond (${rule.timeoutMillisecond}ms) which is not supported in ReaderX`,
			original: rule.timeoutMillisecond,
		});
	}

	const converted: ReplaceRule = {
		name: rule.name ?? "",
		pattern: rule.pattern ?? "",
		...(rule.isRegex === false ? { literal: true } : {}),
		...(replacement !== undefined ? { replacement } : {}),
		...(replacementJs !== undefined ? { replacementJs } : {}),
		enabled: rule.isEnabled ?? true,
		order: rule.sortOrder ?? 0,
		...(rule.group ? { tags: [rule.group] } : {}),
		scope,
	};

	return { rule: converted, steps: [], unsupported };
}

export function convertLegadoReplaceRules(
	rules: readonly LegadoReplaceRule[],
): ImportedResult<ReplaceRuleFile> {
	const warnings: ImportError[] = [];
	const conversionResults: ConversionResult[] = [];
	const convertedRules: ReplaceRule[] = [];

	for (const rule of rules) {
		const result = convertOne(rule, warnings);
		convertedRules.push(result.rule);
		conversionResults.push({ steps: result.steps, unsupported: result.unsupported });
	}

	return {
		data: {
			$schema: SCHEMA_ID,
			rules: convertedRules,
		},
		report: createReport(conversionResults),
		warnings,
	};
}
```

- [ ] **Step 3: Run tests**

Run: `cd packages/rule-engine && pnpm vitest run __tests__/unit/import/converters/replace-rule.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/src/import/converters/replace-rule.ts packages/rule-engine/__tests__/unit/import/converters/replace-rule.test.ts
git commit -m "feat(rule-engine/import): add Legado replace rule converter"
```

---

## Task 6: Dict Rule Converter (`converters/dict-rule.ts` + tests)

**Files:**
- Create: `packages/rule-engine/src/import/converters/dict-rule.ts`
- Create: `packages/rule-engine/__tests__/unit/import/converters/dict-rule.test.ts`

- [ ] **Step 1: Write `dict-rule.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { convertLegadoDictRules } from "../../../../src/import/converters/dict-rule.js";

describe("convertLegadoDictRules", () => {
	it("converts a simple CSS showRule to structured pipeline", () => {
		const legado = [
			{
				name: "海词英文",
				urlRule: "https://dict.cn/{{key}}",
				showRule: "class.basic.main",
				enabled: true,
				sortNumber: 0,
			},
		];

		const result = convertLegadoDictRules(legado);

		expect(result.data.$schema).toBe("readerx/dict-rule/v1");
		expect(result.data.rules).toHaveLength(1);

		const rule = result.data.rules[0];
		expect(rule.id).toBe("海词英文");
		expect(rule.name).toBe("海词英文");
		expect(rule.request.url).toBe("https://dict.cn/{{key}}");
		expect(rule.enabled).toBe(true);
		expect(rule.weight).toBe(0);
		expect(rule.fields?.definition?.pipeline).toBeDefined();
		expect(rule.fields!.definition!.pipeline!.length).toBeGreaterThanOrEqual(1);
	});

	it("converts @js: showRule to ScriptStep pipeline", () => {
		const legado = [
			{
				name: "JS Dict",
				urlRule: "https://example.com/{{key}}",
				showRule: "@js:var html = org.jsoup.JSoup.parse(result); return html.select('.content').text();",
				enabled: true,
				sortNumber: 1,
			},
		];

		const result = convertLegadoDictRules(legado);
		const rule = result.data.rules[0];
		const pipeline = rule.fields?.definition?.pipeline;
		expect(pipeline).toBeDefined();
		expect(pipeline!.length).toBe(1);
		expect(pipeline![0].type).toBe("script");

		expect(result.report.scriptFallbackRules).toBe(1);
	});

	it("handles empty showRule gracefully", () => {
		const legado = [
			{
				name: "Empty",
				urlRule: "https://example.com/{{key}}",
				enabled: true,
				sortNumber: 0,
			},
		];

		const result = convertLegadoDictRules(legado);
		const rule = result.data.rules[0];
		expect(rule.fields).toBeUndefined();
	});

	it("reports stats correctly", () => {
		const legado = [
			{ name: "CSS Dict", urlRule: "https://a.com/{{key}}", showRule: "class.content", enabled: true, sortNumber: 0 },
			{ name: "JS Dict", urlRule: "https://b.com/{{key}}", showRule: "@js:return result;", enabled: true, sortNumber: 1 },
		];

		const result = convertLegadoDictRules(legado);
		expect(result.report.totalRules).toBe(2);
	});
});
```

- [ ] **Step 2: Write `dict-rule.ts` implementation**

```typescript
import type { LegadoDictRule, ImportedResult, ImportError, ConversionResult } from "../types.js";
import type { DictRule, DictRuleFile, RuleStep } from "../../types.js";
import { convertLegadoRule } from "../parser.js";
import { createReport } from "../report.js";

const SCHEMA_ID = "readerx/dict-rule/v1";

function convertOne(rule: LegadoDictRule, warnings: ImportError[]): ConversionResult & { rule: DictRule } {
	let pipeline: readonly RuleStep[] | undefined;
	let legacyScript: string | undefined;
	let unsupported: string[] = [];

	if (rule.showRule) {
		const conversion = convertLegadoRule(rule.showRule);
		unsupported = [...conversion.unsupported];

		if (conversion.legacyScript) {
			legacyScript = conversion.legacyScript;
			pipeline = [{ type: "script", code: conversion.legacyScript }];
		} else if (conversion.steps && conversion.steps.length > 0) {
			pipeline = conversion.steps;
		}
	}

	const dictRule: DictRule = {
		id: rule.name ?? "",
		name: rule.name ?? "",
		enabled: rule.enabled ?? true,
		weight: rule.sortNumber ?? 0,
		request: {
			url: rule.urlRule ?? "",
		},
		...(pipeline ? { fields: { definition: { pipeline } } } : {}),
	};

	return { rule: dictRule, steps: pipeline ?? [], unsupported };
}

export function convertLegadoDictRules(
	rules: readonly LegadoDictRule[],
): ImportedResult<DictRuleFile> {
	const warnings: ImportError[] = [];
	const conversionResults: ConversionResult[] = [];
	const convertedRules: DictRule[] = [];

	for (const rule of rules) {
		const result = convertOne(rule, warnings);
		convertedRules.push(result.rule);
		conversionResults.push({ steps: result.steps, unsupported: result.unsupported });
	}

	return {
		data: {
			$schema: SCHEMA_ID,
			rules: convertedRules,
		},
		report: createReport(conversionResults),
		warnings,
	};
}
```

- [ ] **Step 3: Run tests**

Run: `cd packages/rule-engine && pnpm vitest run __tests__/unit/import/converters/dict-rule.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/src/import/converters/dict-rule.ts packages/rule-engine/__tests__/unit/import/converters/dict-rule.test.ts
git commit -m "feat(rule-engine/import): add Legado dict rule converter"
```

---

## Task 7: Book Source Converter (`converters/book-source.ts` + tests)

**Files:**
- Create: `packages/rule-engine/src/import/converters/book-source.ts`
- Create: `packages/rule-engine/__tests__/unit/import/converters/book-source.test.ts`

This is the most complex converter. It must handle top-level field mapping, searchUrl/exploreUrl parsing, and five nested rule modules.

- [ ] **Step 1: Write `book-source.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { convertLegadoBookSources } from "../../../../src/import/converters/book-source.js";

describe("convertLegadoBookSources", () => {
	// ── Top-level field mapping ────────────────────────────
	it("converts basic top-level fields", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://www.qidian.com",
				bookSourceName: "起点中文",
				bookSourceType: 0,
				bookSourceGroup: "正版",
				bookSourceComment: "起点中文网",
				bookUrlPattern: "https://www.qidian.com/book/\\d+",
				enabled: true,
				weight: 99,
				customOrder: 0,
			},
		]);

		expect(result.data).toHaveLength(1);
		const source = result.data[0];
		expect(source.id).toBe("https://www.qidian.com");
		expect(source.baseUrl).toBe("https://www.qidian.com");
		expect(source.name).toBe("起点中文");
		expect(source.type).toBe("novel");
		expect(source.tags).toEqual(["正版"]);
		expect(source.description).toBe("起点中文网");
		expect(source.urlPattern).toBe("https://www.qidian.com/book/\\d+");
		expect(source.enabled).toBe(true);
		expect(source.weight).toBe(99);
		expect(source.order).toBe(0);
	});

	it("maps bookSourceType to correct enum values", () => {
		const types = [
			{ input: 0, expected: "novel" },
			{ input: 1, expected: "audio" },
			{ input: 2, expected: "comic" },
			{ input: 3, expected: "file" },
		] as const;

		for (const { input, expected } of types) {
			const result = convertLegadoBookSources([
				{ bookSourceUrl: "https://test.com", bookSourceType: input },
			]);
			expect(result.data[0].type).toBe(expected);
		}
	});

	it("converts concurrentRate string to rateLimit integer", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				concurrentRate: "2000",
			},
		]);
		expect(result.data[0].rateLimit).toBe(2000);
	});

	it("converts header JSON string to headers object", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				header: '{"User-Agent":"Mozilla/5.0","Cookie":"sid=abc"}',
			},
		]);
		expect(result.data[0].headers).toEqual({
			"User-Agent": "Mozilla/5.0",
			Cookie: "sid=abc",
		});
	});

	it("converts lastUpdateTime epoch ms to ISO 8601 updatedAt", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				lastUpdateTime: 1700000000000,
			},
		]);
		expect(result.data[0].updatedAt).toBe(new Date(1700000000000).toISOString());
	});

	it("records unsupported features as warnings", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				enabledCookieJar: true,
				loginUi: "{}",
				loginCheckJs: "return true",
			},
		]);
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	// ── searchUrl parsing ──────────────────────────────────
	it("extracts simple searchUrl to search.url", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				searchUrl: "https://test.com/search?q={{key}}&page={{page}}",
			},
		]);
		expect(result.data[0].search?.url).toBe("https://test.com/search?q={{key}}&page={{page}}");
	});

	it("marks @js: searchUrl as unsupported", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				searchUrl: "@js:var url = 'https://test.com/search?q=' + key;",
			},
		]);
		expect(result.report.unsupportedFeatures).toContain("js-search-url");
	});

	// ── exploreUrl parsing ─────────────────────────────────
	it("parses exploreUrl into explore.categories", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				exploreUrl: "玄幻::https://test.com/xuanhuan/{{page}}\n修仙::https://test.com/xiuxian/{{page}}",
			},
		]);
		expect(result.data[0].explore?.categories).toEqual([
			{ title: "玄幻", url: "https://test.com/xuanhuan/{{page}}" },
			{ title: "修仙", url: "https://test.com/xiuxian/{{page}}" },
		]);
	});

	// ── Rule modules ───────────────────────────────────────
	it("converts ruleSearch fields with simple selectors", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				ruleSearch: {
					bookList: "class.result-list@tag.div",
					name: "class.book-name@text",
					author: "class.author@text",
					bookUrl: "class.book-name@href",
				},
			},
		]);
		const search = result.data[0].search;
		expect(search?.rules?.list).toBeDefined();
		expect(search?.rules?.name).toBeDefined();
		expect(search?.rules?.author).toBeDefined();
		expect(search?.rules?.url).toBeDefined();
	});

	it("converts ruleToc field names correctly", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				ruleToc: {
					chapterList: "id.chapter-list@tag.a",
					chapterName: "tag.a@text",
					chapterUrl: "tag.a@href",
					nextTocUrl: "class.next@href",
				},
			},
		]);
		const toc = result.data[0].toc;
		expect(toc?.rules?.list).toBeDefined();
		expect(toc?.rules?.name).toBeDefined();
		expect(toc?.rules?.url).toBeDefined();
		expect(toc?.nextUrl).toBeDefined();
	});

	it("converts ruleContent field names correctly", () => {
		const result = convertLegadoBookSources([
			{
				bookSourceUrl: "https://test.com",
				ruleContent: {
					content: "id.content@html",
					nextContentUrl: "class.next-page@href",
				},
			},
		]);
		const content = result.data[0].content;
		expect(content?.rules?.text).toBeDefined();
		expect(content?.nextUrl).toBeDefined();
	});

	// ── Full integration test with real Legado data shape ───
	it("handles a complete book source from legado data", () => {
		const legado = [
			{
				bookSourceUrl: "https://www.qidian.com",
				bookSourceName: "起点中文",
				bookSourceType: 0,
				bookSourceGroup: "正版",
				enabled: true,
				weight: 99,
				customOrder: 0,
				searchUrl: "https://www.qidian.com/search?q={{key}}",
				ruleSearch: {
					bookList: "class.book-img-text@tag.ul@tag.li",
					name: "class.book-mid-info@tag.h4@tag.a@text",
				},
				ruleBookInfo: {
					name: "//meta[@property='og:novel:book_name']/@content",
					author: "//meta[@property='og:novel:author']/@content",
				},
				ruleContent: {
					content: "class.read-content@html",
				},
			},
		];

		const result = convertLegadoBookSources(legado);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].name).toBe("起点中文");
		expect(result.data[0].search?.rules?.list).toBeDefined();
		expect(result.data[0].bookInfo?.rules?.name).toBeDefined();
		expect(result.data[0].content?.rules?.text).toBeDefined();
		expect(result.report.totalRules).toBe(1);
	});
});
```

- [ ] **Step 2: Write `book-source.ts` implementation**

```typescript
import type {
	LegadoBookSource,
	LegadoRuleFields,
	LegadoRuleBookInfo,
	LegadoRuleToc,
	LegadoRuleContent,
	ImportedResult,
	ImportError,
	ConversionResult,
} from "../types.js";
import type {
	BookSource,
	BookSourceType,
	RequestConfig,
	SearchModule,
	ExploreModule,
	ExploreCategory,
	BookInfoModule,
	TocModule,
	ContentModule,
	Rule,
	ReplacePair,
} from "../../types.js";
import { convertLegadoRule } from "../parser.js";
import { createReport } from "../report.js";

// ── Helpers ───────────────────────────────────────────────

const TYPE_MAP: Record<number, BookSourceType> = {
	0: "novel",
	1: "audio",
	2: "comic",
	3: "file",
};

function convertType(type?: number): BookSourceType {
	return TYPE_MAP[type ?? 0] ?? "novel";
}

function parseHeader(header?: string): Record<string, string> | undefined {
	if (!header) return undefined;
	try {
		const parsed = JSON.parse(header);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			return parsed as Record<string, string>;
		}
	} catch {
		// Invalid JSON, skip
	}
	return undefined;
}

function epochToIso(epochMs?: number): string | undefined {
	if (!epochMs) return undefined;
	return new Date(epochMs).toISOString();
}

function splitComma(value?: string): string[] | undefined {
	if (!value) return undefined;
	const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
	return parts.length > 0 ? parts : undefined;
}

// ── ExploreUrl parsing ────────────────────────────────────

function parseExploreUrl(exploreUrl?: string): ExploreCategory[] | undefined {
	if (!exploreUrl) return undefined;
	const lines = exploreUrl.split("\n").map((l) => l.trim()).filter(Boolean);
	const categories: ExploreCategory[] = [];

	for (const line of lines) {
		const separator = line.indexOf("::");
		if (separator === -1) {
			categories.push({ title: line });
		} else {
			categories.push({
				title: line.slice(0, separator),
				url: line.slice(separator + 2),
			});
		}
	}

	return categories.length > 0 ? categories : undefined;
}

// ── Rule field conversion ─────────────────────────────────

function convertRuleField(expression: string | undefined): Rule | undefined {
	if (!expression) return undefined;
	const conversion = convertLegadoRule(expression);
	if (conversion.steps && conversion.steps.length > 0) {
		return conversion.steps;
	}
	if (conversion.legacyScript) {
		return [{ type: "script", code: conversion.legacyScript }];
	}
	return undefined;
}

// ── Search URL parsing ────────────────────────────────────

function parseSearchUrl(
	searchUrl?: string,
	conversionResults: ConversionResult[] = [],
	warnings: ImportError[] = [],
): Pick<SearchModule, "url"> & Partial<RequestConfig> | undefined {
	if (!searchUrl) return undefined;

	if (searchUrl.startsWith("@js:")) {
		conversionResults.push({
			unsupported: ["js-search-url"],
			legacyScript: searchUrl,
		});
		warnings.push({
			kind: "unsupported_feature",
			message: "searchUrl uses @js: which cannot be auto-converted",
			original: searchUrl,
		});
		return { url: "" };
	}

	return { url: searchUrl };
}

// ── Rule module conversion ────────────────────────────────

function convertRuleFields(fields: LegadoRuleFields | undefined): {
	rules: Record<string, Rule | undefined>;
	conversionResults: ConversionResult[];
} {
	if (!fields) return { rules: {}, conversionResults: [] };

	const fieldMap: Record<string, string> = {
		bookList: "list",
		name: "name",
		author: "author",
		bookUrl: "url",
		coverUrl: "cover",
		intro: "intro",
		kind: "kind",
		lastChapter: "lastChapter",
		wordCount: "wordCount",
	};

	const rules: Record<string, Rule | undefined> = {};
	const conversionResults: ConversionResult[] = [];

	for (const [legadoKey, readerxKey] of Object.entries(fieldMap)) {
		const value = (fields as Record<string, string | undefined>)[legadoKey];
		if (value) {
			const rule = convertRuleField(value);
			if (rule) rules[readerxKey] = rule;

			const conversion = convertLegadoRule(value);
			conversionResults.push(conversion);
		}
	}

	return { rules, conversionResults };
}

function convertRuleBookInfo(
	fields: LegadoRuleBookInfo | undefined,
): {
	rules: Record<string, Rule | undefined>;
	init?: Rule;
	conversionResults: ConversionResult[];
} {
	if (!fields) return { rules: {}, conversionResults: [] };

	const fieldMap: Record<string, string> = {
		name: "name",
		author: "author",
		coverUrl: "cover",
		intro: "intro",
		kind: "kind",
		lastChapter: "lastChapter",
		tocUrl: "tocUrl",
		wordCount: "wordCount",
	};

	const rules: Record<string, Rule | undefined> = {};
	const conversionResults: ConversionResult[] = [];

	for (const [legadoKey, readerxKey] of Object.entries(fieldMap)) {
		const value = (fields as Record<string, string | undefined>)[legadoKey];
		if (value) {
			const rule = convertRuleField(value);
			if (rule) rules[readerxKey] = rule;

			const conversion = convertLegadoRule(value);
			conversionResults.push(conversion);
		}
	}

	const init = fields.init ? convertRuleField(fields.init) : undefined;

	return { rules, init, conversionResults };
}

function convertRuleToc(
	fields: LegadoRuleToc | undefined,
): {
	rules: Record<string, Rule | undefined>;
	nextUrl?: Rule;
	conversionResults: ConversionResult[];
} {
	if (!fields) return { rules: {}, conversionResults: [] };

	const fieldMap: Record<string, string> = {
		chapterList: "list",
		chapterName: "name",
		chapterUrl: "url",
		isVip: "isVip",
		isVolume: "isVolume",
		updateTime: "updateTime",
	};

	const rules: Record<string, Rule | undefined> = {};
	const conversionResults: ConversionResult[] = [];

	for (const [legadoKey, readerxKey] of Object.entries(fieldMap)) {
		const value = (fields as Record<string, string | undefined>)[legadoKey];
		if (value) {
			const rule = convertRuleField(value);
			if (rule) rules[readerxKey] = rule;

			const conversion = convertLegadoRule(value);
			conversionResults.push(conversion);
		}
	}

	const nextUrl = fields.nextTocUrl ? convertRuleField(fields.nextTocUrl) : undefined;

	return { rules, nextUrl, conversionResults };
}

function parseReplaceRegex(replaceRegex?: string): ReplacePair[] | undefined {
	if (!replaceRegex) return undefined;
	// Legado replaceRegex uses ## prefix per pattern
	const pairs: ReplacePair[] = [];
	for (const pattern of replaceRegex.split("##").filter(Boolean)) {
		pairs.push({ pattern, with: "" });
	}
	return pairs.length > 0 ? pairs : undefined;
}

function convertRuleContent(
	fields: LegadoRuleContent | undefined,
): {
	rules: Record<string, Rule | undefined>;
	nextUrl?: Rule;
	replaceRegex?: ReplacePair[];
	conversionResults: ConversionResult[];
} {
	if (!fields) return { rules: {}, conversionResults: [] };

	const conversionResults: ConversionResult[] = [];
	const rules: Record<string, Rule | undefined> = {};

	if (fields.content) {
		rules.text = convertRuleField(fields.content);
		const conversion = convertLegadoRule(fields.content);
		conversionResults.push(conversion);
	}

	const nextUrl = fields.nextContentUrl
		? convertRuleField(fields.nextContentUrl)
		: undefined;

	const replaceRegex = parseReplaceRegex(fields.replaceRegex);

	return { rules, nextUrl, replaceRegex, conversionResults };
}

// ── Main conversion function ──────────────────────────────

export function convertLegadoBookSources(
	sources: readonly LegadoBookSource[],
): ImportedResult<BookSource[]> {
	const warnings: ImportError[] = [];
	const allConversionResults: ConversionResult[] = [];
	const convertedSources: BookSource[] = [];

	for (const src of sources) {
		const sourceConversionResults: ConversionResult[] = [];

		// Check unsupported top-level features
		if (src.enabledCookieJar) {
			warnings.push({
				kind: "unsupported_feature",
				message: "enabledCookieJar is not supported",
				path: "enabledCookieJar",
			});
		}
		if (src.loginUi) {
			warnings.push({
				kind: "unsupported_feature",
				message: "loginUi is not supported",
				path: "loginUi",
			});
		}
		if (src.loginCheckJs) {
			warnings.push({
				kind: "unsupported_feature",
				message: "loginCheckJs is not supported",
				path: "loginCheckJs",
			});
		}

		// Search module
		const searchUrlResult = parseSearchUrl(src.searchUrl, sourceConversionResults, warnings);
		const searchRules = convertRuleFields(src.ruleSearch);
		sourceConversionResults.push(...searchRules.conversionResults);

		const search: SearchModule | undefined = searchUrlResult
			? {
					...searchUrlResult,
					checkKeyWord: src.ruleSearch?.checkKeyWord,
					...(Object.keys(searchRules.rules).length > 0 ? { rules: searchRules.rules } : {}),
				}
			: undefined;

		// Explore module
		const categories = parseExploreUrl(src.exploreUrl);
		const exploreRules = convertRuleFields(src.ruleExplore);
		sourceConversionResults.push(...exploreRules.conversionResults);

		const explore: ExploreModule | undefined = categories
			? {
					categories,
					...(Object.keys(exploreRules.rules).length > 0 ? { rules: exploreRules.rules } : {}),
				}
			: undefined;

		// BookInfo module
		const bookInfoResult = convertRuleBookInfo(src.ruleBookInfo);
		sourceConversionResults.push(...bookInfoResult.conversionResults);

		const bookInfo: BookInfoModule | undefined =
			Object.keys(bookInfoResult.rules).length > 0 || bookInfoResult.init
				? {
						...(bookInfoResult.init ? { rules: { init: bookInfoResult.init, ...bookInfoResult.rules } } : { rules: bookInfoResult.rules }),
					}
				: undefined;

		// Toc module
		const tocResult = convertRuleToc(src.ruleToc);
		sourceConversionResults.push(...tocResult.conversionResults);

		const toc: TocModule | undefined =
			Object.keys(tocResult.rules).length > 0 || tocResult.nextUrl
				? {
						...(tocResult.nextUrl ? { nextUrl: tocResult.nextUrl } : {}),
						...(Object.keys(tocResult.rules).length > 0 ? { rules: tocResult.rules } : {}),
					}
				: undefined;

		// Content module
		const contentResult = convertRuleContent(src.ruleContent);
		sourceConversionResults.push(...contentResult.conversionResults);

		const content: ContentModule | undefined =
			Object.keys(contentResult.rules).length > 0 || contentResult.nextUrl
				? {
						...(contentResult.nextUrl ? { nextUrl: contentResult.nextUrl } : {}),
						...(contentResult.replaceRegex ? { replaceRegex: contentResult.replaceRegex } : {}),
						...(Object.keys(contentResult.rules).length > 0 ? { rules: contentResult.rules } : {}),
					}
				: undefined;

		// Build book source
		const rateLimit = src.concurrentRate ? parseInt(src.concurrentRate, 10) : undefined;

		const bookSource: BookSource = {
			$schema: "readerx/book-source-rule/v1",
			id: src.bookSourceUrl ?? "",
			name: src.bookSourceName ?? "",
			type: convertType(src.bookSourceType),
			baseUrl: src.bookSourceUrl ?? "",
			...(src.bookSourceGroup ? { tags: splitComma(src.bookSourceGroup) } : {}),
			...(src.bookSourceComment ? { description: src.bookSourceComment } : {}),
			...(src.bookUrlPattern ? { urlPattern: src.bookUrlPattern } : {}),
			...(src.enabled !== undefined ? { enabled: src.enabled } : {}),
			...(src.weight !== undefined ? { weight: src.weight } : {}),
			...(src.customOrder !== undefined ? { order: src.customOrder } : {}),
			...(rateLimit && !isNaN(rateLimit) ? { rateLimit } : {}),
			...(parseHeader(src.header) ? { headers: parseHeader(src.header) } : {}),
			...(src.loginUrl ? { loginUrl: src.loginUrl } : {}),
			...(epochToIso(src.lastUpdateTime) ? { updatedAt: epochToIso(src.lastUpdateTime) } : {}),
			...(search ? { search } : {}),
			...(explore ? { explore } : {}),
			...(bookInfo ? { bookInfo } : {}),
			...(toc ? { toc } : {}),
			...(content ? { content } : {}),
		};

		convertedSources.push(bookSource);
		allConversionResults.push(...sourceConversionResults);
	}

	return {
		data: convertedSources,
		report: createReport(allConversionResults),
		warnings,
	};
}
```

- [ ] **Step 3: Run tests**

Run: `cd packages/rule-engine && pnpm vitest run __tests__/unit/import/converters/book-source.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/src/import/converters/book-source.ts packages/rule-engine/__tests__/unit/import/converters/book-source.test.ts
git commit -m "feat(rule-engine/import): add Legado book source converter"
```

---

## Task 8: Public API (`import/index.ts`) + Integration Tests

**Files:**
- Create: `packages/rule-engine/src/import/index.ts`
- Create: `packages/rule-engine/__tests__/unit/import/import-api.test.ts`
- Modify: `packages/rule-engine/src/index.ts`

- [ ] **Step 1: Write `import-api.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
	importBookSource,
	importTxtTocRuleFile,
	importReplaceRuleFile,
	importDictRuleFile,
	importLegadoBookSources,
	importLegadoTxtTocRules,
	importLegadoReplaceRules,
	importLegadoDictRules,
	tryDetectFormat,
} from "../../../src/import/index.js";

describe("ReaderX native imports", () => {
	it("importBookSource delegates to Zod parseBookSource", () => {
		const validSource = {
			$schema: "readerx/book-source-rule/v1",
			id: "https://test.com",
			name: "Test Source",
			type: "novel",
			baseUrl: "https://test.com",
		};
		const result = importBookSource(validSource);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.name).toBe("Test Source");
		}
	});

	it("importBookSource returns error for invalid data", () => {
		const result = importBookSource({ invalid: true });
		expect(result.ok).toBe(false);
	});
});

describe("Legado imports (deprecated)", () => {
	it("importLegadoTxtTocRules converts legado data", () => {
		const legado = [
			{ id: -1, name: "Test TOC", rule: "^第.+章", serialNumber: 0, enable: true },
		];
		const result = importLegadoTxtTocRules(legado);
		expect(result.data.$schema).toBe("readerx/txt-toc-rule/v1");
		expect(result.data.rules).toHaveLength(1);
		expect(result.report.totalRules).toBe(1);
	});

	it("importLegadoReplaceRules converts legado data", () => {
		const legado = [
			{ name: "Test Replace", pattern: "x", isRegex: true, isEnabled: true },
		];
		const result = importLegadoReplaceRules(legado);
		expect(result.data.rules).toHaveLength(1);
	});

	it("importLegadoBookSources converts legado data", () => {
		const legado = [
			{
				bookSourceUrl: "https://test.com",
				bookSourceName: "Test",
				bookSourceType: 0,
			},
		];
		const result = importLegadoBookSources(legado);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].name).toBe("Test");
	});

	it("importLegadoDictRules converts legado data", () => {
		const legado = [
			{ name: "Test Dict", urlRule: "https://dict.com/{{key}}", enabled: true },
		];
		const result = importLegadoDictRules(legado);
		expect(result.data.rules).toHaveLength(1);
	});
});

describe("tryDetectFormat", () => {
	it("detects ReaderX book source by $schema", () => {
		expect(tryDetectFormat({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
		})).toBe("readerx-book-source");
	});

	it("detects ReaderX replace rule by $schema", () => {
		expect(tryDetectFormat({
			$schema: "readerx/replace-rule/v1",
		})).toBe("readerx-replace");
	});

	it("detects Legado book source by bookSourceUrl in array", () => {
		expect(tryDetectFormat([
			{ bookSourceUrl: "https://test.com", bookSourceName: "Test" },
		])).toBe("legado-book-source");
	});

	it("detects Legado dict rule by urlRule in array", () => {
		expect(tryDetectFormat([
			{ name: "Dict", urlRule: "https://dict.com/{{key}}" },
		])).toBe("legado-dict");
	});

	it("detects Legado replace rule by isRegex in array", () => {
		expect(tryDetectFormat([
			{ name: "Replace", pattern: "x", isRegex: true },
		])).toBe("legado-replace");
	});

	it("detects Legado txt-toc rule by serialNumber in array", () => {
		expect(tryDetectFormat([
			{ name: "TOC", rule: "pattern", serialNumber: 0 },
		])).toBe("legado-txt-toc");
	});

	it("returns unknown for unrecognizable data", () => {
		expect(tryDetectFormat("just a string")).toBe("unknown");
		expect(tryDetectFormat(null)).toBe("unknown");
	});
});
```

- [ ] **Step 2: Write `import/index.ts`**

```typescript
// ── Types ─────────────────────────────────────────────────
export type {
	// Legado raw types
	LegadoBookSource,
	LegadoRuleFields,
	LegadoRuleBookInfo,
	LegadoRuleToc,
	LegadoRuleContent,
	LegadoDictRule,
	LegadoReplaceRule,
	LegadoTxtTocRule,
	// Import result types
	ImportError,
	ImportOptions,
	ConversionResult,
	ConversionReport,
	ImportedResult,
	RuleFormatKind,
} from "./types.js";

// ── ReaderX native imports (delegate to Zod) ──────────────

import type { Result } from "../result.js";
import type { BookSource, DictRuleFile, ReplaceRuleFile, TxtTocRuleFile } from "../types.js";
import type { ImportError } from "./types.js";
import {
	parseBookSource,
	parseDictRuleFile,
	parseReplaceRuleFile,
	parseTxtTocRuleFile,
} from "../schemas.js";

function zodErrorToImportError(error: unknown): ImportError {
	const message = error instanceof Error ? error.message : String(error);
	return { kind: "parse_error", message };
}

export function importBookSource(data: unknown): Result<BookSource, ImportError> {
	try {
		const parsed = parseBookSource(data);
		return { ok: true, value: parsed };
	} catch (e) {
		return { ok: false, error: zodErrorToImportError(e) };
	}
}

export function importDictRuleFile(data: unknown): Result<DictRuleFile, ImportError> {
	try {
		const parsed = parseDictRuleFile(data);
		return { ok: true, value: parsed };
	} catch (e) {
		return { ok: false, error: zodErrorToImportError(e) };
	}
}

export function importReplaceRuleFile(data: unknown): Result<ReplaceRuleFile, ImportError> {
	try {
		const parsed = parseReplaceRuleFile(data);
		return { ok: true, value: parsed };
	} catch (e) {
		return { ok: false, error: zodErrorToImportError(e) };
	}
}

export function importTxtTocRuleFile(data: unknown): Result<TxtTocRuleFile, ImportError> {
	try {
		const parsed = parseTxtTocRuleFile(data);
		return { ok: true, value: parsed };
	} catch (e) {
		return { ok: false, error: zodErrorToImportError(e) };
	}
}

// ── Legado imports (deprecated) ───────────────────────────

import { convertLegadoBookSources } from "./converters/book-source.js";
import { convertLegadoDictRules } from "./converters/dict-rule.js";
import { convertLegadoReplaceRules } from "./converters/replace-rule.js";
import { convertLegadoTxtTocRules } from "./converters/txt-toc.js";
import type { ImportedResult, RuleFormatKind } from "./types.js";

/** @deprecated Legado 导入将在未来版本移除 */
export function importLegadoBookSources(
	data: unknown,
): ImportedResult<BookSource[]> {
	if (!Array.isArray(data)) {
		return {
			data: [],
			report: { totalRules: 0, convertedRules: 0, partialConvertedRules: 0, scriptFallbackRules: 0, unsupportedFeatures: ["not-array"] },
			warnings: [{ kind: "parse_error", message: "Expected array of Legado book sources" }],
		};
	}
	return convertLegadoBookSources(data);
}

/** @deprecated */
export function importLegadoDictRules(
	data: unknown,
): ImportedResult<DictRuleFile> {
	if (!Array.isArray(data)) {
		return {
			data: { $schema: "readerx/dict-rule/v1", rules: [] },
			report: { totalRules: 0, convertedRules: 0, partialConvertedRules: 0, scriptFallbackRules: 0, unsupportedFeatures: ["not-array"] },
			warnings: [{ kind: "parse_error", message: "Expected array of Legado dict rules" }],
		};
	}
	return convertLegadoDictRules(data);
}

/** @deprecated */
export function importLegadoReplaceRules(
	data: unknown,
): ImportedResult<ReplaceRuleFile> {
	if (!Array.isArray(data)) {
		return {
			data: { $schema: "readerx/replace-rule/v1", rules: [] },
			report: { totalRules: 0, convertedRules: 0, partialConvertedRules: 0, scriptFallbackRules: 0, unsupportedFeatures: ["not-array"] },
			warnings: [{ kind: "parse_error", message: "Expected array of Legado replace rules" }],
		};
	}
	return convertLegadoReplaceRules(data);
}

/** @deprecated */
export function importLegadoTxtTocRules(
	data: unknown,
): ImportedResult<TxtTocRuleFile> {
	if (!Array.isArray(data)) {
		return {
			data: { $schema: "readerx/txt-toc-rule/v1", rules: [] },
			report: { totalRules: 0, convertedRules: 0, partialConvertedRules: 0, scriptFallbackRules: 0, unsupportedFeatures: ["not-array"] },
			warnings: [{ kind: "parse_error", message: "Expected array of Legado txt-toc rules" }],
		};
	}
	return convertLegadoTxtTocRules(data);
}

// ── Format detection (helper only) ────────────────────────

export function tryDetectFormat(data: unknown): RuleFormatKind {
	// ReaderX: object with $schema
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const obj = data as Record<string, unknown>;
		const schema = obj.$schema;
		if (typeof schema === "string") {
			if (schema.includes("book-source-rule")) return "readerx-book-source";
			if (schema.includes("dict-rule")) return "readerx-dict";
			if (schema.includes("replace-rule")) return "readerx-replace";
			if (schema.includes("txt-toc-rule")) return "readerx-txt-toc";
		}
	}

	// Legado: array with characteristic fields
	if (Array.isArray(data) && data.length > 0) {
		const first = data[0] as Record<string, unknown> | undefined;
		if (first && typeof first === "object") {
			if ("bookSourceUrl" in first) return "legado-book-source";
			if ("urlRule" in first) return "legado-dict";
			if ("isRegex" in first) return "legado-replace";
			if ("serialNumber" in first) return "legado-txt-toc";
		}
	}

	return "unknown";
}
```

- [ ] **Step 3: Update `src/index.ts` to re-export import module**

Add these exports at the end of `packages/rule-engine/src/index.ts`:

```typescript
// ── Import module ─────────────────────────────────────────
export {
	importBookSource,
	importDictRuleFile,
	importReplaceRuleFile,
	importTxtTocRuleFile,
	importLegadoBookSources,
	importLegadoDictRules,
	importLegadoReplaceRules,
	importLegadoTxtTocRules,
	tryDetectFormat,
} from "./import/index.js";

export type {
	ImportError,
	ImportOptions,
	ConversionResult,
	ConversionReport,
	ImportedResult,
	RuleFormatKind,
	LegadoBookSource,
	LegadoDictRule,
	LegadoReplaceRule,
	LegadoTxtTocRule,
} from "./import/index.js";
```

- [ ] **Step 4: Run all import tests**

Run: `cd packages/rule-engine && pnpm vitest run __tests__/unit/import/`
Expected: ALL PASS

- [ ] **Step 5: Run full test suite to check no regressions**

Run: `cd packages/rule-engine && pnpm vitest run`
Expected: ALL PASS

- [ ] **Step 6: Run typecheck**

Run: `cd packages/rule-engine && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add packages/rule-engine/src/import/index.ts packages/rule-engine/src/index.ts packages/rule-engine/__tests__/unit/import/import-api.test.ts
git commit -m "feat(rule-engine/import): add public API, format detection, and package re-exports"
```

---

## Task 9: E2E Test with Real Legado Data

**Files:**
- Create: `packages/rule-engine/__tests__/e2e/legado-import.test.ts`

Validates the entire pipeline against actual `schemas/legado/data/` files.

- [ ] **Step 1: Write `legado-import.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	importLegadoBookSources,
	importLegadoTxtTocRules,
	importLegadoReplaceRules,
	importLegadoDictRules,
} from "../../src/import/index.js";

const LEGADO_DATA_DIR = join(__dirname, "../../../../schemas/legado/data");

function loadLegadoData(filename: string): unknown {
	const path = join(LEGADO_DATA_DIR, filename);
	return JSON.parse(readFileSync(path, "utf-8"));
}

describe("E2E: Legado import with real data", () => {
	it("imports all 26 txt-toc rules from legado data", () => {
		const data = loadLegadoData("txt-toc-rule.json");
		const result = importLegadoTxtTocRules(data);

		expect(result.data.rules).toHaveLength(26);
		expect(result.report.totalRules).toBe(26);
		expect(result.report.convertedRules).toBe(26);
		expect(result.report.scriptFallbackRules).toBe(0);
		expect(result.warnings).toHaveLength(0);
	});

	it("imports all 20 replace rules from legado data", () => {
		const data = loadLegadoData("replace-rule.json");
		const result = importLegadoReplaceRules(data);

		expect(result.data.rules).toHaveLength(20);
		expect(result.report.totalRules).toBe(20);
		// Some may have @js: replacement → script fallback
		expect(result.report.convertedRules + result.report.partialConvertedRules + result.report.scriptFallbackRules).toBe(20);
	});

	it("imports 3 dict rules from legado data", () => {
		const data = loadLegadoData("dict-rule.json");
		const result = importLegadoDictRules(data);

		expect(result.data.rules).toHaveLength(3);
		expect(result.report.totalRules).toBe(3);
	});

	it("imports 10 book sources from legado data", () => {
		const data = loadLegadoData("book-source-rule.json");
		const result = importLegadoBookSources(data);

		expect(result.data).toHaveLength(10);
		expect(result.report.totalRules).toBeGreaterThan(0);

		// Each source should have basic fields
		for (const source of result.data) {
			expect(source.id).toBeDefined();
			expect(source.baseUrl).toBeDefined();
			expect(source.name).toBeDefined();
			expect(source.type).toBeDefined();
		}
	});

	it("preserves search module in converted book sources", () => {
		const data = loadLegadoData("book-source-rule.json");
		const result = importLegadoBookSources(data);

		// At least some sources should have search
		const withSearch = result.data.filter((s) => s.search);
		expect(withSearch.length).toBeGreaterThan(0);
	});

	it("preserves content module in converted book sources", () => {
		const data = loadLegadoData("book-source-rule.json");
		const result = importLegadoBookSources(data);

		const withContent = result.data.filter((s) => s.content);
		expect(withContent.length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 2: Run E2E test**

Run: `cd packages/rule-engine && pnpm vitest run __tests__/e2e/legado-import.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add packages/rule-engine/__tests__/e2e/legado-import.test.ts
git commit -m "test(rule-engine/import): add E2E tests with real Legado data files"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `cd packages/rule-engine && pnpm vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run typecheck**

Run: `cd packages/rule-engine && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify export surface**

Run: `cd packages/rule-engine && node -e "import('./src/index.js').then(m => console.log(Object.keys(m).sort().join('\n')))"`
Expected: All export names printed without error

- [ ] **Step 4: Final commit (if any fixes)**

```bash
git add -A
git commit -m "feat(rule-engine/import): complete import module with Legado legacy support"
```
