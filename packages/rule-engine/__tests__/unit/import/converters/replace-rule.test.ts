import { describe, expect, it } from "vitest";
import { convertLegadoReplaceRules } from "../../../../src/import/converters/replace-rule.js";
import type { LegadoReplaceRule } from "../../../../src/import/types.js";
import type { ReplaceRule } from "../../../../src/types.js";

/** Safe array access helper for noUncheckedIndexedAccess compliance */
function getRule(rules: readonly ReplaceRule[], index: number): ReplaceRule {
	const rule = rules[index];
	if (!rule) throw new Error(`Rule at index ${index} not found`);
	return rule;
}

describe("convertLegadoReplaceRules", () => {
	it("maps basic fields with group to tags", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Remove ads",
				group: "cleanup",
				pattern: "ad\\d+",
				isRegex: true,
				replacement: "",
				isEnabled: true,
				sortOrder: 5,
			},
		];

		const result = convertLegadoReplaceRules(legado);

		expect(result.data.$schema).toBe("readerx/replace-rule/v1");
		expect(result.data.rules).toHaveLength(1);

		const rule = getRule(result.data.rules, 0);
		expect(rule.name).toBe("Remove ads");
		expect(rule.tags).toEqual(["cleanup"]);
		expect(rule.pattern).toBe("ad\\d+");
		expect(rule.replacement).toBe("");
		expect(rule.enabled).toBe(true);
		expect(rule.order).toBe(5);
	});

	it("sets literal:true when isRegex is explicitly false", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Literal replace",
				pattern: "exact text",
				isRegex: false,
				replacement: "new text",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.literal).toBe(true);
		expect(rule.pattern).toBe("exact text");
		expect(rule.replacement).toBe("new text");
	});

	it("does not set literal when isRegex is true", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Regex replace",
				pattern: "\\d+",
				isRegex: true,
				replacement: "NUM",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.literal).toBeUndefined();
	});

	it("does not set literal when isRegex is undefined", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Default replace",
				pattern: "foo",
				replacement: "bar",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.literal).toBeUndefined();
	});

	it("converts @js: replacement to replacementJs", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Script replace",
				pattern: "\\d+",
				replacement: "@js:result.toUpperCase()",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.replacementJs).toBe("result.toUpperCase()");
		expect(rule.replacement).toBeUndefined();
	});

	it("splits scope string into scope.include array", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Scoped rule",
				pattern: "foo",
				scope: "source1, source2 , source3 ",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.scope).toBeDefined();
		expect(rule.scope?.include).toEqual(["source1", "source2", "source3"]);
	});

	it("splits excludeScope into scope.exclude array", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Excluded rule",
				pattern: "foo",
				excludeScope: "bad1, bad2",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.scope?.exclude).toEqual(["bad1", "bad2"]);
	});

	it("sets scope.target to 'both' when scopeTitle and scopeContent are true", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Both scope",
				pattern: "foo",
				scopeTitle: true,
				scopeContent: true,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.scope?.target).toBe("both");
	});

	it("sets scope.target to 'title' when only scopeTitle is true", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Title scope",
				pattern: "foo",
				scopeTitle: true,
				scopeContent: false,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.scope?.target).toBe("title");
	});

	it("sets scope.target to 'content' by default", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Content scope",
				pattern: "foo",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		// target "content" is the default — omitted from output
		expect(rule.scope?.target).toBeUndefined();
	});

	it("handles empty scope (global rule) with only target", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Global rule",
				pattern: "foo",
				replacement: "bar",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.scope).toBeDefined();
		// target "content" is the default — omitted from output
		expect(rule.scope?.target).toBeUndefined();
		expect(rule.scope?.include).toBeUndefined();
		expect(rule.scope?.exclude).toBeUndefined();
	});

	it("does not set tags when group is undefined", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "No group",
				pattern: "foo",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.tags).toBeUndefined();
	});

	it("defaults enabled to true when not specified", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Default enabled",
				pattern: "foo",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.enabled).toBe(true);
	});

	it("sets enabled to false when isEnabled is false", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Disabled rule",
				pattern: "foo",
				isEnabled: false,
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.enabled).toBe(false);
	});

	it("adds warning for timeoutMillisecond", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Timed rule",
				pattern: "foo",
				timeoutMillisecond: 5000,
			},
		];

		const result = convertLegadoReplaceRules(legado);

		expect(result.warnings).toHaveLength(1);
		const warning = result.warnings[0];
		expect(warning).toBeDefined();
		expect(warning?.kind).toBe("unsupported_feature");
		expect(warning?.message).toContain("timeoutMillisecond");
	});

	it("handles empty input array", () => {
		const result = convertLegadoReplaceRules([]);

		expect(result.data.rules).toHaveLength(0);
		expect(result.data.$schema).toBe("readerx/replace-rule/v1");
		expect(result.report.totalRules).toBe(0);
	});

	it("uses default name when name is undefined", () => {
		const legado: LegadoReplaceRule[] = [
			{
				pattern: "foo",
			},
		];

		const result = convertLegadoReplaceRules(legado);
		const rule = getRule(result.data.rules, 0);

		expect(rule.name).toBe("Unnamed Replace Rule");
	});

	it("handles multiple rules with mixed configurations", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Rule 1",
				group: "ads",
				pattern: "ad\\d+",
				isRegex: true,
				scope: "sourceA",
				isEnabled: true,
			},
			{
				name: "Rule 2",
				pattern: "exact",
				isRegex: false,
				replacement: "@js:process(text)",
				scopeTitle: true,
				timeoutMillisecond: 3000,
			},
		];

		const result = convertLegadoReplaceRules(legado);

		expect(result.data.rules).toHaveLength(2);
		expect(result.report.totalRules).toBe(2);

		// Rule 1
		const rule1 = getRule(result.data.rules, 0);
		expect(rule1.name).toBe("Rule 1");
		expect(rule1.tags).toEqual(["ads"]);
		expect(rule1.literal).toBeUndefined();
		expect(rule1.scope?.include).toEqual(["sourceA"]);
		expect(rule1.scope?.target).toBeUndefined();

		// Rule 2
		const rule2 = getRule(result.data.rules, 1);
		expect(rule2.name).toBe("Rule 2");
		expect(rule2.literal).toBe(true);
		expect(rule2.replacementJs).toBe("process(text)");
		expect(rule2.scope?.target).toBe("title");

		// Warning for timeoutMillisecond
		expect(result.warnings).toHaveLength(1);
	});

	it("correctly computes report for fully converted rules", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "Simple rule",
				pattern: "foo",
				replacement: "bar",
			},
		];

		const result = convertLegadoReplaceRules(legado);

		expect(result.report.totalRules).toBe(1);
		expect(result.report.convertedRules).toBe(1);
		expect(result.report.partialConvertedRules).toBe(0);
		expect(result.report.scriptFallbackRules).toBe(0);
	});

	it("tracks rules with warnings as fully converted (warnings live separately)", () => {
		const legado: LegadoReplaceRule[] = [
			{
				name: "With timeout",
				pattern: "foo",
				timeoutMillisecond: 1000,
			},
		];

		const result = convertLegadoReplaceRules(legado);

		// Rules with warnings are still fully converted — warnings are not unsupported features
		expect(result.report.convertedRules).toBe(1);
		expect(result.report.partialConvertedRules).toBe(0);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]?.message).toContain("timeoutMillisecond");
	});
});
