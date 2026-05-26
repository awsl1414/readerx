import type {
	InlineStyle,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "../layout/types";

/**
 * A single run of styled text positioned on the page.
 */
type RenderRun = {
	readonly text: string;
	readonly x: number;
	readonly width: number;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

/**
 * A horizontal line of runs positioned on the page.
 */
type RenderLine = {
	readonly runs: readonly RenderRun[];
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

/**
 * A single page of rendered content.
 */
type RenderPage = {
	readonly index: number;
	readonly lines: readonly RenderLine[];
	readonly dimensions: PageDimensions;
};

/**
 * The complete render output — ready to be consumed by the UI layer.
 */
type RenderResult = {
	readonly pages: readonly RenderPage[];
	readonly totalPages: number;
};

/**
 * Convert a LayoutResult into a render-friendly model.
 * This is a 1:1 structural mapping — no re-layout occurs.
 */
function toRenderModel(layout: LayoutResult): RenderResult {
	const pages = layout.pages.map((page: LayoutPage): RenderPage => ({
		index: page.index,
		lines: page.lines.map((line: LayoutLine): RenderLine => ({
			runs: line.runs.map((run: LayoutRun): RenderRun => ({
				text: run.text,
				x: run.x,
				width: run.width,
				style: run.style,
				sourceNodeId: run.sourceNodeId,
			})),
			x: line.x,
			y: line.y,
			width: line.width,
			height: line.height,
		})),
		dimensions: page.dimensions,
	}));

	return {
		pages,
		totalPages: layout.totalPages,
	};
}

export type { RenderLine, RenderPage, RenderResult, RenderRun };
export { toRenderModel };
