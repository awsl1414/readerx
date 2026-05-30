import { extractCss } from "./css";
import { parseHTML } from "./dom-parse";
import { extractJsonPath } from "./jsonpath";
import { extractRegex } from "./regex";
import type { Result } from "./result";
import { err, ok } from "./result";
import type {
	CompiledExtractStep,
	EvalContext,
	ExtractOutput,
	RuntimeResult,
	RuntimeValue,
} from "./types";
import { extractXPath } from "./xpath";

/**
 * Execute a CompiledExtractStep against the current pipeline values.
 *
 * scope="current": query from each input value (Element/Document), flatten
 * scope="root":    query from root document, ignore current input
 */
export function executeExtract(
	step: CompiledExtractStep,
	input: RuntimeResult,
	rootValue: RuntimeValue,
	ctx: EvalContext,
): Result<RuntimeResult> {
	const scope = step.scope ?? "current";

	if (scope === "root") {
		return extractFromRoot(step, rootValue, ctx);
	}

	// scope="current" — query from each input value
	return extractFromCurrent(step, input, ctx);
}

function extractFromRoot(
	step: CompiledExtractStep,
	rootValue: RuntimeValue,
	ctx: EvalContext,
): Result<RuntimeResult> {
	const result = runEngine(step, rootValue, ctx);
	return result;
}

function extractFromCurrent(
	step: CompiledExtractStep,
	input: RuntimeResult,
	ctx: EvalContext,
): Result<RuntimeResult> {
	// If no input, treat as empty result
	if (input.length === 0) {
		return ok([]);
	}

	const allResults: RuntimeValue[] = [];

	for (const value of input) {
		const result = runEngine(step, value, ctx);
		if (!result.ok) return result;
		allResults.push(...result.value);
	}

	return ok(allResults);
}

function runEngine(
	step: CompiledExtractStep,
	value: RuntimeValue,
	ctx: EvalContext,
): Result<RuntimeResult> {
	const options = step.output
		? { output: step.output as ExtractOutput, attr: step.attr }
		: undefined;

	switch (step.engine) {
		case "css":
			return runCss(step.selector, value, options, ctx);

		case "xpath":
			return runXPath(step.selector, value, options, ctx);

		case "jsonpath":
			return runJsonPath(step.selector, value);

		case "regex":
			return runRegex(step.selector, value);
	}
}

function runCss(
	selector: string,
	value: RuntimeValue,
	options: { output: ExtractOutput; attr?: string } | undefined,
	ctx: EvalContext,
): Result<RuntimeResult> {
	if (isDomNode(value)) {
		return extractCss(selector, value, options);
	}
	if (typeof value === "string") {
		const doc = resolveDocument(value, "html", ctx);
		return extractCss(selector, doc, options);
	}
	return err({
		code: "CONTENT_TYPE_MISMATCH",
		message: "CSS extraction requires HTML/XML content",
		rule: selector,
	});
}

function runXPath(
	expression: string,
	value: RuntimeValue,
	options: { output: ExtractOutput; attr?: string } | undefined,
	ctx: EvalContext,
): Result<RuntimeResult> {
	if (isDomNode(value)) {
		return extractXPath(expression, value, options);
	}
	if (typeof value === "string") {
		const doc = resolveDocument(value, "html", ctx);
		return extractXPath(expression, doc, options);
	}
	return err({
		code: "CONTENT_TYPE_MISMATCH",
		message: "XPath extraction requires HTML/XML content",
		rule: expression,
	});
}

function runJsonPath(path: string, value: RuntimeValue): Result<RuntimeResult> {
	if (typeof value === "object" && value !== null) {
		return extractJsonPath(path, value);
	}
	if (typeof value === "string") {
		try {
			const parsed: unknown = JSON.parse(value);
			return extractJsonPath(path, parsed);
		} catch (e) {
			return err({
				code: "JSONPATH_ERROR",
				message: "Failed to parse JSON for JSONPath extraction",
				rule: path,
				cause: e,
			});
		}
	}
	return err({
		code: "CONTENT_TYPE_MISMATCH",
		message: "JSONPath extraction requires JSON content",
		rule: path,
	});
}

function runRegex(pattern: string, value: RuntimeValue): Result<RuntimeResult> {
	const text = typeof value === "string" ? value : String(value ?? "");
	return extractRegex(pattern, text);
}

/**
 * Resolve a string to a Document, using DocumentCache if available.
 */
function resolveDocument(
	html: string,
	type: "html" | "xml",
	ctx: EvalContext,
): Document {
	const cache = ctx.documentCache;
	if (cache) {
		return type === "xml" ? cache.getXML(html) : cache.getHTML(html);
	}
	// No cache — parse fresh (caller owns disposal)
	const parsed = type === "xml" ? parseHTML(html) : parseHTML(html);
	return parsed.document;
}

function isDomNode(value: RuntimeValue): value is Element | Document {
	return (
		typeof value === "object" && value !== null && "querySelectorAll" in value
	);
}
