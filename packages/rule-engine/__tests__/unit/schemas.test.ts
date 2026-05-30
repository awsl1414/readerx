import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	parseDictRuleFile,
	parseReplaceRuleFile,
	validateBookSource,
	validateDictRuleFile,
	validateReplaceRuleFile,
	validateTxtTocRuleFile,
} from "../../src/schemas.js";

const SCHEMAS_DIR =
	"/Volumes/Data/workspaces/front/readerx/.claude/worktrees/refactor+rule-engine2/schemas/readerx/examples";

function readExample(name: string): unknown {
	return JSON.parse(readFileSync(`${SCHEMAS_DIR}/${name}`, "utf-8"));
}

// ---- Replace Rule ----

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

// ---- TXT TOC Rule ----

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

// ---- Dict Rule ----

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

	it("accepts minimal valid file without authors", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			rules: [
				{
					id: "test",
					name: "Test Dict",
					request: { url: "https://dict.example.com/{{key}}" },
				},
			],
		});
		expect(result.ok).toBe(true);
	});

	it("accepts file with authors", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			authors: ["alice", "bob"],
			rules: [
				{
					id: "test",
					name: "Test Dict",
					request: { url: "https://dict.example.com/{{key}}" },
				},
			],
		});
		expect(result.ok).toBe(true);
	});
});

