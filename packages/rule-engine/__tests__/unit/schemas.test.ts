import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	parseReplaceRuleFile,
	validateBookSource,
	validateDictRuleFile,
	validateReplaceRuleFile,
	validateTxtTocRuleFile,
} from "../../src/schemas.js";

const SCHEMAS_DIR =
	"/Volumes/Data/workspaces/front/readerx/.claude/worktrees/refactor+rule-engine/schemas/readerx/examples";

function readExample(name: string): unknown {
	return JSON.parse(readFileSync(`${SCHEMAS_DIR}/${name}`, "utf-8"));
}

describe("validateReplaceRuleFile", () => {
	it("validates example data", () => {
		const data = readExample("replace-rule-examples.json");
		if (Array.isArray(data)) {
			const result = validateReplaceRuleFile({
				$schema: "readerx/replace-rule/v1",
				rules: data,
			});
			expect(result.ok).toBe(true);
		}
	});

	it("rejects missing $schema", () => {
		const result = validateReplaceRuleFile({
			rules: [{ name: "test", pattern: "foo" }],
		});
		expect(result.ok).toBe(false);
	});

	it("rejects extra properties", () => {
		const result = validateReplaceRuleFile({
			$schema: "readerx/replace-rule/v1",
			rules: [],
			extra: true,
		});
		expect(result.ok).toBe(false);
	});

	it("accepts minimal valid file", () => {
		const result = validateReplaceRuleFile({
			$schema: "readerx/replace-rule/v1",
			rules: [{ name: "remove ads", pattern: "advertisement" }],
		});
		expect(result.ok).toBe(true);
	});
});

describe("validateTxtTocRuleFile", () => {
	it("validates example data", () => {
		const data = readExample("txt-toc-rule-examples.json");
		if (Array.isArray(data)) {
			const result = validateTxtTocRuleFile({
				$schema: "readerx/txt-toc-rule/v1",
				rules: data,
			});
			expect(result.ok).toBe(true);
		}
	});

	it("accepts minimal valid file", () => {
		const result = validateTxtTocRuleFile({
			$schema: "readerx/txt-toc-rule/v1",
			rules: [{ name: "chapter", pattern: "^Chapter \\d+" }],
		});
		expect(result.ok).toBe(true);
	});
});

describe("validateDictRuleFile", () => {
	it("validates example data", () => {
		const data = readExample("dict-rule-examples.json");
		if (Array.isArray(data)) {
			const result = validateDictRuleFile({
				$schema: "readerx/dict-rule/v1",
				rules: data,
			});
			expect(result.ok).toBe(true);
		}
	});
});

describe("validateBookSource", () => {
	it("validates minimal book source", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test-source",
			name: "Test Source",
			type: "novel",
			baseUrl: "https://example.com",
		});
		expect(result.ok).toBe(true);
	});

	it("rejects invalid type", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "invalid",
			baseUrl: "https://example.com",
		});
		expect(result.ok).toBe(false);
	});

	it("rejects missing required fields", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
		});
		expect(result.ok).toBe(false);
	});

	it("rejects extra properties", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			unknownField: true,
		});
		expect(result.ok).toBe(false);
	});
});

describe("parseReplaceRuleFile", () => {
	it("throws on invalid data", () => {
		expect(() => parseReplaceRuleFile({ invalid: true })).toThrow();
	});
});
