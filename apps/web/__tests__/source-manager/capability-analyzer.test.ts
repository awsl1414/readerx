import { describe, expect, it } from "vitest";
import { analyzeCapabilities } from "@/features/source-manager/lib/capability-analyzer";

describe("analyzeCapabilities", () => {
	it("detects pure CSS/XPath source as full compatibility", () => {
		const result = analyzeCapabilities({
			enabledCookieJar: false,
			ruleSearch: {
				bookList: "class.book-list",
				name: "tag.a.0@text",
				bookUrl: "tag.a.0@href",
			},
			ruleContent: {
				content: "class.content@html",
			},
		});
		expect(result.usesJs).toBe(false);
		expect(result.usesCookieJar).toBe(false);
		expect(result.usesWebView).toBe(false);
		expect(result.usesJavaApi).toBe(false);
		expect(result.webCompatibility).toBe("full");
	});

	it("detects @js: prefix as JS usage", () => {
		const result = analyzeCapabilities({
			searchUrl: "@js:baseUrl + '/search?q=' + key",
			ruleSearch: { bookList: "$.data" },
		});
		expect(result.usesJs).toBe(true);
		expect(result.webCompatibility).toBe("partial");
	});

	it("detects <js> inline blocks as JS usage", () => {
		const result = analyzeCapabilities({
			ruleToc: {
				chapterList: "<js>result.split('\\n')</js>",
			},
		});
		expect(result.usesJs).toBe(true);
	});

	it("detects java.ajax as Java API usage", () => {
		const result = analyzeCapabilities({
			ruleBookInfo: {
				author: "$.author",
				init: "<js>java.ajax('http://example.com');</js>",
			},
		});
		expect(result.usesJavaApi).toBe(true);
		expect(result.webCompatibility).toBe("partial");
	});

	it("detects startBrowserAwait as WebView usage", () => {
		const result = analyzeCapabilities({
			loginUrl: "java.startBrowserAwait('https://example.com')",
		});
		expect(result.usesWebView).toBe(true);
		expect(result.webCompatibility).toBe("unsupported");
	});

	it("detects enabledCookieJar", () => {
		const result = analyzeCapabilities({
			enabledCookieJar: true,
		});
		expect(result.usesCookieJar).toBe(true);
	});

	it("detects nextContentUrl as multi-page", () => {
		const result = analyzeCapabilities({
			ruleContent: {
				content: "class.text",
				nextContentUrl: "class.next-page@href",
			},
		});
		expect(result.usesMultiPage).toBe(true);
	});

	it("handles empty source", () => {
		const result = analyzeCapabilities({});
		expect(result.usesJs).toBe(false);
		expect(result.webCompatibility).toBe("full");
	});
});
