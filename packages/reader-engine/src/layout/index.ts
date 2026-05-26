export type {
	InlineStyle,
	LayoutConfig,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "./types";

export type { InlineSegment } from "./inline-flatten";
export { flattenInlines } from "./inline-flatten";

export type { RunMapperResult } from "./run-mapper";
export { mapLineToRuns } from "./run-mapper";

export type { PaginationState } from "./pagination";
export { addLine, createPaginationState, flushPage } from "./pagination";

export { PretextLayouter } from "./pretext-layouter";

export { layoutDocument } from "./layout-engine";
