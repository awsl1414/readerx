import { describe, it, expect } from "vitest";
import {
	getString,
	getStringList,
	getElements,
	parseCssRule,
} from "../src/css";

const HTML = `
<html><body>
  <div class="book">
    <h1 class="title">三体</h1>
    <p class="author">刘慈欣</p>
    <a href="/book/1" class="link">详情</a>
    <img src="/cover.jpg" class="cover" />
  </div>
  <div class="book">
    <h1 class="title">流浪地球</h1>
    <p class="author">刘慈欣</p>
    <a href="/book/2" class="link">详情</a>
    <img src="/cover2.jpg" class="cover" />
  </div>
  <div class="meta">
    <span>文本节点1</span>
    <span>文本节点2</span>
    <span>文本节点3</span>
    <span>文本节点4</span>
    <span>文本节点5</span>
  </div>
</body></html>`;

const RANGE_HTML = `<ul>
  <li>0</li><li>1</li><li>2</li><li>3</li><li>4</li>
</ul>`;

describe("parseCssRule", () => {
	it("parses simple selector without attribute or index", () => {
		const result = parseCssRule("div");
		expect(result.selector).toBe("div");
		expect(result.attribute).toBeUndefined();
		expect(result.indexExpr).toBeUndefined();
	});

	it("parses selector with @text attribute only", () => {
		const result = parseCssRule("div.content@text");
		expect(result.selector).toBe("div.content");
		expect(result.attribute).toBe("text");
		expect(result.indexExpr).toBeUndefined();
	});

	it("parses selector with @href attribute only", () => {
		const result = parseCssRule("a.link@href");
		expect(result.selector).toBe("a.link");
		expect(result.attribute).toBe("href");
	});

	it("parses selector with negative index (no @)", () => {
		const result = parseCssRule("div.book.-1");
		expect(result.selector).toBe("div.book");
		expect(result.indexExpr).toBe("-1");
	});

	it("parses selector with positive index (no @)", () => {
		const result = parseCssRule("div.book.0");
		expect(result.selector).toBe("div.book");
		expect(result.indexExpr).toBe("0");
	});

	it("parses selector with exclude index (no @)", () => {
		const result = parseCssRule("div.book.!0");
		expect(result.selector).toBe("div.book");
		expect(result.indexExpr).toBe("!0");
	});

	it("parses selector with range index (no @)", () => {
		const result = parseCssRule("div.book.0:3:2");
		expect(result.selector).toBe("div.book");
		expect(result.indexExpr).toBe("0:3:2");
	});

	it("parses @attribute.index — Legado combined format", () => {
		const result = parseCssRule("div.book@text.-1");
		expect(result.selector).toBe("div.book");
		expect(result.attribute).toBe("text");
		expect(result.indexExpr).toBe("-1");
	});

	it("parses @attribute.range_index", () => {
		const result = parseCssRule("div.book@text.0:2");
		expect(result.selector).toBe("div.book");
		expect(result.attribute).toBe("text");
		expect(result.indexExpr).toBe("0:2");
	});

	it("converts class.name shorthand to .name", () => {
		expect(parseCssRule("class.title").selector).toBe(".title");
	});

	it("converts id.name shorthand to #name", () => {
		expect(parseCssRule("id.main").selector).toBe("#main");
	});

	it("converts tag.name shorthand to tag name", () => {
		expect(parseCssRule("tag.div").selector).toBe("div");
	});

	it("converts children to > * selector", () => {
		expect(parseCssRule("children").selector).toBe("> *");
	});

	it("handles text.value shorthand as filter marker", () => {
		expect(parseCssRule("text.刘慈欣").selector).toContain("__TEXT_FILTER__刘慈欣");
	});

	it("leaves standard CSS selectors unchanged", () => {
		expect(parseCssRule("#main").selector).toBe("#main");
		expect(parseCssRule(".title").selector).toBe(".title");
		expect(parseCssRule("[data-id]").selector).toBe("[data-id]");
		expect(parseCssRule("*").selector).toBe("*");
	});

	it("uses last @ when multiple @ signs present", () => {
		const result = parseCssRule("div@class@href");
		expect(result.attribute).toBe("href");
	});

	it("trims whitespace from rule", () => {
		const result = parseCssRule("  div.content@text  ");
		expect(result.selector).toBe("div.content");
		expect(result.attribute).toBe("text");
	});
});

