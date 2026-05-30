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

	describe("unwrap", () => {
		it("replaces wrapper element with its children", () => {
			const container = document.createElement("div");
			container.innerHTML = "<div><b>bold</b> text</div>";

			const step: DomTransformStep = {
				type: "transform",
				category: "dom",
				action: "unwrap",
				selector: "b",
			};
			const result = applyDomTransform(step, [container]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				const clone = result.value[0] as Element;
				expect(clone.querySelector("b")).toBeNull();
				expect(clone.textContent).toContain("bold");
			}
		});
	});

	describe("strip", () => {
		it("removes specified attributes using attrs field", () => {
			const container = document.createElement("div");
			container.innerHTML =
				'<p style="color:red" class="intro">Hello</p><span style="font-size:12px">World</span>';

			const step: DomTransformStep = {
				type: "transform",
				category: "dom",
				action: "strip",
				selector: "p, span",
				attrs: ["style"],
			};
			const result = applyDomTransform(step, [container]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				const clone = result.value[0] as Element;
				const p = clone.querySelector("p");
				const span = clone.querySelector("span");
				expect(p?.getAttribute("style")).toBeNull();
				expect(p?.getAttribute("class")).toBe("intro");
				expect(span?.getAttribute("style")).toBeNull();
			}
		});

		it("strips multiple attrs", () => {
			const container = document.createElement("div");
			container.innerHTML =
				'<div style="color:red" class="test" id="main"></div>';

			const step: DomTransformStep = {
				type: "transform",
				category: "dom",
				action: "strip",
				selector: "div",
				attrs: ["style", "class"],
			};
			const result = applyDomTransform(step, [container]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				const clone = result.value[0] as Element;
				const div = clone.querySelector("div");
				expect(div?.getAttribute("style")).toBeNull();
				expect(div?.getAttribute("class")).toBeNull();
				expect(div?.getAttribute("id")).toBe("main");
			}
		});

		it("does nothing when attrs is empty or missing", () => {
			const container = document.createElement("div");
			container.innerHTML = '<p style="color:red">Hello</p>';

			const step: DomTransformStep = {
				type: "transform",
				category: "dom",
				action: "strip",
				selector: "p",
			};
			const result = applyDomTransform(step, [container]);
			expect(result.ok).toBe(true);
			if (result.ok) {
				const clone = result.value[0] as Element;
				expect(clone.querySelector("p")?.getAttribute("style")).toBe(
					"color:red",
				);
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
