import { describe, expect, it } from "vitest";
import { extractXPath } from "../../src/xpath.js";

const HTML = `
<ul>
	<li class="book"><span class="title">Book A</span><a href="/a">Link A</a></li>
	<li class="book"><span class="title">Book B</span><a href="/b">Link B</a></li>
</ul>
`;

describe("extractXPath", () => {
	it("filters out non-element nodes (text() returns no results)", () => {
		const result = extractXPath('//span[@class="title"]/text()', HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			// text() nodes have nodeType 3, filtered out by nodeType === 1 check
			expect(result.value).toEqual([]);
		}
	});

	it("extracts element text via XPath selecting elements", () => {
		const result = extractXPath('//span[@class="title"]', HTML, {
			output: "text",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["Book A", "Book B"]);
		}
	});

	it("returns error for invalid expression", () => {
		const result = extractXPath("//[invalid", HTML);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("XPATH_ERROR");
		}
	});

	it("supports scoped extraction from an Element", () => {
		const books = extractXPath('//li[@class="book"]', HTML);
		expect(books.ok).toBe(true);
		if (!books.ok) return;

		const firstBook = books.value[0] as Element;

		const titles = extractXPath(".//span[@class='title']", firstBook, {
			output: "text",
		});
		expect(titles.ok).toBe(true);
		if (titles.ok) {
			expect(titles.value).toEqual(["Book A"]);
		}
	});

	it("returns empty array when no matches", () => {
		const result = extractXPath("//div[@class='nonexistent']", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual([]);
		}
	});
});
