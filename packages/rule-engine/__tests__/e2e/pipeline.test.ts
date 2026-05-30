/**
 * End-to-end integration tests for the rule engine.
 * Tests real-world scenarios: HTML book source extraction,
 * JSON API parsing, replace rules, TXT TOC detection.
 */
import { describe, expect, it } from "vitest";
import type {
	EvalContext,
	ReplaceRule,
	Rule,
	TxtTocRule,
} from "../../src/index.js";
import {
	applyReplaceRules,
	compileRule,
	createDocumentCache,
	evaluateCompiled,
	evaluateRule,
	findChapterBoundaries,
	resolveUrl,
	validateBookSource,
	validateReplaceRuleFile,
} from "../../src/index.js";

// ---- Realistic HTML ----

const BOOK_LIST_HTML = `
<!DOCTYPE html>
<html>
<body>
<div class="result-list">
  <div class="book-item">
    <h3 class="book-name"><a href="/book/1001.html">斗破苍穹</a></h3>
    <span class="author">天蚕土豆</span>
    <span class="kind">玄幻</span>
    <p class="intro">三十年河东三十年河西...</p>
    <img class="cover" src="/covers/1001.jpg" />
  </div>
  <div class="book-item">
    <h3 class="book-name"><a href="/book/1002.html">凡人修仙传</a></h3>
    <span class="author">忘语</span>
    <span class="kind">仙侠</span>
    <p class="intro">一个普通山村少年...</p>
    <img class="cover" src="/covers/1002.jpg" />
  </div>
  <div class="book-item">
    <h3 class="book-name"><a href="/book/1003.html">遮天</a></h3>
    <span class="author">辰东</span>
    <span class="kind">玄幻</span>
    <p class="intro">冰冷与黑暗并存的宇宙深处...</p>
    <img class="cover" src="/covers/1003.jpg" />
  </div>
</div>
</body>
</html>
`;

const CHAPTER_HTML = `
<div id="content">
  <h1 class="chapter-title">第一章 开始</h1>
  <div class="ad-banner">广告内容</div>
  <p>这是正文内容第一段。</p>
  <p>这是正文内容第二段。</p>
  <div class="ad-banner">另一条广告</div>
  <p>这是正文内容第三段。</p>
</div>
<div class="pager">
  <a href="/chapter/1.html" class="prev">上一章</a>
  <a href="/chapter/3.html" class="next">下一章</a>
</div>
`;

const JSON_API = JSON.stringify({
	code: 0,
	data: {
		total: 2,
		list: [
			{ id: 1, title: "Chapter 1", url: "/read/1" },
			{ id: 2, title: "Chapter 2", url: "/read/2" },
		],
	},
});

// ---- E2E: Book search result extraction ----

describe("E2E: Book search extraction", () => {
	it("extracts book list with multi-field pipeline", async () => {
		const nameRule: Rule = [
			{
				type: "extract",
				engine: "css",
				selector: ".book-name a",
				output: "text",
			},
		];
		const result = await evaluateRule(nameRule, BOOK_LIST_HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["斗破苍穹", "凡人修仙传", "遮天"]);
	});

	it("extracts author names", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".author", output: "text" },
		];
		const result = await evaluateRule(rule, BOOK_LIST_HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["天蚕土豆", "忘语", "辰东"]);
	});

	it("extracts cover URLs with attr output", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "css",
				selector: ".cover",
				output: "attr",
				attr: "src",
			},
		];
		const result = await evaluateRule(rule, BOOK_LIST_HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual([
			"/covers/1001.jpg",
			"/covers/1002.jpg",
			"/covers/1003.jpg",
		]);
	});

	it("extracts book URLs with scope chaining", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".book-item" },
			{
				type: "extract",
				engine: "css",
				selector: ".book-name a",
				output: "attr",
				attr: "href",
			},
		];
		const result = await evaluateRule(rule, BOOK_LIST_HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual([
			"/book/1001.html",
			"/book/1002.html",
			"/book/1003.html",
		]);
	});
});

// ---- E2E: Chapter content extraction ----

describe("E2E: Chapter content extraction", () => {
	it("extracts and cleans chapter text", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: "#content" },
			{
				type: "transform",
				category: "dom",
				action: "remove",
				selector: ".ad-banner",
			},
			{
				type: "extract",
				engine: "css",
				selector: "p",
				output: "text",
				scope: "current",
			},
		];
		const result = await evaluateRule(rule, CHAPTER_HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual([
			"这是正文内容第一段。",
			"这是正文内容第二段。",
			"这是正文内容第三段。",
		]);
	});

	it("extracts next chapter URL", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "css",
				selector: ".next",
				output: "attr",
				attr: "href",
			},
		];
		const result = await evaluateRule(rule, CHAPTER_HTML);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["/chapter/3.html"]);
	});
});

// ---- E2E: JSON API extraction ----

