import { describe, it, expect } from "vitest";
import { getString, getStringList, getElements } from "../src/xpath";


const HTML = `
<html><body>
  <div class="book">
    <h1 class="title">三体</h1>
    <p class="author">刘慈欣</p>
    <a href="/book/1">详情</a>
  </div>
  <div class="book">
    <h1 class="title">流浪地球</h1>
    <p class="author">刘慈欣</p>
    <a href="/book/2">详情</a>
  </div>
</body></html>`;

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>文章一</title>
      <link>https://example.com/1</link>
      <description>描述一</description>
    </item>
    <item>
      <title>文章二</title>
      <link>https://example.com/2</link>
      <description>描述二</description>
    </item>
  </channel>
</rss>`;


describe("XPath getString", () => {
	it("extracts single text from XPath expression", () => {
		const result = getString("//h1[@class='title']", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("三体");
		}
	});

	it("extracts attribute value with XPath", () => {
		const result = getString("//a/@href", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("/book/1");
		}
	});

	it("extracts text from XML content", () => {
		const result = getString("//item/title/text()", XML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("文章一");
		}
	});

	it("extracts link from XML", () => {
		const result = getString("//item/link/text()", XML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("https://example.com/1");
		}
	});

	it("returns empty for no matches", () => {
		const result = getString("//nonexistent", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});

	it("extracts text using string() function", () => {
		const result = getString("string(//h1[@class='title'])", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("三体");
		}
	});
});

describe("XPath getStringList", () => {
	it("returns list of all matching text values from HTML", () => {
		const result = getStringList("//h1[@class='title']", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(2);
			expect(result.values).toContain("三体");
			expect(result.values).toContain("流浪地球");
		}
	});

	it("returns list of all author paragraphs", () => {
		const result = getStringList("//p[@class='author']", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["刘慈欣", "刘慈欣"]);
		}
	});

	it("returns list of XML item titles", () => {
		const result = getStringList("//item/title/text()", XML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["文章一", "文章二"]);
		}
	});

	it("returns list of XML links", () => {
		const result = getStringList("//item/link/text()", XML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([
				"https://example.com/1",
				"https://example.com/2",
			]);
		}
	});

	it("returns empty list for no matches", () => {
		const result = getStringList("//nonexistent", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([]);
		}
	});
});

describe("XPath getElements", () => {
	it("returns outerHTML of matched elements", () => {
		const result = getElements("//div[@class='book']", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(2);
			expect(result.values[0]).toContain("三体");
			expect(result.values[1]).toContain("流浪地球");
		}
	});

	it("returns XML element serialized content", () => {
		const result = getElements("//item", XML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(2);
			expect(result.values[0]).toContain("文章一");
			expect(result.values[1]).toContain("文章二");
		}
	});

	it("returns empty list for no matches", () => {
		const result = getElements("//nonexistent", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([]);
		}
	});
});

describe("XPath content type detection", () => {
	it("parses content starting with <?xml as XML", () => {
		const result = getString("//title/text()", XML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("文章一");
		}
	});

	it("parses content starting with <!DOCTYPE", () => {
		const doctypeHtml =
			"<!DOCTYPE html><html><body><h1>Title</h1></body></html>";
		const result = getString("//h1", doctypeHtml);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("Title");
		}
	});

	it("parses regular HTML content", () => {
		const result = getString("//p[@class='author']", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("刘慈欣");
		}
	});
});

describe("XPath error handling", () => {
	it("handles invalid XPath expression", () => {
		const result = getString("///invalid[", HTML);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("XPath evaluation failed");
		}
	});

	it("handles empty content", () => {
		const result = getString("//div", "");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});

	it("handles malformed HTML gracefully", () => {
		const result = getString("//div", "<div>unclosed");
		expect(result.ok).toBe(true);
	});
});

describe("XPath attribute extraction", () => {
	it("extracts href attributes from anchor elements", () => {
		const result = getStringList("//a/@href", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["/book/1", "/book/2"]);
		}
	});

	it("extracts class attributes", () => {
		const result = getStringList("//div/@class", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["book", "book"]);
		}
	});
});

describe("XPath module structure", () => {
	it("exports xpathParser with RuleParser interface", async () => {
		const { xpathParser } = await import("../src/xpath");
		expect(xpathParser).toBeDefined();
		expect(typeof xpathParser.getString).toBe("function");
		expect(typeof xpathParser.getStringList).toBe("function");
		expect(typeof xpathParser.getElements).toBe("function");
	});
});
