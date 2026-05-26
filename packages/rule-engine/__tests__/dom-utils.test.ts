import { describe, expect, it } from "vitest";
import { fixHtmlFragment, parseHTML, parseXML } from "../src/dom-utils";

describe("parseHTML", () => {
	it("parses basic HTML string", () => {
		const doc = parseHTML("<div><p>hello</p></div>");
		const elements = doc.querySelectorAll("p");
		expect(elements).toHaveLength(1);
		expect(elements[0]?.textContent).toBe("hello");
	});

	it("parses complete HTML document", () => {
		const doc = parseHTML("<html><body><h1>Title</h1></body></html>");
		const h1 = doc.querySelectorAll("h1");
		expect(h1).toHaveLength(1);
		expect(h1[0]?.textContent).toBe("Title");
	});

	it("parses HTML with attributes", () => {
		const doc = parseHTML(
			'<div class="container"><a href="/link">click</a></div>',
		);
		const link = doc.querySelectorAll("a");
		expect(link).toHaveLength(1);
		expect(link[0]?.getAttribute("href")).toBe("/link");
	});

	it("parses HTML with nested elements", () => {
		const doc = parseHTML(`
			<ul>
				<li>item 1</li>
				<li>item 2</li>
				<li>item 3</li>
			</ul>
		`);
		const items = doc.querySelectorAll("li");
		expect(items).toHaveLength(3);
	});

	it("returns documentElement", () => {
		const doc = parseHTML("<html><body>content</body></html>");
		expect(doc.documentElement).toBeDefined();
	});

	it("handles empty string", () => {
		const doc = parseHTML("");
		expect(doc).toBeDefined();
	});

	it("handles HTML with special characters", () => {
		const doc = parseHTML("<p>你好世界 &amp; 再见</p>");
		const p = doc.querySelectorAll("p");
		expect(p[0]?.textContent).toContain("你好世界");
	});

	it("querySelectAll by class", () => {
		const doc = parseHTML(
			'<div class="a">1</div><div class="a">2</div><div class="b">3</div>',
		);
		const a = doc.querySelectorAll(".a");
		expect(a).toHaveLength(2);
	});

	it("querySelectAll by id", () => {
		const doc = parseHTML('<div id="main">content</div>');
		const el = doc.querySelectorAll("#main");
		expect(el).toHaveLength(1);
		expect(el[0]?.textContent).toBe("content");
	});
});

describe("parseXML", () => {
	it("parses basic XML document", () => {
		const doc = parseXML(
			'<?xml version="1.0"?><root><item>value</item></root>',
		);
		expect(doc).toBeDefined();
		expect(doc.documentElement).toBeDefined();
	});

	it("parses XML with child elements", () => {
		const doc = parseXML('<?xml version="1.0"?><root><a>1</a><a>2</a></root>');
		const items = doc.documentElement.childNodes;
		expect(items.length).toBeGreaterThanOrEqual(2);
	});

	it("returns documentElement for XML", () => {
		const doc = parseXML('<?xml version="1.0"?><root><child/></root>');
		expect(doc.documentElement).toBeDefined();
	});
});

describe("fixHtmlFragment", () => {
	it("wraps </td> fragments in <tr> then <table>", () => {
		const result = fixHtmlFragment("<td>cell</td>");
		expect(result).toBe("<table><tr><td>cell</td></tr></table>");
	});

	it("wraps </tr> fragments in <table>", () => {
		const result = fixHtmlFragment("<tr><td>cell</td></tr>");
		expect(result).toBe("<table><tr><td>cell</td></tr></table>");
	});

	it("wraps </tbody> fragments in <table>", () => {
		const result = fixHtmlFragment("<tbody><tr><td>cell</td></tr></tbody>");
		expect(result).toBe("<table><tbody><tr><td>cell</td></tr></tbody></table>");
	});

	it("does not modify non-table fragments", () => {
		const html = "<div>content</div>";
		expect(fixHtmlFragment(html)).toBe(html);
	});

	it("does not modify plain text", () => {
		expect(fixHtmlFragment("hello world")).toBe("hello world");
	});

	it("does not modify empty string", () => {
		expect(fixHtmlFragment("")).toBe("");
	});
});