describe("E2E: JSON API extraction", () => {
	it("extracts chapter list from JSON", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "jsonpath",
				selector: "$.data.list[*].title",
			},
		];
		const result = await evaluateRule(rule, JSON_API);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["Chapter 1", "Chapter 2"]);
	});

	it("extracts chapter URLs from JSON", async () => {
		const rule: Rule = [
			{
				type: "extract",
				engine: "jsonpath",
				selector: "$.data.list[*].url",
			},
		];
		const result = await evaluateRule(rule, JSON_API);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value).toEqual(["/read/1", "/read/2"]);
	});
});

// ---- E2E: Replace rules ----

describe("E2E: Replace rules", () => {
	it("removes ads from chapter text", async () => {
		const text = "正文内容【广告：点击下载】更多内容【推广：扫码关注】";
		const rules: ReplaceRule[] = [
			{ name: "remove-ads", pattern: "【.*?】", replacement: "" },
		];
		const result = await applyReplaceRules(text, rules);
		expect(result).toBe("正文内容更多内容");
	});
});

// ---- E2E: TXT TOC detection ----

describe("E2E: TXT TOC detection", () => {
	it("detects chapter boundaries in TXT file", () => {
		const lines = [
			"书名：测试小说",
			"作者：测试",
			"",
			"第一章 初出茅庐",
			"这是第一章的内容。",
			"内容继续。",
			"",
			"第二章 小试牛刀",
			"这是第二章的内容。",
			"",
			"第三章 大展身手",
			"这是第三章的内容。",
		];

		const rules: TxtTocRule[] = [
			{
				name: "chapter",
				pattern: "^第[一二三四五六七八九十百千万零\\d]+[章节]",
			},
		];

		const boundaries = findChapterBoundaries(lines, rules);
		expect(boundaries).toHaveLength(3);
		expect(boundaries[0]?.title).toBe("第一章");
		expect(boundaries[1]?.title).toBe("第二章");
		expect(boundaries[2]?.title).toBe("第三章");
	});
});

// ---- E2E: URL resolution ----

describe("E2E: URL resolution", () => {
	it("resolves search URL with key variable", () => {
		const ctx: EvalContext = {
			baseUrl: "https://www.example.com",
			variables: { key: "斗破苍穹" },
		};
		const url = resolveUrl("/search?q={{key}}", ctx);
		// new URL encodes non-ASCII characters
		expect(url).toBe(
			"https://www.example.com/search?q=%E6%96%97%E7%A0%B4%E8%8B%8D%E7%A9%B9",
		);
	});

	it("resolves paginated URL", () => {
		const ctx: EvalContext = {
			baseUrl: "https://www.example.com",
			variables: { key: "test" },
			page: 2,
		};
		const url = resolveUrl("/search?q={{key}}&page={{page}}", ctx);
		expect(url).toBe("https://www.example.com/search?q=test&page=2");
	});
});

// ---- E2E: Compile once, evaluate many ----

describe("E2E: Compiled rule reuse", () => {
	it("compiles a rule and reuses across different content", async () => {
		const rule: Rule = [
			{ type: "extract", engine: "css", selector: ".item", output: "text" },
		];
		const compiled = compileRule(rule);
		expect(compiled.ok).toBe(true);
		if (!compiled.ok) return;

		const html1 = '<div class="item">A</div><div class="item">B</div>';
		const r1 = await evaluateCompiled(compiled.value, html1);
		expect(r1.ok).toBe(true);
		if (!r1.ok) return;
		expect(r1.value).toEqual(["A", "B"]);

		const html2 =
			'<div class="item">X</div><div class="item">Y</div><div class="item">Z</div>';
		const r2 = await evaluateCompiled(compiled.value, html2);
		expect(r2.ok).toBe(true);
		if (!r2.ok) return;
		expect(r2.value).toEqual(["X", "Y", "Z"]);
	});
});

// ---- E2E: DocumentCache ----

describe("E2E: DocumentCache with evaluation", () => {
	it("uses cache for repeated evaluations", async () => {
		const cache = createDocumentCache();
		const ctx: EvalContext = { documentCache: cache };

		const rule: Rule = [
			{ type: "extract", engine: "css", selector: "p", output: "text" },
		];

		const html = "<p>Hello</p><p>World</p>";
		const r1 = await evaluateRule(rule, html, ctx);
		expect(r1.ok).toBe(true);
		if (!r1.ok) return;
		expect(r1.value).toEqual(["Hello", "World"]);

		// Second call should use cached document
		const r2 = await evaluateRule(rule, html, ctx);
		expect(r2.ok).toBe(true);
		if (!r2.ok) return;
		expect(r2.value).toEqual(["Hello", "World"]);

		cache.dispose();
	});
});

// ---- E2E: Schema validation ----

describe("E2E: Schema validation", () => {
	it("validates a valid replace rule file", () => {
		const result = validateReplaceRuleFile({
			$schema: "readerx/replace-rule/v1",
			rules: [{ name: "clean-ads", pattern: "广告.*", replacement: "" }],
		});
		expect(result.ok).toBe(true);
	});

	it("validates a valid book source", () => {
		const result = validateBookSource({
			$schema: "readerx/book-source-rule/v1",
			id: "test",
			name: "Test",
			type: "novel",
			baseUrl: "https://example.com",
		});
		expect(result.ok).toBe(true);
	});
});
