import type { ConversionResult } from "./types.js";
import type { ExtractStep, RuleStep, ScriptStep, StringTransformStep } from "../types.js";

// ── Unsupported Feature Detection ─────────────────────────────

const UNSUPPORTED_PATTERNS: readonly (readonly [RegExp, string])[] = [
	[/@put:\{/, "variable-system"],
	[/@get:\{/, "variable-system"],
	[/&&/, "merge-operator"],
	[/@js:/, "js-expression"],
] as const;

function detectUnsupported(expression: string): string[] | undefined {
	const features: string[] = [];
	for (const [pattern, feature] of UNSUPPORTED_PATTERNS) {
		if (pattern.test(expression)) {
			features.push(feature);
		}
	}
	return features.length > 0 ? features : undefined;
}

// ── Simple JSoup Parser ──────────────────────────────────────

const JSOUP_RE =
	/^(?:class|id|tag)\.([a-zA-Z0-9_-]+)(?:@(text|html|href|src|data-[a-zA-Z0-9_-]+))?$/;

type JsoupResult = {
	readonly selector: string;
	readonly output?: "text" | "html" | "attr";
	readonly attr?: string;
};

export function parseSimpleJsoup(input: string): JsoupResult | null {
	const match = JSOUP_RE.exec(input);
	if (!match) return null;

	const name = match[1] ?? "";
	const outputSuffix = match[2];

	// Determine selector from prefix
	const prefix = input.split(".")[0];
	let selector: string;
	if (prefix === "class") {
		selector = `.${name}`;
	} else if (prefix === "id") {
		selector = `#${name}`;
	} else {
		// tag
		selector = name;
	}

	if (!outputSuffix) {
		return { selector };
	}

	if (outputSuffix === "text" || outputSuffix === "html") {
		return { selector, output: outputSuffix };
	}

	// href, src, data-* → attr output
	return { selector, output: "attr", attr: outputSuffix };
}

// ── Engine Inference ──────────────────────────────────────────

type InferredEngine = {
	readonly engine: "css" | "xpath" | "jsonpath";
	readonly selector: string;
	readonly output?: "text" | "html" | "attr";
	readonly attr?: string;
} | null;

function inferEngine(expression: string): InferredEngine {
	// 1. @css: prefix
	if (expression.startsWith("@css:")) {
		return { engine: "css", selector: expression.slice(5) };
	}

	// 2. @xpath: prefix
	if (expression.startsWith("@xpath:")) {
		return { engine: "xpath", selector: expression.slice(7) };
	}

	// 3. @json: prefix
	if (expression.startsWith("@json:")) {
		return { engine: "jsonpath", selector: expression.slice(6) };
	}

	// 4. Starts with // or ./ → xpath
	if (expression.startsWith("//") || expression.startsWith("./")) {
		return { engine: "xpath", selector: expression };
	}

	// 5. Starts with $. → jsonpath
	if (expression.startsWith("$.")) {
		return { engine: "jsonpath", selector: expression };
	}

	// 6. Simple JSoup match → css (carry output/attr directly)
	const jsoup = parseSimpleJsoup(expression);
	if (jsoup) {
		return {
			engine: "css",
			selector: jsoup.selector,
			...(jsoup.output !== undefined ? { output: jsoup.output } : {}),
			...(jsoup.attr !== undefined ? { attr: jsoup.attr } : {}),
		};
	}

	// 7. Unknown
	return null;
}

// ── Legacy Script Wrapper ─────────────────────────────────────

export function wrapAsLegacyScript(expression: string): string {
	return `/* legado-legacy */ return (function() { /* original: ${expression.replace(/\*\//g, "*\\/")} */ throw new Error("Legado legacy rule not yet executable: upgrade or remove this rule"); })()`;
}

// ── Main Parser ───────────────────────────────────────────────

export function parseLegadoRule(expression: string): ConversionResult {
	// Handle empty string
	if (expression === "") {
		return { steps: [], unsupported: [] };
	}

	// Check for unsupported features first
	const unsupported = detectUnsupported(expression);
	if (unsupported) {
		return {
			unsupported,
			legacyScript: wrapAsLegacyScript(expression),
		};
	}

	// Split on ## for replacements
	const parts = expression.split("##");
	const mainExpr = parts[0] ?? "";
	const replacePatterns = parts.slice(1);

	// Infer engine from the main expression
	const inferred = inferEngine(mainExpr);

	if (!inferred) {
		return {
			unsupported: ["unknown-engine"],
			legacyScript: wrapAsLegacyScript(expression),
		};
	}

	const steps: RuleStep[] = [];

	// Build extract step directly from inferred engine result
	const extractStep: ExtractStep = {
		type: "extract",
		engine: inferred.engine,
		selector: inferred.selector,
		...(inferred.output !== undefined ? { output: inferred.output } : {}),
		...(inferred.attr !== undefined ? { attr: inferred.attr } : {}),
	};
	steps.push(extractStep);

	// Build transform steps for each ## replacement
	for (const pattern of replacePatterns) {
		const transform: StringTransformStep = {
			type: "transform",
			category: "string",
			action: "replace",
			pattern,
			with: "",
		};
		steps.push(transform);
	}

	return { steps, unsupported: [] };
}
