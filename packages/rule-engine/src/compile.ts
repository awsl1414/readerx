import type { Result } from "./result";
import { err, ok } from "./result";
import type {
	CompiledExtractStep,
	CompiledRule,
	CompiledStep,
	CompiledTransformStep,
	DomTransformStep,
	ExtractStep,
	Rule,
	RuleStep,
	StringTransformStep,
} from "./types";

/**
 * Compile a Rule into a CompiledRule with pre-validated/pre-compiled artifacts.
 * Strict: invalid selectors/expressions/patterns cause compile errors.
 */
export function compileRule(rule: Rule): Result<CompiledRule> {
	const result = compileSteps(rule);
	if (!result.ok) return result;
	return ok({ steps: result.value });
}

/**
 * Compile individual steps.
 */
export function compileSteps(
	steps: readonly RuleStep[],
): Result<readonly CompiledStep[]> {
	const compiled: CompiledStep[] = [];

	for (const step of steps) {
		const result = compileStep(step);
		if (!result.ok) return result;
		compiled.push(result.value);
	}

	return ok(compiled);
}

function compileStep(step: RuleStep): Result<CompiledStep> {
	switch (step.type) {
		case "extract":
			return compileExtract(step);
		case "transform":
			return compileTransform(step);
		case "script":
			return ok(step as CompiledStep);
		default: {
			const _exhaustive: never = step;
			return compileError(
				"unknown",
				`Unknown step type: ${String(_exhaustive)}`,
			);
		}
	}
}

function compileExtract(step: ExtractStep): Result<CompiledExtractStep> {
	switch (step.engine) {
		case "css":
			if (!step.selector.trim()) {
				return compileError("css", "Empty CSS selector");
			}
			return ok({ ...step });

		case "xpath":
			if (!step.selector.trim()) {
				return compileError("xpath", "Empty XPath expression");
			}
			return ok({ ...step });

		case "jsonpath":
			if (!step.selector.trim()) {
				return compileError("jsonpath", "Empty JSONPath expression");
			}
			return ok({ ...step });

		case "regex":
			if (!step.selector.trim()) {
				return compileError("regex", "Empty regex pattern");
			}
			try {
				new RegExp(step.selector);
			} catch (e) {
				return compileError("regex", `Invalid regex: ${step.selector}`, e);
			}
			return ok({ ...step });
	}
}

function compileTransform(
	step: StringTransformStep | DomTransformStep,
): Result<CompiledStep> {
	if (step.category === "dom") {
		if (!step.selector.trim()) {
			return compileError(step.action, "Empty DOM transform selector");
		}
		return ok({ ...step } as CompiledTransformStep);
	}

	const def = step as StringTransformStep;

	switch (def.action) {
		case "replace":
		case "match":
		case "split": {
			if (!def.pattern) {
				return compileError(
					def.action,
					`Missing pattern for "${def.action}" transform`,
				);
			}
			try {
				const regex = new RegExp(
					def.pattern,
					def.flags ?? (def.action === "replace" ? "g" : ""),
				);
				return ok({
					...step,
					compiledRegex: regex,
				} as CompiledTransformStep);
			} catch (e) {
				return compileError(
					def.action,
					`Invalid regex pattern: ${def.pattern}`,
					e,
				);
			}
		}
		case "template": {
			if (!def.template) {
				return compileError("template", "Missing template string");
			}
			return ok({ ...step } as CompiledTransformStep);
		}
		case "trim":
			return ok({ ...step } as CompiledTransformStep);
	}
}

function compileError(
	engine: string,
	message: string,
	cause?: unknown,
): Result<never> {
	return err({
		code: "COMPILE_ERROR",
		message,
		rule: engine,
		cause,
	});
}
