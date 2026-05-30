import { describe, expect, it } from "vitest";
import type {
	BookSource,
	ChapterBoundary,
	CompiledExtractStep,
	CompiledRule,
	CompiledTransformStep,
	ContentModule,
	DictField,
	DictRule,
	DictRuleFile,
	DomTransformStep,
	EvalContext,
	ExploreCategory,
	ExploreModule,
	ExtractEngine,
	ExtractOutput,
	ExtractStep,
	FieldSchema,
	JsEvalContext,
	JsEvalResult,
	ReplaceRule,
	ReplaceRuleFile,
	RequestConfig,
	Rule,
	RuleError,
	RuleErrorCode,
	RuleObject,
	RuleStep,
	ScriptStep,
	SearchModule,
	StringTransformStep,
	TocModule,
	TxtTocRule,
	TxtTocRuleFile,
} from "../../src/types.js";

describe("types (compile-time verification)", () => {
	it("RuleError has required fields", () => {
		const e: RuleError = { code: "INVALID_SELECTOR", message: "bad selector" };
		expect(e.code).toBe("INVALID_SELECTOR");
	});

	it("all error codes are assignable", () => {
		const codes: RuleErrorCode[] = [
			"INVALID_SELECTOR", "JSONPATH_ERROR", "XPATH_ERROR", "REGEX_ERROR",
			"SCRIPT_ERROR", "SCRIPT_DISABLED", "NO_JS_EXECUTOR",
			"CONTENT_TYPE_MISMATCH", "DOM_PARSE_ERROR", "TYPE_MISMATCH",
		];
		expect(codes).toHaveLength(10);
	});

	it("ExtractStep with minimal fields", () => {
		const step: ExtractStep = { type: "extract", engine: "css", selector: "div.content" };
		expect(step.type).toBe("extract");
	});

	it("ExtractStep with all fields including scope", () => {
		const step: ExtractStep = {
			type: "extract", engine: "xpath", selector: "//div",
			scope: "root", output: "outerHtml", attr: "href",
		};
		expect(step.scope).toBe("root");
	});

	it("StringTransformStep", () => {
		const step: StringTransformStep = {
			type: "transform", category: "string", action: "replace",
			pattern: "\\d+", replacement: "NUM", flags: "g",
		};
		expect(step.action).toBe("replace");
	});

	it("DomTransformStep", () => {
		const step: DomTransformStep = {
			type: "transform", category: "dom", action: "remove", selector: ".ad",
		};
		expect(step.category).toBe("dom");
	});

	it("ScriptStep", () => {
		const step: ScriptStep = { type: "script", code: "return result.toUpperCase();" };
		expect(step.type).toBe("script");
	});

	it("Rule = readonly RuleStep[]", () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".book" },
			{ type: "transform", category: "string", action: "trim" },
		];
		expect(rule).toHaveLength(2);
	});

	it("RuleObject shorthand", () => {
		const obj: RuleObject = { css: ".title", attr: "text" };
		expect(obj.css).toBe(".title");
	});

	it("CompiledRule with compiled steps", () => {
		const compiled: CompiledRule = {
			steps: [
				{ type: "extract", engine: "css", selector: "div", compiledSelector: "div" },
				{ type: "transform", category: "string", action: "replace", pattern: "a", compiledRegex: /a/g },
			],
		};
		expect(compiled.steps).toHaveLength(2);
	});

	it("BookSource minimal", () => {
		const src: BookSource = {
			$schema: "readerx/book-source-rule/v1", id: "test", name: "Test",
			type: "novel", baseUrl: "https://example.com",
		};
		expect(src.type).toBe("novel");
	});

	it("DictRuleFile", () => {
		const file: DictRuleFile = { $schema: "readerx/dict-rule/v1", authors: ["test"], rules: [] };
		expect(file.rules).toHaveLength(0);
	});

	it("ReplaceRuleFile", () => {
		const file: ReplaceRuleFile = {
			$schema: "readerx/replace-rule/v1",
			rules: [{ pattern: "\\s+", replacement: " " }],
		};
		expect(file.rules).toHaveLength(1);
	});

	it("TxtTocRuleFile", () => {
		const file: TxtTocRuleFile = {
			$schema: "readerx/txt-toc-rule/v1",
			rules: [{ name: "ch", pattern: "^第.+章", flags: "m" }],
		};
		expect(file.rules).toHaveLength(1);
	});

	it("EvalContext", () => {
		const ctx: EvalContext = { baseUrl: "https://example.com", allowScript: true };
		expect(ctx.baseUrl).toBe("https://example.com");
	});
});