describe("dict-rule pipeline transforms", () => {
	it("infers category from transform action (dom)", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			rules: [
				{
					id: "test",
					name: "Test",
					request: { url: "https://example.com" },
					fields: {
						def: {
							pipeline: [
								{ type: "extract", engine: "css", selector: ".content" },
								{ type: "transform", action: "remove", selector: ".ad" },
							],
						},
					},
				},
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const pipeline = result.value.rules[0]?.fields?.def?.pipeline;
		const transformStep = pipeline?.[1];
		expect(transformStep).toEqual({
			type: "transform",
			action: "remove",
			selector: ".ad",
			attrs: undefined,
			pattern: undefined,
			with: undefined,
			flags: undefined,
			category: "dom",
		});
	});

	it("infers category from transform action (string)", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			rules: [
				{
					id: "test",
					name: "Test",
					request: { url: "https://example.com" },
					fields: {
						def: {
							pipeline: [
								{
									type: "transform",
									action: "replace",
									pattern: "\\d+",
									with: "NUM",
								},
							],
						},
					},
				},
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const pipeline = result.value.rules[0]?.fields?.def?.pipeline;
		expect(pipeline?.[0]).toEqual({
			type: "transform",
			action: "replace",
			pattern: "\\d+",
			with: "NUM",
			selector: undefined,
			attrs: undefined,
			flags: undefined,
			category: "string",
		});
	});

	it("flattens output attr object to output + attr fields", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			rules: [
				{
					id: "test",
					name: "Test",
					request: { url: "https://example.com" },
					fields: {
						link: {
							pipeline: [
								{
									type: "extract",
									engine: "css",
									selector: "a.chapter",
									output: { type: "attr", name: "href" },
								},
							],
						},
					},
				},
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const pipeline = result.value.rules[0]?.fields?.link?.pipeline;
		expect(pipeline?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "a.chapter",
			output: "attr",
			attr: "href",
			baseUrl: undefined,
		});
	});

	it("accepts string output without transformation", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			rules: [
				{
					id: "test",
					name: "Test",
					request: { url: "https://example.com" },
					fields: {
						title: {
							pipeline: [
								{
									type: "extract",
									engine: "css",
									selector: "h1",
									output: "text",
								},
							],
						},
					},
				},
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const pipeline = result.value.rules[0]?.fields?.title?.pipeline;
		expect(pipeline?.[0]).toEqual({
			type: "extract",
			engine: "css",
			selector: "h1",
			output: "text",
			baseUrl: undefined,
		});
	});

	it("accepts structured body in request", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			rules: [
				{
					id: "test",
					name: "Test",
					request: {
						url: "https://example.com/api",
						method: "POST",
						body: { type: "json", data: { key: "{{key}}" } },
					},
				},
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const req = result.value.rules[0]?.request;
		expect(req?.body).toEqual({ type: "json", data: { key: "{{key}}" } });
	});

	it("accepts string body in request", () => {
		const result = validateDictRuleFile({
			$schema: "readerx/dict-rule/v1",
			rules: [
				{
					id: "test",
					name: "Test",
					request: {
						url: "https://example.com/api",
						method: "POST",
						body: "key={{key}}",
					},
				},
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const req = result.value.rules[0]?.request;
		expect(req?.body).toBe("key={{key}}");
	});
});

// ---- Book Source ----

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

	it("validates search module with rules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			search: {
				url: "https://example.com/search?q={{key}}",
				rules: {
					list: ".book-list > .item",
					name: ".title",
					url: "a[href]",
					author: ".author",
				},
			},
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.search?.rules?.name).toBe(".title");
	});

	it("validates search module with RuleObject rules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			search: {
				url: "https://example.com/search?q={{key}}",
				rules: {
					list: { css: ".book-list > .item" },
					name: { css: ".title", attr: "text" },
				},
			},
		});
		expect(result.ok).toBe(true);
	});

	it("validates search module with pipeline rules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			search: {
				url: "https://example.com/search?q={{key}}",
				rules: {
					name: [
						{ css: ".title" },
						{ replace: { pattern: "\\s+", with: " " } },
					],
				},
			},
		});
		expect(result.ok).toBe(true);
	});

	it("validates explore module with categories and rules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			explore: {
				categories: [
					{ title: "热门推荐" },
					{ title: "玄幻", url: "https://example.com/cat/1" },
				],
				rules: {
					list: ".list > .item",
					name: ".title",
				},
			},
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.explore?.categories).toHaveLength(2);
	});

	it("validates bookInfo module with init and rules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			bookInfo: {
				init: ".decode-btn",
				rules: {
					name: { css: "h1.book-title", attr: "text" },
					cover: { css: ".cover img", attr: "src" },
				},
			},
		});
		expect(result.ok).toBe(true);
	});

	it("validates toc module with nextUrl and rules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			toc: {
				nextUrl: { css: "a.next-page", attr: "href" },
				rules: {
					list: ".chapter-list > li",
					name: "a",
					url: { css: "a", attr: "href" },
				},
			},
		});
		expect(result.ok).toBe(true);
	});

	it("validates content module with nextUrl, replaceRegex, and rules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
			content: {
				nextUrl: { css: "a.next", attr: "href" },
				replaceRegex: [
					{ pattern: "广告\\d+", with: "" },
					{ pattern: "请收藏本站", with: "" },
				],
				rules: {
					text: "#content",
				},
			},
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.content?.replaceRegex).toHaveLength(2);
	});

	it("validates full book source with all modules", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "example.com",
			name: "Example Source",
			type: "novel",
			baseUrl: "https://example.com",
			author: "test",
			version: 1,
			enabled: true,
			weight: 50,
			search: {
				url: "https://example.com/search?q={{key}}",
				checkKeyWord: "斗破苍穹",
				rules: {
					list: ".result-list > .item",
					name: ".book-name",
					url: ".book-name",
					author: ".author",
					cover: "img.cover",
				},
			},
			explore: {
				categories: [{ title: "全部", url: "/all/{{page}}" }],
				rules: {
					list: ".list > .item",
					name: ".name",
				},
			},
			bookInfo: {
				rules: {
					name: "h1",
					author: ".author-name",
					cover: ".cover img",
				},
			},
			toc: {
				rules: {
					list: ".chapter-list > li",
					name: "a",
					url: { css: "a", attr: "href" },
				},
			},
			content: {
				rules: {
					text: "#chapter-content",
				},
			},
		});
		expect(result.ok).toBe(true);
	});
});

describe("parseReplaceRuleFile", () => {
	it("throws on invalid data", () => {
		expect(() => parseReplaceRuleFile({ invalid: true })).toThrow();
	});
});

describe("parseDictRuleFile", () => {
	it("throws on invalid data", () => {
		expect(() => parseDictRuleFile({ invalid: true })).toThrow();
	});
});
