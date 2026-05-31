import { describe, expect, it } from "vitest";
import {
	validateBookSourceData,
	validateDictRuleData,
	validateReplaceRuleData,
	validateTxtTocRuleData,
} from "../src/schemas";

describe("validateReplaceRuleData", () => {
	it("validates valid replace rule data", () => {
		const result = validateReplaceRuleData({
			pattern: "广告文字",
			replacement: "",
			flags: "g",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.pattern).toBe("广告文字");
			expect(result.value.replacement).toBe("");
			expect(result.value.flags).toBe("g");
		}
	});

	it("rejects missing pattern", () => {
		const result = validateReplaceRuleData({
			replacement: "",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("VALIDATION_ERROR");
			expect(result.error.message).toContain("pattern");
		}
	});

	it("validates data with scope", () => {
		const result = validateReplaceRuleData({
			pattern: "\\[广告\\]",
			flags: "g",
			literal: false,
			replacement: "",
			scope: {
				include: ["example.com"],
				exclude: ["safe.example.com"],
				target: "content",
			},
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.scope?.include).toEqual(["example.com"]);
			expect(result.value.scope?.target).toBe("content");
		}
	});
});

describe("validateTxtTocRuleData", () => {
	it("validates valid txt toc rule data", () => {
		const result = validateTxtTocRuleData({
			pattern: "^第[零一二三四五六七八九十百千万\\d]+章",
			flags: "gm",
			description: "匹配「第X章」格式",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.pattern).toContain("第");
			expect(result.value.flags).toBe("gm");
		}
	});

	it("rejects missing pattern", () => {
		const result = validateTxtTocRuleData({
			flags: "gm",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("VALIDATION_ERROR");
			expect(result.error.message).toContain("pattern");
		}
	});
});

describe("validateDictRuleData", () => {
	it("validates valid dict rule data with request and fields", () => {
		const result = validateDictRuleData({
			request: {
				url: "https://dict.example.com/search?q={{key}}",
				method: "GET",
				headers: { "Accept-Language": "zh-CN" },
			},
			fields: {
				definition: {
					schema: "html",
					pipeline: [
						{
							type: "extract",
							engine: "css",
							selector: ".definition",
							output: "html",
						},
					],
				},
			},
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.request.url).toBe(
				"https://dict.example.com/search?q={{key}}",
			);
			expect(result.value.fields?.definition).toBeDefined();
		}
	});

	it("rejects missing request", () => {
		const result = validateDictRuleData({
			fields: {
				definition: {
					pipeline: [],
				},
			},
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("VALIDATION_ERROR");
			expect(result.error.message).toContain("request");
		}
	});
});

describe("validateBookSourceData", () => {
	it("validates valid book source data with modules", () => {
		const result = validateBookSourceData({
			baseUrl: "https://www.example.com",
			modules: [
				{
					type: "search",
					request: {
						url: "https://www.example.com/search?q={{key}}",
						method: "GET",
					},
					rules: {
						list: ".book-list > .item",
						name: ".book-name",
						url: "a[href]@href",
					},
				},
				{
					type: "content",
					rules: {
						text: "#content",
					},
					nextUrl: ".next-page@href",
				},
			],
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.baseUrl).toBe("https://www.example.com");
			expect(result.value.modules).toHaveLength(2);
			expect(result.value.modules[0]?.type).toBe("search");
			expect(result.value.modules[1]?.type).toBe("content");
		}
	});

	it("rejects missing baseUrl", () => {
		const result = validateBookSourceData({
			modules: [],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("VALIDATION_ERROR");
			expect(result.error.message).toContain("baseUrl");
		}
	});

	it("rejects missing modules", () => {
		const result = validateBookSourceData({
			baseUrl: "https://www.example.com",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("VALIDATION_ERROR");
			expect(result.error.message).toContain("modules");
		}
	});

	it("validates book source with module containing pipeline rules", () => {
		const result = validateBookSourceData({
			baseUrl: "https://www.example.com",
			modules: [
				{
					type: "toc",
					rules: {
						list: [
							{ type: "extract", engine: "css", selector: ".chapter-list a" },
						],
						name: [
							{ type: "extract", engine: "css", selector: "a", output: "text" },
						],
					},
					nextUrl: [{ type: "extract", engine: "css", selector: ".next" }],
				},
			],
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.modules[0]?.type).toBe("toc");
		}
	});
});
