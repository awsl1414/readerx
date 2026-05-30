/**
 * E2E tests for the Legado import pipeline using real data files.
 * Validates that actual Legado JSON data is correctly imported
 * into ReaderX rule format.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { convertLegadoBookSources } from "../../src/import/converters/book-source.js";
import { convertLegadoTxtTocRules } from "../../src/import/converters/txt-toc.js";
import { convertLegadoReplaceRules } from "../../src/import/converters/replace-rule.js";
import { convertLegadoDictRules } from "../../src/import/converters/dict-rule.js";
import type {
	LegadoBookSource,
	LegadoDictRule,
	LegadoReplaceRule,
	LegadoTxtTocRule,
} from "../../src/import/types.js";

const LEGADO_DATA_DIR = join(import.meta.dirname, "../../../../schemas/legado/data");

function loadLegadoData<T>(filename: string): readonly T[] {
	const path = join(LEGADO_DATA_DIR, filename);
	return JSON.parse(readFileSync(path, "utf-8")) as readonly T[];
}

// ── TXT TOC ──────────────────────────────────────────────────────

describe("E2E Legado Import: txt-toc-rule", () => {
	it("imports all 26 rules with full conversion", () => {
		const raw = loadLegadoData<LegadoTxtTocRule>("txt-toc-rule.json");
		const result = convertLegadoTxtTocRules(raw);

		expect(result.data.rules).toHaveLength(26);
		expect(result.data.$schema).toBe("readerx/txt-toc-rule/v1");

		expect(result.report.totalRules).toBe(26);
		expect(result.report.convertedRules).toBe(26);
		expect(result.report.scriptFallbackRules).toBe(0);
		expect(result.report.partialConvertedRules).toBe(0);
		expect(result.report.unsupportedFeatures).toHaveLength(0);
		expect(result.warnings).toHaveLength(0);
	});

	it("every rule has name; non-fallback rules have pattern", () => {
		const raw = loadLegadoData<LegadoTxtTocRule>("txt-toc-rule.json");
		const result = convertLegadoTxtTocRules(raw);

		let nonEmptyPatterns = 0;
		for (const rule of result.data.rules) {
			expect(rule.name).toBeDefined();
			if (rule.pattern && rule.pattern !== "") {
				nonEmptyPatterns++;
			}
		}
		// 25 out of 26 rules have non-empty patterns
		// (the last "默认分章规则" fallback rule has an intentionally empty pattern)
		expect(nonEmptyPatterns).toBe(25);
	});
});

// ── REPLACE RULE ─────────────────────────────────────────────────

describe("E2E Legado Import: replace-rule", () => {
	it("imports all 20 rules", () => {
		const raw = loadLegadoData<LegadoReplaceRule>("replace-rule.json");
		const result = convertLegadoReplaceRules(raw);

		expect(result.data.rules).toHaveLength(20);
		expect(result.data.$schema).toBe("readerx/replace-rule/v1");

		expect(result.report.totalRules).toBe(20);
		// converted + partial + scriptFallback should sum to 20
		const sum =
			result.report.convertedRules +
			result.report.partialConvertedRules +
			result.report.scriptFallbackRules;
		expect(sum).toBe(20);
	});

	it("handles @js: replacement as replacementJs field", () => {
		const raw = loadLegadoData<LegadoReplaceRule>("replace-rule.json");
		const result = convertLegadoReplaceRules(raw);

		const jsRules = result.data.rules.filter(
			(r) => r.replacementJs !== undefined,
		);
		// Real data has 4 rules with @js: replacement
		expect(jsRules.length).toBeGreaterThan(0);

		// Ensure replacementJs is the script content without the @js: prefix
		for (const rule of jsRules) {
			expect(rule.replacementJs).toBeDefined();
			expect(rule.replacementJs).not.toContain("@js:");
		}
	});
});

// ── DICT RULE ────────────────────────────────────────────────────

describe("E2E Legado Import: dict-rule", () => {
	it("imports all 3 rules", () => {
		const raw = loadLegadoData<LegadoDictRule>("dict-rule.json");
		const result = convertLegadoDictRules(raw);

		expect(result.data.rules).toHaveLength(3);
		expect(result.data.$schema).toBe("readerx/dict-rule/v1");

		expect(result.report.totalRules).toBe(3);
	});

	it("at least some rules have request.url", () => {
		const raw = loadLegadoData<LegadoDictRule>("dict-rule.json");
		const result = convertLegadoDictRules(raw);

		const rulesWithUrl = result.data.rules.filter(
			(r) => r.request?.url && r.request.url !== "",
		);
		expect(rulesWithUrl.length).toBeGreaterThan(0);
	});

	it("rules have correct name and enabled state", () => {
		const raw = loadLegadoData<LegadoDictRule>("dict-rule.json");
		const result = convertLegadoDictRules(raw);

		for (const rule of result.data.rules) {
			expect(rule.name).toBeDefined();
			expect(rule.name).not.toBe("");
			expect(typeof rule.enabled).toBe("boolean");
		}
	});
});

// ── BOOK SOURCE ──────────────────────────────────────────────────

describe("E2E Legado Import: book-source-rule", () => {
	it("imports all 10 sources", () => {
		const raw = loadLegadoData<LegadoBookSource>("book-source-rule.json");
		const result = convertLegadoBookSources(raw);

		expect(result.data).toHaveLength(10);
		expect(result.report.totalRules).toBeGreaterThan(0);
	});

	it("each source has id, baseUrl, name, type", () => {
		const raw = loadLegadoData<LegadoBookSource>("book-source-rule.json");
		const result = convertLegadoBookSources(raw);

		for (const source of result.data) {
			expect(source.id).toBeDefined();
			expect(source.baseUrl).toBeDefined();
			expect(source.name).toBeDefined();
			expect(source.type).toBeDefined();
			expect(["novel", "audio", "comic", "file"]).toContain(source.type);
		}
	});

	it("at least some sources have search module", () => {
		const raw = loadLegadoData<LegadoBookSource>("book-source-rule.json");
		const result = convertLegadoBookSources(raw);

		const withSearch = result.data.filter((s) => s.search !== undefined);
		expect(withSearch.length).toBeGreaterThan(0);
	});

	it("at least some sources have content module", () => {
		const raw = loadLegadoData<LegadoBookSource>("book-source-rule.json");
		const result = convertLegadoBookSources(raw);

		const withContent = result.data.filter(
			(s) => s.content !== undefined,
		);
		expect(withContent.length).toBeGreaterThan(0);
	});

	it("report has unsupported features from real data", () => {
		const raw = loadLegadoData<LegadoBookSource>("book-source-rule.json");
		const result = convertLegadoBookSources(raw);

		// Real data uses @js:, &&, @put, etc.
		expect(result.report.unsupportedFeatures.length).toBeGreaterThan(0);
	});

	it("report counts are consistent", () => {
		const raw = loadLegadoData<LegadoBookSource>("book-source-rule.json");
		const result = convertLegadoBookSources(raw);

		const sum =
			result.report.convertedRules +
			result.report.partialConvertedRules +
			result.report.scriptFallbackRules;
		expect(sum).toBe(result.report.totalRules);
	});
});

// ── ROUND-TRIP VALIDATION ────────────────────────────────────────

describe("E2E Legado Import: round-trip validation", () => {
	it("preserves field values for a simple book source", () => {
		const raw = loadLegadoData<LegadoBookSource>("book-source-rule.json");
		const result = convertLegadoBookSources(raw);

		const originalFirst = raw[0];
		const convertedFirst = result.data[0];

		expect(originalFirst).toBeDefined();
		expect(convertedFirst).toBeDefined();
		expect(convertedFirst!.name).toBe(originalFirst!.bookSourceName);
		expect(convertedFirst!.id).toBe(originalFirst!.bookSourceUrl);
		expect(convertedFirst!.baseUrl).toBe(originalFirst!.bookSourceUrl);

		// Type mapping: 0 → "novel"
		if (originalFirst!.bookSourceType === 0) {
			expect(convertedFirst!.type).toBe("novel");
		}
	});
});
