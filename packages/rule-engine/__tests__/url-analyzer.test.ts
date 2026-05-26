import { describe, expect, it } from "vitest";
import {
	AnalyzeUrl,
	replaceVariables,
	resolvePage,
	resolveRelativeUrl,
	splitUrlOptions,
} from "../src/url-analyzer";

describe("AnalyzeUrl", () => {
	const analyzer = new AnalyzeUrl();

	it("returns URL as-is when no variables", () => {
		const result = analyzer.analyze("https://example.com/api/books");
		expect(result.url).toBe("https://example.com/api/books");
	});

	it("replaces single variable", () => {
		const result = analyzer.analyze(
			"https://example.com/search?q={{keyword}}",
			{ keyword: "三体" },
		);
		expect(result.url).toBe("https://example.com/search?q=三体");
	});

	it("replaces multiple variables", () => {
		const result = analyzer.analyze("https://example.com/{{category}}/{{id}}", {
			category: "book",
			id: "123",
		});
		expect(result.url).toBe("https://example.com/book/123");
	});

	it("replaces repeated variables", () => {
		const result = analyzer.analyze(
			"{{base}}/search?q={{keyword}}&from={{base}}",
			{ base: "https://example.com", keyword: "test" },
		);
		expect(result.url).toBe(
			"https://example.com/search?q=test&from=https://example.com",
		);
	});

	it("leaves unreferenced variables as-is", () => {
		const result = analyzer.analyze("https://example.com/{{page}}", {});
		expect(result.url).toBe("https://example.com/{{page}}");
	});

	it("handles empty rule string", () => {
		const result = analyzer.analyze("");
		expect(result.url).toBe("");
	});

	it("handles variables with special characters in value", () => {
		const result = analyzer.analyze("https://example.com/search?q={{query}}", {
			query: "hello world&filter=all",
		});
		expect(result.url).toBe(
			"https://example.com/search?q=hello world&filter=all",
		);
	});

	it("ignores extra variables not in URL", () => {
		const result = analyzer.analyze("https://example.com/page", {
			unused: "value",
			extra: "data",
		});
		expect(result.url).toBe("https://example.com/page");
	});
});

describe("splitUrlOptions", () => {
	it("returns optionJson null when no JSON present", () => {
		const result = splitUrlOptions("https://example.com/search");
		expect(result).toEqual({
			urlPart: "https://example.com/search",
			optionJson: null,
		});
	});

	it("separates URL and JSON options", () => {
		const result = splitUrlOptions(
			'https://example.com/search,{"method":"POST"}',
		);
		expect(result.urlPart).toBe("https://example.com/search");
		expect(result.optionJson).toBe('{"method":"POST"}');
	});

	it("handles spaces after comma", () => {
		const result = splitUrlOptions('  url , {"method":"POST"}  ');
		expect(result.urlPart).toBe("  url");
		expect(result.optionJson).toBe('{"method":"POST"}');
	});

	it("does not match JSON in query parameters", () => {
		const result = splitUrlOptions('https://example.com?q={"a":1}');
		expect(result.optionJson).toBe(null);
	});

	it("handles empty string", () => {
		const result = splitUrlOptions("");
		expect(result).toEqual({ urlPart: "", optionJson: null });
	});
});

describe("replaceVariables", () => {
	it("replaces single variable", () => {
		expect(
			replaceVariables("https://example.com/search?q={{keyword}}", {
				keyword: "三体",
			}),
		).toBe("https://example.com/search?q=三体");
	});

	it("replaces multiple different variables", () => {
		expect(
			replaceVariables("https://example.com/{{cat}}/{{id}}", {
				cat: "book",
				id: "123",
			}),
		).toBe("https://example.com/book/123");
	});

	it("replaces repeated variables", () => {
		expect(
			replaceVariables("{{base}}/search?q={{keyword}}&from={{base}}", {
				base: "https://example.com",
				keyword: "test",
			}),
		).toBe("https://example.com/search?q=test&from=https://example.com");
	});

	it("leaves unreferenced variables as-is", () => {
		expect(replaceVariables("https://example.com/{{page}}", {})).toBe(
			"https://example.com/{{page}}",
		);
	});

	it("returns unchanged URL with empty variables map", () => {
		expect(replaceVariables("https://example.com/page", {})).toBe(
			"https://example.com/page",
		);
	});

	it("ignores variables not present in URL", () => {
		expect(
			replaceVariables("https://example.com/page", {
				unused: "value",
				extra: "data",
			}),
		).toBe("https://example.com/page");
	});

	it("handles variable values with special characters", () => {
		expect(
			replaceVariables("https://example.com/search?q={{query}}", {
				query: "hello world&filter=all",
			}),
		).toBe("https://example.com/search?q=hello world&filter=all");
	});
});

describe("resolvePage", () => {
	it("replaces <page> with page number", () => {
		expect(resolvePage("https://example.com/page/<page>", 3)).toBe(
			"https://example.com/page/3",
		);
	});

	it("indexes into comma-separated list by page number", () => {
		expect(resolvePage("https://example.com/<1,2,3>", 2)).toBe(
			"https://example.com/2",
		);
	});

	it("returns last item when page exceeds list length", () => {
		expect(resolvePage("https://example.com/<a,b>", 5)).toBe(
			"https://example.com/b",
		);
	});

	it("returns first item for page 1", () => {
		expect(resolvePage("https://example.com/<x,y,z>", 1)).toBe(
			"https://example.com/x",
		);
	});

	it("returns URL unchanged when page is undefined", () => {
		expect(resolvePage("https://example.com/page/<page>", undefined)).toBe(
			"https://example.com/page/<page>",
		);
	});

	it("replaces multiple placeholders", () => {
		expect(resolvePage("https://example.com/<a,b>/<1,2>", 2)).toBe(
			"https://example.com/b/2",
		);
	});

	it("replaces single-item list with page number", () => {
		expect(resolvePage("https://example.com/<page>", 3)).toBe(
			"https://example.com/3",
		);
	});
});

describe("resolveRelativeUrl", () => {
	it("returns absolute URL unchanged", () => {
		expect(
			resolveRelativeUrl("https://example.com/page", "https://base.com"),
		).toBe("https://example.com/page");
	});

	it("resolves relative path with leading slash", () => {
		expect(resolveRelativeUrl("/books/123", "https://example.com")).toBe(
			"https://example.com/books/123",
		);
	});

	it("resolves relative path without leading slash", () => {
		expect(resolveRelativeUrl("books/123", "https://example.com/search/")).toBe(
			"https://example.com/search/books/123",
		);
	});

	it("resolves protocol-relative URL", () => {
		expect(
			resolveRelativeUrl("//cdn.example.com/img.jpg", "https://example.com"),
		).toBe("https://cdn.example.com/img.jpg");
	});

	it("returns URL unchanged when baseUrl is undefined", () => {
		expect(resolveRelativeUrl("https://example.com/page", undefined)).toBe(
			"https://example.com/page",
		);
	});

	it("returns relative path as-is when no baseUrl provided", () => {
		expect(resolveRelativeUrl("/books/123", undefined)).toBe("/books/123");
	});
});
