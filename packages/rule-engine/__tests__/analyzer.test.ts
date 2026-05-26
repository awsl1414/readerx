import { describe, expect, it } from "vitest";
import { AnalyzeRule } from "../src/analyzer";

describe("AnalyzeRule", () => {
	describe("detectRuleMode", () => {
		const analyzer = new AnalyzeRule();

		it("detects @CSS: prefix as default", () => {
			expect(analyzer.detectRuleMode("@CSS:div.class")).toBe("default");
		});

		it("detects @XPath: prefix as xpath", () => {
			expect(analyzer.detectRuleMode("@XPath://div")).toBe("xpath");
		});

		it("detects @Json: prefix as json", () => {
			expect(analyzer.detectRuleMode("@Json:$.data")).toBe("json");
		});

		it("detects @js: prefix as js", () => {
			expect(analyzer.detectRuleMode("@js:code")).toBe("js");
		});

		it("auto-detects XPath from // prefix", () => {
			expect(analyzer.detectRuleMode("//div/a")).toBe("xpath");
		});

		it("auto-detects JSON from $. prefix", () => {
			expect(analyzer.detectRuleMode("$.data.list")).toBe("json");
		});

		it("falls back to default for plain selectors", () => {
			expect(analyzer.detectRuleMode("class.name")).toBe("default");
		});
	});

	describe("CSS parsing", () => {
		const html = [
			'<div class="title">Book Name</div>',
			'<div class="author">Author Name</div>',
			'<a href="/book/123">Link</a>',
		].join("\n");

		it("extracts text from div.title", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = analyzer.getString("div.title");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Book Name");
			}
		});

		it("extracts text from div.author", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = analyzer.getString("div.author");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Author Name");
			}
		});

		it("extracts href attribute from a@href", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = analyzer.getString("a@href");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("/book/123");
			}
		});
	});

	describe("JSONPath parsing", () => {
		const json = JSON.stringify({
			data: {
				books: [{ name: "Book1" }, { name: "Book2" }],
			},
		});

		it("extracts values via JSONPath", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(json);
			const result = analyzer.getString("$.data.books[*].name");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Book1");
				expect(result.value).toContain("Book2");
				expect(result.values).toEqual(["Book1", "Book2"]);
			}
		});

		it("returns multiple values via getStringList", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(json);
			const result = analyzer.getStringList("$.data.books[*].name");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toEqual(["Book1", "Book2"]);
			}
		});
	});

	describe("operator combination", () => {
		const html = [
			'<div class="title">Book Name</div>',
			'<div class="author">Author Name</div>',
		].join("\n");

		it("&& operator concatenates both results", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = analyzer.getString("div.title&&div.author");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Book Name");
				expect(result.value).toContain("Author Name");
			}
		});
	});

	describe("empty and edge cases", () => {
		it("returns empty success for empty rule", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = analyzer.getString("");
			expect(result).toEqual({ ok: true, value: "", values: [] });
		});

		it("returns empty success for whitespace-only rule", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = analyzer.getString("   ");
			expect(result).toEqual({ ok: true, value: "", values: [] });
		});

		it("returns error for JS rules", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = analyzer.getString("@js:result = content;");
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain("quickjs-runtime");
			}
		});

		it("returns empty for CSS selector with no matches", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = analyzer.getString("p.nonexistent");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("");
			}
		});
	});
});
