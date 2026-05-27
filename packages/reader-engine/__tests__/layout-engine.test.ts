import { describe, expect, it } from "vitest";
import type {
	LayoutCursor,
	TextLayouter,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayoutOptions,
} from "../src/contracts/text-layouter";
import {
	type BlockquoteNode,
	documentNode,
	headingNode,
	type ImageNode,
	nodeId,
	paragraphNode,
	type SeparatorNode,
	textNode,
} from "../src/document/nodes";
import { layoutDocument } from "../src/layout/layout-engine";
import type { LayoutConfig } from "../src/layout/types";

// --- Mock TextLayouter ---

type MockLine = {
	text: string;
	width: number;
	start: LayoutCursor;
	end: LayoutCursor;
};

function _createMockLayouter(
	linesPerParagraph: number,
	lineWidth: number,
	lineCharsPerLine: number,
): TextLayouter {
	return {
		prepare(_text: string, _options: TextLayoutOptions): TextLayoutHandle {
			return {} as TextLayoutHandle;
		},

		layoutNextLine(
			_handle: TextLayoutHandle,
			start: LayoutCursor | null,
			_maxWidth: number,
		): TextLayoutLine | null {
			// For simplicity, we only handle sequential calls.
			// Each call produces a line of fixed width and fixed char count.
			// After linesPerParagraph calls, return null.
			// We track state via segmentIndex in the cursor.
			const segIdx = start?.segmentIndex ?? 0;
			const graphIdx = start?.graphemeIndex ?? 0;

			if (segIdx >= linesPerParagraph) {
				return null;
			}

			const _newGraphIdx = graphIdx + lineCharsPerLine;

			return {
				text: "x".repeat(lineCharsPerLine),
				width: lineWidth,
				start: { segmentIndex: segIdx, graphemeIndex: graphIdx },
				end: { segmentIndex: segIdx + 1, graphemeIndex: 0 },
			};
		},
	};
}

function createMockLayouterFromLines(mockLines: MockLine[]): TextLayouter {
	let callIndex = 0;

	return {
		prepare(_text: string, _options: TextLayoutOptions): TextLayoutHandle {
			callIndex = 0;
			return {} as TextLayoutHandle;
		},

		layoutNextLine(
			_handle: TextLayoutHandle,
			_start: LayoutCursor | null,
			_maxWidth: number,
		): TextLayoutLine | null {
			if (callIndex >= mockLines.length) {
				return null;
			}
			const line = mockLines[callIndex];
			callIndex++;
			if (line === undefined) return null;
			return line;
		},
	};
}

function makeConfig(overrides: Partial<LayoutConfig> = {}): LayoutConfig {
	return {
		pageWidth: 600,
		pageHeight: 800,
		lineHeight: 24,
		font: "16px serif",
		paddingTop: 40,
		paddingBottom: 40,
		paddingLeft: 30,
		paddingRight: 30,
		...overrides,
	};
}

// --- Tests ---

