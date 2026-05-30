import { compileRule } from "./compile";
import { parseHTML } from "./dom-parse";
import { executeExtract } from "./extract";
import type { Result } from "./result";
import { err, ok } from "./result";
import { elementToText, serializeResult } from "./serialize";
import { applyDomTransform, applyStringTransform } from "./transform";
import type {
	CompiledExtractStep,
	CompiledRule,
	CompiledScriptStep,
	CompiledStep,
	CompiledTransformStep,
	EvalContext,
	JsEvalContext,
	Rule,
	RuntimeResult,
	RuntimeValue,
} from "./types";

/**
 * Full pipeline: compile + evaluate in one call (for one-shot execution).
 */
export async function evaluateRule(
	rule: Rule,
	content: string,
	ctx: EvalContext = {},
): Promise<Result<string[]>> {
	const compiled = compileRule(rule);
	if (!compiled.ok) return compiled;

	return evaluateCompiled(compiled.value, content, ctx);
}

/**
 * Evaluate a pre-compiled rule against content.
 * Returns serialized string results.
 */
export async function evaluateCompiled(
	compiled: CompiledRule,
	content: string,
	ctx: EvalContext = {},
): Promise<Result<string[]>> {
	// Parse initial content
	const initialResult = parseContent(content, ctx);
	if (!initialResult.ok) return initialResult;

	const { rootValue, dispose } = initialResult.value;

	// Run pipeline
	const finalResult = await runPipeline(compiled.steps, rootValue, ctx);

	dispose?.();

	if (!finalResult.ok) return finalResult;

	return ok(serializeResult(finalResult.value));
}

/**
 * Run the compiled step pipeline, threading RuntimeResult through each step.
 */
async function runPipeline(
	steps: readonly CompiledStep[],
	rootValue: RuntimeValue,
	ctx: EvalContext,
): Promise<Result<RuntimeResult>> {
	let current: RuntimeResult = [rootValue];

	let i = 0;
	for (const step of steps) {
		const result = await executeStep(step, current, rootValue, ctx, i);

		if (!result.ok) return result;
		current = result.value;

		// Short-circuit: empty result means nothing to process further
		if (current.length === 0) return ok([]);
		i++;
	}

	return ok(current);
}

async function executeStep(
	step: CompiledStep,
	current: RuntimeResult,
	rootValue: RuntimeValue,
	ctx: EvalContext,
	stepIndex: number,
): Promise<Result<RuntimeResult>> {
	switch (step.type) {
		case "extract":
			return executeExtract(
				step as CompiledExtractStep,
				current,
				rootValue,
				ctx,
			);

		case "transform":
			return executeTransform(step as CompiledTransformStep, current);

		case "script":
			return executeScript(step as CompiledScriptStep, current, ctx, stepIndex);
		default: {
			const _exhaustive: never = step;
			return err({
				code: "COMPILE_ERROR",
				message: `Unknown step type: ${String(_exhaustive)}`,
				step: stepIndex,
			});
		}
	}
}

function executeTransform(
	step: CompiledTransformStep,
	current: RuntimeResult,
): Result<RuntimeResult> {
	if (step.category === "string") {
		return applyStringTransform(step, current);
	}
	return applyDomTransform(step, current);
}

async function executeScript(
	step: CompiledScriptStep,
	current: RuntimeResult,
	ctx: EvalContext,
	stepIndex: number,
): Promise<Result<RuntimeResult>> {
	if (!ctx.allowScript) {
		return err({
			code: "SCRIPT_DISABLED",
			message: "Script execution is disabled (allowScript not set)",
			step: stepIndex,
			rule: step.code,
		});
	}

	if (!ctx.jsExecutor) {
		return err({
			code: "NO_JS_EXECUTOR",
			message: "No JsExecutor provided for script execution",
			step: stepIndex,
			rule: step.code,
		});
	}

	// Serialize input to string for JS context
	const resultString = current
		.map((v) => (typeof v === "string" ? v : elementToText(v)))
		.join("\n");

	try {
		const jsContext: Record<string, unknown> = { result: resultString };
		if (ctx.baseUrl !== undefined) jsContext.baseUrl = ctx.baseUrl;
		if (ctx.source !== undefined) jsContext.source = ctx.source;
		if (ctx.book !== undefined) jsContext.book = ctx.book;
		if (ctx.chapter !== undefined) jsContext.chapter = ctx.chapter;
		if (ctx.key !== undefined) jsContext.key = ctx.key;
		if (ctx.page !== undefined) jsContext.page = ctx.page;

		const jsResult = await ctx.jsExecutor.eval(
			step.code,
			jsContext as JsEvalContext,
		);

		if (!jsResult.success) {
			return err({
				code: "SCRIPT_ERROR",
				message: jsResult.error ?? "Script execution failed",
				step: stepIndex,
				rule: step.code,
			});
		}

		// Script returns a single value or array
		const value = jsResult.value;
		if (Array.isArray(value)) {
			return ok(value as RuntimeResult);
		}
		return ok([value as RuntimeValue]);
	} catch (e) {
		return err({
			code: "SCRIPT_ERROR",
			message: "Script execution threw an error",
			step: stepIndex,
			rule: step.code,
			cause: e,
		});
	}
}

/**
 * Parse raw content string into initial RuntimeValue.
 */
function parseContent(
	content: string,
	ctx: EvalContext,
): Result<{
	rootValue: RuntimeValue;
	dispose: (() => void) | undefined;
}> {
	const trimmed = content.trim();

	// Detect content type and parse accordingly
	if (trimmed.startsWith("<")) {
		// HTML/XML content → parse to Document
		const cache = ctx.documentCache;
		if (cache) {
			const doc = cache.getHTML(trimmed);
			return ok({ rootValue: doc, dispose: undefined });
		}
		const parsed = parseHTML(trimmed);
		return ok({ rootValue: parsed.document, dispose: parsed.dispose });
	}

	// Try JSON
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		try {
			const parsed: unknown = JSON.parse(trimmed);
			return ok({ rootValue: parsed, dispose: undefined });
		} catch {
			// Not valid JSON — treat as plain text
		}
	}

	// Plain text
	return ok({ rootValue: trimmed, dispose: undefined });
}
