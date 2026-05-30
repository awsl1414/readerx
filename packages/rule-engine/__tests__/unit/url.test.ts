import { describe, expect, it } from "vitest";
import type { EvalContext } from "../../src/types.js";
import { resolveUrl } from "../../src/url.js";

describe("resolveUrl", () => {
	it("replaces {{key}} with variable", () => {
		const ctx: EvalContext = { variables: { key: "abc" } };
		expect(resolveUrl("https://example.com/search?q={{key}}", ctx)).toBe(
			"https://example.com/search?q=abc",
		);
	});

	it("resolves relative URL against baseUrl", () => {
		const ctx: EvalContext = { baseUrl: "https://example.com/books/" };
		expect(resolveUrl("/page/1", ctx)).toBe("https://example.com/page/1");
	});

	it("returns absolute URL unchanged", () => {
		const ctx: EvalContext = { baseUrl: "https://other.com/" };
		expect(resolveUrl("https://example.com/page", ctx)).toBe(
			"https://example.com/page",
		);
	});

	it("replaces {{page}} with ctx.page", () => {
		const ctx: EvalContext = { page: 3 };
		expect(resolveUrl("https://example.com/page/{{page}}", ctx)).toBe(
			"https://example.com/page/3",
		);
	});
});