describe("layoutDocument", () => {
	it("returns empty result for empty document", () => {
		const doc = documentNode([]);
		const config = makeConfig();
		const layouter = createMockLayouterFromLines([]);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(0);
		expect(result.pages).toHaveLength(0);
	});

	it("layouts a single paragraph into lines on one page", () => {
		const doc = documentNode([paragraphNode([textNode("Hello World")])]);
		const config = makeConfig();

		const mockLines: MockLine[] = [
			{
				text: "Hello World",
				width: 100,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 11 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(1);
		expect(result.pages).toHaveLength(1);
		expect(result.pages[0]?.lines).toHaveLength(1);
		expect(result.pages[0]?.lines[0]?.runs).toHaveLength(1);
		expect(result.pages[0]?.lines[0]?.runs[0]?.text).toBe("Hello World");
	});

	it("paginates across multiple pages", () => {
		const doc = documentNode([paragraphNode([textNode("Long text")])]);
		// Page height 80, padding 20 top/bottom = 40 content height, lineHeight 20 = 2 lines per page
		const config = makeConfig({
			pageHeight: 80,
			paddingTop: 20,
			paddingBottom: 20,
			lineHeight: 20,
		});

		// Create 5 mock lines for a long paragraph
		const mockLines: MockLine[] = [0, 1, 2, 3, 4].map((i) => ({
			text: `Line ${i}`,
			width: 50,
			start: { segmentIndex: i, graphemeIndex: 0 },
			end: { segmentIndex: i + 1, graphemeIndex: 0 },
		}));
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		// 5 lines, 2 lines per page = 3 pages (2 + 2 + 1)
		expect(result.totalPages).toBe(3);
		expect(result.pages[0]?.lines).toHaveLength(2);
		expect(result.pages[1]?.lines).toHaveLength(2);
		expect(result.pages[2]?.lines).toHaveLength(1);
	});

	it("sets correct x position from paddingLeft", () => {
		const doc = documentNode([paragraphNode([textNode("Hi")])]);
		const config = makeConfig({ paddingLeft: 50 });

		const mockLines: MockLine[] = [
			{
				text: "Hi",
				width: 20,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 2 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.pages[0]?.lines[0]?.x).toBe(50);
	});

	it("sets correct y positions accounting for paddingTop", () => {
		const doc = documentNode([paragraphNode([textNode("Line1")])]);
		const config = makeConfig({ paddingTop: 30, lineHeight: 20 });

		const mockLines: MockLine[] = [
			{
				text: "Line1",
				width: 50,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 5 },
			},
			{
				text: "Line2",
				width: 50,
				start: { segmentIndex: 1, graphemeIndex: 0 },
				end: { segmentIndex: 1, graphemeIndex: 5 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.pages[0]?.lines[0]?.y).toBe(30);
		expect(result.pages[0]?.lines[1]?.y).toBe(50);
	});

	it("handles multiple paragraphs", () => {
		const doc = documentNode([
			paragraphNode([textNode("Para 1")]),
			paragraphNode([textNode("Para 2")]),
		]);
		const config = makeConfig();

		// 2 lines total, one per paragraph
		// Each prepare() resets callIndex, so each paragraph gets 1 line
		const mockLines: MockLine[] = [
			{
				text: "Para text",
				width: 60,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 9 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(1);
		expect(result.pages[0]?.lines).toHaveLength(2);
	});

	it("handles heading node", () => {
		const doc = documentNode([headingNode(1, [textNode("Title")])]);
		const config = makeConfig();

		const mockLines: MockLine[] = [
			{
				text: "Title",
				width: 80,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 5 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(1);
		expect(result.pages[0]?.lines).toHaveLength(1);
		expect(result.pages[0]?.lines[0]?.runs[0]?.text).toBe("Title");
	});

	it("sets page dimensions correctly", () => {
		const doc = documentNode([paragraphNode([textNode("Hi")])]);
		const config = makeConfig({
			pageWidth: 500,
			pageHeight: 700,
			paddingTop: 10,
			paddingBottom: 10,
			paddingLeft: 20,
			paddingRight: 20,
		});

		const mockLines: MockLine[] = [
			{
				text: "Hi",
				width: 20,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 2 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		const dims = result.pages[0]?.dimensions;
		expect(dims?.width).toBe(500);
		expect(dims?.height).toBe(700);
		expect(dims?.paddingTop).toBe(10);
		expect(dims?.paddingBottom).toBe(10);
		expect(dims?.paddingLeft).toBe(20);
		expect(dims?.paddingRight).toBe(20);
	});

	// --- Blockquote layout ---

	it("layouts blockquote with nested paragraphs", () => {
		const bq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [
				paragraphNode([textNode("Quote line 1")]),
				paragraphNode([textNode("Quote line 2")]),
			],
		};
		const doc = documentNode([bq]);
		const config = makeConfig();

		// Each paragraph calls prepare() which resets callIndex,
		// so provide only 1 line — each paragraph consumes 1 line = 2 total.
		const mockLines: MockLine[] = [
			{
				text: "Quote line",
				width: 80,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 10 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(1);
		// Two lines from the two paragraphs inside the blockquote
		expect(result.pages[0]?.lines).toHaveLength(2);
	});

	it("layouts nested blockquotes recursively", () => {
		const innerBq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [paragraphNode([textNode("Inner quote")])],
		};
		const outerBq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [paragraphNode([textNode("Outer quote")]), innerBq],
		};
		const doc = documentNode([outerBq]);
		const config = makeConfig();

		// 2 paragraphs total (1 in outer + 1 in inner), each gets 1 line
		const mockLines: MockLine[] = [
			{
				text: "Quote",
				width: 80,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 5 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(1);
		expect(result.pages[0]?.lines).toHaveLength(2);
	});

	it("layouts blockquote with empty children produces no lines", () => {
		const bq: BlockquoteNode = {
			id: nodeId(),
			type: "blockquote",
			children: [],
		};
		const doc = documentNode([bq]);
		const config = makeConfig();
		const layouter = createMockLayouterFromLines([]);

		const result = layoutDocument(doc, config, layouter);

		// Empty document after processing — no pages
		expect(result.totalPages).toBe(0);
	});

	// --- Separator layout ---

	it("layouts separator as a spacing line", () => {
		const sep: SeparatorNode = { id: nodeId(), type: "separator" };
		const doc = documentNode([
			paragraphNode([textNode("Before")]),
			sep,
			paragraphNode([textNode("After")]),
		]);
		const config = makeConfig();

		// Each paragraph calls prepare() which resets callIndex,
		// so provide only 1 line per paragraph invocation = 1 text line each.
		const mockLines: MockLine[] = [
			{
				text: "Text",
				width: 50,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 4 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(1);
		// 2 text lines + 1 separator spacing line = 3
		expect(result.pages[0]?.lines).toHaveLength(3);

		// The separator line should have no runs (spacing-only)
		const separatorLine = result.pages[0]?.lines[1];
		expect(separatorLine).toBeDefined();
		if (separatorLine !== undefined) {
			expect(separatorLine.runs).toHaveLength(0);
		}
	});

	it("does not add separator spacing when at start of page", () => {
		// Separator is the first (and only) block — no existing lines,
		// so no spacing line is added.
		const sep: SeparatorNode = { id: nodeId(), type: "separator" };
		const doc = documentNode([sep]);
		const config = makeConfig();
		const layouter = createMockLayouterFromLines([]);

		const result = layoutDocument(doc, config, layouter);

		// No content lines → empty result
		expect(result.totalPages).toBe(0);
	});

	// --- Image layout (v1: skipped) ---

	it("skips image nodes in v1 (no lines produced)", () => {
		const image: ImageNode = {
			id: nodeId(),
			type: "image",
			src: "https://example.com/img.png",
			alt: "A picture",
		};
		const doc = documentNode([
			paragraphNode([textNode("Text before")]),
			image,
			paragraphNode([textNode("Text after")]),
		]);
		const config = makeConfig();

		// Each paragraph calls prepare() which resets callIndex,
		// so provide only 1 line per invocation = 1 text line each.
		const mockLines: MockLine[] = [
			{
				text: "Text",
				width: 60,
				start: { segmentIndex: 0, graphemeIndex: 0 },
				end: { segmentIndex: 0, graphemeIndex: 4 },
			},
		];
		const layouter = createMockLayouterFromLines(mockLines);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(1);
		// Only 2 lines — image is skipped
		expect(result.pages[0]?.lines).toHaveLength(2);
	});

	it("handles document with only an image (skipped) producing empty result", () => {
		const image: ImageNode = {
			id: nodeId(),
			type: "image",
			src: "https://example.com/img.png",
		};
		const doc = documentNode([image]);
		const config = makeConfig();
		const layouter = createMockLayouterFromLines([]);

		const result = layoutDocument(doc, config, layouter);

		expect(result.totalPages).toBe(0);
	});
});
