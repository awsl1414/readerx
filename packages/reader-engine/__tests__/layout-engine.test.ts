import { describe, expect, it } from "vitest";
import {
	type Document,
	documentNode,
	headingNode,
	paragraphNode,
	textNode,
} from "../src/document/nodes";
import type {
	LayoutCursor,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayoutOptions,
	TextLayouter,
} from "../src/contracts/text-layouter";
import { layoutDocument } from "../src/layout/layout-engine";
import type { LayoutConfig, LayoutResult } from "../src/layout/types";
import type { InlineNode } from "../src/document/nodes";

// --- Mock TextLayouter ---

type MockLine = {
	text: string;
	width: number;
	start: LayoutCursor;
	end: LayoutCursor;
};

function createMockLayouter(
	linesPerParagraph: number,
	lineWidth: number,
	lineCharsPerLine: number,
): TextLayouter {
	return {
		prepare(
			_text: string,
			_options: TextLayoutOptions,
		): TextLayoutHandle {
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

			const newGraphIdx = graphIdx + lineCharsPerLine;

			return {
				text: "x".repeat(lineCharsPerLine),
				width: lineWidth,
				start: { segmentIndex: segIdx, graphemeIndex: graphIdx },
				end: { segmentIndex: segIdx + 1, graphemeIndex: 0 },
			};
		},
	};
}

function createMockLayouterFromLines(
	mockLines: MockLine[],
): TextLayouter {
	let callIndex = 0;

	return {
		prepare(
			_text: string,
			_options: TextLayoutOptions,
		): TextLayoutHandle {
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
		const doc = documentNode([
			headingNode(1, [textNode("Title")]),
		]);
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
});