import { describe, it, expect } from "vitest";
import { parseReplaceChain, applyReplacements } from "../src/regex";

describe("parseReplaceChain", () => {
	it("parses a single replacement", () => {
		const result = parseReplaceChain("rule##pattern##replace");
		expect(result.rule).toBe("rule");
		expect(result.replacements).toHaveLength(1);
		expect(result.replacements[0]).toEqual({
			pattern: "pattern",
			replacement: "replace",
			replaceFirst: false,
		});
	});

	it("parses multiple replacements", () => {
		const result = parseReplaceChain("rule##p1##r1##p2##r2");
		expect(result.rule).toBe("rule");
		expect(result.replacements).toHaveLength(2);
		expect(result.replacements[0]).toEqual({
			pattern: "p1",
			replacement: "r1",
			replaceFirst: false,
		});
		expect(result.replacements[1]).toEqual({
			pattern: "p2",
			replacement: "r2",
			replaceFirst: false,
		});
	});

	it("returns empty replacements when no ## present", () => {
		const result = parseReplaceChain("rule");
		expect(result.rule).toBe("rule");
		expect(result.replacements).toEqual([]);
	});

	it("treats lone ## pattern as delete-match (empty replacement)", () => {
		const result = parseReplaceChain("rule##pattern");
		expect(result.rule).toBe("rule");
		// 单个 ##pattern 视为"删除匹配"（替换为空字符串）
		expect(result.replacements).toEqual([
			{ pattern: "pattern", replacement: "", replaceFirst: false },
		]);
	});

	it("detects replaceFirst via ### separator", () => {
		const result = parseReplaceChain("rule###pattern###replace");
		// ### splits into: ["rule", "", "pattern", "", "replace"]
		// First empty string after "rule" indicates replaceFirst for next pair
		expect(result.replacements.length).toBeGreaterThanOrEqual(1);
		if (result.replacements.length > 0) {
			expect(result.replacements[0]?.replaceFirst).toBe(true);
		}
	});
});

describe("applyReplacements", () => {
	it("applies a single replacement globally", () => {
		const result = applyReplacements("hello world hello", [
			{ pattern: "hello", replacement: "hi", replaceFirst: false },
		]);
		expect(result).toBe("hi world hi");
	});

	it("applies replacement only to first match when replaceFirst is true", () => {
		const result = applyReplacements("hello world hello", [
			{ pattern: "hello", replacement: "hi", replaceFirst: true },
		]);
		expect(result).toBe("hi world hello");
	});

	it("applies multiple replacements in order", () => {
		const result = applyReplacements("foo bar baz", [
			{ pattern: "foo", replacement: "one", replaceFirst: false },
			{ pattern: "bar", replacement: "two", replaceFirst: false },
		]);
		expect(result).toBe("one two baz");
	});

	it("skips empty patterns", () => {
		const result = applyReplacements("hello world", [
			{ pattern: "", replacement: "x", replaceFirst: false },
		]);
		expect(result).toBe("hello world");
	});

	it("skips invalid regex gracefully", () => {
		const result = applyReplacements("hello world", [
			{ pattern: "[invalid", replacement: "x", replaceFirst: false },
		]);
		// Should not throw, original content returned
		expect(result).toBe("hello world");
	});

	it("applies regex with capture groups", () => {
		const result = applyReplacements("Title: Hello World", [
			{
				pattern: "Title: (.+)",
				replacement: "$1",
				replaceFirst: false,
			},
		]);
		expect(result).toBe("Hello World");
	});

	it("returns original content for empty replacements", () => {
		const result = applyReplacements("unchanged", []);
		expect(result).toBe("unchanged");
	});
});
