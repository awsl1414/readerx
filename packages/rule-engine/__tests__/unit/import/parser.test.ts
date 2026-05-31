import { describe, expect, it } from "vitest";
import {
	parseJsoupChain,
	parseLegadoRule,
	parseSimpleJsoup,
	wrapAsLegacyScript,
} from "../../../src/import/parser.js";

describe("parseLegadoRule", () => {
	// ── CSS Selectors ─────────────────────────────────────────

	it("parses @css: prefix as css engine", () => {
		const result = parseLegadoRule("@css:.book-title");
		expect(result.unsupported).toEqual([]);
		expect(result.legacyScript).toBeUndefined();
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-title",
		});
	});

	it('parses class.xxx as css engine with "." selector', () => {
		const result = parseLegadoRule("class.book-title");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-title",
		});
	});

	it("parses class.xxx@text with text output", () => {
		const result = parseLegadoRule("class.book-title@text");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-title",
			output: "text",
		});
	});

	it("parses class.xxx@html with html output", () => {
		const result = parseLegadoRule("class.content@html");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".content",
			output: "html",
		});
	});

	it("parses class.xxx@href with attr output", () => {
		const result = parseLegadoRule("class.book-url@href");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-url",
			output: "attr",
			attr: "href",
		});
	});

	it("parses id.xxx as css engine with '#' selector", () => {
		const result = parseLegadoRule("id.content");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "#content",
		});
	});

	it("parses tag.xxx as css engine with bare tag selector", () => {
		const result = parseLegadoRule("tag.div");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "div",
		});
	});

	it("parses class.xxx@src with attr output", () => {
		const result = parseLegadoRule("class.cover@src");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".cover",
			output: "attr",
			attr: "src",
		});
	});

	it("parses class.xxx@data-cover with attr output", () => {
		const result = parseLegadoRule("class.img@data-cover");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".img",
			output: "attr",
			attr: "data-cover",
		});
	});

	// ── XPath ─────────────────────────────────────────────────

	it("parses @xpath: prefix as xpath engine", () => {
		const result = parseLegadoRule(
			"@xpath://meta[@property='og:novel:author']/@content",
		);
		expect(result.unsupported).toEqual([]);
		expect(result.legacyScript).toBeUndefined();
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "xpath",
			selector: "//meta[@property='og:novel:author']/@content",
		});
	});

	it("infers xpath from // prefix", () => {
		const result = parseLegadoRule("//div[@class='title']/text()");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "xpath",
			selector: "//div[@class='title']/text()",
		});
	});

	it("infers xpath from ./ prefix", () => {
		const result = parseLegadoRule("./div/span");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "xpath",
			selector: "./div/span",
		});
	});

	// ── JSONPath ──────────────────────────────────────────────

	it("parses @json: prefix as jsonpath engine", () => {
		const result = parseLegadoRule("@json:$.data.content");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "jsonpath",
			selector: "$.data.content",
		});
	});

	it("infers jsonpath from $. prefix", () => {
		const result = parseLegadoRule("$.data.content");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "jsonpath",
			selector: "$.data.content",
		});
	});

	// ── ## Replacement ────────────────────────────────────────

	it("parses ## replacement as transform step", () => {
		const result = parseLegadoRule("class.title##prefix\\.");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(2);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".title",
		});
		expect(result.steps?.[1]).toEqual({
			type: "transform",
			category: "string",
			action: "replace",
			pattern: "prefix\\.",
			with: "",
		});
	});

	it("parses multiple ## replacements", () => {
		const result = parseLegadoRule("$.name##^##\\s+$");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(3);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "jsonpath",
			selector: "$.name",
		});
		expect(result.steps?.[1]).toEqual({
			type: "transform",
			category: "string",
			action: "replace",
			pattern: "^",
			with: "",
		});
		expect(result.steps?.[2]).toEqual({
			type: "transform",
			category: "string",
			action: "replace",
			pattern: "\\s+$",
			with: "",
		});
	});

	// ── @js: Fallback ────────────────────────────────────────

	it("falls back to script for @js: expression", () => {
		const result = parseLegadoRule("@js:baseUrl.replace('/txt','')");
		expect(result.unsupported).toEqual(["js-expression"]);
		expect(result.legacyScript).toBeDefined();
		expect(result.steps).toBeUndefined();
	});

	// ── @put Fallback ────────────────────────────────────────

	it("falls back to script for @put: expression", () => {
		const result = parseLegadoRule("$.data@put:{book:$.id}");
		expect(result.unsupported).toEqual(["variable-system"]);
		expect(result.legacyScript).toBeDefined();
		expect(result.steps).toBeUndefined();
	});

	// ── @get Fallback ────────────────────────────────────────

	it("falls back to script for @get: expression", () => {
		const result = parseLegadoRule("@get:{book}");
		expect(result.unsupported).toEqual(["variable-system"]);
		expect(result.legacyScript).toBeDefined();
		expect(result.steps).toBeUndefined();
	});

	// ── && Fallback ───────────────────────────────────────────

	it("falls back to script for && merge operator", () => {
		const result = parseLegadoRule("class.a&&class.b");
		expect(result.unsupported).toEqual(["merge-operator"]);
		expect(result.legacyScript).toBeDefined();
		expect(result.steps).toBeUndefined();
	});

	// ── Unknown Engine ────────────────────────────────────────

	it("falls back to script for unrecognized expression", () => {
		const result = parseLegadoRule("something weird no engine");
		expect(result.unsupported).toEqual(["unknown-engine"]);
		expect(result.legacyScript).toBeDefined();
		expect(result.steps).toBeUndefined();
	});

	it("falls back to script for plain text like 'text'", () => {
		const result = parseLegadoRule("text");
		expect(result.unsupported).toEqual(["unknown-engine"]);
		expect(result.legacyScript).toBeDefined();
	});

	// ── Empty String ─────────────────────────────────────────

	it("returns empty steps for empty string", () => {
		const result = parseLegadoRule("");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toEqual([]);
		expect(result.legacyScript).toBeUndefined();
	});
});

