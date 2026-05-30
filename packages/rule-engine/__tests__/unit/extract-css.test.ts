import { describe, expect, it } from "vitest";
import { extractCss } from "../../src/css.js";

const HTML = `
<ul>
	<li class="book"><span class="title">Book A</span><a href="/a">Link A</a></li>
	<li class="book"><span class="title">Book B</span><a href="/b">Link B</a></li>
</ul>
`;

describe("extractCss", () => {
	it("extracts text content from multiple elements", () => {
		const result = extractCss(".title", HTML, { output: "text" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["Book A", "Book B"]);
		}
	});

	it("extracts Element instances when no output is specified", () => {
		const result = extractCss(".book", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toHaveLength(2);
			for (const el of result.value) {
				expect(el).toHaveProperty("querySelectorAll");
			}
		}
	});

	it("extracts innerHTML", () => {
		const result = extractCss(".book", HTML, { output: "html" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toHaveLength(2);
			expect(result.value[0]).toContain("Book A");
			expect(result.value[0]).toContain("<span");
		}
	});

	it("extracts an attribute", () => {
		const result = extractCss("a", HTML, { output: "attr", attr: "href" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["/a", "/b"]);
		}
	});

	it("returns empty array when no matches", () => {
		const result = extractCss(".nonexistent", HTML);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual([]);
		}
	});

	it("returns error for invalid selector", () => {
		const result = extractCss("[[[invalid", HTML);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("INVALID_SELECTOR");
		}
	});

	it("supports scoped extraction from an Element", () => {
		// First extract all .book elements
		const books = extractCss(".book", HTML);
		expect(books.ok).toBe(true);
		if (!books.ok) return;

		const firstBook = books.value[0] as Element;

		// Then scope extraction within that element
		const titles = extractCss(".title", firstBook, { output: "text" });
		expect(titles.ok).toBe(true);
		if (titles.ok) {
			expect(titles.value).toEqual(["Book A"]);
		}
	});
});
