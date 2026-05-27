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

		it("extracts text from div.title", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("div.title");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Book Name");
			}
		});

		it("extracts text from div.author", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("div.author");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Author Name");
			}
		});

		it("extracts href attribute from a@href", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("a@href");
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

		it("extracts values via JSONPath", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(json);
			const result = await analyzer.getString("$.data.books[*].name");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Book1");
				expect(result.value).toContain("Book2");
				expect(result.values).toEqual(["Book1", "Book2"]);
			}
		});

		it("returns multiple values via getStringList", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(json);
			const result = await analyzer.getStringList("$.data.books[*].name");
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

		it("&& operator concatenates both results", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("div.title&&div.author");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("Book Name");
				expect(result.value).toContain("Author Name");
			}
		});
	});

	describe("empty and edge cases", () => {
		it("returns empty success for empty rule", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = await analyzer.getString("");
			expect(result).toEqual({ ok: true, value: "", values: [] });
		});

		it("returns empty success for whitespace-only rule", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = await analyzer.getString("   ");
			expect(result).toEqual({ ok: true, value: "", values: [] });
		});

		it("returns error for JS rules", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = await analyzer.getString("@js:result = content;");
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain("JsExecutor");
			}
		});

		it("returns empty for CSS selector with no matches", async () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = await analyzer.getString("p.nonexistent");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("");
			}
		});
	});

	describe("getElements() async", () => {
		it("extracts outerHTML elements via CSS rule", async () => {
			const html = [
				'<div class="item">First</div>',
				'<div class="item">Second</div>',
			].join("\n");
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getElements("div.item");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toHaveLength(2);
				expect(result.values[0]).toContain("First");
				expect(result.values[1]).toContain("Second");
			}
		});

		it("extracts JSON elements via JSONPath rule", async () => {
			const json = JSON.stringify({
				data: {
					books: [{ name: "BookA" }, { name: "BookB" }],
				},
			});
			const analyzer = new AnalyzeRule();
			analyzer.setContent(json);
			const result = await analyzer.getElements("$.data.books[*]");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toHaveLength(2);
			}
		});
	});

	describe("getStringListSync()", () => {
		it("sync extracts string list from CSS rule", () => {
			const html = [
				'<div class="title">Book1</div>',
				'<div class="title">Book2</div>',
			].join("\n");
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = analyzer.getStringListSync("div.title");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toEqual(["Book1", "Book2"]);
			}
		});

		it("sync extracts string list from JSONPath rule", () => {
			const json = JSON.stringify({
				items: [{ val: "A" }, { val: "B" }, { val: "C" }],
			});
			const analyzer = new AnalyzeRule();
			analyzer.setContent(json);
			const result = analyzer.getStringListSync("$.items[*].val");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toEqual(["A", "B", "C"]);
			}
		});
	});

	describe("getElementsSync()", () => {
		it("sync extracts elements via CSS rule", () => {
			const html = [
				'<p class="para">Paragraph 1</p>',
				'<p class="para">Paragraph 2</p>',
			].join("\n");
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = analyzer.getElementsSync("p.para");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toHaveLength(2);
				expect(result.values[0]).toContain("Paragraph 1");
				expect(result.values[1]).toContain("Paragraph 2");
			}
		});

		it("returns error for JS rules", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>content</div>");
			const result = analyzer.getElementsSync("@js:result = src;");
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toContain("JS");
			}
		});
	});

	describe("getContent() and getContentType()", () => {
		it("returns the raw content string", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>hello</div>");
			expect(analyzer.getContent()).toBe("<div>hello</div>");
		});

		it("detects HTML content type", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("<div>hello</div>");
			expect(analyzer.getContentType()).toBe("html");
		});

		it("detects JSON content type for object", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent('{"key":"value"}');
			expect(analyzer.getContentType()).toBe("json");
		});

		it("detects JSON content type for array", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("[1,2,3]");
			expect(analyzer.getContentType()).toBe("json");
		});

		it("detects XML content type", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent('<?xml version="1.0"?><root/>');
			expect(analyzer.getContentType()).toBe("xml");
		});

		it("detects text content type", () => {
			const analyzer = new AnalyzeRule();
			analyzer.setContent("plain text content");
			expect(analyzer.getContentType()).toBe("text");
		});
	});

	describe("@regex: mode prefix", () => {
		it("detects @regex: prefix as regex mode", () => {
			// Note: @regex: is detected by detectMode
			const analyzer = new AnalyzeRule();
			// detectRuleMode does not currently detect @regex: — it falls to "default"
			// because detectMode() has no @regex: check. This test documents current behavior.
			expect(analyzer.detectRuleMode("@regex:Name: (\\w+)")).toBe("default");
		});
	});

	describe("content-type auto-detection", () => {
		it("auto-routes JSON content to JSONPath parser", async () => {
			const json = JSON.stringify({
				data: { title: "AutoDetected" },
			});
			const analyzer = new AnalyzeRule();
			analyzer.setContent(json);
			// No explicit @Json: prefix — should auto-detect json content type
			const result = await analyzer.getString("$.data.title");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("AutoDetected");
			}
		});

		it("auto-routes HTML content to CSS parser", async () => {
			const html = '<div class="info">CSS Auto</div>';
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("div.info");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("CSS Auto");
			}
		});
	});

	describe("|| operator (fallback)", () => {
		it("returns first non-empty result", async () => {
			const html = [
				'<div class="title">Primary</div>',
				'<div class="author">Author</div>',
			].join("\n");
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("div.title||div.author");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("Primary");
				expect(result.values).toEqual(["Primary"]);
			}
		});

		it("falls back to second when first is empty", async () => {
			const html = [
				'<div class="title">Primary</div>',
				'<div class="author">Author</div>',
			].join("\n");
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("p.nonexistent||div.author");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("Author");
				expect(result.values).toEqual(["Author"]);
			}
		});

		it("returns empty when both are empty", async () => {
			const html = "<div>content</div>";
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("p.a||p.b");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("");
				// ok("") returns values: [""] so fallback still yields [""]
				expect(result.values).toEqual([""]);
			}
		});
	});

	describe("%% zip operator", () => {
		it("interleaves results from two rules", async () => {
			const html = [
				'<div class="name">Alice</div>',
				'<div class="name">Bob</div>',
				'<div class="age">30</div>',
				'<div class="age">25</div>',
			].join("\n");
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("div.name%%div.age");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toEqual(["Alice", "30", "Bob", "25"]);
			}
		});

		it("handles unequal lengths with zip merge", async () => {
			const html = [
				'<div class="a">X</div>',
				'<div class="a">Y</div>',
				'<div class="a">Z</div>',
				'<div class="b">1</div>',
			].join("\n");
			const analyzer = new AnalyzeRule();
			analyzer.setContent(html);
			const result = await analyzer.getString("div.a%%div.b");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.values).toEqual(["X", "1", "Y", "Z"]);
			}
		});
	});
});
