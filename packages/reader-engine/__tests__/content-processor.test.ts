import { describe, expect, it } from "vitest";
import { ContentProcessor } from "../src/content/content-processor";
import type { ReplaceRule } from "../src/content/types";
import {
	type BlockNode,
	type BlockquoteNode,
	type Document,
	documentNode,
	type EmphasisNode,
	headingNode,
	type ImageNode,
	type InlineNode,
	type LinkNode,
	nodeId,
	paragraphNode,
	type SeparatorNode,
	type StrongNode,
	textNode,
} from "../src/document/nodes";

// --- Helpers ---

function makeRule(override: Partial<ReplaceRule> = {}): ReplaceRule {
	return {
		id: 0,
		name: "test rule",
		pattern: "",
		replacement: "",
		scopeTitle: true,
		scopeContent: true,
		isEnabled: true,
		isRegex: false,
		order: 0,
		...override,
	};
}

function simpleDoc(text: string): Document {
	return documentNode([paragraphNode([textNode(text)])]);
}

function headingDoc(text: string): Document {
	return documentNode([headingNode(1, [textNode(text)])]);
}

/** Extract concatenated text from all TextNodes in a Document. */
function getDocText(doc: Document): string {
	const parts: string[] = [];
	for (const block of doc.children) {
		collectBlockText(block, parts);
	}
	return parts.join("");
}

function collectBlockText(block: BlockNode, parts: string[]): void {
	switch (block.type) {
		case "paragraph":
		case "heading":
			for (const inline of block.children) {
				collectInlineText(inline, parts);
			}
			break;
		case "blockquote":
			for (const child of block.children) {
				collectBlockText(child, parts);
			}
			break;
		// image, separator have no text
	}
}

function collectInlineText(inline: InlineNode, parts: string[]): void {
	switch (inline.type) {
		case "text":
			parts.push(inline.value);
			break;
		case "strong":
		case "emphasis":
		case "link":
			for (const child of inline.children) {
				collectInlineText(child, parts);
			}
			break;
		// image-inline has no text
	}
}

// --- Tests ---

