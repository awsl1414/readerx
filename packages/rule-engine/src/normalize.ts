import type { Result } from "./result";
import { err, ok } from "./result";
import type {
	ExtractStep,
	Rule,
	RuleObject,
	RuleStep,
	ScriptStep,
	StringTransformStep,
} from "./types";

/**
 * Accept RuleObject | RuleStep[] and always return RuleStep[].
 * RuleStep[] is passed through unchanged.
 */
export function toRule(rule: RuleObject | Rule): Result<Rule> {
	if (Array.isArray(rule)) {
		return ok(rule);
	}
	return normalizeRule(rule as RuleObject);
}

/**
 * Normalize a RuleObject (shorthand with css/xpath/jsonpath/regex/js fields)
 * into a canonical RuleStep[] pipeline.
 *
 * Order: extract → js script → template → transforms
 *
 * Note: `separator` and `reverse` from RuleObject are recognized but not yet
 * implemented in the pipeline. They will be added in a future iteration.
 */
export function normalizeRule(obj: RuleObject): Result<Rule> {
	const steps: RuleStep[] = [];

	// 1. Extract step from the first matching engine field
	const extractStep = buildExtractStep(obj);
	if (extractStep) {
		steps.push(extractStep);
	}

	// 2. JS script step (if present and no extract engine matched)
	if (obj.js && !extractStep) {
		steps.push({
			type: "script",
			code: obj.js,
		} satisfies ScriptStep);
	}

	// 3. Template step (if present and no extract engine or js)
	if (obj.template && !extractStep && !obj.js) {
		steps.push({
			type: "transform",
			category: "string",
			action: "template",
			template: obj.template,
		} satisfies StringTransformStep);
	}

	// 4. Append explicit transforms
	if (obj.transform) {
		for (const t of obj.transform) {
			steps.push(t);
		}
	}

	if (steps.length === 0) {
		return err({
			code: "TYPE_MISMATCH",
			message:
				"RuleObject has no extract engine (css/xpath/jsonpath/regex), js, or template",
		});
	}

	// TODO: Apply separator (multi-selector merge) and reverse (list reversal)
	// These are RuleObject-level modifiers that apply after the pipeline executes.
	// Implementation deferred to a future iteration.
	void obj.separator;
	void obj.reverse;

	return ok(steps as Rule);
}

function buildExtractStep(obj: RuleObject): ExtractStep | undefined {
	const engines: Array<{
		field: string | undefined;
		engine: ExtractStep["engine"];
		selector: string;
	}> = [];

	if (obj.css)
		engines.push({ field: obj.css, engine: "css", selector: obj.css });
	if (obj.xpath)
		engines.push({ field: obj.xpath, engine: "xpath", selector: obj.xpath });
	if (obj.jsonpath)
		engines.push({
			field: obj.jsonpath,
			engine: "jsonpath",
			selector: obj.jsonpath,
		});
	if (obj.regex)
		engines.push({ field: obj.regex, engine: "regex", selector: obj.regex });

	// Use the first defined engine
	for (const e of engines) {
		if (e.field) {
			const base = {
				type: "extract" as const,
				engine: e.engine,
				selector: e.selector,
			};
			return obj.attr ? { ...base, attr: obj.attr } : base;
		}
	}

	return undefined;
}
