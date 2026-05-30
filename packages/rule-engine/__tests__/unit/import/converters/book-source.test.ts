import { describe, expect, it } from "vitest";
import { convertLegadoBookSources } from "../../../../src/import/converters/book-source.js";
import type { LegadoBookSource } from "../../../../src/import/types.js";

// Helper: minimal valid Legado source
function makeSource(
	overrides: Partial<LegadoBookSource> = {},
): LegadoBookSource {
	return {
		bookSourceUrl: "https://example.com",
		bookSourceName: "TestSource",
		...overrides,
	};
}

describe("convertLegadoBookSources", () => {
	// ── 1. Basic top-level field mapping ──────────────────────────

	it("maps bookSourceUrl to id and baseUrl", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceUrl: "https://books.example.com" }),
		]);

		expect(result.data[0]?.id).toBe("https://books.example.com");
		expect(result.data[0]?.baseUrl).toBe("https://books.example.com");
	});

	it("maps bookSourceName to name", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceName: "My Book Source" }),
		]);

		expect(result.data[0]?.name).toBe("My Book Source");
	});

	it("maps bookSourceGroup (comma-separated) to tags array", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceGroup: "fiction, fantasy, top" }),
		]);

		expect(result.data[0]?.tags).toEqual(["fiction", "fantasy", "top"]);
	});

	it("trims whitespace when splitting bookSourceGroup", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceGroup: " fiction ,  fantasy " }),
		]);

		expect(result.data[0]?.tags).toEqual(["fiction", "fantasy"]);
	});

	it("maps bookSourceComment to description", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceComment: "A great source" }),
		]);

		expect(result.data[0]?.description).toBe("A great source");
	});

	it("maps enabled directly", () => {
		const result = convertLegadoBookSources([
			makeSource({ enabled: true }),
		]);

		expect(result.data[0]?.enabled).toBe(true);
	});

	it("maps weight directly", () => {
		const result = convertLegadoBookSources([
			makeSource({ weight: 100 }),
		]);

		expect(result.data[0]?.weight).toBe(100);
	});

	it("maps customOrder to order", () => {
		const result = convertLegadoBookSources([
			makeSource({ customOrder: 5 }),
		]);

		expect(result.data[0]?.order).toBe(5);
	});

	it("maps bookUrlPattern to urlPattern", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookUrlPattern: "https://example.com/book/\\d+" }),
		]);

		expect(result.data[0]?.urlPattern).toBe("https://example.com/book/\\d+");
	});

	it("maps loginUrl", () => {
		const result = convertLegadoBookSources([
			makeSource({ loginUrl: "https://example.com/login" }),
		]);

		expect(result.data[0]?.loginUrl).toBe("https://example.com/login");
	});

	it("sets $schema to readerx/book-source-rule/v1", () => {
		const result = convertLegadoBookSources([makeSource()]);

		expect(result.data[0]?.$schema).toBe("readerx/book-source-rule/v1");
	});

	// ── 2. BookSourceType mapping ─────────────────────────────────

	it("maps bookSourceType 0 → novel", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceType: 0 }),
		]);
		expect(result.data[0]?.type).toBe("novel");
	});

	it("maps bookSourceType 1 → audio", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceType: 1 }),
		]);
		expect(result.data[0]?.type).toBe("audio");
	});

	it("maps bookSourceType 2 → comic", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceType: 2 }),
		]);
		expect(result.data[0]?.type).toBe("comic");
	});

	it("maps bookSourceType 3 → file", () => {
		const result = convertLegadoBookSources([
			makeSource({ bookSourceType: 3 }),
		]);
		expect(result.data[0]?.type).toBe("file");
	});

	it("defaults bookSourceType to novel when undefined", () => {
		const result = convertLegadoBookSources([makeSource()]);
		expect(result.data[0]?.type).toBe("novel");
	});

	// ── 3. concurrentRate → rateLimit ────────────────────────────

	it("parses concurrentRate string to rateLimit int", () => {
		const result = convertLegadoBookSources([
			makeSource({ concurrentRate: "500" }),
		]);

		expect(result.data[0]?.rateLimit).toBe(500);
	});

	it("omits rateLimit when concurrentRate is not a valid number", () => {
		const result = convertLegadoBookSources([
			makeSource({ concurrentRate: "abc" }),
		]);

		expect(result.data[0]?.rateLimit).toBeUndefined();
	});

	it("omits rateLimit when concurrentRate is undefined", () => {
		const result = convertLegadoBookSources([makeSource()]);

		expect(result.data[0]?.rateLimit).toBeUndefined();
	});

	// ── 4. header JSON string → headers object ──────────────────

	it("parses header JSON string to headers object", () => {
		const result = convertLegadoBookSources([
			makeSource({ header: '{"User-Agent": "ReaderX", "Accept": "text/html"}' }),
		]);

		expect(result.data[0]?.headers).toEqual({
			"User-Agent": "ReaderX",
			Accept: "text/html",
		});
	});

	it("omits headers when header is invalid JSON", () => {
		const result = convertLegadoBookSources([
			makeSource({ header: "{invalid json" }),
		]);

		expect(result.data[0]?.headers).toBeUndefined();
	});

	it("omits headers when header is undefined", () => {
		const result = convertLegadoBookSources([makeSource()]);

		expect(result.data[0]?.headers).toBeUndefined();
	});

	// ── 5. lastUpdateTime epoch ms → updatedAt ISO string ───────

	it("converts lastUpdateTime epoch ms to updatedAt ISO string", () => {
		const epochMs = 1700000000000; // 2023-11-14T22:13:20.000Z
		const result = convertLegadoBookSources([
			makeSource({ lastUpdateTime: epochMs }),
		]);

		expect(result.data[0]?.updatedAt).toBe(new Date(epochMs).toISOString());
	});

	it("omits updatedAt when lastUpdateTime is undefined", () => {
		const result = convertLegadoBookSources([makeSource()]);

		expect(result.data[0]?.updatedAt).toBeUndefined();
	});

	// ── 6. Unsupported features → warnings ──────────────────────

	it("adds warning for enabledCookieJar", () => {
		const result = convertLegadoBookSources([
			makeSource({ enabledCookieJar: true }),
		]);

		expect(result.warnings.length).toBeGreaterThan(0);
		expect(
			result.warnings.some((w) => w.message.includes("enabledCookieJar")),
		).toBe(true);
	});

	it("adds warning for loginUi", () => {
		const result = convertLegadoBookSources([
			makeSource({ loginUi: '{"fields":[]}' }),
		]);

		expect(
			result.warnings.some((w) => w.message.includes("loginUi")),
		).toBe(true);
	});

	it("adds warning for loginCheckJs", () => {
		const result = convertLegadoBookSources([
			makeSource({ loginCheckJs: "java.ajax(url)" }),
		]);

		expect(
			result.warnings.some((w) => w.message.includes("loginCheckJs")),
		).toBe(true);
	});

	it("does not add warning for respondTime (silently ignored)", () => {
		const result = convertLegadoBookSources([
			makeSource({ respondTime: 12345 }),
		]);

		expect(
			result.warnings.some((w) => w.message.includes("respondTime")),
		).toBe(false);
	});

	// ── 7. searchUrl → search.url ────────────────────────────────

	it("maps searchUrl to search.url", () => {
		const result = convertLegadoBookSources([
			makeSource({ searchUrl: "https://example.com/search?q=" }),
		]);

		expect(result.data[0]?.search?.url).toBe("https://example.com/search?q=");
	});

	// ── 8. @js: searchUrl → unsupported warning ─────────────────

	it("adds warning for @js: searchUrl (unsupported)", () => {
		const result = convertLegadoBookSources([
			makeSource({ searchUrl: "@js:var url = 'https://example.com';" }),
		]);

		expect(result.data[0]?.search).toBeUndefined();
		expect(
			result.warnings.some((w) => w.message.includes("searchUrl") && w.message.includes("@js:")),
		).toBe(true);
	});

	// ── 9. exploreUrl parsing ────────────────────────────────────

	it("parses exploreUrl newline-separated title::url format", () => {
		const exploreUrl = "Fantasy::https://example.com/explore/fantasy\nSci-Fi::https://example.com/explore/scifi";
		const result = convertLegadoBookSources([
			makeSource({ exploreUrl }),
		]);

		expect(result.data[0]?.explore?.categories).toEqual([
			{ title: "Fantasy", url: "https://example.com/explore/fantasy" },
			{ title: "Sci-Fi", url: "https://example.com/explore/scifi" },
		]);
	});

	it("handles lines without :: as group headings (no url)", () => {
		const exploreUrl = "Genres\nFantasy::https://example.com/fantasy";
		const result = convertLegadoBookSources([
			makeSource({ exploreUrl }),
		]);

		expect(result.data[0]?.explore?.categories).toEqual([
			{ title: "Genres" },
			{ title: "Fantasy", url: "https://example.com/fantasy" },
		]);
	});

	it("skips empty lines in exploreUrl", () => {
		const exploreUrl = "A::https://a.com\n\nB::https://b.com\n";
		const result = convertLegadoBookSources([
			makeSource({ exploreUrl }),
		]);

		expect(result.data[0]?.explore?.categories).toEqual([
			{ title: "A", url: "https://a.com" },
			{ title: "B", url: "https://b.com" },
		]);
	});

	// ── 10. ruleSearch field name mapping ─────────────────────────

	it("maps ruleSearch fields with simple selectors to search.rules", () => {
		const result = convertLegadoBookSources([
			makeSource({
				searchUrl: "https://example.com/search?q=",
				ruleSearch: {
					bookList: "@css:.book-list li",
					name: "class.title@text",
					author: "class.author@text",
					bookUrl: "tag.a@href",
					coverUrl: "tag.img@src",
					intro: "class.desc@text",
					kind: "class.genre@text",
					lastChapter: "class.latest@text",
					wordCount: "class.words@text",
				},
			}),
		]);

		const searchRules = result.data[0]?.search?.rules;
		expect(searchRules).toBeDefined();

		// list: bookList → list (mapped name)
		expect(searchRules?.list).toBeDefined();
		expect(searchRules?.list?.[0]?.type).toBe("extract");

		// Field name mapping: name → name (same)
		expect(searchRules?.name).toBeDefined();
		// bookUrl → url
		expect(searchRules?.url).toBeDefined();
		// coverUrl → cover
		expect(searchRules?.cover).toBeDefined();
		// No legacy 'bookUrl' key
		expect(searchRules?.["bookUrl" as keyof typeof searchRules]).toBeUndefined();
	});

	it("maps checkKeyWord directly on search module", () => {
		const result = convertLegadoBookSources([
			makeSource({
				searchUrl: "https://example.com/search?q=",
				ruleSearch: {
					bookList: "@css:.list div",
					checkKeyWord: "keyword",
				},
			}),
		]);

		expect(result.data[0]?.search?.checkKeyWord).toBe("keyword");
	});

	// ── 11. ruleToc field name mapping ────────────────────────────

	it("maps ruleToc fields: chapterList→list, nextTocUrl→nextUrl", () => {
		const result = convertLegadoBookSources([
			makeSource({
				ruleToc: {
					chapterList: "@css:.chapter-list dd",
					chapterName: "tag.a@text",
					chapterUrl: "tag.a@href",
					isVip: "class.vip@text",
					isVolume: "class.volume@text",
					updateTime: "class.time@text",
					nextTocUrl: "class.next-page@href",
				},
			}),
		]);

		const tocModule = result.data[0]?.toc;
		expect(tocModule).toBeDefined();

		// chapterList → list (in rules)
		expect(tocModule?.rules?.list).toBeDefined();
		expect(tocModule?.rules?.list?.[0]?.type).toBe("extract");

		// chapterName → name
		expect(tocModule?.rules?.name).toBeDefined();
		// chapterUrl → url
		expect(tocModule?.rules?.url).toBeDefined();

		// nextTocUrl → nextUrl (module-level)
		expect(tocModule?.nextUrl).toBeDefined();
		expect(tocModule?.nextUrl?.[0]?.type).toBe("extract");
	});

	// ── 12. ruleContent field mapping ─────────────────────────────

	it("maps ruleContent: content→text (in rules), nextContentUrl→nextUrl", () => {
		const result = convertLegadoBookSources([
			makeSource({
				ruleContent: {
					content: "class.content@html",
					nextContentUrl: "class.next-page@href",
				},
			}),
		]);

		const contentModule = result.data[0]?.content;
		expect(contentModule).toBeDefined();

		// content → text (in rules)
		expect(contentModule?.rules?.text).toBeDefined();
		expect(contentModule?.rules?.text?.[0]?.type).toBe("extract");

		// nextContentUrl → nextUrl (module-level)
		expect(contentModule?.nextUrl).toBeDefined();
	});

	it("parses replaceRegex ##-separated into ReplacePair[]", () => {
		const result = convertLegadoBookSources([
			makeSource({
				ruleContent: {
					content: "class.content@html",
					replaceRegex: "ads\\s*##spoiler\\s*",
				},
			}),
		]);

		const contentModule = result.data[0]?.content;
		expect(contentModule?.replaceRegex).toEqual([
			{ pattern: "ads\\s*", with: "" },
			{ pattern: "spoiler\\s*", with: "" },
		]);
	});

	it("produces empty replaceRegex when replaceRegex is empty string", () => {
		const result = convertLegadoBookSources([
			makeSource({
				ruleContent: {
					content: "class.content@html",
					replaceRegex: "",
				},
			}),
		]);

		const contentModule = result.data[0]?.content;
		expect(contentModule?.replaceRegex).toBeUndefined();
	});

	// ── 13. ruleBookInfo field mapping ────────────────────────────

	it("maps ruleBookInfo fields including init as separate field", () => {
		const result = convertLegadoBookSources([
			makeSource({
				ruleBookInfo: {
					init: "class.book-page",
					name: "class.title@text",
					author: "class.author@text",
					coverUrl: "tag.img@src",
					intro: "class.desc@text",
					kind: "class.genre@text",
					lastChapter: "class.latest@text",
					tocUrl: "class.toc-link@href",
					wordCount: "class.words@text",
				},
			}),
		]);

		const bookInfoModule = result.data[0]?.bookInfo;
		expect(bookInfoModule).toBeDefined();

		// init → bookInfo.rules.init
		expect(bookInfoModule?.rules?.init).toBeDefined();

		// coverUrl → cover
		expect(bookInfoModule?.rules?.cover).toBeDefined();
		// tocUrl → tocUrl (same name)
		expect(bookInfoModule?.rules?.tocUrl).toBeDefined();
	});

	// ── 14. @js: rules → ScriptStep pipeline ─────────────────────

	it("converts @js: rules to ScriptStep pipeline", () => {
		const result = convertLegadoBookSources([
			makeSource({
				ruleSearch: {
					bookList: "@js:JSON.parse(result).data",
				},
			}),
		]);

		// search module should not exist since no searchUrl
		// But ruleSearch without searchUrl should still produce search rules
		// Actually, without searchUrl, search module may be omitted entirely
		// Let's test with searchUrl
		const result2 = convertLegadoBookSources([
			makeSource({
				searchUrl: "https://example.com/search",
				ruleSearch: {
					bookList: "@js:JSON.parse(result).data",
				},
			}),
		]);

		const searchRules = result2.data[0]?.search?.rules;
		expect(searchRules?.list).toBeDefined();
		expect(searchRules?.list?.[0]?.type).toBe("script");
	});

	// ── 15. Full integration test ─────────────────────────────────

	it("converts a full realistic Legado book source", () => {
		const source: LegadoBookSource = {
			bookSourceUrl: "https://www.example.com",
			bookSourceName: "Example Source",
			bookSourceType: 0,
			bookSourceGroup: "中文, 玄幻, 热门",
			bookSourceComment: "A high-quality book source",
			bookUrlPattern: "https://www.example.com/book/\\d+",
			enabled: true,
			weight: 50,
			customOrder: 10,
			concurrentRate: "500",
			header: '{"User-Agent": "Mozilla/5.0"}',
			loginUrl: "https://www.example.com/login",
			lastUpdateTime: 1700000000000,
			searchUrl: "https://www.example.com/search?q={{key}}",
			exploreUrl:
				"推荐::https://www.example.com/recommend\n最新::https://www.example.com/latest\n热门",
			ruleSearch: {
				bookList: "@css:.book-list div",
				name: "class.book-name@text",
				author: "class.author@text",
				bookUrl: "tag.a@href",
				coverUrl: "tag.img@src",
				intro: "class.intro@text",
				kind: "class.kind@text",
				lastChapter: "class.latest-chapter@text",
				wordCount: "class.word-count@text",
				checkKeyWord: "keyword",
			},
			ruleBookInfo: {
				init: "@css:.book-detail",
				name: "class.book-name@text",
				author: "class.author-name@text",
				coverUrl: "tag.img@src",
				intro: "class.book-intro@text",
				kind: "class.book-kind@text",
				lastChapter: "class.last-chapter@text",
				tocUrl: "class.chapter-list@href",
				wordCount: "class.word-count@text",
			},
			ruleToc: {
				chapterList: "@css:.chapter-list dd",
				chapterName: "tag.a@text",
				chapterUrl: "tag.a@href",
				nextTocUrl: "class.next-page@href",
			},
			ruleContent: {
				content: "class.read-content@html",
				nextContentUrl: "class.next-page@href",
				replaceRegex: "ad-\\d+\\s*##watermark",
			},
		};

		const result = convertLegadoBookSources([source]);

		// Top-level
		const bs = result.data[0];
		expect(bs).toBeDefined();
		expect(bs?.$schema).toBe("readerx/book-source-rule/v1");
		expect(bs?.id).toBe("https://www.example.com");
		expect(bs?.baseUrl).toBe("https://www.example.com");
		expect(bs?.name).toBe("Example Source");
		expect(bs?.type).toBe("novel");
		expect(bs?.tags).toEqual(["中文", "玄幻", "热门"]);
		expect(bs?.description).toBe("A high-quality book source");
		expect(bs?.urlPattern).toBe("https://www.example.com/book/\\d+");
		expect(bs?.enabled).toBe(true);
		expect(bs?.weight).toBe(50);
		expect(bs?.order).toBe(10);
		expect(bs?.rateLimit).toBe(500);
		expect(bs?.headers).toEqual({ "User-Agent": "Mozilla/5.0" });
		expect(bs?.loginUrl).toBe("https://www.example.com/login");
		expect(bs?.updatedAt).toBe(new Date(1700000000000).toISOString());

		// Search module
		expect(bs?.search?.url).toBe("https://www.example.com/search?q={{key}}");
		expect(bs?.search?.checkKeyWord).toBe("keyword");
		expect(bs?.search?.rules?.list).toBeDefined();
		expect(bs?.search?.rules?.name).toBeDefined();
		expect(bs?.search?.rules?.url).toBeDefined(); // bookUrl → url
		expect(bs?.search?.rules?.cover).toBeDefined(); // coverUrl → cover

		// Explore module
		expect(bs?.explore?.categories).toHaveLength(3);
		expect(bs?.explore?.categories?.[0]).toEqual({
			title: "推荐",
			url: "https://www.example.com/recommend",
		});
		expect(bs?.explore?.categories?.[2]).toEqual({ title: "热门" });

		// BookInfo module
		expect(bs?.bookInfo?.rules?.init).toBeDefined();
		expect(bs?.bookInfo?.rules?.cover).toBeDefined();
		expect(bs?.bookInfo?.rules?.tocUrl).toBeDefined();

		// Toc module
		expect(bs?.toc?.rules?.list).toBeDefined();
		expect(bs?.toc?.rules?.name).toBeDefined(); // chapterName → name
		expect(bs?.toc?.rules?.url).toBeDefined(); // chapterUrl → url
		expect(bs?.toc?.nextUrl).toBeDefined(); // nextTocUrl → nextUrl

		// Content module
		expect(bs?.content?.rules?.text).toBeDefined(); // content → text
		expect(bs?.content?.nextUrl).toBeDefined(); // nextContentUrl → nextUrl
		expect(bs?.content?.replaceRegex).toEqual([
			{ pattern: "ad-\\d+\\s*", with: "" },
			{ pattern: "watermark", with: "" },
		]);

		// Report
		expect(result.report.totalRules).toBeGreaterThan(0);
		expect(result.report.convertedRules).toBeGreaterThan(0);
	});

	// ── 16. Multiple sources ──────────────────────────────────────

	it("converts multiple sources and aggregates report", () => {
		const sources: readonly LegadoBookSource[] = [
			makeSource({
				bookSourceUrl: "https://a.com",
				bookSourceName: "Source A",
				searchUrl: "https://a.com/search",
				ruleSearch: { bookList: "@css:.list div" },
			}),
			makeSource({
				bookSourceUrl: "https://b.com",
				bookSourceName: "Source B",
				searchUrl: "https://b.com/search",
				ruleSearch: { bookList: "@js:complex.code" },
			}),
		];

		const result = convertLegadoBookSources(sources);

		expect(result.data).toHaveLength(2);
		expect(result.data[0]?.name).toBe("Source A");
		expect(result.data[1]?.name).toBe("Source B");
		expect(result.report.totalRules).toBeGreaterThan(0);
	});

	// ── 17. Empty input ───────────────────────────────────────────

	it("handles empty input array", () => {
		const result = convertLegadoBookSources([]);

		expect(result.data).toEqual([]);
		expect(result.report.totalRules).toBe(0);
		expect(result.report.convertedRules).toBe(0);
		expect(result.report.partialConvertedRules).toBe(0);
		expect(result.report.scriptFallbackRules).toBe(0);
		expect(result.warnings).toEqual([]);
	});

	// ── 18. Missing required fields ───────────────────────────────

	it("defaults name to empty string when bookSourceName is missing", () => {
		const result = convertLegadoBookSources([
			{ bookSourceUrl: "https://example.com" },
		]);

		expect(result.data[0]?.name).toBe("");
	});

	it("defaults id and baseUrl to empty string when bookSourceUrl is missing", () => {
		const result = convertLegadoBookSources([
			{ bookSourceName: "NoUrl" },
		]);

		expect(result.data[0]?.id).toBe("");
		expect(result.data[0]?.baseUrl).toBe("");
	});

	// ── 19. Omit undefined optional fields ────────────────────────

	it("omits optional fields when source values are undefined", () => {
		const result = convertLegadoBookSources([makeSource()]);

		const bs = result.data[0];
		expect(bs).toBeDefined();
		expect(bs?.tags).toBeUndefined();
		expect(bs?.description).toBeUndefined();
		expect(bs?.urlPattern).toBeUndefined();
		expect(bs?.loginUrl).toBeUndefined();
		expect(bs?.rateLimit).toBeUndefined();
		expect(bs?.headers).toBeUndefined();
		expect(bs?.updatedAt).toBeUndefined();
	});

	// ── 20. ruleExplore shares field mapping with ruleSearch ──────

	it("maps ruleExplore fields same as ruleSearch into explore.rules", () => {
		const result = convertLegadoBookSources([
			makeSource({
				exploreUrl: "A::https://example.com/a",
				ruleExplore: {
					bookList: "@css:.list div",
					name: "class.title@text",
					author: "class.author@text",
					bookUrl: "tag.a@href",
				},
			}),
		]);

		const exploreRules = result.data[0]?.explore?.rules;
		expect(exploreRules).toBeDefined();
		expect(exploreRules?.list).toBeDefined();
		expect(exploreRules?.name).toBeDefined();
		expect(exploreRules?.url).toBeDefined(); // bookUrl → url
		expect(exploreRules?.author).toBeDefined();
	});
});
