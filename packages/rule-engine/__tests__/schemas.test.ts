import { describe, expect, it } from "vitest";
import {
	bookSourceSchema,
	contentRuleSchema,
	exploreRuleSchema,
	isValidBookSourceType,
	parseBookSource,
	parseUrlOption,
	reviewRuleSchema,
	searchRuleSchema,
	tocRuleSchema,
	validateBookSource,
} from "../src/schemas";

// ─── parseUrlOption ───────────────────────────────────────────────────────

describe("parseUrlOption", () => {
	it("parses valid POST options", () => {
		const result = parseUrlOption('{"method":"POST","body":"key=value"}');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.method).toBe("POST");
			expect(result.data.body).toBe("key=value");
		}
	});

	it("parses options with headers", () => {
		const result = parseUrlOption(
			'{"method":"GET","headers":{"Content-Type":"application/json"}}',
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.headers).toEqual({
				"Content-Type": "application/json",
			});
		}
	});

	it("parses retry and charset", () => {
		const result = parseUrlOption('{"retry":3,"charset":"gbk"}');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.retry).toBe(3);
			expect(result.data.charset).toBe("gbk");
		}
	});

	it("parses empty JSON object", () => {
		const result = parseUrlOption("{}");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({});
		}
	});

	it("rejects invalid JSON", () => {
		const result = parseUrlOption("not json");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("Invalid JSON");
		}
	});

	it("rejects negative retry", () => {
		const result = parseUrlOption('{"retry":-1}');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeTruthy();
		}
	});

	it("allows unknown fields via passthrough", () => {
		const result = parseUrlOption('{"method":"GET","customField":"value"}');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.customField).toBe("value");
		}
	});

	it("allows webView boolean", () => {
		const result = parseUrlOption('{"webView":true}');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.webView).toBe(true);
		}
	});
});

// ─── Rule Schemas ─────────────────────────────────────────────────────────

describe("searchRuleSchema", () => {
	it("accepts valid data with required fields", () => {
		const result = searchRuleSchema.safeParse({
			bookList: ".book-list > div",
			name: ".book-name",
			author: ".book-author",
			bookUrl: "a.book-link@href",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing bookList", () => {
		const result = searchRuleSchema.safeParse({
			name: ".book-name",
			author: ".book-author",
			bookUrl: "a.book-link@href",
		});
		expect(result.success).toBe(false);
	});

	it("allows optional fields", () => {
		const result = searchRuleSchema.safeParse({
			bookList: ".book-list > div",
			name: ".book-name",
			author: ".book-author",
			bookUrl: "a.book-link@href",
			intro: ".intro",
			coverUrl: "img@src",
			wordCount: ".word-count",
		});
		expect(result.success).toBe(true);
	});
});

describe("exploreRuleSchema", () => {
	it("accepts same fields as searchRule (without checkKeyWord)", () => {
		const result = exploreRuleSchema.safeParse({
			bookList: ".book-list > div",
			name: ".book-name",
			author: ".book-author",
			bookUrl: "a.book-link@href",
		});
		expect(result.success).toBe(true);
	});
});

describe("tocRuleSchema", () => {
	it("accepts valid data with required fields", () => {
		const result = tocRuleSchema.safeParse({
			chapterList: ".chapter-list > div",
			chapterName: ".chapter-name",
			chapterUrl: "a@href",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing chapterList", () => {
		const result = tocRuleSchema.safeParse({
			chapterName: ".chapter-name",
			chapterUrl: "a@href",
		});
		expect(result.success).toBe(false);
	});
});

describe("contentRuleSchema", () => {
	it("accepts valid data with required content", () => {
		const result = contentRuleSchema.safeParse({
			content: "#content",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing content", () => {
		const result = contentRuleSchema.safeParse({
			title: ".title",
		});
		expect(result.success).toBe(false);
	});
});

describe("reviewRuleSchema", () => {
	it("accepts empty object (all optional)", () => {
		const result = reviewRuleSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts partial fields", () => {
		const result = reviewRuleSchema.safeParse({
			reviewUrl: "/api/review",
			contentRule: ".review-content",
		});
		expect(result.success).toBe(true);
	});
});

// ─── bookSourceSchema + parseBookSource + validateBookSource ──────────────

const minimalSource = {
	bookSourceUrl: "https://example.com",
	bookSourceName: "Test Source",
	bookSourceType: 0,
	enabled: true,
	enabledExplore: false,
	customOrder: 0,
	weight: 0,
	lastUpdateTime: 0,
	respondTime: 0,
};

describe("bookSourceSchema", () => {
	it("accepts minimal valid BookSource", () => {
		const result = bookSourceSchema.safeParse(minimalSource);
		expect(result.success).toBe(true);
	});

	it("accepts full BookSource with nested rules", () => {
		const full = {
			...minimalSource,
			searchUrl: "https://example.com/search?q={{key}}",
			ruleSearch: {
				bookList: ".book-list > div",
				name: ".book-name",
				author: ".book-author",
				bookUrl: "a@href",
			},
			ruleToc: {
				chapterList: ".chapter-list > div",
				chapterName: ".chapter-name",
				chapterUrl: "a@href",
			},
			ruleContent: {
				content: "#content",
			},
		};
		const result = bookSourceSchema.safeParse(full);
		expect(result.success).toBe(true);
	});

	it("rejects missing bookSourceUrl", () => {
		const { bookSourceUrl: _, ...noUrl } = minimalSource;
		const result = bookSourceSchema.safeParse(noUrl);
		expect(result.success).toBe(false);
	});

	it("rejects empty bookSourceUrl", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			bookSourceUrl: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid bookSourceType", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			bookSourceType: 99,
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid nested ruleSearch", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			ruleSearch: {
				bookList: 123, // should be string
			},
		});
		expect(result.success).toBe(false);
	});

	it("allows extra fields via passthrough", () => {
		const result = bookSourceSchema.safeParse({
			...minimalSource,
			customExtraField: "hello",
		});
		expect(result.success).toBe(true);
	});
});

describe("parseBookSource", () => {
	it("returns data on success", () => {
		const result = parseBookSource(minimalSource);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.bookSourceUrl).toBe("https://example.com");
			expect(result.data.bookSourceName).toBe("Test Source");
		}
	});

	it("returns errors on failure", () => {
		const result = parseBookSource({ bookSourceUrl: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors).toBeDefined();
			expect(result.errors.issues.length).toBeGreaterThan(0);
		}
	});
});

describe("validateBookSource", () => {
	it("returns true for valid source", () => {
		expect(validateBookSource(minimalSource)).toBe(true);
	});

	it("returns false for invalid source", () => {
		expect(validateBookSource({ bookSourceUrl: "" })).toBe(false);
	});
});

describe("isValidBookSourceType", () => {
	it("returns true for valid types 0-3", () => {
		expect(isValidBookSourceType(0)).toBe(true);
		expect(isValidBookSourceType(1)).toBe(true);
		expect(isValidBookSourceType(2)).toBe(true);
		expect(isValidBookSourceType(3)).toBe(true);
	});

	it("returns false for invalid types", () => {
		expect(isValidBookSourceType(-1)).toBe(false);
		expect(isValidBookSourceType(4)).toBe(false);
		expect(isValidBookSourceType(99)).toBe(false);
	});
});
