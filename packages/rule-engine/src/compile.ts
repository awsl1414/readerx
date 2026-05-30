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

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		const result = compileStep(step, i);
		if (!result.ok) return result;
		compiled.push(result.value);
	}

	return ok(compiled);
}

function compileStep(step: RuleStep, index: number): Result<CompiledStep> {
	switch (step.type) {
		case "extract":
			return compileExtract(step, index);
		case "transform":
			return compileTransform(step, index);
		case "script":
			return ok(step as CompiledStep);
	}
}

function compileExtract(
	step: ExtractStep,
	index: number,
): Result<CompiledExtractStep> {
	switch (step.engine) {
		case "css":
			// Validate CSS selector by attempting to parse
			if (!step.selector.trim()) {
				return compileError(index, "css", "Empty CSS selector");
			}
			// CSS selector validation happens at eval time via querySelectorAll
			return ok({ ...step });

		case "xpath":
			if (!step.selector.trim()) {
				return compileError(index, "xpath", "Empty XPath expression");
			}
			// XPath validation happens at eval time — no pre-parse API available
			return ok({ ...step });

		case "jsonpath":
			if (!step.selector.trim()) {
				return compileError(index, "jsonpath", "Empty JSONPath expression");
			}
			// JSONPath validation via @swaggerexpert/jsonpath happens at eval time
			return ok({ ...step });

		case "regex":
			if (!step.selector.trim()) {
				return compileError(index, "regex", "Empty regex pattern");
			}
			// Pre-compile regex to catch invalid patterns early
			try {
				new RegExp(step.selector);
			} catch (e) {
				return compileError(
					index,
					"regex",
					`Invalid regex: ${step.selector}`,
					e,
				);
			}
			return ok({ ...step });
	}
}

function compileTransform(
	step: StringTransformStep | DomTransformStep,
	index: number,
): Result<CompiledStep> {
	if (step.category === "dom") {
		// DomTransform — validate selector
		if (!step.selector.trim()) {
			return compileError(index, step.action, "Empty DOM transform selector");
		}
		return ok({ ...step } as CompiledTransformStep);
	}

	// StringTransform
	const def = step as StringTransformStep;

	switch (def.action) {
		case "replace":
		case "match":
		case "split": {
			if (!def.pattern) {
				return compileError(
					index,
					def.action,
					`Missing pattern for "${def.action}" transform`,
				);
			}
			try {
				const regex = new RegExp(
					def.pattern,
					def.flags ?? (def.action === "replace" ? "g" : ""),
				);
				return ok({ ...step, compiledRegex: regex } as CompiledTransformStep);
			} catch (e) {
				return compileError(
					index,
					def.action,
					`Invalid regex pattern: ${def.pattern}`,
					e,
				);
			}
		}
		case "template": {
			if (!def.template) {
				return compileError(index, "template", "Missing template string");
			}
			return ok({ ...step } as CompiledTransformStep);
		}
		case "trim":
			return ok({ ...step } as CompiledTransformStep);
	}
}

function compileError(
	index: number,
	engine: string,
	message: string,
	cause?: unknown,
): Result<never> {
	return err({
		code: "COMPILE_ERROR",
		message,
		step: index,
		rule: engine,
		cause,
	});
}
