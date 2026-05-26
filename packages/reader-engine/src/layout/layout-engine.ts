import type {
	BlockNode,
	BlockquoteNode,
	Document,
	HeadingNode,
	ParagraphNode,
} from "../document/nodes";
import type { TextLayouter, TextLayoutLine } from "../contracts/text-layouter";
import type {
	LayoutConfig,
	LayoutLine,
	LayoutResult,
	PageDimensions,
} from "./types";
import { flattenInlines } from "./inline-flatten";
import type { InlineSegment } from "./inline-flatten";
import { mapLineToRuns } from "./run-mapper";
import { addLine, createPaginationState, flushPage } from "./pagination";
import type { TextLayoutOptions } from "../contracts/text-layouter";

const CONTENT_WIDTH_FACTOR = 1;

function layoutDocument(
	doc: Document,
	config: LayoutConfig,
	layouter: TextLayouter,
): LayoutResult {
	const dimensions: PageDimensions = {
		width: config.pageWidth,
		height: config.pageHeight,
		contentHeight: config.pageHeight - config.paddingTop - config.paddingBottom,
		paddingTop: config.paddingTop,
		paddingBottom: config.paddingBottom,
		paddingLeft: config.paddingLeft,
		paddingRight: config.paddingRight,
	};

	const maxContentWidth =
		config.pageWidth - config.paddingLeft - config.paddingRight;
	const maxContentHeight = dimensions.contentHeight;

	let state = createPaginationState();
	let yOffset = 0;

	function flushCurrentPage(): void {
		if (state.currentPageLines.length > 0) {
			state = flushPage(state);
			yOffset = 0;
		}
	}

	function addLayoutLine(line: LayoutLine): void {
		const newHeight = yOffset + line.height;

		if (newHeight > maxContentHeight && state.currentPageLines.length > 0) {
			flushCurrentPage();
		}

		state = addLine(state, line, maxContentHeight);
		yOffset = state.currentHeight;
	}

	function processInlines(inlines: readonly InlineSegment[]): void {
		if (inlines.length === 0) return;

		// Join all segment texts for preparation
		const fullText = joinSegments(inlines);

		const options: TextLayoutOptions = {
			font: config.font,
		};
		if (config.letterSpacing !== undefined) {
			(options as { letterSpacing: number }).letterSpacing =
				config.letterSpacing;
		}

		const handle = layouter.prepare(fullText, options);

		let cursor: {
			readonly segmentIndex: number;
			readonly graphemeIndex: number;
		} | null = null;

		while (true) {
			const textLine: TextLayoutLine | null = layouter.layoutNextLine(
				handle,
				cursor,
				maxContentWidth * CONTENT_WIDTH_FACTOR,
			);

			if (textLine === null) break;

			const runs = mapLineToRuns(textLine, inlines);

			const layoutLine: LayoutLine = {
				runs,
				width: textLine.width,
				height: config.lineHeight,
				x: config.paddingLeft,
				y: config.paddingTop + yOffset,
			};

			addLayoutLine(layoutLine);

			cursor = {
				segmentIndex: textLine.end.segmentIndex,
				graphemeIndex: textLine.end.graphemeIndex,
			};
		}
	}

	function processBlock(block: BlockNode): void {
		switch (block.type) {
			case "paragraph":
			case "heading": {
				const inlineBlock = block as ParagraphNode | HeadingNode;
				const segments = flattenInlines(inlineBlock.children);
				if (segments.length === 0) break;

				processInlines(segments);
				break;
			}
			case "blockquote": {
				const bq = block as BlockquoteNode;
				for (const child of bq.children) {
					processBlock(child);
				}
				break;
			}
			case "separator": {
				// v1: skip separators, just add a line of spacing
				if (state.currentPageLines.length > 0) {
					yOffset += config.lineHeight;
					if (yOffset > maxContentHeight) {
						flushCurrentPage();
					}
				}
				break;
			}
			case "image": {
				// v1: skip images
				break;
			}
		}
	}

	// Process all blocks in the document
	for (const block of doc.children) {
		processBlock(block);
	}

	// Final flush for remaining lines
	state = flushPage(state);

	// Re-index pages with correct dimensions
	const pages = state.pages.map((page, index) => ({
		...page,
		index,
		dimensions: dimensions,
	}));

	return {
		pages,
		totalPages: pages.length,
	};
}

function joinSegments(segments: readonly InlineSegment[]): string {
	let result = "";
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (segment !== undefined) {
			result += segment.text;
		}
	}
	return result;
}

export { layoutDocument };
