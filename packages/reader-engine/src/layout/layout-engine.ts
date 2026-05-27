import type {
	TextLayouter,
	TextLayoutLine,
	TextLayoutOptions,
} from "../contracts/text-layouter";
import type {
	BlockNode,
	BlockquoteNode,
	Document,
	HeadingNode,
	ParagraphNode,
} from "../document/nodes";
import type { InlineSegment } from "./inline-flatten";
import { flattenInlines } from "./inline-flatten";
import { addLine, createPaginationState, flushPage } from "./pagination";
import { mapLineToRuns } from "./run-mapper";
import type {
	LayoutConfig,
	LayoutLine,
	LayoutResult,
	PageDimensions,
} from "./types";

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

	function addLayoutLine(line: LayoutLine): void {
		state = addLine(state, line, maxContentHeight);
	}

	function processInlines(inlines: readonly InlineSegment[]): void {
		if (inlines.length === 0) return;

		const fullText = inlines.map((s) => s.text).join("");
		if (fullText.length === 0) return;

		const options: TextLayoutOptions = {
			font: config.font,
			...(config.letterSpacing !== undefined
				? { letterSpacing: config.letterSpacing }
				: {}),
		};

		const handle = layouter.prepare(fullText, options);
		let cursor: {
			readonly segmentIndex: number;
			readonly graphemeIndex: number;
		} | null = null;

		while (true) {
			const textLine: TextLayoutLine | null = layouter.layoutNextLine(
				handle,
				cursor,
				maxContentWidth,
			);
			if (textLine === null) break;

			const runs = mapLineToRuns(textLine, inlines);
			const currentLineCount = state.currentPageLines.length;
			const yOffset = config.paddingTop + currentLineCount * config.lineHeight;

			const layoutLine: LayoutLine = {
				runs,
				width: textLine.width,
				height: config.lineHeight,
				x: config.paddingLeft,
				y: yOffset,
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
				// Add spacing as a zero-run line tracked in pagination state
				if (state.currentPageLines.length > 0) {
					const currentLineCount = state.currentPageLines.length;
					const spacingLine: LayoutLine = {
						runs: [],
						width: maxContentWidth,
						height: config.lineHeight,
						x: config.paddingLeft,
						y: config.paddingTop + currentLineCount * config.lineHeight,
					};
					addLayoutLine(spacingLine);
				}
				break;
			}
			case "image": {
				// v1: skip images
				break;
			}
			default: {
				const _exhaustive: never = block;
				break;
			}
		}
	}

	for (const block of doc.children) {
		processBlock(block);
	}

	state = flushPage(state);

	if (state.pages.length === 0) {
		return { pages: [], totalPages: 0 };
	}

	const pages = state.pages.map((page, index) => ({
		...page,
		index,
		dimensions,
	}));

	return { pages, totalPages: pages.length };
}

export { layoutDocument };
