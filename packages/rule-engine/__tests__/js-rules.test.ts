import { describe, expect, it, vi } from "vitest";
import { AnalyzeRule } from "../src/analyzer";
import type { JsExecutor, JsEvalContext } from "../src/types";

function createMockExecutor(
	impl?: (code: string, context: JsEvalContext) => unknown,
): JsExecutor {
	return {
		async eval(code: string, context: JsEvalContext) {
			try {
				const value = impl ? impl(code, context) : undefined;
				return { success: true, value };
			} catch (e) {
				return {
					success: false,
					value: undefined,
					error: e instanceof Error ? e.message : String(e),
				};
			}
		},
	};
}

describe("AnalyzeRule JS rules", () => {
	it("returns error when JS rule has no executor", async () => {
		const analyzer = new AnalyzeRule();
		analyzer.setContent("<div>hello</div>");
		const result = await analyzer.getString("@js:result.toUpperCase()");
		expect(result.ok).toBe(false);
		expect(result.error).toContain("JsExecutor");
	});

	it("executes JS rule via executor", async () => {
		const executor = createMockExecutor(() => "JS_RESULT");
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div>hello</div>");
		const result = await analyzer.getString("@js:result.toUpperCase()");
		expect(result.ok).toBe(true);
		expect(result.value).toBe("JS_RESULT");
	});

	it("executes inline <js> block", async () => {
		const executor = createMockExecutor(() => "INLINE_RESULT");
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div>text</div>");
		const result = await analyzer.getString("<js>result.toUpperCase()</js>");
		expect(result.ok).toBe(true);
		expect(result.value).toBe("INLINE_RESULT");
	});

	it("getStringSync returns error for JS rules", () => {
		const analyzer = new AnalyzeRule();
		analyzer.setContent("<div>hello</div>");
		const result = analyzer.getStringSync("@js:test");
		expect(result.ok).toBe(false);
		expect(result.error).toContain("JS");
	});

	it("getStringSync works for non-JS rules", () => {
		const analyzer = new AnalyzeRule();
		analyzer.setContent("<div>hello</div>");
		const result = analyzer.getStringSync("div");
		expect(result.ok).toBe(true);
		expect(result.value).toBe("hello");
	});

	it("passes context to executor", async () => {
		let receivedCtx: JsEvalContext | undefined;
		const executor: JsExecutor = {
			async eval(code, context) {
				receivedCtx = context;
				return { success: true, value: "ok" };
			},
		};
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setEvalContext({
			baseUrl: "https://example.com",
			book: { name: "test book" },
		});
		analyzer.setContent("<div>text</div>");
		await analyzer.getString("@js:test");
		expect(receivedCtx?.baseUrl).toBe("https://example.com");
		expect(receivedCtx?.book).toEqual({ name: "test book" });
		expect(receivedCtx?.src).toBe("<div>text</div>");
	});

	it("handles null JS return value", async () => {
		const executor = createMockExecutor(() => null);
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div>text</div>");
		const result = await analyzer.getString("@js:null");
		expect(result.ok).toBe(true);
		expect(result.value).toBe("");
		expect(result.values).toEqual([]);
	});

	it("handles array JS return value", async () => {
		const executor = createMockExecutor(() => ["a", "b", "c"]);
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div>text</div>");
		const result = await analyzer.getString("@js:result.split(',')");
		expect(result.ok).toBe(true);
		expect(result.value).toBe("a\nb\nc");
		expect(result.values).toEqual(["a", "b", "c"]);
	});

	it("handles JS execution error", async () => {
		const executor = createMockExecutor(() => {
			throw new Error("JS boom");
		});
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div>text</div>");
		const result = await analyzer.getString("@js:throw new Error('boom')");
		expect(result.ok).toBe(false);
		expect(result.error).toContain("JS boom");
	});

	it("chains CSS && JS via operator", async () => {
		let capturedCode: string | undefined;
		const executor: JsExecutor = {
			async eval(code) {
				capturedCode = code;
				return { success: true, value: "JS_RESULT" };
			},
		};
		const analyzer = new AnalyzeRule();
		analyzer.setJsExecutor(executor);
		analyzer.setContent("<div class='content'>hello world</div>");
		// CSS && @js: — operator splits into two segments
		const result = await analyzer.getString(
			"div.content&&@js:result.toUpperCase()",
		);
		expect(result.ok).toBe(true);
		expect(capturedCode).toContain("toUpperCase");
	});
});