describe("parseSimpleJsoup", () => {
	it("parses class.xxx", () => {
		expect(parseSimpleJsoup("class.book-title")).toEqual({
			selector: ".book-title",
		});
	});

	it("parses class.xxx@text", () => {
		expect(parseSimpleJsoup("class.book-title@text")).toEqual({
			selector: ".book-title",
			output: "text",
		});
	});

	it("parses class.xxx@html", () => {
		expect(parseSimpleJsoup("class.content@html")).toEqual({
			selector: ".content",
			output: "html",
		});
	});

	it("parses class.xxx@href", () => {
		expect(parseSimpleJsoup("class.url@href")).toEqual({
			selector: ".url",
			output: "attr",
			attr: "href",
		});
	});

	it("parses class.xxx@src", () => {
		expect(parseSimpleJsoup("class.cover@src")).toEqual({
			selector: ".cover",
			output: "attr",
			attr: "src",
		});
	});

	it("parses class.xxx@data-* as attr", () => {
		expect(parseSimpleJsoup("class.img@data-src")).toEqual({
			selector: ".img",
			output: "attr",
			attr: "data-src",
		});
	});

	it("parses id.xxx", () => {
		expect(parseSimpleJsoup("id.main")).toEqual({
			selector: "#main",
		});
	});

	it("parses tag.xxx", () => {
		expect(parseSimpleJsoup("tag.div")).toEqual({
			selector: "div",
		});
	});

	it("parses tag.xxx@text with text output", () => {
		expect(parseSimpleJsoup("tag.div@text")).toEqual({
			selector: "div",
			output: "text",
		});
	});

	it("returns null for complex JSoup expressions", () => {
		expect(parseSimpleJsoup("class.a.b")).toBeNull();
	});

	it("returns null for non-JSoup input", () => {
		expect(parseSimpleJsoup("//div")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseSimpleJsoup("")).toBeNull();
	});
});

// ── JSoup Chain Parsing ──────────────────────────────────────

describe("parseJsoupChain", () => {
	// ── Single-level with index ───────────────────────────────

	it("parses class.xxx.N (indexed class)", () => {
		expect(parseJsoupChain("class.book-img-box.0")).toEqual({
			selector: ".book-img-box:nth-of-type(1)",
		});
	});

	it("parses id.xxx.N (indexed id)", () => {
		expect(parseJsoupChain("id.details-menu.0")).toEqual({
			selector: "#details-menu:nth-of-type(1)",
		});
	});

	it("parses tag.xxx.N (indexed tag)", () => {
		expect(parseJsoupChain("tag.div.1")).toEqual({
			selector: "div:nth-of-type(2)",
		});
	});

	// ── Chained selectors with output ─────────────────────────

	it("parses class.xxx.N@tag.yyy.M@src (chain with attr output)", () => {
		const result = parseJsoupChain("class.book-img-box.0@tag.img.0@src");
		expect(result).toEqual({
			selector: ".book-img-box:nth-of-type(1) img:nth-of-type(1)",
			output: "attr",
			attr: "src",
		});
	});

	it("parses class.xxx@tag.h4.N@tag.a.M@text (multi-chain)", () => {
		const result = parseJsoupChain("class.book-mid-info@tag.h4.0@tag.a.0@text");
		expect(result).toEqual({
			selector: ".book-mid-info h4:nth-of-type(1) a:nth-of-type(1)",
			output: "text",
		});
	});

	it("parses id.xxx.N@html", () => {
		const result = parseJsoupChain("id.content.0@html");
		expect(result).toEqual({
			selector: "#content:nth-of-type(1)",
			output: "html",
		});
	});

	it("parses class.xxx@tag.div (descendant chain, no output)", () => {
		const result = parseJsoupChain("class.result-list@tag.div");
		expect(result).toEqual({
			selector: ".result-list div",
		});
	});

	it("parses class.xxx@tag.h4@tag.a.N@text (chain with partial index)", () => {
		const result = parseJsoupChain("class.book-mid-info@tag.h4@tag.a.0@text");
		expect(result).toEqual({
			selector: ".book-mid-info h4 a:nth-of-type(1)",
			output: "text",
		});
	});

	it("parses tag.xxx@all as html output", () => {
		const result = parseJsoupChain("tag.body@all");
		expect(result).toEqual({
			selector: "body",
			output: "html",
		});
	});

	// ── Bare CSS selectors ────────────────────────────────────

	it("parses bare a[data-bid]@data-bid (attribute selector)", () => {
		const result = parseJsoupChain("a[data-bid]@data-bid");
		expect(result).toEqual({
			selector: "a[data-bid]",
			output: "attr",
			attr: "data-bid",
		});
	});

	// ── textNodes output ──────────────────────────────────────

	it("parses class.xxx.N@tag.yyy.M@textNodes as text output", () => {
		const result = parseJsoupChain("class.zxzj.0@tag.p.0@textNodes");
		expect(result).toEqual({
			selector: ".zxzj:nth-of-type(1) p:nth-of-type(1)",
			output: "text",
		});
	});

	// ── Negative index ────────────────────────────────────────

	it("parses negative index as nth-last-of-type", () => {
		const result = parseJsoupChain("tag.div.-1");
		expect(result).toEqual({
			selector: "div:nth-last-of-type(1)",
		});
	});

	// ── Unsupported patterns return null ──────────────────────

	it("returns null for @children[N] pattern (unsupported)", () => {
		expect(parseJsoupChain("class.full_chapters@children[0]@tag.a")).toBeNull();
	});

	it("returns null for slice notation [N:M] (unsupported)", () => {
		expect(parseJsoupChain("tag.span[0:1]")).toBeNull();
	});

	it("returns null for bare output specifier without selector", () => {
		expect(parseJsoupChain("text")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseJsoupChain("")).toBeNull();
	});
});

