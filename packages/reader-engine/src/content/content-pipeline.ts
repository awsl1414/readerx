import type { ContentRule, JsExecutor } from "@readerx/rule-engine";
import type {
	HttpFetcher,
	HttpFetcherOptions,
} from "../contracts/http-fetcher";
import type { Document } from "../document/nodes";
import type { ReplaceRule } from "./types";
import { AnalyzeRule } from "@readerx/rule-engine";
import { fetchRaw } from "./content-fetcher";
import { decodeBody } from "./charset-decoder";
import { extractContent } from "./content-extractor";
import { parseHtmlToDocument, parseTextToDocument } from "./document-parser";
import { ContentProcessor } from "./content-processor";

type PipelineDeps = {
	readonly httpFetcher: HttpFetcher;
	readonly jsExecutor?: JsExecutor;
};

type PipelineConfig = {
	readonly contentRule: ContentRule;
	readonly url: string;
	readonly urlOptions?: Record<string, string>;
	readonly replaceRules?: readonly ReplaceRule[];
};

/**
 * Fetch a URL, extract content via rule engine, parse into a Document AST,
 * and optionally apply replace rules.
 */
async function fetchAndParse(
	deps: PipelineDeps,
	config: PipelineConfig,
): Promise<Document> {
	// 1. Fetch raw bytes
	const { body, detectedCharset } = await fetchRaw(
		deps.httpFetcher,
		config.url,
	);

	// 2. Decode bytes to string
	const decoded = decodeBody(body, detectedCharset);

	// 3. Extract content using rule engine
	const analyzer = new AnalyzeRule();
	analyzer.setContent(decoded);
	const { content, isHtml } = await extractContent(
		analyzer,
		config.contentRule,
		deps.jsExecutor,
	);

	// 4. Parse into Document AST
	let title: string | undefined;
	if (config.contentRule.title) {
		const titleResult = await analyzer.getString(config.contentRule.title);
		title = titleResult.ok ? (titleResult.value ?? undefined) : undefined;
	}

	const doc = isHtml
		? parseHtmlToDocument(content, title)
		: parseTextToDocument(content, title);

	// 5. Apply replace rules if provided
	if (config.replaceRules !== undefined && config.replaceRules.length > 0) {
		const processor = new ContentProcessor();
		processor.setRules([...config.replaceRules]);
		return processor.process(doc);
	}

	return doc;
}

export type { PipelineConfig, PipelineDeps };
export { fetchAndParse };
