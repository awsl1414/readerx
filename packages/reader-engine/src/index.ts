// Document AST

export { decodeBody } from "./content/charset-decoder";
export type { ExtractResult } from "./content/content-extractor";
export { extractContent } from "./content/content-extractor";
export type { FetchResult } from "./content/content-fetcher";
export { fetchRaw } from "./content/content-fetcher";
export type { PipelineConfig, PipelineDeps } from "./content/content-pipeline";
export { fetchAndParse } from "./content/content-pipeline";
// Content
export { ContentProcessor } from "./content/content-processor";
export {
	parseHtmlToDocument,
	parseTextToDocument,
} from "./content/document-parser";
export type { ReplaceRule } from "./content/types";
// Contracts
export type {
	HttpFetcher,
	HttpFetcherOptions,
	HttpFetcherResponse,
} from "./contracts/http-fetcher";
export type {
	JsEvalContext,
	JsEvalResult,
	JsExecutor,
} from "./contracts/js-executor";
export type {
	LayoutCursor,
	TextLayouter,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayoutOptions,
} from "./contracts/text-layouter";
export type {
	BaseNode,
	BlockNode,
	BlockquoteNode,
	Document,
	DocumentMeta,
	EmphasisNode,
	HeadingNode,
	ImageInlineNode,
	ImageNode,
	InlineNode,
	LinkNode,
	ParagraphNode,
	SeparatorNode,
	StrongNode,
	TextNode,
} from "./document/nodes";
export {
	documentNode,
	headingNode,
	nodeId,
	paragraphNode,
	textNode,
} from "./document/nodes";
export type { InlineSegment } from "./layout/inline-flatten";
export { flattenInlines } from "./layout/inline-flatten";
export { layoutDocument } from "./layout/layout-engine";
export type { PaginationState } from "./layout/pagination";
export {
	addLine,
	createPaginationState,
	flushPage,
} from "./layout/pagination";
export { PretextLayouter } from "./layout/pretext-layouter";
export type { RunMapperResult } from "./layout/run-mapper";
export { mapLineToRuns } from "./layout/run-mapper";
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
// Renderer
export type {
	RenderLine,
	RenderPage,
	RenderResult,
	RenderRun,
} from "./renderer/render-model";
export { toRenderModel } from "./renderer/render-model";
// Cursors
export type { DocumentCursor, PageCursor } from "./shared/cursors";
