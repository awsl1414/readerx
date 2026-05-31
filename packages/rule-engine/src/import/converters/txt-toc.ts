import type {
	ConversionResult,
	ImportedResult,
	LegadoTxtTocRule,
} from "../types";
import { createReport } from "../report";
import type { TxtTocRule, TxtTocRuleFile } from "../../types";

const SCHEMA_ID = "readerx/txt-toc-rule/v1";

/** Regex to match inline flags like (?mi) at the start of a pattern. */
const INLINE_FLAGS_RE = /^\(\?([gimsuy]+)\)/;

/** Default flags for TXT TOC regex patterns. */
const DEFAULT_FLAGS = "gm";

/**
 * Extract inline regex flags from a pattern string.
 * Returns [strippedPattern, mergedFlags].
 */
function extractInlineFlags(pattern: string): {
	readonly pattern: string;
	readonly flags: string;
} {
	const match = INLINE_FLAGS_RE.exec(pattern);
	if (!match) {
		return { pattern, flags: DEFAULT_FLAGS };
	}

	const inlineFlags = match[1] ?? "";
	const stripped = pattern.slice(match[0].length);

	// Merge inline flags with defaults, ensure 'g' is present, sort alphabetically
	const flagSet = new Set<string>([
		...DEFAULT_FLAGS.split(""),
		...inlineFlags.split(""),
	]);
	// Ensure 'g' is always present
	flagSet.add("g");

	const merged = [...flagSet].sort().join("");
	return { pattern: stripped, flags: merged };
}

/**
 * Convert a single Legado TXT TOC rule to ReaderX format.
 */
function convertRule(rule: LegadoTxtTocRule): {
	readonly converted: TxtTocRule;
	readonly result: ConversionResult;
} {
	const { pattern, flags } = extractInlineFlags(rule.rule ?? "");

	const converted: TxtTocRule = {
		name: rule.name ?? "",
		pattern,
		flags,
		enabled: rule.enable ?? true,
		...(rule.example != null ? { description: rule.example } : {}),
		...(rule.serialNumber != null ? { order: rule.serialNumber } : {}),
	};

	return {
		converted,
		result: {
			steps: [],
			unsupported: [],
		},
	};
}

/**
 * Convert an array of Legado TXT TOC rules to a ReaderX TxtTocRuleFile.
 *
 * This is a simple 1:1 field mapping converter — no ScriptStep needed.
 */
export function convertLegadoTxtTocRules(
	rules: readonly LegadoTxtTocRule[],
): ImportedResult<TxtTocRuleFile> {
	const conversionResults: ConversionResult[] = [];
	const convertedRules: TxtTocRule[] = [];

	for (const rule of rules) {
		const { converted, result } = convertRule(rule);
		convertedRules.push(converted);
		conversionResults.push(result);
	}

	return {
		data: {
			$schema: SCHEMA_ID,
			rules: convertedRules,
		},
		report: createReport(conversionResults),
		warnings: [],
	};
}
