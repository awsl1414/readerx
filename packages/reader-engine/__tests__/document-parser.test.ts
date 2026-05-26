// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
	parseHtmlToDocument,
	parseTextToDocument,
} from "../src/content/document-parser";

// ─── parseTextToDocument ─────────────────────────────────────────────

describe("parseTextToDocument", () => {
	it("splits by newlines and creates paragraph per line", () => {
		const doc = parseTextToDocument("hello\nworld");
		expect(doc.type).toBe("document");
		expect(doc.children).toHaveLength(2);
		expect(doc.children[0]?.type).toBe("paragraph");
		expect(doc.children[1]?.type).toBe("paragraph");
	});

	it("trims each line", () => {
		const doc = parseTextToDocument("  hello  \n  world  ");
		const p0 = doc.children[0];
		const p1 = doc.children[1];
		expect(p0?.type).toBe("paragraph");
		expect(p1?.type).toBe("paragraph");
		if (p0?.type === "paragraph" && p1?.type === "paragraph") {
			const t0 = p0.children[0];
			const t1 = p1.children[0];
			expect(t0?.type).toBe("text");
			expect(t1?.type).toBe("text");
			if (t0?.type === "text" && t1?.type === "text") {
				expect(t0.value).toBe("hello");
				expect(t1.value).toBe("world");
			}
		}
	});

	it("skips empty lines", () => {
		const doc = parseTextToDocument("hello\n\n\nworld");
		expect(doc.children).toHaveLength(2);
	});

	it("skips whitespace-only lines", () => {
		const doc = parseTextToDocument("hello\n   \nworld");
		expect(doc.children).toHaveLength(2);
	});

	it("sets meta.title when title is provided", () => {
		const doc = parseTextToDocument("hello", "My Title");
		expect(doc.meta?.title).toBe("My Title");
	});

	it("omits meta when no title provided", () => {
		const doc = parseTextToDocument("hello");
		expect(doc.meta).toBeUndefined();
	});

	it("generates unique IDs for all nodes", () => {
		const doc = parseTextToDocument("a\nb");
		const docId = doc.id;
		const p0Id = doc.children[0]?.id;
		const p1Id = doc.children[1]?.id;
		const ids = new Set([docId, p0Id, p1Id]);
		expect(ids.size).toBe(3);
	});

	it("handles empty string input", () => {
		const doc = parseTextToDocument("");
		expect(doc.children).toHaveLength(0);
	});
});

// ─── parseHtmlToDocument ─────────────────────────────────────────────

describe("parseHtmlToDocument", () => {
	it("parses <p> tags into ParagraphNodes", () => {
		const doc = parseHtmlToDocument("<p>Hello</p><p>World</p>");
		expect(doc.children).toHaveLength(2);
		expect(doc.children[0]?.type).toBe("paragraph");
		expect(doc.children[1]?.type).toBe("paragraph");
	});

	it("parses <h1>-<h6> into HeadingNodes with correct level", () => {
		for (let level = 1; level <= 6; level++) {
			const doc = parseHtmlToDocument(`<h${level}>Title</h${level}>`);
			expect(doc.children).toHaveLength(1);
			const heading = doc.children[0];
			expect(heading?.type).toBe("heading");
			if (heading?.type === "heading") {
				expect(heading.level).toBe(level);
			}
		}
	});

	it("parses <img> into ImageNode with src and alt", () => {
		const doc = parseHtmlToDocument(
			'<img src="http://example.com/img.png" alt="A pic">',
		);
		expect(doc.children).toHaveLength(1);
		const img = doc.children[0];
		expect(img?.type).toBe("image");
		if (img?.type === "image") {
			expect(img.src).toBe("http://example.com/img.png");
			expect(img.alt).toBe("A pic");
		}
	});

	it("parses <strong> inside a paragraph", () => {
		const doc = parseHtmlToDocument("<p>Hello <strong>bold</strong></p>");
		expect(doc.children).toHaveLength(1);
		const p = doc.children[0];
		expect(p?.type).toBe("paragraph");
		if (p?.type === "paragraph") {
			expect(p.children).toHaveLength(2);
			const strong = p.children[1];
			expect(strong?.type).toBe("strong");
			if (strong?.type === "strong") {
				expect(strong.children).toHaveLength(1);
				const inner = strong.children[0];
				if (inner?.type === "text") {
					expect(inner.value).toBe("bold");
				}
			}
		}
	});

	it("parses <em> inside a paragraph", () => {
		const doc = parseHtmlToDocument("<p>Hello <em>italic</em></p>");
		const p = doc.children[0];
		if (p?.type === "paragraph") {
			const em = p.children[1];
			expect(em?.type).toBe("emphasis");
		}
	});

	it("parses <a> into LinkNode with href", () => {
		const doc = parseHtmlToDocument(
			'<p><a href="http://example.com">link</a></p>',
		);
		const p = doc.children[0];
		if (p?.type === "paragraph") {
			const link = p.children[0];
			expect(link?.type).toBe("link");
			if (link?.type === "link") {
				expect(link.href).toBe("http://example.com");
			}
		}
	});

	it("parses <blockquote> recursively", () => {
		const doc = parseHtmlToDocument("<blockquote><p>quoted</p></blockquote>");
		expect(doc.children).toHaveLength(1);
		const bq = doc.children[0];
		expect(bq?.type).toBe("blockquote");
		if (bq?.type === "blockquote") {
			expect(bq.children).toHaveLength(1);
			expect(bq.children[0]?.type).toBe("paragraph");
		}
	});

	it("parses <hr> into SeparatorNode", () => {
		const doc = parseHtmlToDocument("<p>before</p><hr><p>after</p>");
		expect(doc.children).toHaveLength(3);
		expect(doc.children[1]?.type).toBe("separator");
	});

	it("handles plain text without tags", () => {
		const doc = parseHtmlToDocument("Hello world");
		expect(doc.children).toHaveLength(1);
		expect(doc.children[0]?.type).toBe("paragraph");
	});

	it("sets meta.title when title is provided", () => {
		const doc = parseHtmlToDocument("<p>content</p>", "Page Title");
		expect(doc.meta?.title).toBe("Page Title");
	});

	it("generates unique IDs for all nodes", () => {
		const doc = parseHtmlToDocument("<p>a</p><p>b</p>");
		const ids = new Set<string>();
		ids.add(doc.id);
		for (const child of doc.children) {
			ids.add(child.id);
			if (child.type === "paragraph") {
				for (const inline of child.children) {
					ids.add(inline.id);
				}
			}
		}
		// doc + 2 paragraphs + 2 text nodes = 5 unique IDs
		expect(ids.size).toBe(5);
	});

	it("skips <br> tags", () => {
		const doc = parseHtmlToDocument("<p>Hello<br>World</p>");
		const p = doc.children[0];
		if (p?.type === "paragraph") {
			// Should have 2 text nodes, no separator from <br>
			expect(p.children.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("parses <div> as ParagraphNode", () => {
		const doc = parseHtmlToDocument("<div>content</div>");
		expect(doc.children[0]?.type).toBe("paragraph");
	});
});