// ── parseLegadoRule with JSoup chains ────────────────────────

describe("parseLegadoRule (JSoup chain integration)", () => {
	it("converts class.xxx.N@tag.yyy.M@src to css extract", () => {
		const result = parseLegadoRule("class.book-img-box.0@tag.img.0@src");
		expect(result.unsupported).toEqual([]);
		expect(result.steps).toHaveLength(1);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-img-box:nth-of-type(1) img:nth-of-type(1)",
			output: "attr",
			attr: "src",
		});
	});

	it("converts class.xxx@tag.h4.N@tag.a.M@text to css extract", () => {
		const result = parseLegadoRule("class.book-mid-info@tag.h4.0@tag.a.0@text");
		expect(result.unsupported).toEqual([]);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".book-mid-info h4:nth-of-type(1) a:nth-of-type(1)",
			output: "text",
		});
	});

	it("converts id.content.0@html to css extract", () => {
		const result = parseLegadoRule("id.content.0@html");
		expect(result.unsupported).toEqual([]);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "#content:nth-of-type(1)",
			output: "html",
		});
	});

	it("converts a[data-bid]@data-bid to css extract", () => {
		const result = parseLegadoRule("a[data-bid]@data-bid");
		expect(result.unsupported).toEqual([]);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "a[data-bid]",
			output: "attr",
			attr: "data-bid",
		});
	});

	it("converts tag.body@all to css extract with html output", () => {
		const result = parseLegadoRule("tag.body@all");
		expect(result.unsupported).toEqual([]);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "body",
			output: "html",
		});
	});

	it("converts class.result-list@tag.div to css extract", () => {
		const result = parseLegadoRule("class.result-list@tag.div");
		expect(result.unsupported).toEqual([]);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".result-list div",
		});
	});

	it("handles @children[N] as unknown-engine fallback", () => {
		const result = parseLegadoRule("class.full_chapters@children[0]@tag.a");
		expect(result.unsupported).toEqual(["unknown-engine"]);
		expect(result.legacyScript).toBeDefined();
	});

	it("handles slice notation [N:M] as unknown-engine fallback", () => {
		const result = parseLegadoRule("tag.span[0:1]");
		expect(result.unsupported).toEqual(["unknown-engine"]);
		expect(result.legacyScript).toBeDefined();
	});

	it("converts class.zxzj.0@tag.p.0@textNodes to css with text output", () => {
		const result = parseLegadoRule("class.zxzj.0@tag.p.0@textNodes");
		expect(result.unsupported).toEqual([]);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: ".zxzj:nth-of-type(1) p:nth-of-type(1)",
			output: "text",
		});
	});

	it("converts id.details-menu.0@href to css with attr output", () => {
		const result = parseLegadoRule("id.details-menu.0@href");
		expect(result.unsupported).toEqual([]);
		expect(result.steps?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "#details-menu:nth-of-type(1)",
			output: "attr",
			attr: "href",
		});
	});
});

describe("wrapAsLegacyScript", () => {
	it("wraps expression in legacy script template", () => {
		const result = wrapAsLegacyScript("class.a&&class.b");
		expect(result).toContain("/* legado-legacy */");
		expect(result).toContain("class.a&&class.b");
		expect(result).toContain("throw new Error");
	});

	it("escapes */ in expression", () => {
		const result = wrapAsLegacyScript("some/*weird*/expr");
		expect(result).not.toContain("some/*weird*/expr");
		expect(result).toContain("*\\/");
	});
});
