// @vitest-environment jsdom

import type { ContentModule } from "@readerx/rule-engine";
import { describe, expect, it } from "vitest";
import { decodeBody } from "../src/content/charset-decoder";
import {
	detectCharsetFromHeaders,
	fetchRaw,
} from "../src/content/content-fetcher";
import { fetchAndParse } from "../src/content/content-pipeline";
import type { ReplaceRule } from "../src/content/types";
import type {
	HttpFetcher,
	HttpFetcherResponse,
} from "../src/contracts/http-fetcher";
import type {
	InlineStyle,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "../src/layout/types";
import { toRenderModel } from "../src/renderer/render-model";

// ---------------------------------------------------------------------------
// decodeBody
// ---------------------------------------------------------------------------

describe("decodeBody", () => {
	it("decodes UTF-8 by default", () => {
		const text = "Hello, world!";
		const bytes = new TextEncoder().encode(text);
		expect(decodeBody(bytes)).toBe(text);
	});

	it("decodes with an explicit charset", () => {
		const text = "Hello";
		const bytes = new TextEncoder().encode(text);
		expect(decodeBody(bytes, "utf-8")).toBe(text);
	});

	it("falls back to UTF-8 for unsupported charset", () => {
		const text = "fallback";
		const bytes = new TextEncoder().encode(text);
		// "bogus-charset" is not a valid encoding label
		expect(decodeBody(bytes, "bogus-charset")).toBe(text);
	});

	it("handles empty byte array", () => {
		expect(decodeBody(new Uint8Array(0))).toBe("");
	});
});

// ---------------------------------------------------------------------------
// detectCharsetFromHeaders
// ---------------------------------------------------------------------------

describe("detectCharsetFromHeaders", () => {
	it("extracts charset from Content-Type header", () => {
		expect(
			detectCharsetFromHeaders({ "content-type": "text/html; charset=gbk" }),
		).toBe("gbk");
	});

	it("extracts charset with uppercase header key", () => {
		expect(
			detectCharsetFromHeaders({ "Content-Type": "text/html; charset=UTF-8" }),
		).toBe("UTF-8");
	});

	it("returns undefined when no Content-Type header", () => {
		expect(detectCharsetFromHeaders({})).toBeUndefined();
	});

	it("returns undefined when Content-Type has no charset", () => {
		expect(
			detectCharsetFromHeaders({ "content-type": "text/html" }),
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// fetchRaw
// ---------------------------------------------------------------------------

describe("fetchRaw", () => {
	it("returns body and detected charset from headers", async () => {
		const body = new TextEncoder().encode("hello");
		const mockFetcher: HttpFetcher = {
			async fetch(
				_url: string,
				_options: unknown,
			): Promise<HttpFetcherResponse> {
				return {
					ok: true,
					status: 200,
					body,
					headers: { "content-type": "text/html; charset=utf-8" },
				};
			},
		};

		const result = await fetchRaw(mockFetcher, "https://example.com");
		expect(result.body).toBe(body);
		expect(result.detectedCharset).toBe("utf-8");
	});

	it("returns undefined charset when header is absent", async () => {
		const body = new TextEncoder().encode("hello");
		const mockFetcher: HttpFetcher = {
			async fetch(
				_url: string,
				_options: unknown,
			): Promise<HttpFetcherResponse> {
				return {
					ok: true,
					status: 200,
					body,
					headers: {},
				};
			},
		};

		const result = await fetchRaw(mockFetcher, "https://example.com");
		expect(result.detectedCharset).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// toRenderModel
// ---------------------------------------------------------------------------

describe("toRenderModel", () => {
	const defaultDimensions: PageDimensions = {
		width: 600,
		height: 800,
		contentHeight: 720,
		paddingTop: 40,
		paddingBottom: 40,
		paddingLeft: 30,
		paddingRight: 30,
	};

	it("maps an empty LayoutResult to an empty RenderResult", () => {
		const layout: LayoutResult = { pages: [], totalPages: 0 };
		const result = toRenderModel(layout);

		expect(result.pages).toHaveLength(0);
		expect(result.totalPages).toBe(0);
	});

	it("maps a single-page LayoutResult with one line and one run", () => {
		const style: InlineStyle = { bold: true };

		const run: LayoutRun = {
			text: "Hello",
			x: 0,
			width: 50,
			style,
			sourceNodeId: "node-1",
		};

		const line: LayoutLine = {
			runs: [run],
			x: 30,
			y: 40,
			width: 540,
			height: 24,
		};

		const page: LayoutPage = {
			index: 0,
			lines: [line],
			dimensions: defaultDimensions,
		};

		const layout: LayoutResult = { pages: [page], totalPages: 1 };
		const result = toRenderModel(layout);

		expect(result.totalPages).toBe(1);
		expect(result.pages).toHaveLength(1);

		const renderPage = result.pages[0];
		expect(renderPage).toBeDefined();
		if (renderPage === undefined) return;

		expect(renderPage.index).toBe(0);
		expect(renderPage.lines).toHaveLength(1);
		expect(renderPage.dimensions).toEqual(defaultDimensions);

		const renderLine = renderPage.lines[0];
		expect(renderLine).toBeDefined();
		if (renderLine === undefined) return;

		expect(renderLine.x).toBe(30);
		expect(renderLine.y).toBe(40);
		expect(renderLine.width).toBe(540);
		expect(renderLine.height).toBe(24);
		expect(renderLine.runs).toHaveLength(1);

		const renderRun = renderLine.runs[0];
		expect(renderRun).toBeDefined();
		if (renderRun === undefined) return;

		expect(renderRun.text).toBe("Hello");
		expect(renderRun.x).toBe(0);
		expect(renderRun.width).toBe(50);
		expect(renderRun.style).toEqual({ bold: true });
		expect(renderRun.sourceNodeId).toBe("node-1");
	});

	it("maps a multi-page LayoutResult correctly", () => {
		const run: LayoutRun = {
			text: "Page content",
			x: 0,
			width: 100,
			sourceNodeId: "n1",
		};

		const line: LayoutLine = {
			runs: [run],
			x: 0,
			y: 0,
			width: 100,
			height: 20,
		};

		const pages: readonly LayoutPage[] = [
			{ index: 0, lines: [line], dimensions: defaultDimensions },
			{ index: 1, lines: [line], dimensions: defaultDimensions },
		];

		const layout: LayoutResult = { pages, totalPages: 2 };
		const result = toRenderModel(layout);

		expect(result.totalPages).toBe(2);
		expect(result.pages).toHaveLength(2);
		expect(result.pages[0]?.index).toBe(0);
		expect(result.pages[1]?.index).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// fetchAndParse
// ---------------------------------------------------------------------------

describe("fetchAndParse", () => {
	function createMockFetcher(htmlBody: string): HttpFetcher {
		const body = new TextEncoder().encode(htmlBody);
		return {
			async fetch(
				_url: string,
				_options: unknown,
			): Promise<HttpFetcherResponse> {
				return {
					ok: true,
					status: 200,
					body,
					headers: { "content-type": "text/html; charset=utf-8" },
				};
			},
		};
	}

	const htmlWithContent = `<!DOCTYPE html>
<html><head><title>Test Page</title></head>
<body>
<div class="content"><p>Hello World</p><p>Second paragraph</p></div>
</body></html>`;

	function makeContentModule(
		overrides: Partial<ContentModule> = {},
	): ContentModule {
		return {
			rules: {
				text: [
					{
						type: "extract" as const,
						engine: "css" as const,
						selector: ".content",
						output: "text" as const,
					},
				],
			},
			...overrides,
		};
	}

	it("fetches HTML, extracts content, and returns a Document", async () => {
		const mockFetcher = createMockFetcher(htmlWithContent);
		const contentModule = makeContentModule();

		const doc = await fetchAndParse(
			{ httpFetcher: mockFetcher },
			{ contentModule, url: "https://example.com/page1" },
		);

		expect(doc.type).toBe("document");
		expect(doc.children.length).toBeGreaterThanOrEqual(1);
	});

	it("extracts title when contentModule has title rule", async () => {
		const mockFetcher = createMockFetcher(htmlWithContent);
		const contentModule = makeContentModule({
			rules: {
				text: [
					{
						type: "extract",
						engine: "css",
						selector: ".content",
						output: "text",
					},
				],
				title: [
					{ type: "extract", engine: "css", selector: "title", output: "text" },
				],
			},
		});

		const doc = await fetchAndParse(
			{ httpFetcher: mockFetcher },
			{ contentModule, url: "https://example.com/page1" },
		);

		expect(doc.meta?.title).toBe("Test Page");
	});

	it("parses plain text content when no HTML tags in extracted content", async () => {
		const plainTextFetcher: HttpFetcher = {
			async fetch(
				_url: string,
				_options: unknown,
			): Promise<HttpFetcherResponse> {
				// Return HTML page whose extracted content is plain text
				const html = `<!DOCTYPE html>
<html><body><div class="text-content">Just plain text here.</div></body></html>`;
				const body = new TextEncoder().encode(html);
				return {
					ok: true,
					status: 200,
					body,
					headers: {},
				};
			},
		};

		const contentModule: ContentModule = {
			rules: {
				text: [
					{
						type: "extract",
						engine: "css",
						selector: ".text-content",
						output: "text",
					},
				],
			},
		};

		const doc = await fetchAndParse(
			{ httpFetcher: plainTextFetcher },
			{ contentModule, url: "https://example.com/page1" },
		);

		expect(doc.type).toBe("document");
		// The extracted content "Just plain text here." has no HTML tags,
		// so parseTextToDocument is used, producing one paragraph
		expect(doc.children.length).toBeGreaterThanOrEqual(1);
	});

	it("applies replace rules when provided", async () => {
		const mockFetcher = createMockFetcher(htmlWithContent);
		const contentModule = makeContentModule();
		const replaceRules: ReplaceRule[] = [
			{
				id: 1,
				name: "replace Hello",
				pattern: "Hello",
				replacement: "Goodbye",
				scopeTitle: true,
				scopeContent: true,
				isEnabled: true,
				isRegex: false,
				order: 0,
			},
		];

		const doc = await fetchAndParse(
			{ httpFetcher: mockFetcher },
			{
				contentModule,
				url: "https://example.com/page1",
				replaceRules,
			},
		);

		expect(doc.type).toBe("document");
		// Verify the document was processed — at least one child exists
		expect(doc.children.length).toBeGreaterThanOrEqual(1);
	});

	it("returns document without replace rules when replaceRules is empty", async () => {
		const mockFetcher = createMockFetcher(htmlWithContent);
		const contentModule = makeContentModule();

		const doc = await fetchAndParse(
			{ httpFetcher: mockFetcher },
			{
				contentModule,
				url: "https://example.com/page1",
				replaceRules: [],
			},
		);

		expect(doc.type).toBe("document");
		expect(doc.children.length).toBeGreaterThanOrEqual(1);
	});

	it("works without a title rule", async () => {
		const mockFetcher = createMockFetcher(htmlWithContent);
		const contentModule = makeContentModule();

		const doc = await fetchAndParse(
			{ httpFetcher: mockFetcher },
			{ contentModule, url: "https://example.com/page1" },
		);

		expect(doc.meta?.title).toBeUndefined();
	});
});
