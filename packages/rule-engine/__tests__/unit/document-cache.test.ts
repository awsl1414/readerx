import { describe, expect, it } from "vitest";
import { createDocumentCache } from "../../src/document-cache.js";

describe("document-cache", () => {
	describe("getHTML", () => {
		it("returns a Document with queryable elements", () => {
			const cache = createDocumentCache();
			const doc = cache.getHTML('<div><p class="title">Hello</p></div>');

			const p = doc.querySelector("p.title");
			expect(p).not.toBeNull();
			expect(p?.textContent).toBe("Hello");
		});

		it("caches: same HTML string returns same Document reference", () => {
			const cache = createDocumentCache();
			const html = "<div>test</div>";

			const doc1 = cache.getHTML(html);
			const doc2 = cache.getHTML(html);

			expect(doc1).toBe(doc2);
		});

		it("different HTML strings return different Document references", () => {
			const cache = createDocumentCache();

			const doc1 = cache.getHTML("<div>a</div>");
			const doc2 = cache.getHTML("<div>b</div>");

			expect(doc1).not.toBe(doc2);
		});
	});

	describe("getXML", () => {
		it("returns a Document with queryable elements", () => {
			const cache = createDocumentCache();
			const doc = cache.getXML("<root><item>value</item></root>");

			const items = doc.querySelectorAll("item");
			expect(items.length).toBe(1);
			expect(items[0]?.textContent).toBe("value");
		});

		it("caches: same XML string returns same Document reference", () => {
			const cache = createDocumentCache();
			const xml = "<root><item>v</item></root>";

			const doc1 = cache.getXML(xml);
			const doc2 = cache.getXML(xml);

			expect(doc1).toBe(doc2);
		});
	});

	describe("getJSON", () => {
		it("parses JSON and returns the parsed value", () => {
			const cache = createDocumentCache();
			const result = cache.getJSON('{"name":"test","value":42}') as Record<
				string,
				unknown
			>;

			expect(result.name).toBe("test");
			expect(result.value).toBe(42);
		});

		it("caches: same JSON string returns same reference", () => {
			const cache = createDocumentCache();
			const json = '{"a":1}';

			const val1 = cache.getJSON(json);
			const val2 = cache.getJSON(json);

			expect(val1).toBe(val2);
		});
	});

	describe("dispose", () => {
		it("clears all caches so subsequent calls return new references", () => {
			const cache = createDocumentCache();
			const html = "<div>dispose-test</div>";
			const xml = "<root><x>1</x></root>";
			const json = '{"disposed":true}';

			const docHtml1 = cache.getHTML(html);
			const docXml1 = cache.getXML(xml);
			const valJson1 = cache.getJSON(json);

			cache.dispose();

			const docHtml2 = cache.getHTML(html);
			const docXml2 = cache.getXML(xml);
			const valJson2 = cache.getJSON(json);

			expect(docHtml2).not.toBe(docHtml1);
			expect(docXml2).not.toBe(docXml1);
			expect(valJson2).not.toBe(valJson1);
		});
	});
});
