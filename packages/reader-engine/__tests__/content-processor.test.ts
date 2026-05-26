import { describe, expect, it } from "vitest";
import {
	type BlockNode,
	type Document,
	type InlineNode,
	type TextNode,
	documentNode,
	headingNode,
	paragraphNode,
	textNode,
} from "../src/document/nodes";
import { ContentProcessor } from "../src/content/content-processor";
import type { ReplaceRule } from "../src/content/types";

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
		expect(getDocText(documentNode([blocks[0]]))).toBe("y");
		expect(getDocText(documentNode([blocks[1]]))).toBe("y");
		expect(getDocText(documentNode([blocks[2]]))).toBe("y");
	});
});
