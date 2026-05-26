import type {
	AnalyzeRule,
	ContentRule,
	JsExecutor,
} from "@readerx/rule-engine";

type ExtractResult = {
	readonly content: string;
	readonly isHtml: boolean;
};

const HTML_TAG_PATTERN = /<[a-zA-Z][^>]*>/;
const MAX_CONTENT_PAGES = 50;

/**
 * Extract content from the source loaded into the analyzer,
 * applying the given ContentRule.
 *
 * For v1 this handles single-page extraction only.
 * Multi-page (nextContentUrl) support is deferred to a future iteration.
 */
async function extractContent(
	analyzer: AnalyzeRule,
	contentRule: ContentRule,
	jsExecutor?: JsExecutor,
): Promise<ExtractResult> {
	if (jsExecutor !== undefined) {
		analyzer.setJsExecutor(jsExecutor);
	}

	const result = await analyzer.getString(contentRule.content);

	if (!result.ok) {
		throw new Error(`Content extraction failed: ${result.error ?? "unknown"}`);
	}

	const content = result.value ?? "";
	const isHtml = HTML_TAG_PATTERN.test(content);

	return { content, isHtml };
}

export type { ExtractResult };
export { extractContent };
