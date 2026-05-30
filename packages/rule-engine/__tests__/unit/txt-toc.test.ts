import { describe, expect, it } from "vitest";
import { findChapterBoundaries } from "../../src/txt-toc.js";
import type { TxtTocRule } from "../../src/types.js";

describe("findChapterBoundaries", () => {
	const lines = [
		"Preface",
		"",
		"Chapter 1: The Beginning",
		"Some content here",
		"More content",
		"",
		"Chapter 2: The Journey",
		"Chapter 2 content",
		"",
		"Chapter 3: The End",
		"Final content",
	];

	it("finds chapters matching pattern", () => {
		const rules: TxtTocRule[] = [
			{ name: "chapter", pattern: "^Chapter (\\d+.*)$" },
		];
		const boundaries = findChapterBoundaries(lines, rules);
		expect(boundaries).toHaveLength(4);
		expect(boundaries[0]).toEqual({
			lineIndex: 2,
			title: "1: The Beginning",
			ruleName: "chapter",
		});
		expect(boundaries[1]).toEqual({
			lineIndex: 6,
			title: "2: The Journey",
			ruleName: "chapter",
		});
		expect(boundaries[2]).toEqual({
			lineIndex: 7,
			title: "2 content",
			ruleName: "chapter",
		});
		expect(boundaries[3]).toEqual({
			lineIndex: 9,
			title: "3: The End",
			ruleName: "chapter",
		});
	});

	it("uses full match when no capture group", () => {
		const rules: TxtTocRule[] = [{ name: "chapter", pattern: "^Chapter \\d+" }];
		const boundaries = findChapterBoundaries(lines, rules);
		expect(boundaries[0]?.title).toBe("Chapter 1");
	});

	it("empty pattern matches all non-empty lines (fallback)", () => {
		const rules: TxtTocRule[] = [{ name: "fallback", pattern: "" }];
		const boundaries = findChapterBoundaries(lines, rules);
		// All non-empty lines match (8 non-empty lines in the test data)
		expect(boundaries.length).toBe(8);
	});

	it("skips disabled rules", () => {
		const rules: TxtTocRule[] = [
			{ name: "disabled", pattern: "^Chapter \\d+", enabled: false },
			{ name: "preface", pattern: "^(Preface)" },
		];
		const boundaries = findChapterBoundaries(lines, rules);
		expect(boundaries).toHaveLength(1);
		expect(boundaries[0]?.title).toBe("Preface");
	});

	it("sorts rules by order", () => {
		const rules: TxtTocRule[] = [
			{ pattern: "^Chapter (\\d+)", name: "chapter", order: 2 },
			{ pattern: "^(Preface)", name: "preface", order: 1 },
		];
		const boundaries = findChapterBoundaries(lines, rules);
		// "Preface" line matched by order-1 rule, chapter lines by order-2
		expect(boundaries[0]?.ruleName).toBe("preface");
		expect(boundaries[1]?.ruleName).toBe("chapter");
	});
});
