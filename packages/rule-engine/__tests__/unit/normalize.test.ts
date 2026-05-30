import { describe, expect, it } from "vitest";
import { normalizeRule, toRule } from "../../src/normalize.js";
import type { RuleObject } from "../../src/types.js";

describe("normalizeRule", () => {
	it("converts RuleObject with css to extract step", () => {
		const obj: RuleObject = { css: ".title" };
		const result = normalizeRule(obj);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toHaveLength(1);
		expect(result.value[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".title",
		});
	});

	it("converts RuleObject with xpath + attr", () => {
		const obj: RuleObject = { xpath: "//div/@href", attr: "href" };
		const result = normalizeRule(obj);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value[0]).toEqual({
			type: "extract",
			engine: "xpath",
			selector: "//div/@href",
			attr: "href",
		});
	});

	it("converts RuleObject with template only (no extract engine)", () => {
		const obj: RuleObject = { template: "https://example.com/{{result}}" };
		const result = normalizeRule(obj);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toHaveLength(1);
		expect(result.value[0]).toEqual({
			type: "transform",
			category: "string",
			action: "template",
			template: "https://example.com/{{result}}",
		});
	});

	it("appends transforms after extract", () => {
		const obj: RuleObject = {
			css: ".content",
			transform: [
				{ type: "transform", category: "string", action: "trim" },
			],
		};
		const result = normalizeRule(obj);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toHaveLength(2);
		expect(result.value[0]!.type).toBe("extract");
		expect(result.value[1]!.type).toBe("transform");
	});

	it("returns error for empty RuleObject", () => {
		const obj: RuleObject = {};
		const result = normalizeRule(obj);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("TYPE_MISMATCH");
		}
	});
});

describe("toRule", () => {
	it("passes through RuleStep[] unchanged", () => {
		const steps = [
			{ type: "extract" as const, engine: "css" as const, selector: ".title" },
		];
		const result = toRule(steps);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toBe(steps);
	});

	it("normalizes RuleObject", () => {
		const result = toRule({ jsonpath: "$.data.title" });
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value[0]!.type).toBe("extract");
	});
});
