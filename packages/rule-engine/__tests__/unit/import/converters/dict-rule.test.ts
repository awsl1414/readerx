import { describe, expect, it } from "vitest";
import { convertLegadoDictRules } from "../../../../src/import/converters/dict-rule.js";
import type { LegadoDictRule } from "../../../../src/import/types.js";

describe("convertLegadoDictRules", () => {
	// ── Simple CSS showRule → structured pipeline ──────────────

	it("converts a simple CSS showRule to structured pipeline with ExtractStep", () => {
		const rules: readonly LegadoDictRule[] = [
			{
				name: "TestDict",
				urlRule: "https://dict.example.com/api?q=",
				showRule: "class.definition@text",
				enabled: true,
				sortNumber: 5,
			},
		];

		const result = convertLegadoDictRules(rules);

		expect(result.data.$schema).toBe("readerx/dict-rule/v1");
		expect(result.data.rules).toHaveLength(1);

		const dictRule = result.data.rules[0];
		expect(dictRule).toBeDefined();
		expect(dictRule?.id).toBe("TestDict");
		expect(dictRule?.name).toBe("TestDict");
		expect(dictRule?.request.url).toBe("https://dict.example.com/api?q=");
		expect(dictRule?.enabled).toBe(true);
		expect(dictRule?.weight).toBe(5);

		// fields.definition.pipeline should contain an ExtractStep
		expect(dictRule?.fields).toBeDefined();
		const definition = dictRule?.fields?.["definition"];
		expect(definition).toBeDefined();
		expect(definition?.pipeline).toHaveLength(1);
		expect(definition?.pipeline[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".definition",
			output: "text",
		});

		// Report stats
		expect(result.report.totalRules).toBe(1);
		expect(result.report.convertedRules).toBe(1);
		expect(result.report.scriptFallbackRules).toBe(0);
		expect(result.warnings).toEqual([]);
	});

	// ── @js: showRule → ScriptStep pipeline ────────────────────

	it("converts @js: showRule to ScriptStep pipeline and reports scriptFallback", () => {
		const rules: readonly LegadoDictRule[] = [
			{
				name: "JSDict",
				urlRule: "https://dict.example.com",
				showRule: "@js:document.querySelector('.def').innerText",
			},
		];

		const result = convertLegadoDictRules(rules);

		expect(result.data.rules).toHaveLength(1);
		const dictRule = result.data.rules[0];
		expect(dictRule).toBeDefined();
		expect(dictRule?.id).toBe("JSDict");

		// fields.definition.pipeline should contain a ScriptStep
		expect(dictRule?.fields).toBeDefined();
		const definition = dictRule?.fields?.["definition"];
		expect(definition).toBeDefined();
		expect(definition?.pipeline).toHaveLength(1);
		expect(definition?.pipeline[0]?.type).toBe("script");
		expect((definition?.pipeline[0] as { type: "script"; code: string }).code).toContain(
			"legado-legacy",
		);

		// Report: scriptFallbackRules should be 1
		expect(result.report.scriptFallbackRules).toBe(1);
		expect(result.report.convertedRules).toBe(0);
	});

	// ── Empty showRule → no fields property ─────────────────────

	it("produces no fields property when showRule is empty", () => {
		const rules: readonly LegadoDictRule[] = [
			{
				name: "NoShowDict",
				urlRule: "https://dict.example.com",
				showRule: "",
			},
		];

		const result = convertLegadoDictRules(rules);

		const dictRule = result.data.rules[0];
		expect(dictRule).toBeDefined();
		expect(dictRule?.fields).toBeUndefined();
	});

	it("produces no fields property when showRule is undefined", () => {
		const rules: readonly LegadoDictRule[] = [
			{
				name: "NoShowDict2",
				urlRule: "https://dict.example.com",
			},
		];

		const result = convertLegadoDictRules(rules);

		const dictRule = result.data.rules[0];
		expect(dictRule).toBeDefined();
		expect(dictRule?.fields).toBeUndefined();
	});

	// ── Report stats ────────────────────────────────────────────

	it("report totalRules matches input count", () => {
		const rules: readonly LegadoDictRule[] = [
			{ name: "A", urlRule: "https://a.com", showRule: "class.def@text" },
			{ name: "B", urlRule: "https://b.com", showRule: "@css:.content" },
			{ name: "C", urlRule: "https://c.com", showRule: "@js:some.code" },
			{ name: "D", urlRule: "https://d.com" },
		];

		const result = convertLegadoDictRules(rules);

		expect(result.report.totalRules).toBe(4);
	});

	// ── Default values ──────────────────────────────────────────

	it("defaults enabled to true when not specified", () => {
		const rules: readonly LegadoDictRule[] = [
			{
				name: "DefaultEnabled",
				urlRule: "https://dict.example.com",
			},
		];

		const result = convertLegadoDictRules(rules);

		expect(result.data.rules[0]?.enabled).toBe(true);
	});

	it("omits weight when sortNumber is not specified", () => {
		const rules: readonly LegadoDictRule[] = [
			{
				name: "NoWeight",
				urlRule: "https://dict.example.com",
			},
		];

		const result = convertLegadoDictRules(rules);

		expect(result.data.rules[0]?.weight).toBeUndefined();
	});

	// ── Empty input ─────────────────────────────────────────────

	it("handles empty input array", () => {
		const result = convertLegadoDictRules([]);

		expect(result.data.rules).toEqual([]);
		expect(result.report.totalRules).toBe(0);
		expect(result.report.convertedRules).toBe(0);
	});

	// ── Multiple rules ──────────────────────────────────────────

	it("converts multiple rules correctly", () => {
		const rules: readonly LegadoDictRule[] = [
			{
				name: "Dict1",
				urlRule: "https://dict1.com",
				showRule: "class.def@html",
				enabled: true,
				sortNumber: 10,
			},
			{
				name: "Dict2",
				urlRule: "https://dict2.com",
				showRule: "@xpath://div[@class='def']",
				enabled: false,
			},
		];

		const result = convertLegadoDictRules(rules);

		expect(result.data.rules).toHaveLength(2);
		expect(result.report.totalRules).toBe(2);

		expect(result.data.rules[0]?.id).toBe("Dict1");
		expect(result.data.rules[0]?.enabled).toBe(true);
		expect(result.data.rules[0]?.weight).toBe(10);
		expect(result.data.rules[0]?.fields?.["definition"]?.pipeline[0]?.type).toBe("extract");

		expect(result.data.rules[1]?.id).toBe("Dict2");
		expect(result.data.rules[1]?.enabled).toBe(false);
		expect(result.data.rules[1]?.weight).toBeUndefined();
		expect(result.data.rules[1]?.fields?.["definition"]?.pipeline[0]?.type).toBe("extract");
	});
});
