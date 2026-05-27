import { describe, expect, it, vi } from "vitest";
import type {
	AnalyzeRule,
	ContentRule,
	JsEvalContext,
	JsEvalResult,
	JsExecutor,
	ParseResult,
} from "@readerx/rule-engine";
import { extractContent } from "../src/content/content-extractor";

// --- Helpers ---

function successResult(value: string): ParseResult {
	return { ok: true, value, values: [value] };
}

function failureResult(error: string): ParseResult {
	return { ok: false, error };
}

interface MockAnalyzerState {
	jsExecutorSet: boolean;
}

/**
 * Create a mock AnalyzeRule that only implements the methods used by
 * extractContent: setJsExecutor and getString.
 */
function createMockAnalyzer(
	getStringResult: ParseResult,
	state?: MockAnalyzerState,
): AnalyzeRule {
	return {
		setContent: vi.fn(),
		setJsExecutor: vi.fn((_executor: JsExecutor) => {
			if (state) {
				state.jsExecutorSet = true;
			}
		}),
		setEvalContext: vi.fn(),
		getContent: vi.fn(() => ""),
		getContentType: vi.fn(() => "html"),
		getString: vi.fn(async (_rule: string) => getStringResult),
		getStringList: vi.fn(async (_rule: string) => getStringResult),
		getElements: vi.fn(async (_rule: string) => getStringResult),
		getStringSync: vi.fn((_rule: string) => getStringResult),
		getStringListSync: vi.fn((_rule: string) => getStringResult),
		getElementsSync: vi.fn((_rule: string) => getStringResult),
		detectRuleMode: vi.fn(() => "default"),
	} as unknown as AnalyzeRule;
}

function makeContentRule(overrides: Partial<ContentRule> = {}): ContentRule {
	return {
		content: ".content",
		...overrides,
	};
}

// --- Tests ---

describe("extractContent", () => {
	it("extracts HTML content and detects isHtml=true", async () => {
		const htmlContent =
			'<div class="content"><p>Hello world</p></div>';
		const analyzer = createMockAnalyzer(successResult(htmlContent));
		const rule = makeContentRule();

		const result = await extractContent(analyzer, rule);

		expect(result.content).toBe(htmlContent);
		expect(result.isHtml).toBe(true);
	});

	it("detects plain text as isHtml=false", async () => {
		const plainText = "Just a plain text paragraph with no tags.";
		const analyzer = createMockAnalyzer(successResult(plainText));
		const rule = makeContentRule();

		const result = await extractContent(analyzer, rule);

		expect(result.content).toBe(plainText);
		expect(result.isHtml).toBe(false);
	});

	it("returns empty content when rule matches nothing", async () => {
		const analyzer = createMockAnalyzer(successResult(""));
		const rule = makeContentRule();

		const result = await extractContent(analyzer, rule);

		expect(result.content).toBe("");
		expect(result.isHtml).toBe(false);
	});

	it("throws when content extraction fails", async () => {
		const analyzer = createMockAnalyzer(
			failureResult("CSS selector not found"),
		);
		const rule = makeContentRule();

		await expect(extractContent(analyzer, rule)).rejects.toThrow(
			"Content extraction failed: CSS selector not found",
		);
	});

	it("throws with 'unknown' when error is undefined", async () => {
		const analyzer = createMockAnalyzer(failureResult("unknown"));
		const rule = makeContentRule();

		await expect(extractContent(analyzer, rule)).rejects.toThrow(
			"Content extraction failed: unknown",
		);
	});

	it("detects HTML from content with any HTML tag", async () => {
		const contentWithSpan = "Text <span>with span</span> inside";
		const analyzer = createMockAnalyzer(successResult(contentWithSpan));
		const rule = makeContentRule();

		const result = await extractContent(analyzer, rule);

		expect(result.isHtml).toBe(true);
	});

	it("calls setJsExecutor when jsExecutor is provided", async () => {
		const state: MockAnalyzerState = { jsExecutorSet: false };
		const analyzer = createMockAnalyzer(
			successResult("<p>test</p>"),
			state,
		);

		const mockJsExecutor: JsExecutor = {
			async eval(
				_code: string,
				_context: JsEvalContext,
			): Promise<JsEvalResult> {
				return { success: true, value: "js result" };
			},
		};

		const rule = makeContentRule();
		const result = await extractContent(analyzer, rule, mockJsExecutor);

		expect(state.jsExecutorSet).toBe(true);
		expect(result.content).toBe("<p>test</p>");
	});

	it("does not call setJsExecutor when jsExecutor is undefined", async () => {
		const state: MockAnalyzerState = { jsExecutorSet: false };
		const analyzer = createMockAnalyzer(successResult("text"), state);
		const rule = makeContentRule();

		const result = await extractContent(analyzer, rule);

		expect(state.jsExecutorSet).toBe(false);
		expect(result.content).toBe("text");
	});

	it("handles content with nested HTML tags", async () => {
		const nestedHtml =
			"<div><p><strong>Bold</strong> and <em>italic</em></p></div>";
		const analyzer = createMockAnalyzer(successResult(nestedHtml));
		const rule = makeContentRule();

		const result = await extractContent(analyzer, rule);

		expect(result.isHtml).toBe(true);
		expect(result.content).toBe(nestedHtml);
	});

	it("passes the content rule string to getString", async () => {
		const analyzer = createMockAnalyzer(successResult("result"));
		const rule = makeContentRule({ content: "#main-content" });

		await extractContent(analyzer, rule);

		// Verify getString was called with the rule's content string
		const mockGetString = analyzer.getString as ReturnType<typeof vi.fn>;
		expect(mockGetString).toHaveBeenCalledWith("#main-content");
	});
});
