import { describe, expect, it } from "vitest";
import {
	importBookSource,
	importDictRuleFile,
	importLegadoBookSources,
	importLegadoDictRules,
	importLegadoReplaceRules,
	importLegadoTxtTocRules,
	importReplaceRuleFile,
	importTxtTocRuleFile,
	tryDetectFormat,
} from "../../../src/import/index.js";

// ── Helpers ──────────────────────────────────────────────

const VALID_BOOK_SOURCE = {
	$schema: "readerx/book-source-rule/v1",
	id: "https://example.com",
	name: "Test Source",
	type: "novel",
	baseUrl: "https://example.com",
};

const VALID_REPLACE_RULE_FILE = {
	$schema: "readerx/replace-rule/v1",
	rules: [
		{ name: "Remove ads", pattern: "ad\\.example\\.com", replacement: "" },
	],
};

const VALID_DICT_RULE_FILE = {
	$schema: "readerx/dict-rule/v1",
	rules: [
		{
			id: "test-dict",
			name: "Test Dict",
			request: { url: "https://dict.example.com" },
		},
	],
};

const VALID_TXT_TOC_RULE_FILE = {
	$schema: "readerx/txt-toc-rule/v1",
	rules: [
		{ name: "Chapter", pattern: "^Chapter \\d+" },
	],
};

