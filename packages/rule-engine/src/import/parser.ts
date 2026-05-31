import type { ExtractStep, RuleStep, StringTransformStep } from "../types";
import type { ConversionResult } from "./types";

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

// ── JSoup Chain Parser ───────────────────────────────────────

type JsoupResult = {
	readonly selector: string;
	readonly output?: "text" | "html" | "attr";
	readonly attr?: string;
};

/**
 * Parse a single JSoup segment: `{type}.{name}[.{index}]`
 * Also handles bare CSS-like selectors without type prefix (e.g., `a[data-bid]`).
 * Returns null if the segment is not a valid selector segment.
 */
function parseJsoupSegment(segment: string): {
	selector: string;
	index: number | null;
} | null {
	// Match: type.name[.index]
	// type is class|id|tag
	// name can contain alphanumeric, hyphens, underscores, and CSS attribute selectors
	// index is an optional integer (can be negative)
	const match = /^(class|id|tag)\.([a-zA-Z0-9_\-[\]="':]+)(?:\.(-?\d+))?$/.exec(
		segment,
	);
	if (match) {
		const type = match[1] ?? "";
		const name = match[2] ?? "";
		const indexStr = match[3];

		if (!name) return null;

		let baseSelector: string;
		if (type === "class") {
			baseSelector = `.${name}`;
		} else if (type === "id") {
			baseSelector = `#${name}`;
		} else {
			// tag
			baseSelector = name;
		}

		const index = indexStr !== undefined ? Number.parseInt(indexStr, 10) : null;
		return { selector: baseSelector, index };
	}

	// Bare CSS-like selector: e.g., `a[data-bid]`, `div.className`
	// These don't have a type prefix and are used as-is
	// Must contain at least a letter, and may have attribute selectors or class combinations
	if (/^[a-zA-Z][a-zA-Z0-9]*(?:\[.*?\])?$/.test(segment)) {
		return { selector: segment, index: null };
	}

	return null;
}

/**
 * Resolve an output specifier string to output/attr fields.
 */
function resolveOutput(
	specifier: string,
): { output: "text" | "html" | "attr"; attr?: string } | null {
	if (specifier === "text" || specifier === "textNodes") {
		return { output: "text" };
	}
	if (specifier === "html" || specifier === "all") {
		return { output: "html" };
	}
	// href, src, data-* → attr output
	if (
		specifier === "href" ||
		specifier === "src" ||
		specifier.startsWith("data-")
	) {
		return { output: "attr", attr: specifier };
	}
	return null;
}

/**
 * Check for unsupported JSoup patterns that cannot be converted to CSS.
 * Returns a reason string if unsupported, or null if OK.
 */
function checkUnsupportedPattern(input: string): string | null {
	// children[N] — no CSS equivalent
	if (/@children\[/.test(input)) {
		return "jsoup-children-selector";
	}
	// Slice notation [N:M] on tag segments
	if (/\[\d+:-?\d+\]/.test(input) || /\[-?\d+:\d+\]/.test(input)) {
		return "jsoup-slice-notation";
	}
	return null;
}

/**
 * Apply nth-of-type index to a CSS selector.
 * If selector already has pseudo-class at the end, wrap appropriately.
 */
function applyIndex(selector: string, index: number | null): string {
	if (index === null) return selector;
	// nth-of-type is 1-based in CSS, JSoup uses 0-based
	// Negative index: -1 means last, -2 means second-to-last, etc.
	if (index < 0) {
		return `${selector}:nth-last-of-type(${Math.abs(index)})`;
	}
	return `${selector}:nth-of-type(${index + 1})`;
}

/**
 * Parse a full JSoup chain expression.
 *
 * Handles patterns like:
 * - `class.book-img-box.0@tag.img.0@src`
 * - `class.book-mid-info@tag.h4.0@tag.a.0@text`
 * - `id.content.0@html`
 * - `a[data-bid]@data-bid`
 * - `tag.body@all`
 * - `class.book-title` (simple, no chain)
 *
 * Returns null if the expression cannot be parsed as a JSoup chain.
 */
export function parseJsoupChain(input: string): JsoupResult | null {
	if (!input) return null;

	// Bare output specifiers like "text", "html", "href", "src", "all" are not
	// valid JSoup selectors on their own — they need a parent selector context.
	if (resolveOutput(input) !== null) return null;

	// Check for unsupported patterns first
	const unsupportedReason = checkUnsupportedPattern(input);
	if (unsupportedReason) return null;

	// Split on @ to get chain segments
	const segments = input.split("@");

	if (segments.length === 0) return null;

	// Determine if the last segment is an output specifier
	// It's an output specifier if it's a known output keyword AND
	// it's not parseable as a selector segment
	let outputSpec: string | null = null;
	let selectorSegments = segments;

	const lastSegment = segments[segments.length - 1] ?? "";
	const lastAsOutput = resolveOutput(lastSegment);
	const lastAsSelector = parseJsoupSegment(lastSegment);

	if (lastAsOutput !== null && lastAsSelector === null) {
		// Last segment is an output specifier, not a selector
		outputSpec = lastSegment;
		selectorSegments = segments.slice(0, -1);
	} else if (
		lastAsOutput !== null &&
		lastAsSelector !== null &&
		segments.length > 1
	) {
		// Ambiguous: could be output or selector. Check if the second-to-last
		// is a valid selector. If so, the last is likely an output specifier.
		const secondLast = segments[segments.length - 2] ?? "";
		const secondLastAsSelector = parseJsoupSegment(secondLast);
		if (secondLastAsSelector !== null) {
			// Second-to-last is a valid selector, so last is output
			outputSpec = lastSegment;
			selectorSegments = segments.slice(0, -1);
		}
		// Otherwise, treat last segment as a selector (no output specifier)
	}

	if (selectorSegments.length === 0) {
		// Only an output specifier with no selector — not valid as a JSoup chain
		return null;
	}

	// Parse each selector segment and build the CSS selector
	const cssParts: string[] = [];
	for (const seg of selectorSegments) {
		const parsed = parseJsoupSegment(seg);
		if (parsed === null) return null;

		const withIndex = applyIndex(parsed.selector, parsed.index);
		cssParts.push(withIndex);
	}

	// Join with descendant combinator (space)
	const cssSelector = cssParts.join(" ");

	// Resolve output
	if (outputSpec !== null) {
		const resolved = resolveOutput(outputSpec);
		if (resolved) {
			return {
				selector: cssSelector,
				output: resolved.output,
				...(resolved.attr !== undefined ? { attr: resolved.attr } : {}),
			};
		}
	}

	return { selector: cssSelector };
}

/**
 * Legacy simple JSoup parser — kept for backward compatibility.
 * Delegates to parseJsoupChain internally.
 */
export function parseSimpleJsoup(input: string): JsoupResult | null {
	return parseJsoupChain(input);
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

	// 6. JSoup chain match → css (carry output/attr directly)
	const jsoup = parseJsoupChain(expression);
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
