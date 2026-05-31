import type {
	ContentModule,
	EvalContext,
	JsExecutor,
	Rule,
} from "@readerx/rule-engine";
import { evaluateRule } from "@readerx/rule-engine";
import type { HttpFetcher } from "../contracts/http-fetcher";
import type { Document } from "../document/nodes";
import { decodeBody } from "./charset-decoder";
import { extractContent } from "./content-extractor";
import { fetchRaw } from "./content-fetcher";
import { ContentProcessor } from "./content-processor";
import { parseHtmlToDocument, parseTextToDocument } from "./document-parser";
import type { ReplaceRule } from "./types";

type PipelineDeps = {
	readonly httpFetcher: HttpFetcher;
	readonly jsExecutor?: JsExecutor;
};

type PipelineConfig = {
	readonly contentModule: ContentModule;
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
	const { content, isHtml } = await extractContent(
		decoded,
		config.contentModule,
		deps.jsExecutor,
	);

	// 4. Extract title if rule is defined
	let title: string | undefined;
	const titleRule: Rule | undefined = config.contentModule.rules?.title;
	if (titleRule && titleRule.length > 0) {
		const titleCtx: EvalContext = {
			allowScript: true,
			...(deps.jsExecutor ? { jsExecutor: deps.jsExecutor } : {}),
		};
		const titleResult = await evaluateRule(titleRule, decoded, titleCtx);
		title = titleResult.ok ? (titleResult.value[0] ?? undefined) : undefined;
	}

	// 5. Parse into Document AST
	const doc = isHtml
		? parseHtmlToDocument(content, title)
		: parseTextToDocument(content, title);

	// 6. Apply replace rules if provided
	if (config.replaceRules !== undefined && config.replaceRules.length > 0) {
		const processor = new ContentProcessor();
		processor.setRules([...config.replaceRules]);
		return processor.process(doc);
	}

	return doc;
}

export type { PipelineConfig, PipelineDeps };
export { fetchAndParse };
