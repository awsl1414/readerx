import { describe, it, expect } from "vitest";
import { AnalyzeUrl } from "../src/url-analyzer";

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
		const result = analyzer.analyze(
			"https://example.com/{{category}}/{{id}}",
			{ category: "book", id: "123" },
		);
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
		const result = analyzer.analyze(
			"https://example.com/{{page}}",
			{},
		);
		expect(result.url).toBe("https://example.com/{{page}}");
	});

	it("handles empty rule string", () => {
		const result = analyzer.analyze("");
		expect(result.url).toBe("");
	});

	it("handles variables with special characters in value", () => {
		const result = analyzer.analyze(
			"https://example.com/search?q={{query}}",
			{ query: "hello world&filter=all" },
		);
		expect(result.url).toBe(
			"https://example.com/search?q=hello world&filter=all",
		);
	});

	it("ignores extra variables not in URL", () => {
		const result = analyzer.analyze(
			"https://example.com/page",
			{ unused: "value", extra: "data" },
		);
		expect(result.url).toBe("https://example.com/page");
	});
});
