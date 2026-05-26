// Document AST
export type {
	Document,
	DocumentMeta,
	BlockNode,
	BlockquoteNode,
	HeadingNode,
	ImageNode,
	InlineNode,
	EmphasisNode,
	ImageInlineNode,
	LinkNode,
	ParagraphNode,
	SeparatorNode,
	StrongNode,
	TextNode,
	BaseNode,
} from "./document/nodes";
export {
	documentNode,
	headingNode,
	nodeId,
	paragraphNode,
	textNode,
} from "./document/nodes";

// Cursors
export type { DocumentCursor, PageCursor } from "./shared/cursors";

// Contracts
export type {
	HttpFetcher,
	HttpFetcherOptions,
	HttpFetcherResponse,
} from "./contracts/http-fetcher";
export type {
	JsExecutor,
	JsEvalContext,
	JsEvalResult,
} from "./contracts/js-executor";
export type {
	LayoutCursor,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayouter,
	TextLayoutOptions,
} from "./contracts/text-layouter";

// Content
export { ContentProcessor } from "./content/content-processor";
export type { ReplaceRule } from "./content/types";
export {
	parseHtmlToDocument,
	parseTextToDocument,
} from "./content/document-parser";
export { decodeBody } from "./content/charset-decoder";
export { fetchRaw } from "./content/content-fetcher";
export type { FetchResult } from "./content/content-fetcher";
export { extractContent } from "./content/content-extractor";
export type { ExtractResult } from "./content/content-extractor";
export { fetchAndParse } from "./content/content-pipeline";
export type { PipelineDeps, PipelineConfig } from "./content/content-pipeline";

// Layout
export type {
	InlineStyle,
	LayoutConfig,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "./layout/types";
export { layoutDocument } from "./layout/layout-engine";
export { PretextLayouter } from "./layout/pretext-layouter";
export { flattenInlines } from "./layout/inline-flatten";
export type { InlineSegment } from "./layout/inline-flatten";
export { mapLineToRuns } from "./layout/run-mapper";
export type { RunMapperResult } from "./layout/run-mapper";
export {
	createPaginationState,
	addLine,
	flushPage,
} from "./layout/pagination";
export type { PaginationState } from "./layout/pagination";

// Renderer
export type {
	RenderLine,
	RenderPage,
	RenderResult,
	RenderRun,
} from "./renderer/render-model";
export { toRenderModel } from "./renderer/render-model";
