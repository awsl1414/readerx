import { describe, expect, it } from "vitest";
import { compileRule } from "../../src/compile.js";
import { evaluateCompiled, evaluateRule } from "../../src/evaluate.js";
import type { EvalContext, JsExecutor, Rule } from "../../src/types.js";

const HTML = `
<div class="book">
  <h1 class="title">Hello World</h1>
  <p class="author">John Doe</p>
</div>
<div class="book">
  <h1 class="title">Second Book</h1>
  <p class="author">Jane Smith</p>
</div>
`;

const JSON_CONTENT = JSON.stringify({
	data: {
		books: [
			{ title: "Book A", author: "Author A" },
			{ title: "Book B", author: "Author B" },
		],
	},
});

describe("evaluateRule", () => {
	it("extracts titles from HTML via CSS", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".title", output: "text" },
		];
		const result = await evaluateRule(rule, HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["Hello World", "Second Book"]);
	});

	it("chains extract + transform (trim)", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "css",
				selector: ".author",
				output: "text",
			},
			{ type: "transform", category: "string", action: "trim" },
		];
		const result = await evaluateRule(rule, HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["John Doe", "Jane Smith"]);
	});

	it("extracts from JSON via JSONPath", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "jsonpath",
				selector: "$.data.books[*].title",
			},
		];
		const result = await evaluateRule(rule, JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["Book A", "Book B"]);
	});

	it("extracts via regex from plain text", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "regex", selector: "(Hello|Second)" },
		];
		const result = await evaluateRule(rule, "Hello World and Second Book");
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["Hello", "Second"]);
	});

	it("returns error for invalid CSS selector", async () => {
		const rule: Rule = [{ type: "extract", engine: "css", selector: "  " }];
		const result = await evaluateRule(rule, HTML);
		expect(result.ok).toBe(false);
	});

	it("chains CSS extract scope=current with child selector", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".book" },
			{ type: "extract", engine: "css", selector: ".title", output: "text" },
		];
		const result = await evaluateRule(rule, HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["Hello World", "Second Book"]);
	});

	it("extract scope=root queries from root document", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".book" },
			{
				type: "extract",
				engine: "css",
				selector: ".title",
				output: "text",
				scope: "root",
			},
		];
		const result = await evaluateRule(rule, HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["Hello World", "Second Book"]);
	});
});

describe("evaluateRule script steps", () => {
	it("returns SCRIPT_DISABLED when allowScript is false", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "css",
				selector: ".title",
				output: "text",
			},
			{ type: "script", code: "return result.toUpperCase();" },
		];
		const result = await evaluateRule(rule, HTML, { allowScript: false });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("SCRIPT_DISABLED");
		}
	});

	it("returns NO_JS_EXECUTOR when no executor provided", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "css",
				selector: ".title",
				output: "text",
			},
			{ type: "script", code: "return result.toUpperCase();" },
		];
		const result = await evaluateRule(rule, HTML, { allowScript: true });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("NO_JS_EXECUTOR");
		}
	});

	it("executes script with JsExecutor", async () => {
		const executor: JsExecutor = {
			async eval(code, context) {
				if (code.includes("toUpperCase")) {
					return { success: true, value: context.result.toUpperCase() };
				}
				return { success: true, value: context.result };
			},
		};
		const rule: Rule = [
			{
				type: "extract",
				engine: "css",
				selector: ".title",
				output: "text",
			},
			{ type: "script", code: "return result.toUpperCase();" },
		];
		const ctx: EvalContext = { allowScript: true, jsExecutor: executor };
		const result = await evaluateRule(rule, HTML, ctx);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		// Script receives joined string, returns single value
		expect(result.value).toEqual(["HELLO WORLD\nSECOND BOOK"]);
	});
});

describe("evaluateCompiled", () => {
	it("compiles once, evaluates multiple times", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".title", output: "text" },
		];
		const compiled = compileRule(rule);
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) return;

		const r1 = await evaluateCompiled(compiled.value, HTML);
		expect(r1.ok).toBe(true);
		if (!r1.ok) return;
		expect(r1.value).toEqual(["Hello World", "Second Book"]);

		const otherHtml = '<div class="title">Other</div>';
		const r2 = await evaluateCompiled(compiled.value, otherHtml);
		expect(r2.ok).toBe(true);
		if (!r2.ok) return;
		expect(r2.value).toEqual(["Other"]);
	});
});
