import type { ContentModule, Rule } from "@readerx/rule-engine";
import { evaluateRule } from "@readerx/rule-engine";
import { describe, expect, it, vi } from "vitest";
import { extractContent } from "../src/content/content-extractor";

// Mock the rule-engine evaluateRule
vi.mock("@readerx/rule-engine", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@readerx/rule-engine")>();
	return {
		...actual,
		evaluateRule: vi.fn(),
	};
});

// --- Helpers ---

function makeContentModule(
	rule: Rule = [{ type: "extract", engine: "css", selector: ".content" }],
	overrides: Partial<ContentModule> = {},
): ContentModule {
	return {
		rules: { text: rule },
		...overrides,
	};
}

// --- Tests ---

describe("extractContent", () => {
	it("extracts HTML content and detects isHtml=true", async () => {
		const htmlContent = '<div class="content"><p>Hello world</p></div>';
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: true,
			value: [htmlContent],
		});

		const result = await extractContent("<html></html>", makeContentModule());

		expect(result.content).toBe(htmlContent);
		expect(result.isHtml).toBe(true);
	});

	it("detects plain text as isHtml=false", async () => {
		const plainText = "Just a plain text paragraph with no tags.";
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: true,
			value: [plainText],
		});

		const result = await extractContent("source", makeContentModule());

		expect(result.content).toBe(plainText);
		expect(result.isHtml).toBe(false);
	});

	it("returns empty content when rule matches nothing", async () => {
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: true,
			value: [""],
		});

		const result = await extractContent("source", makeContentModule());

		expect(result.content).toBe("");
		expect(result.isHtml).toBe(false);
	});

	it("throws when content extraction fails", async () => {
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: false,
			error: { code: "INVALID_SELECTOR", message: "CSS selector not found" },
		});

		await expect(extractContent("source", makeContentModule())).rejects.toThrow(
			"Content extraction failed",
		);
	});

	it("throws with error message when extraction fails", async () => {
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: false,
			error: { code: "INVALID_SELECTOR", message: "bad selector" },
		});

		await expect(extractContent("source", makeContentModule())).rejects.toThrow(
			"Content extraction failed",
		);
	});

	it("detects HTML from content with any HTML tag", async () => {
		const contentWithSpan = "Text <span>with span</span> inside";
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: true,
			value: [contentWithSpan],
		});

		const result = await extractContent("source", makeContentModule());

		expect(result.isHtml).toBe(true);
	});

	it("joins multiple result values with newlines", async () => {
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: true,
			value: ["<p>para1</p>", "<p>para2</p>"],
		});

		const result = await extractContent("source", makeContentModule());

		expect(result.content).toBe("<p>para1</p>\n<p>para2</p>");
		expect(result.isHtml).toBe(true);
	});

	it("throws when content rule is empty", async () => {
		const module = makeContentModule([]);

		await expect(extractContent("source", module)).rejects.toThrow(
			"Content rule is empty or not defined",
		);
	});

	it("throws when content rule is undefined", async () => {
		const module: ContentModule = { rules: {} };

		await expect(extractContent("source", module)).rejects.toThrow(
			"Content rule is empty or not defined",
		);
	});

	it("handles content with nested HTML tags", async () => {
		const nestedHtml =
			"<div><p><strong>Bold</strong> and <em>italic</em></p></div>";
		vi.mocked(evaluateRule).mockResolvedValue({
			ok: true,
			value: [nestedHtml],
		});

		const result = await extractContent("source", makeContentModule());

		expect(result.isHtml).toBe(true);
		expect(result.content).toBe(nestedHtml);
	});
});
