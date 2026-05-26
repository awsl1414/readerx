import { describe, expect, it } from "vitest";
import { combineResults, splitRuleByOperators } from "../src/rule-operators";

describe("splitRuleByOperators", () => {
	it("splits simple && into 2 segments", () => {
		const segments = splitRuleByOperators("class.a&&class.b");
		expect(segments).toHaveLength(2);
		expect(segments[0]).toEqual({ rule: "class.a", operator: undefined });
		expect(segments[1]).toEqual({ rule: "class.b", operator: "&&" });
	});

	it("splits three-way || into 3 segments", () => {
		const segments = splitRuleByOperators("class.a||class.b||class.c");
		expect(segments).toHaveLength(3);
		expect(segments[0]).toEqual({ rule: "class.a", operator: undefined });
		expect(segments[1]).toEqual({ rule: "class.b", operator: "||" });
		expect(segments[2]).toEqual({ rule: "class.c", operator: "||" });
	});

	it("does not split operators inside brackets", () => {
		const segments = splitRuleByOperators("div.class[href&&value]");
		expect(segments).toHaveLength(1);
		expect(segments[0]).toEqual({
			rule: "div.class[href&&value]",
			operator: undefined,
		});
	});

	it("preserves ## as part of the rule (not split)", () => {
		const segments = splitRuleByOperators("class.a##regex##replace");
		expect(segments).toHaveLength(1);
		expect(segments[0]).toEqual({
			rule: "class.a##regex##replace",
			operator: undefined,
		});
	});

	it("returns empty array for empty string", () => {
		const segments = splitRuleByOperators("");
		expect(segments).toEqual([]);
	});

	it("returns 1 segment with undefined operator for single rule", () => {
		const segments = splitRuleByOperators("class.title");
		expect(segments).toHaveLength(1);
		expect(segments[0]).toEqual({ rule: "class.title", operator: undefined });
	});

	it("handles mixed && and || operators", () => {
		const segments = splitRuleByOperators("class.a&&class.b||class.c");
		expect(segments).toHaveLength(3);
		expect(segments[0]).toEqual({ rule: "class.a", operator: undefined });
		expect(segments[1]).toEqual({ rule: "class.b", operator: "&&" });
		expect(segments[2]).toEqual({ rule: "class.c", operator: "||" });
	});

	it("first segment operator is always undefined", () => {
		const segments = splitRuleByOperators("a&&b&&c&&d");
		expect(segments[0]?.operator).toBeUndefined();
		for (let i = 1; i < segments.length; i++) {
			expect(segments[i]?.operator).toBeDefined();
		}
	});
});

describe("combineResults", () => {
	it("returns empty array for empty input", () => {
		expect(combineResults([])).toEqual([]);
	});

	it("returns values directly for single result", () => {
		const result = combineResults([
			{ values: ["a", "b"], operator: undefined },
		]);
		expect(result).toEqual(["a", "b"]);
	});

	it("&& concatenates all results", () => {
		const result = combineResults([
			{ values: ["a", "b"], operator: undefined },
			{ values: ["c", "d"], operator: "&&" },
		]);
		expect(result).toEqual(["a", "b", "c", "d"]);
	});

	it("|| returns first non-empty result", () => {
		const result = combineResults([
			{ values: [""], operator: undefined },
			{ values: ["fallback"], operator: "||" },
		]);
		expect(result).toEqual(["fallback"]);
	});

	it("|| keeps first result when non-empty", () => {
		const result = combineResults([
			{ values: ["first"], operator: undefined },
			{ values: ["fallback"], operator: "||" },
		]);
		expect(result).toEqual(["first"]);
	});

	it("%% zip-merges arrays", () => {
		const result = combineResults([
			{ values: ["a", "b"], operator: undefined },
			{ values: ["1", "2"], operator: "%%" },
		]);
		expect(result).toEqual(["a", "1", "b", "2"]);
	});

	it("%% zip-merges arrays of different lengths", () => {
		const result = combineResults([
			{ values: ["a", "b", "c"], operator: undefined },
			{ values: ["1"], operator: "%%" },
		]);
		expect(result).toEqual(["a", "1", "b", "c"]);
	});
});
