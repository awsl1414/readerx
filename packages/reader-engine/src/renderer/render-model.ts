import type {
	InlineStyle,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "../layout/types";

type RenderRun = {
	readonly text: string;
	readonly x: number;
	readonly width: number;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

type RenderLine = {
	readonly runs: readonly RenderRun[];
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

type RenderPage = {
	readonly index: number;
	readonly lines: readonly RenderLine[];
	readonly dimensions: PageDimensions;
};

type RenderResult = {
	readonly pages: readonly RenderPage[];
	readonly totalPages: number;
};

function toRenderModel(layout: LayoutResult): RenderResult {
	const pages = layout.pages.map(
		(page: LayoutPage): RenderPage => ({
			index: page.index,
			lines: page.lines.map(
				(line: LayoutLine): RenderLine => ({
					runs: line.runs.map(
						(run: LayoutRun): RenderRun => ({
							text: run.text,
							x: run.x,
							width: run.width,
							sourceNodeId: run.sourceNodeId,
							...(run.style !== undefined ? { style: run.style } : {}),
						}),
					),
					x: line.x,
					y: line.y,
					width: line.width,
					height: line.height,
				}),
			),
			dimensions: page.dimensions,
		}),
	);

	return {
		pages,
		totalPages: layout.totalPages,
	};
}

export type { RenderLine, RenderPage, RenderResult, RenderRun };
export { toRenderModel };
