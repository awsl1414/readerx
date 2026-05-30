import { describe, expect, it } from "vitest";
import { compileRule, compileSteps } from "../../src/compile.js";
import type { RuleStep, RuleObject } from "../../src/types.js";
import { normalizeRule } from "../../src/normalize.js";

describe("compileRule", () => {
	it("compiles CSS extract step", () => {
		const steps: RuleStep[] = [
			{ type: "extract", engine: "css", selector: ".title" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.steps).toHaveLength(1);
		expect(result.value.steps[0]!.type).toBe("extract");
	});

	it("compiles regex extract step", () => {
		const steps: RuleStep[] = [
			{ type: "extract", engine: "regex", selector: "chapter (\\d+)" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(true);
	});

	it("returns error for empty CSS selector", () => {
		const steps: RuleStep[] = [
			{ type: "extract", engine: "css", selector: "  " },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("COMPILE_ERROR");
		}
	});

	it("returns error for invalid regex", () => {
		const steps: RuleStep[] = [
			{ type: "extract", engine: "regex", selector: "[invalid" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("COMPILE_ERROR");
		}
	});

	it("pre-compiles regex in string transform", () => {
		const steps: RuleStep[] = [
			{
				type: "transform",
				category: "string",
				action: "replace",
				pattern: "\\d+",
				replacement: "NUM",
			},
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const compiled = result.value.steps[0] as Extract<
			{ compiledRegex?: RegExp },
			{ compiledRegex?: RegExp }
		>;
		expect(compiled.compiledRegex).toBeInstanceOf(RegExp);
	});

	it("returns error for replace without pattern", () => {
		const steps: RuleStep[] = [
			{
				type: "transform",
				category: "string",
				action: "replace",
			},
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("COMPILE_ERROR");
		}
	});

	it("passes through script steps unchanged", () => {
		const steps: RuleStep[] = [
			{ type: "script", code: "return result.toUpperCase();" },
		];
		const result = compileRule(steps);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.steps[0]!.type).toBe("script");
	});
});

describe("compileSteps (full pipeline from RuleObject)", () => {
	it("normalizes then compiles a RuleObject", () => {
		const obj: RuleObject = {
			css: ".title",
			transform: [
				{ type: "transform", category: "string", action: "trim" },
			],
		};
		const normalized = normalizeRule(obj);
		expect(normalized.ok).toBe(true);
		if (!normalized.ok) return;

		const compiled = compileSteps(normalized.value);
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) return;
		expect(compiled.value).toHaveLength(2);
	});
});
