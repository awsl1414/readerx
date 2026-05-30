import { describe, expect, it } from "vitest";
import { convertLegadoTxtTocRules } from "../../../../src/import/converters/txt-toc.js";
import type { LegadoTxtTocRule } from "../../../../src/import/types.js";

/** Helper to get a non-undefined element after asserting length. */
function elementAt<T>(arr: readonly T[], index: number): T {
	expect(arr.length).toBeGreaterThanOrEqual(index + 1);
	const val = arr[index];
	if (val === undefined) {
		throw new Error(`Expected element at index ${index} to be defined`);
	}
	return val;
}

describe("convertLegadoTxtTocRules", () => {
	it("converts array of Legado rules to TxtTocRuleFile with $schema", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{
				name: "Chapter Rule",
				rule: "^第[零一二三四五六七八九十百千万]+章",
				example: "第一章 起始",
				serialNumber: 1,
				enable: true,
			},
			{
				name: "Section Rule",
				rule: "^卷[\\d]+",
				example: "卷1 开篇",
				serialNumber: 2,
				enable: false,
			},
		];

		const result = convertLegadoTxtTocRules(input);

		expect(result.data.$schema).toBe("readerx/txt-toc-rule/v1");
		expect(result.data.rules).toHaveLength(2);
		expect(result.warnings).toHaveLength(0);

		// First rule
		expect(elementAt(result.data.rules, 0)).toEqual({
			name: "Chapter Rule",
			pattern: "^第[零一二三四五六七八九十百千万]+章",
			description: "第一章 起始",
			order: 1,
			enabled: true,
			flags: "gm",
		});

		// Second rule
		expect(elementAt(result.data.rules, 1)).toEqual({
			name: "Section Rule",
			pattern: "^卷[\\d]+",
			description: "卷1 开篇",
			order: 2,
			enabled: false,
			flags: "gm",
		});
	});

	it("extracts inline regex flags (?mi) and merges with defaults", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{
				name: "Case-insensitive rule",
				rule: "(?mi)^chapter\\s+\\d+",
			},
		];

		const result = convertLegadoTxtTocRules(input);
		const rule = elementAt(result.data.rules, 0);

		// Flags: 'm' and 'i' from inline, merged with default 'g' = "gim" sorted
		expect(rule.flags).toBe("gim");
		// Pattern should have inline flags stripped
		expect(rule.pattern).toBe("^chapter\\s+\\d+");
	});

	it("uses defaults for missing optional fields", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{
				rule: "^第\\d+章",
			},
		];

		const result = convertLegadoTxtTocRules(input);
		const rule = elementAt(result.data.rules, 0);

		expect(rule).toEqual({
			name: "",
			pattern: "^第\\d+章",
			enabled: true,
			flags: "gm",
		});
		// description and order should be omitted when not provided
		expect("description" in rule).toBe(false);
		expect("order" in rule).toBe(false);
	});

	it("reports stats: totalRules matches input length, all converted", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{ name: "Rule A", rule: "patternA" },
			{ name: "Rule B", rule: "patternB" },
			{ name: "Rule C", rule: "patternC" },
		];

		const result = convertLegadoTxtTocRules(input);

		expect(result.report.totalRules).toBe(3);
		expect(result.report.convertedRules).toBe(3);
		expect(result.report.partialConvertedRules).toBe(0);
		expect(result.report.scriptFallbackRules).toBe(0);
		expect(result.report.unsupportedFeatures).toHaveLength(0);
	});

	it("handles empty input array", () => {
		const result = convertLegadoTxtTocRules([]);

		expect(result.data.$schema).toBe("readerx/txt-toc-rule/v1");
		expect(result.data.rules).toHaveLength(0);
		expect(result.report.totalRules).toBe(0);
		expect(result.report.convertedRules).toBe(0);
		expect(result.warnings).toHaveLength(0);
	});

	it("handles inline flag (?s) with default merge", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{
				name: "Dotall rule",
				rule: "(?s)^.+",
			},
		];

		const result = convertLegadoTxtTocRules(input);
		const rule = elementAt(result.data.rules, 0);

		// 's' from inline + default 'gm' = "gms" sorted
		expect(rule.flags).toBe("gms");
		expect(rule.pattern).toBe("^.+");
	});

	it("preserves 'g' flag when explicitly in inline flags", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{
				name: "Explicit global",
				rule: "(?gi)^test",
			},
		];

		const result = convertLegadoTxtTocRules(input);
		const rule = elementAt(result.data.rules, 0);

		// 'g' and 'i' from inline + default 'gm', deduplicated and sorted
		expect(rule.flags).toBe("gim");
		expect(rule.pattern).toBe("^test");
	});

	it("handles pattern without inline flags as-is", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{
				name: "Plain pattern",
				rule: "^第[一二三]章\\s+.+",
			},
		];

		const result = convertLegadoTxtTocRules(input);
		const rule = elementAt(result.data.rules, 0);

		expect(rule.pattern).toBe("^第[一二三]章\\s+.+");
		expect(rule.flags).toBe("gm");
	});

	it("handles rule with empty pattern string", () => {
		const input: readonly LegadoTxtTocRule[] = [
			{
				name: "Empty rule",
				rule: "",
			},
		];

		const result = convertLegadoTxtTocRules(input);
		const rule = elementAt(result.data.rules, 0);

		expect(rule.pattern).toBe("");
		expect(rule.flags).toBe("gm");
	});
});
