// ── Import module public API ──────────────────────────────
//
// Re-exports types, provides ReaderX native import wrappers,
// Legado legacy import functions, and format detection.

// ── Type re-exports ───────────────────────────────────────
export type {
	ConversionReport,
	ConversionResult,
	ImportError,
	ImportedResult,
	ImportOptions,
	LegadoBookSource,
	LegadoDictRule,
	LegadoReplaceRule,
	LegadoTxtTocRule,
	RuleFormatKind,
} from "./types";

// ── ReaderX native imports ────────────────────────────────

import type { Result } from "../result";
import {
	parseBookSource,
	parseDictRuleFile,
	parseReplaceRuleFile,
	parseTxtTocRuleFile,
} from "../schemas";
import type {
	BookSource,
	DictRuleFile,
	ReplaceRuleFile,
	TxtTocRuleFile,
} from "../types";
import type { ImportError as ImportErrorT } from "./types";

/**
 * Import a ReaderX-format BookSource from unknown data.
 *
 * Wraps `parseBookSource` in try/catch; returns `Result` instead of throwing.
 */
export function importBookSource(
	data: unknown,
): Result<BookSource, ImportErrorT> {
	try {
		const value = parseBookSource(data);
		return { ok: true, value: value as unknown as BookSource };
	} catch (e: unknown) {
		const message =
			e instanceof Error ? e.message : "Failed to parse book source";
		return {
			ok: false,
			error: { kind: "parse_error", message },
		};
	}
}

/**
 * Import a ReaderX-format DictRuleFile from unknown data.
 */
export function importDictRuleFile(
	data: unknown,
): Result<DictRuleFile, ImportErrorT> {
	try {
		const value = parseDictRuleFile(data);
		return { ok: true, value: value as unknown as DictRuleFile };
	} catch (e: unknown) {
		const message =
			e instanceof Error ? e.message : "Failed to parse dict rule file";
		return {
			ok: false,
			error: { kind: "parse_error", message },
		};
	}
}

/**
 * Import a ReaderX-format ReplaceRuleFile from unknown data.
 */
export function importReplaceRuleFile(
	data: unknown,
): Result<ReplaceRuleFile, ImportErrorT> {
	try {
		const value = parseReplaceRuleFile(data);
		return { ok: true, value: value as unknown as ReplaceRuleFile };
	} catch (e: unknown) {
		const message =
			e instanceof Error ? e.message : "Failed to parse replace rule file";
		return {
			ok: false,
			error: { kind: "parse_error", message },
		};
	}
}

/**
 * Import a ReaderX-format TxtTocRuleFile from unknown data.
 */
export function importTxtTocRuleFile(
	data: unknown,
): Result<TxtTocRuleFile, ImportErrorT> {
	try {
		const value = parseTxtTocRuleFile(data);
		return { ok: true, value: value as unknown as TxtTocRuleFile };
	} catch (e: unknown) {
		const message =
			e instanceof Error ? e.message : "Failed to parse txt toc rule file";
		return {
			ok: false,
			error: { kind: "parse_error", message },
		};
	}
}

// ── Legado legacy imports ─────────────────────────────────

import { convertLegadoBookSources } from "./converters/book-source";
import { convertLegadoDictRules } from "./converters/dict-rule";
import { convertLegadoReplaceRules } from "./converters/replace-rule";
import { convertLegadoTxtTocRules } from "./converters/txt-toc";
import { createReport } from "./report";
import type {
	ImportedResult as ImportedResultT,
	RuleFormatKind as RuleFormatKindT,
} from "./types";

/**
 * Import an array of Legado-format BookSources.
 *
 * @deprecated Prefer ReaderX native format.
 */
export function importLegadoBookSources(
	data: unknown,
): ImportedResultT<BookSource[]> {
	if (!Array.isArray(data)) {
		return {
			data: [],
			report: createReport([]),
			warnings: [
				{
					kind: "convert_error",
					message: "Expected an array of Legado book sources",
				},
			],
		};
	}
	return convertLegadoBookSources(data);
}

/**
 * Import an array of Legado-format DictRules.
 *
 * @deprecated Prefer ReaderX native format.
 */
export function importLegadoDictRules(
	data: unknown,
): ImportedResultT<DictRuleFile> {
	if (!Array.isArray(data)) {
		return {
			data: { $schema: "readerx/dict-rule/v1", rules: [] },
			report: createReport([]),
			warnings: [
				{
					kind: "convert_error",
					message: "Expected an array of Legado dict rules",
				},
			],
		};
	}
	return convertLegadoDictRules(data);
}

/**
 * Import an array of Legado-format ReplaceRules.
 *
 * @deprecated Prefer ReaderX native format.
 */
export function importLegadoReplaceRules(
	data: unknown,
): ImportedResultT<ReplaceRuleFile> {
	if (!Array.isArray(data)) {
		return {
			data: { $schema: "readerx/replace-rule/v1", rules: [] },
			report: createReport([]),
			warnings: [
				{
					kind: "convert_error",
					message: "Expected an array of Legado replace rules",
				},
			],
		};
	}
	return convertLegadoReplaceRules(data);
}

/**
 * Import an array of Legado-format TxtTocRules.
 *
 * @deprecated Prefer ReaderX native format.
 */
export function importLegadoTxtTocRules(
	data: unknown,
): ImportedResultT<TxtTocRuleFile> {
	if (!Array.isArray(data)) {
		return {
			data: { $schema: "readerx/txt-toc-rule/v1", rules: [] },
			report: createReport([]),
			warnings: [
				{
					kind: "convert_error",
					message: "Expected an array of Legado txt toc rules",
				},
			],
		};
	}
	return convertLegadoTxtTocRules(data);
}

// ── Format detection ──────────────────────────────────────

/**
 * Attempt to detect the format of unknown rule data.
 *
 * This is a heuristic-based helper for UI workflows; it is NOT used by the
 * main import pipeline.
 */
export function tryDetectFormat(data: unknown): RuleFormatKindT {
	// 1. Object with $schema → check content
	if (typeof data === "object" && data !== null && !Array.isArray(data)) {
		const obj = data as Record<string, unknown>;
		if (typeof obj.$schema === "string") {
			const schema = obj.$schema as string;
			if (schema.includes("book-source-rule")) return "readerx-book-source";
			if (schema.includes("dict-rule")) return "readerx-dict";
			if (schema.includes("replace-rule")) return "readerx-replace";
			if (schema.includes("txt-toc-rule")) return "readerx-txt-toc";
		}
	}

	// 2-5. Array → inspect first element
	if (Array.isArray(data) && data.length > 0) {
		const first = data[0];
		if (typeof first === "object" && first !== null) {
			if ("bookSourceUrl" in first) return "legado-book-source";
			if ("urlRule" in first) return "legado-dict";
			if ("isRegex" in first) return "legado-replace";
			if ("serialNumber" in first) return "legado-txt-toc";
		}
	}

	// 6. Unknown
	return "unknown";
}
