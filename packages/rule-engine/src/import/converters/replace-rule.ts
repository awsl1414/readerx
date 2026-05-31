import type {
	ConversionResult,
	ImportError,
	ImportedResult,
	LegadoReplaceRule,
} from "../types";
import { createReport } from "../report";
import type { ReplaceRule, ReplaceRuleFile, ReplaceScope } from "../../types";

const SCHEMA_ID = "readerx/replace-rule/v1";

/**
 * Split a comma-separated scope string into a trimmed, non-empty array.
 * Returns `undefined` if the result would be empty.
 */
function splitScope(scope: string | undefined): readonly string[] | undefined {
	if (!scope) return undefined;
	const items = scope
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	return items.length > 0 ? items : undefined;
}

/**
 * Infer the target field from scopeTitle / scopeContent booleans.
 * - both true  → "both"
 * - title only → "title"
 * - otherwise  → "content"
 */
function inferTarget(
	scopeTitle: boolean | undefined,
	scopeContent: boolean | undefined,
): "content" | "title" | "both" {
	if (scopeTitle && scopeContent) return "both";
	if (scopeTitle) return "title";
	return "content";
}

/**
 * Convert a single Legado replace rule to a ReaderX ReplaceRule.
 * Returns the converted rule and any warnings generated during conversion.
 */
function convertOne(
	legado: LegadoReplaceRule,
	index: number,
): { rule: ReplaceRule; warnings: ImportError[] } {
	const warnings: ImportError[] = [];

	// --- timeoutMillisecond → warning ---
	if (legado.timeoutMillisecond != null) {
		warnings.push({
			kind: "unsupported_feature",
			message: `Rule at index ${index}: timeoutMillisecond is not supported in ReaderX`,
			original: legado.timeoutMillisecond,
		});
	}

	// --- tags from group ---
	const tags = legado.group ? [legado.group] : undefined;

	// --- literal flag (only when isRegex is explicitly false) ---
	const literal = legado.isRegex === false ? true : undefined;

	// --- replacement vs replacementJs ---
	let replacement: string | undefined;
	let replacementJs: string | undefined;
	if (legado.replacement != null) {
		if (legado.replacement.startsWith("@js:")) {
			replacementJs = legado.replacement.slice(4);
		} else {
			replacement = legado.replacement;
		}
	}

	// --- scope ---
	const include = splitScope(legado.scope);
	const exclude = splitScope(legado.excludeScope);
	const target = inferTarget(legado.scopeTitle, legado.scopeContent);

	const scope: ReplaceScope = {
		...(include ? { include } : {}),
		...(exclude ? { exclude } : {}),
		...(target !== "content" ? { target } : {}),
	};

	const rule: ReplaceRule = {
		name: legado.name ?? "Unnamed Replace Rule",
		...(tags ? { tags } : {}),
		enabled: legado.isEnabled ?? true,
		...(legado.sortOrder != null ? { order: legado.sortOrder } : {}),
		scope,
		pattern: legado.pattern ?? "",
		...(literal != null ? { literal } : {}),
		...(replacement != null ? { replacement } : {}),
		...(replacementJs != null ? { replacementJs } : {}),
	};

	return { rule, warnings };
}

/**
 * Convert an array of Legado replace rules to a ReaderX ReplaceRuleFile.
 */
export function convertLegadoReplaceRules(
	rules: readonly LegadoReplaceRule[],
): ImportedResult<ReplaceRuleFile> {
	const allWarnings: ImportError[] = [];
	const convertedRules: ReplaceRule[] = [];
	const conversionResults: ConversionResult[] = [];

	for (let i = 0; i < rules.length; i++) {
		const legado = rules[i];
		if (!legado) continue;
		const { rule, warnings } = convertOne(legado, i);
		convertedRules.push(rule);
		allWarnings.push(...warnings);
		// Successful conversions use unsupported: [] so they count as converted,
		// not partial. Warnings live only in the warnings array.
		conversionResults.push({
			steps: [],
			unsupported: [],
		});
	}

	const data: ReplaceRuleFile = {
		$schema: SCHEMA_ID,
		rules: convertedRules,
	};

	return {
		data,
		report: createReport(conversionResults),
		warnings: allWarnings,
	};
}