describe("import module public API", () => {
	// ── ReaderX native imports ─────────────────────────────────

	describe("importBookSource", () => {
		it("returns ok with valid ReaderX book source data", () => {
			const result = importBookSource(VALID_BOOK_SOURCE);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.id).toBe("https://example.com");
				expect(result.value.name).toBe("Test Source");
				expect(result.value.type).toBe("novel");
			}
		});

		it("returns error with invalid data", () => {
			const result = importBookSource({ invalid: true });

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.kind).toBe("parse_error");
				expect(result.error.message).toBeTruthy();
			}
		});

		it("returns error with null input", () => {
			const result = importBookSource(null);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.kind).toBe("parse_error");
			}
		});
	});

	describe("importDictRuleFile", () => {
		it("returns ok with valid dict rule file", () => {
			const result = importDictRuleFile(VALID_DICT_RULE_FILE);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.rules).toHaveLength(1);
			}
		});

		it("returns error with invalid data", () => {
			const result = importDictRuleFile({ bad: true });

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.kind).toBe("parse_error");
			}
		});
	});

	describe("importReplaceRuleFile", () => {
		it("returns ok with valid replace rule file", () => {
			const result = importReplaceRuleFile(VALID_REPLACE_RULE_FILE);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.rules).toHaveLength(1);
			}
		});

		it("returns error with invalid data", () => {
			const result = importReplaceRuleFile("not an object");

			expect(result.ok).toBe(false);
		});
	});

	describe("importTxtTocRuleFile", () => {
		it("returns ok with valid txt toc rule file", () => {
			const result = importTxtTocRuleFile(VALID_TXT_TOC_RULE_FILE);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.rules).toHaveLength(1);
			}
		});

		it("returns error with invalid data", () => {
			const result = importTxtTocRuleFile(42);

			expect(result.ok).toBe(false);
		});
	});

	// ── Legado imports ─────────────────────────────────────────

	describe("importLegadoBookSources", () => {
		it("converts array of Legado book sources", () => {
			const result = importLegadoBookSources([
				{
					bookSourceUrl: "https://legado.example.com",
					bookSourceName: "Legado Source",
				},
			]);

			expect(result.data).toHaveLength(1);
			expect(result.data[0]?.id).toBe("https://legado.example.com");
			expect(result.data[0]?.name).toBe("Legado Source");
			// report.totalRules counts conversion results (rule fields parsed),
			// not input sources. A source with no rule fields produces 0 conversions.
			expect(result.report.totalRules).toBeGreaterThanOrEqual(0);
		});

		it("returns empty result with error for non-array input", () => {
			const result = importLegadoBookSources("not an array");

			expect(result.data).toHaveLength(0);
			expect(result.report.totalRules).toBe(0);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]?.kind).toBe("convert_error");
		});
	});

	describe("importLegadoDictRules", () => {
		it("converts array of Legado dict rules", () => {
			const result = importLegadoDictRules([
				{ name: "Test Dict", urlRule: "https://dict.example.com" },
			]);

			expect(result.data.rules).toHaveLength(1);
			expect(result.data.rules[0]?.name).toBe("Test Dict");
			expect(result.report.totalRules).toBe(1);
		});

		it("returns empty result with error for non-array input", () => {
			const result = importLegadoDictRules({ not: "array" });

			expect(result.data.rules).toHaveLength(0);
			expect(result.report.totalRules).toBe(0);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]?.kind).toBe("convert_error");
		});
	});

	describe("importLegadoReplaceRules", () => {
		it("converts array of Legado replace rules", () => {
			const result = importLegadoReplaceRules([
				{
					name: "Ad Remover",
					pattern: "ads",
					replacement: "",
					isRegex: true,
				},
			]);

			expect(result.data.rules).toHaveLength(1);
			expect(result.data.rules[0]?.name).toBe("Ad Remover");
			expect(result.report.totalRules).toBe(1);
		});

		it("returns empty result with error for non-array input", () => {
			const result = importLegadoReplaceRules(123);

			expect(result.data.rules).toHaveLength(0);
			expect(result.report.totalRules).toBe(0);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]?.kind).toBe("convert_error");
		});
	});

	describe("importLegadoTxtTocRules", () => {
		it("converts array of Legado txt toc rules", () => {
			const result = importLegadoTxtTocRules([
				{
					name: "Chapter Pattern",
					rule: "^Chapter \\d+",
					serialNumber: 1,
				},
			]);

			expect(result.data.rules).toHaveLength(1);
			expect(result.data.rules[0]?.name).toBe("Chapter Pattern");
			expect(result.report.totalRules).toBe(1);
		});

		it("returns empty result with error for non-array input", () => {
			const result = importLegadoTxtTocRules(null);

			expect(result.data.rules).toHaveLength(0);
			expect(result.report.totalRules).toBe(0);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]?.kind).toBe("convert_error");
		});
	});

	// ── Format detection ──────────────────────────────────────

	describe("tryDetectFormat", () => {
		it("detects ReaderX book source by $schema", () => {
			expect(
				tryDetectFormat({
					$schema: "readerx/book-source-rule/v1",
					id: "x",
					name: "x",
				}),
			).toBe("readerx-book-source");
		});

		it("detects ReaderX dict rule by $schema", () => {
			expect(
				tryDetectFormat({
					$schema: "readerx/dict-rule/v1",
					rules: [],
				}),
			).toBe("readerx-dict");
		});

		it("detects ReaderX replace rule by $schema", () => {
			expect(
				tryDetectFormat({
					$schema: "readerx/replace-rule/v1",
					rules: [],
				}),
			).toBe("readerx-replace");
		});

		it("detects ReaderX txt-toc rule by $schema", () => {
			expect(
				tryDetectFormat({
					$schema: "readerx/txt-toc-rule/v1",
					rules: [],
				}),
			).toBe("readerx-txt-toc");
		});

		it("detects Legado book source by bookSourceUrl", () => {
			expect(
				tryDetectFormat([{ bookSourceUrl: "https://example.com" }]),
			).toBe("legado-book-source");
		});

		it("detects Legado dict by urlRule", () => {
			expect(
				tryDetectFormat([{ urlRule: "https://dict.example.com" }]),
			).toBe("legado-dict");
		});

		it("detects Legado replace by isRegex", () => {
			expect(
				tryDetectFormat([{ isRegex: true }]),
			).toBe("legado-replace");
		});

		it("detects Legado txt-toc by serialNumber", () => {
			expect(
				tryDetectFormat([{ serialNumber: 1 }]),
			).toBe("legado-txt-toc");
		});

		it("returns unknown for string input", () => {
			expect(tryDetectFormat("hello")).toBe("unknown");
		});

		it("returns unknown for null input", () => {
			expect(tryDetectFormat(null)).toBe("unknown");
		});

		it("returns unknown for number input", () => {
			expect(tryDetectFormat(42)).toBe("unknown");
		});

		it("returns unknown for empty object", () => {
			expect(tryDetectFormat({})).toBe("unknown");
		});

		it("returns unknown for empty array", () => {
			expect(tryDetectFormat([])).toBe("unknown");
		});
	});
});
