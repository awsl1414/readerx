import type {
	ContentModule,
	EvalContext,
	JsExecutor,
	Rule,
} from "@readerx/rule-engine";
import { evaluateRule } from "@readerx/rule-engine";

type ExtractResult = {
	readonly content: string;
	readonly isHtml: boolean;
};

const HTML_TAG_PATTERN = /<[a-zA-Z][^>]*>/;

/**
 * Extract content from HTML/text source using a ContentModule's content rule.
 *
 * For v1 this handles single-page extraction only.
 * Multi-page (nextContentUrl) support is deferred to a future iteration.
 */
async function extractContent(
	source: string,
	contentModule: ContentModule,
	jsExecutor?: JsExecutor,
): Promise<ExtractResult> {
	// The content rule is in contentModule.rules?.text
	const contentRule: Rule | undefined = contentModule.rules?.text;

	if (!contentRule || contentRule.length === 0) {
		throw new Error("Content rule is empty or not defined");
	}

	const ctx: EvalContext = {
		allowScript: true,
		...(jsExecutor ? { jsExecutor } : {}),
	};

	const result = await evaluateRule(contentRule, source, ctx);

	if (!result.ok) {
		throw new Error(`Content extraction failed: ${result.error?.message ?? result.error?.code ?? "unknown"}`);
	}

	const content = result.value.join("\n");
	const isHtml = HTML_TAG_PATTERN.test(content);

	return { content, isHtml };
}

export type { ExtractResult };
export { extractContent };
