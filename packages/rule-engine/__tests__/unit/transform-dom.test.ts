// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { applyDomTransform } from "../../src/transform.js";
import type { DomTransformStep } from "../../src/types.js";

describe("applyDomTransform", () => {
	describe("remove", () => {
		it("removes elements matching selector", () => {
			const container = document.createElement("div");
			container.innerHTML =
				"<p>hello</p><span class='ad'>ad content</span><p>world</p>";

			const step: DomTransformStep = {
				type: "transform",
				category: "dom",
				action: "remove",
				selector: ".ad",
			};
			const result = applyDomTransform(step, [container]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				const clone = result.value[0] as Element;
				expect(clone.querySelectorAll(".ad")).toHaveLength(0);
				expect(clone.querySelectorAll("p")).toHaveLength(2);
			}
		});
	});

	describe("type mismatch", () => {
		it("returns error when input is string array", () => {
			const step: DomTransformStep = {
				type: "transform",
				category: "dom",
				action: "remove",
				selector: ".ad",
			};
			const result = applyDomTransform(step, ["not an element"]);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe("TYPE_MISMATCH");
			}
		});
	});
});
