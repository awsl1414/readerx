import { describe, expect, it } from "vitest";
import { applyStringTransform } from "../../src/transform.js";
import type { CompiledTransformStep } from "../../src/types.js";

describe("applyStringTransform", () => {
	describe("replace", () => {
		it("replaces all occurrences of whitespace with single space", () => {
			const step: CompiledTransformStep = {
				type: "transform",
				category: "string",
				action: "replace",
				pattern: "\\s+",
				replacement: " ",
				compiledRegex: /\s+/g,
			};
			const result = applyStringTransform(step, ["  hello   world  "]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual([" hello world "]);
			}
		});
	});

	describe("match", () => {
		it("extracts capture groups from input", () => {
			const step: CompiledTransformStep = {
				type: "transform",
				category: "string",
				action: "match",
				pattern: "(\\w+)@(\\w+)",
				group: 1,
				compiledRegex: /(\w+)@(\w+)/g,
			};
			const result = applyStringTransform(step, ["a@b c@d"]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual(["a", "c"]);
			}
		});
	});

	describe("split", () => {
		it("splits input by comma", () => {
			const step: CompiledTransformStep = {
				type: "transform",
				category: "string",
				action: "split",
				pattern: ",",
				compiledRegex: /,/g,
			};
			const result = applyStringTransform(step, ["a,b,c"]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual(["a", "b", "c"]);
			}
		});
	});

	describe("template", () => {
		it("wraps result in brackets using template", () => {
			const step: CompiledTransformStep = {
				type: "transform",
				category: "string",
				action: "template",
				template: "[{{result}}]",
			};
			const result = applyStringTransform(step, ["hello"]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual(["[hello]"]);
			}
		});
	});

	describe("trim", () => {
		it("trims whitespace from both ends", () => {
			const step: CompiledTransformStep = {
				type: "transform",
				category: "string",
				action: "trim",
			};
			const result = applyStringTransform(step, ["  hello  "]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual(["hello"]);
			}
		});
	});
});