describe("CSS getString", () => {
	it("extracts text content from elements", () => {
		const result = getString("class.title@text", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("三体\n流浪地球");
			expect(result.values).toEqual(["三体", "流浪地球"]);
		}
	});

	it("extracts href attribute from elements", () => {
		const result = getString("a.link@href", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["/book/1", "/book/2"]);
		}
	});

	it("extracts src attribute from images", () => {
		const result = getString("img.cover@src", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["/cover.jpg", "/cover2.jpg"]);
		}
	});

	it("returns empty string for no matches", () => {
		const result = getString(".nonexistent@text", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});

	it("extracts @html (innerHTML) with index", () => {
		const result = getString("div.book@html.-1", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("流浪地球");
			expect(result.value).not.toContain("三体");
		}
	});

	it("extracts last element with -1 index", () => {
		const result = getString("class.author@text.-1", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("刘慈欣");
			expect(result.values).toHaveLength(1);
		}
	});

	it("extracts first element with 0 index", () => {
		const result = getString("class.title@text.0", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("三体");
		}
	});

	it("extracts all text by default when no @ attribute", () => {
		const result = getString("class.title", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("三体");
		}
	});

	it("filters by text content using text.value shorthand", () => {
		const result = getString("text.流浪地球@text", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("流浪地球");
		}
	});

	it("handles range index 0:4:2 (every other element)", () => {
		const result = getString("span@text.0:4:2", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["文本节点1", "文本节点3", "文本节点5"]);
		}
	});

	it("handles exclude index !0 (exclude first)", () => {
		const result = getString("span@text.!0", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([
				"文本节点2",
				"文本节点3",
				"文本节点4",
				"文本节点5",
			]);
		}
	});
});

describe("CSS getStringList", () => {
	it("returns list of all matching text values", () => {
		const result = getStringList("class.author@text", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["刘慈欣", "刘慈欣"]);
		}
	});

	it("returns list of href values", () => {
		const result = getStringList("a.link@href", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["/book/1", "/book/2"]);
		}
	});

	it("returns empty list for no matches", () => {
		const result = getStringList(".nonexistent@text", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([]);
		}
	});

	it("preserves empty values in list", () => {
		const html = '<div><span></span><span>text</span></div>';
		const result = getStringList("span@text", html);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(2);
		}
	});
});

describe("CSS getElements", () => {
	it("returns outerHTML of matched elements", () => {
		const result = getElements("class.title", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(2);
			expect(result.values[0]).toContain("<h1");
			expect(result.values[0]).toContain("三体");
			expect(result.values[1]).toContain("流浪地球");
		}
	});

	it("returns empty list for no matches", () => {
		const result = getElements(".nonexistent", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([]);
		}
	});

	it("returns outerHTML with index filter (no @)", () => {
		const result = getElements("div.book.0", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(1);
			expect(result.values[0]).toContain("三体");
		}
	});
});

describe("CSS extractAttribute edge cases", () => {
	it("@ownText returns only direct text nodes", () => {
		const html =
			'<div class="container">直接文本<span>子元素文本</span>更多文本</div>';
		const result = getString("class.container@ownText", html);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("直接文本");
			expect(result.value).toContain("更多文本");
		}
	});

	it("@textNodes returns all text nodes recursively", () => {
		const html =
			'<div class="container">直接文本<span>子元素文本</span></div>';
		const result = getString("class.container@textNodes", html);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("直接文本");
			expect(result.value).toContain("子元素文本");
		}
	});

	it("@all returns outerHTML", () => {
		const html = '<div class="item">content</div>';
		const result = getString("class.item@all", html);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("<div");
			expect(result.value).toContain("</div>");
		}
	});

	it("extracts standard HTML attribute like data-id", () => {
		const html = '<div class="item" data-id="123">content</div>';
		const result = getString("class.item@data-id", html);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("123");
		}
	});

	it("returns empty string for nonexistent attribute", () => {
		const html = '<div class="item">content</div>';
		const result = getString("class.item@nonexistent", html);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});
});

describe("CSS range index", () => {
	it("range 1:3 returns elements at index 1, 2, 3", () => {
		const result = getString("li@text.1:3", RANGE_HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["1", "2", "3"]);
		}
	});

	it("range 0:4:2 returns every other element", () => {
		const result = getString("li@text.0:4:2", RANGE_HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["0", "2", "4"]);
		}
	});

	it("range 2:4 returns elements at index 2, 3, 4", () => {
		const result = getString("li@text.2:4", RANGE_HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["2", "3", "4"]);
		}
	});

	it("negative single index -1 returns last element", () => {
		const result = getString("li@text.-1", RANGE_HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["4"]);
		}
	});

	it("negative single index -2 returns second to last", () => {
		const result = getString("li@text.-2", RANGE_HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["3"]);
		}
	});
});

describe("CSS invalid input handling", () => {
	it("handles invalid selector gracefully", () => {
		const result = getString(">>>invalid<<<@text", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});

	it("handles empty content", () => {
		const result = getString("div@text", "");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});

	it("handles index out of range", () => {
		const result = getString("li@text.99", RANGE_HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});
});
