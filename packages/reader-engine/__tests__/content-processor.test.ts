import { describe, expect, it } from "vitest";
import { ContentProcessor } from "../src/content/content-processor";
import type { ReplaceRule } from "../src/content/types";

function makeRule(override: Partial<ReplaceRule> = {}): ReplaceRule {
	return {
		id: 0,
		name: "test rule",
		pattern: "",
		replacement: "",
		scopeTitle: true,
		scopeContent: true,
		isEnabled: true,
		isRegex: false,
		order: 0,
		...override,
	};
}

describe("ContentProcessor", () => {
	it("returns content unchanged with no rules", () => {
		const cp = new ContentProcessor();
		cp.setRules([]);
		expect(cp.process("hello world", false)).toBe("hello world");
	});

	it("applies simple string replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "foo", replacement: "bar" })]);
		expect(cp.process("foo baz foo", false)).toBe("bar baz bar");
	});

	it("applies regex replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "\\d+", replacement: "NUM", isRegex: true }),
		]);
		expect(cp.process("abc 123 def 456", false)).toBe("abc NUM def NUM");
	});

	it("applies regex with capture groups", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({
				pattern: "(\\w+)@(\\w+)",
				replacement: "$1 at $2",
				isRegex: true,
			}),
		]);
		expect(cp.process("user@host", false)).toBe("user at host");
	});

	it("skips disabled rules", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "foo", replacement: "bar", isEnabled: false }),
		]);
		expect(cp.process("foo", false)).toBe("foo");
	});

	it("filters by scopeTitle when processing title", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({
				pattern: "x",
				replacement: "y",
				scopeTitle: false,
				scopeContent: true,
			}),
		]);
		expect(cp.process("x", true)).toBe("x");
		expect(cp.process("x", false)).toBe("y");
	});

	it("filters by scopeContent when processing content", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({
				pattern: "x",
				replacement: "y",
				scopeTitle: true,
				scopeContent: false,
			}),
		]);
		expect(cp.process("x", true)).toBe("y");
		expect(cp.process("x", false)).toBe("x");
	});

	it("applies rules in order", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "a", replacement: "b", order: 2 }),
			makeRule({ pattern: "b", replacement: "c", order: 1 }),
		]);
		// order 1: b→c (no match on "a")
		// order 2: a→b
		expect(cp.process("a", false)).toBe("b");
	});

	it("skips invalid regex gracefully", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "[invalid", replacement: "x", isRegex: true }),
		]);
		expect(cp.process("hello [invalid world", false)).toBe(
			"hello [invalid world",
		);
	});

	it("handles empty content", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "x", replacement: "y" })]);
		expect(cp.process("", false)).toBe("");
	});

	it("replaceAll with empty pattern inserts between every character", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "", replacement: "y" })]);
		expect(cp.process("hello", false)).toBe("yhyeylylyoy");
	});

	it("applies multiple rules sequentially", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "a", replacement: "b", order: 1 }),
			makeRule({ pattern: "b", replacement: "c", order: 2 }),
			makeRule({ pattern: "c", replacement: "d", order: 3 }),
		]);
		expect(cp.process("a", false)).toBe("d");
	});

	it("handles rule with empty replacement (deletion)", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "rm", replacement: "" })]);
		expect(cp.process("a rm b rm c", false)).toBe("a  b  c");
	});
});