describe("ContentProcessor", () => {
	it("returns document unchanged with no rules", () => {
		const cp = new ContentProcessor();
		cp.setRules([]);
		const doc = simpleDoc("hello world");
		const result = cp.process(doc);
		expect(getDocText(result)).toBe("hello world");
	});

	it("applies simple string replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "foo", replacement: "bar" })]);
		const result = cp.process(simpleDoc("foo baz foo"));
		expect(getDocText(result)).toBe("bar baz bar");
	});

	it("applies regex replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "\\d+", replacement: "NUM", isRegex: true }),
		]);
		const result = cp.process(simpleDoc("abc 123 def 456"));
		expect(getDocText(result)).toBe("abc NUM def NUM");
	});

	it("applies regex with capture groups", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({
				pattern: "(\\w+)@(\\w+)",
				replacement: "$1 at $2",
				isRegex: true,
			}),
		]);
		const result = cp.process(simpleDoc("user@host"));
		expect(getDocText(result)).toBe("user at host");
	});

	it("skips disabled rules", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "foo", replacement: "bar", isEnabled: false }),
		]);
		const result = cp.process(simpleDoc("foo"));
		expect(getDocText(result)).toBe("foo");
	});

	it("filters by scopeTitle in heading context", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({
				pattern: "x",
				replacement: "y",
				scopeTitle: false,
				scopeContent: true,
			}),
		]);
		// Heading context (isTitle=true): scopeTitle=false → rule skipped
		expect(getDocText(cp.process(headingDoc("x")))).toBe("x");
		// Paragraph context (isTitle=false): scopeContent=true → rule applied
		expect(getDocText(cp.process(simpleDoc("x")))).toBe("y");
	});

	it("filters by scopeContent in paragraph context", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({
				pattern: "x",
				replacement: "y",
				scopeTitle: true,
				scopeContent: false,
			}),
		]);
		// Heading context (isTitle=true): scopeTitle=true → rule applied
		expect(getDocText(cp.process(headingDoc("x")))).toBe("y");
		// Paragraph context (isTitle=false): scopeContent=false → rule skipped
		expect(getDocText(cp.process(simpleDoc("x")))).toBe("x");
	});

	it("applies rules in order", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "a", replacement: "b", order: 2 }),
			makeRule({ pattern: "b", replacement: "c", order: 1 }),
		]);
		// order 1: b→c (no match on "a")
		// order 2: a→b
		expect(getDocText(cp.process(simpleDoc("a")))).toBe("b");
	});

	it("skips invalid regex gracefully", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "[invalid", replacement: "x", isRegex: true }),
		]);
		expect(getDocText(cp.process(simpleDoc("hello [invalid world")))).toBe(
			"hello [invalid world",
		);
	});

	it("handles empty document", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "x", replacement: "y" })]);
		const emptyDoc = documentNode([]);
		const result = cp.process(emptyDoc);
		expect(result.children).toHaveLength(0);
	});

	it("replaceAll with empty pattern inserts between every character", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "", replacement: "y" })]);
		expect(getDocText(cp.process(simpleDoc("hello")))).toBe("yhyeylylyoy");
	});

	it("handles rule with empty replacement (deletion)", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "rm", replacement: "" })]);
		expect(getDocText(cp.process(simpleDoc("a rm b rm c")))).toBe("a  b  c");
	});

	it("immutable — original document not modified", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "foo", replacement: "bar" })]);
		const original = simpleDoc("foo");
		const originalText = getDocText(original);
		const _result = cp.process(original);
		expect(getDocText(original)).toBe(originalText);
	});

	it("multiple blocks processed independently", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "x", replacement: "y" })]);
		const doc = documentNode([
			paragraphNode([textNode("x")]),
			headingNode(2, [textNode("x")]),
			paragraphNode([textNode("x")]),
		]);
		const result = cp.process(doc);
		expect(result.children).toHaveLength(3);
		// All blocks should have "y" since scopeTitle and scopeContent are both true
		expect(getDocText(result)).toBe("yyy");
		// Verify each block independently
		const blocks = result.children;
		const b0 = blocks[0];
		const b1 = blocks[1];
		const b2 = blocks[2];
		expect(b0).toBeDefined();
		expect(b1).toBeDefined();
		expect(b2).toBeDefined();
		if (b0 === undefined || b1 === undefined || b2 === undefined) return;
		expect(getDocText(documentNode([b0]))).toBe("y");
		expect(getDocText(documentNode([b1]))).toBe("y");
		expect(getDocText(documentNode([b2]))).toBe("y");
	});

	// --- BlockquoteNode ---

	it("processes BlockquoteNode with nested blocks", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "old", replacement: "new" })]);

		const bq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [paragraphNode([textNode("old text")])],
		};
		const doc = documentNode([bq]);
		const result = cp.process(doc);

		expect(result.children).toHaveLength(1);
		const resultBq = result.children[0];
		expect(resultBq?.type).toBe("blockquote");
		expect(getDocText(result)).toBe("new text");
	});

	it("processes deeply nested BlockquoteNode", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "a", replacement: "b" })]);

		const innerBq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [paragraphNode([textNode("a")])],
		};
		const outerBq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [paragraphNode([textNode("a")]), innerBq],
		};
		const doc = documentNode([outerBq]);
		const result = cp.process(doc);

		expect(getDocText(result)).toBe("bb");
	});

	// --- StrongNode ---

	it("processes StrongNode with inline text replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "foo", replacement: "bar" })]);

		const strong: StrongNode = {
			id: nodeId(),
			type: "strong",
			children: [textNode("foo")],
		};
		const doc = documentNode([paragraphNode([strong])]);
		const result = cp.process(doc);

		expect(getDocText(result)).toBe("bar");
	});

	it("processes StrongNode with mixed inline children", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "x", replacement: "y" })]);

		const strong: StrongNode = {
			id: nodeId(),
			type: "strong",
			children: [textNode("ax"), textNode("xb")],
		};
		const doc = documentNode([paragraphNode([textNode("before "), strong])]);
		const result = cp.process(doc);

		// "ax" → "ay", "xb" → "yb"; concatenated: "ay" + "yb" = "ayyb"
		expect(getDocText(result)).toBe("before ayyb");
	});

	// --- EmphasisNode ---

	it("processes EmphasisNode with text replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "old", replacement: "new" })]);

		const em: EmphasisNode = {
			id: nodeId(),
			type: "emphasis",
			children: [textNode("old")],
		};
		const doc = documentNode([paragraphNode([em])]);
		const result = cp.process(doc);

		expect(getDocText(result)).toBe("new");
	});

	it("processes EmphasisNode preserving structure", () => {
		const cp = new ContentProcessor();
		cp.setRules([]);

		const em: EmphasisNode = {
			id: nodeId(),
			type: "emphasis",
			children: [textNode("italic")],
		};
		const doc = documentNode([paragraphNode([textNode("normal "), em])]);
		const result = cp.process(doc);

		const para = result.children[0];
		expect(para?.type).toBe("paragraph");
		if (para?.type === "paragraph") {
			// Should have 2 inline children: text + emphasis
			expect(para.children).toHaveLength(2);
			expect(para.children[0]?.type).toBe("text");
			expect(para.children[1]?.type).toBe("emphasis");
		}
		expect(getDocText(result)).toBe("normal italic");
	});

	// --- LinkNode ---

	it("processes LinkNode with text replacement in children", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "click", replacement: "tap" })]);

		const link: LinkNode = {
			id: nodeId(),
			type: "link",
			href: "https://example.com",
			children: [textNode("click here")],
		};
		const doc = documentNode([paragraphNode([link])]);
		const result = cp.process(doc);

		expect(getDocText(result)).toBe("tap here");

		// Verify href is preserved
		const para = result.children[0];
		expect(para?.type).toBe("paragraph");
		if (para?.type === "paragraph") {
			const resultLink = para.children[0];
			expect(resultLink?.type).toBe("link");
			if (resultLink?.type === "link") {
				expect(resultLink.href).toBe("https://example.com");
			}
		}
	});

	// --- ImageNode ---

	it("passes ImageNode through unchanged", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "foo", replacement: "bar" })]);

		const image: ImageNode = {
			id: nodeId(),
			type: "image",
			src: "https://example.com/img.png",
			alt: "foo image",
		};
		const doc = documentNode([image]);
		const result = cp.process(doc);

		expect(result.children).toHaveLength(1);
		const resultImage = result.children[0];
		expect(resultImage?.type).toBe("image");
		if (resultImage?.type === "image") {
			// ImageNode passes through — alt text is NOT replaced
			expect(resultImage.src).toBe("https://example.com/img.png");
			expect(resultImage.alt).toBe("foo image");
		}
	});

	// --- SeparatorNode ---

	it("passes SeparatorNode through unchanged", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "anything", replacement: "nothing" })]);

		const sep: SeparatorNode = { id: nodeId(), type: "separator" };
		const doc = documentNode([
			paragraphNode([textNode("before")]),
			sep,
			paragraphNode([textNode("after")]),
		]);
		const result = cp.process(doc);

		expect(result.children).toHaveLength(3);
		expect(result.children[1]?.type).toBe("separator");
	});

	// --- Combined: rules scoped to title vs content in blockquote context ---

	it("applies scopeContent rules inside blockquote paragraphs", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({
				pattern: "x",
				replacement: "y",
				scopeTitle: true,
				scopeContent: true,
			}),
		]);

		const bq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [paragraphNode([textNode("x")])],
		};
		const result = cp.process(documentNode([bq]));
		expect(getDocText(result)).toBe("y");
	});

	// --- Immutable checks for node types ---

	it("immutable — StrongNode original not modified", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "a", replacement: "b" })]);

		const strong: StrongNode = {
			id: nodeId(),
			type: "strong",
			children: [textNode("a")],
		};
		const doc = documentNode([paragraphNode([strong])]);
		const originalText = getDocText(doc);

		const _result = cp.process(doc);
		expect(getDocText(doc)).toBe(originalText);
	});

	it("immutable — BlockquoteNode original not modified", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "a", replacement: "b" })]);

		const bq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [paragraphNode([textNode("a")])],
		};
		const doc = documentNode([bq]);
		const originalText = getDocText(doc);

		const _result = cp.process(doc);
		expect(getDocText(doc)).toBe(originalText);
	});
});
