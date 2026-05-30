import { describe, expect, it } from "vitest";
import { applyReplaceRules, matchesScope } from "../../src/replace.js";
import type { ReplaceRule, ReplaceScope } from "../../src/types.js";

describe("applyReplaceRules", () => {
	it("applies regex replacement", async () => {
		const rules: ReplaceRule[] = [
			{ name: "test", pattern: "foo", replacement: "bar" },
		];
		const result = await applyReplaceRules("foo baz foo", rules);
		expect(result).toBe("bar baz bar");
	});

	it("skips disabled rules", async () => {
		const rules: ReplaceRule[] = [
			{ name: "test", pattern: "foo", replacement: "bar", enabled: false },
		];
		const result = await applyReplaceRules("foo baz", rules);
		expect(result).toBe("foo baz");
	});

	it("applies literal replacement", async () => {
		const rules: ReplaceRule[] = [
			{ name: "test", pattern: "[ad]", replacement: "", literal: true },
		];
		const result = await applyReplaceRules("text [ad] more", rules);
		expect(result).toBe("text  more");
	});

	it("respects scope matching", async () => {
		const scope: ReplaceScope = { target: "title" };
		const rules: ReplaceRule[] = [
			{ name: "test", pattern: "bad", replacement: "good", scope },
		];
		// target=content should NOT match scope.target=title
		const r1 = await applyReplaceRules("bad text", rules, {
			target: "content",
		});
		expect(r1).toBe("bad text");

		// target=title should match
		const r2 = await applyReplaceRules("bad text", rules, { target: "title" });
		expect(r2).toBe("good text");
	});

	it("applies multiple rules in order", async () => {
		const rules: ReplaceRule[] = [
			{ name: "a", pattern: "a", replacement: "b" },
			{ name: "b", pattern: "b", replacement: "c" },
		];
		const result = await applyReplaceRules("a", rules);
		expect(result).toBe("c");
	});
});

describe("matchesScope", () => {
	it("matches when no scope defined", () => {
		expect(matchesScope(undefined)).toBe(true);
	});

	it("matches include list", () => {
		const scope: ReplaceScope = { include: ["source-1"] };
		expect(matchesScope(scope, { sourceId: "source-1" })).toBe(true);
		expect(matchesScope(scope, { sourceId: "source-2" })).toBe(false);
	});

	it("excludes items in exclude list", () => {
		const scope: ReplaceScope = { exclude: ["source-1"] };
		expect(matchesScope(scope, { sourceId: "source-1" })).toBe(false);
		expect(matchesScope(scope, { sourceId: "source-2" })).toBe(true);
	});
});
