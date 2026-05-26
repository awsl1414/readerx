import { describe, expect, it } from "vitest";
import {
	AnalyzeUrl,
	analyzeUrl,
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

	it("takes last comma-brace as split point", () => {
		const result = splitUrlOptions(
			'https://example.com/search?q={"a":1},{"method":"POST"}',
		);
		expect(result.urlPart).toBe('https://example.com/search?q={"a":1}');
		expect(result.optionJson).toBe('{"method":"POST"}');
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

	it("returns URL unchanged when page is 0", () => {
		expect(resolvePage("https://example.com/page/<page>", 0)).toBe(
			"https://example.com/page/<page>",
		);
	});

	it("returns URL unchanged when page is negative", () => {
		expect(resolvePage("https://example.com/page/<page>", -1)).toBe(
			"https://example.com/page/<page>",
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

describe("analyzeUrl (full pipeline)", () => {
	it("returns plain URL with defaults", () => {
		const result = analyzeUrl("https://example.com/api");
		expect(result.url).toBe("https://example.com/api");
		expect(result.method).toBe("GET");
		expect(result.retry).toBe(0);
		expect(result.headers).toEqual({});
	});

	it("replaces variables and resolves page", () => {
		const result = analyzeUrl("https://example.com/search?q={{key}}&p=<page>", {
			variables: { key: "三体" },
			page: 2,
		});
		expect(result.url).toBe("https://example.com/search?q=三体&p=2");
	});

	it("parses POST method from URL option", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"method":"POST","body":"key={{key}}"}',
			{ variables: { key: "test" } },
		);
		expect(result.url).toBe("https://example.com/api");
		expect(result.method).toBe("POST");
		expect(result.body).toBe("key=test");
	});

	it("merges headers from context and URL option", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"headers":{"X-Custom":"yes"}}',
			{ headers: { Authorization: "Bearer token" } },
		);
		expect(result.headers).toEqual({
			Authorization: "Bearer token",
			"X-Custom": "yes",
		});
	});

	it("URL option headers override context headers", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"headers":{"Authorization":"new"}}',
			{ headers: { Authorization: "old" } },
		);
		expect(result.headers.Authorization).toBe("new");
	});

	it("resolves relative URL against baseUrl", () => {
		const result = analyzeUrl("/books/123", {
			baseUrl: "https://example.com",
		});
		expect(result.url).toBe("https://example.com/books/123");
	});

	it("handles empty rule string", () => {
		const result = analyzeUrl("");
		expect(result.url).toBe("");
		expect(result.method).toBe("GET");
	});

	it("handles invalid JSON option gracefully", () => {
		const result = analyzeUrl("https://example.com/api,{invalid}");
		expect(result.url).toBe("https://example.com/api");
		expect(result.method).toBe("GET");
	});

	it("extracts charset and retry", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"charset":"gbk","retry":3}',
		);
		expect(result.charset).toBe("gbk");
		expect(result.retry).toBe(3);
	});

	it("extracts webJs", () => {
		const result = analyzeUrl(
			'https://example.com/api,{"webJs":"document.title"}',
		);
		expect(result.webJs).toBe("document.title");
	});
});

describe("AnalyzeUrl class (backward compat)", () => {
	it("works with old two-arg API (variables map)", () => {
		const analyzer = new AnalyzeUrl();
		const result = analyzer.analyze("https://example.com/search?q={{key}}", {
			key: "test",
		});
		expect(result.url).toBe("https://example.com/search?q=test");
	});

	it("treats string-only object as variables map", () => {
		const analyzer = new AnalyzeUrl();
		const result = analyzer.analyze("https://example.com/{{page}}", {
			page: "2",
		});
		expect(result.url).toBe("https://example.com/2");
	});

	it("treats object with number value as context", () => {
		const analyzer = new AnalyzeUrl();
		const result = analyzer.analyze("https://example.com/p/<page>", {
			page: 2,
		});
		expect(result.url).toBe("https://example.com/p/2");
	});

	it("no argument returns URL as-is", () => {
		const analyzer = new AnalyzeUrl();
		const result = analyzer.analyze("https://example.com/api");
		expect(result.url).toBe("https://example.com/api");
	});
});
