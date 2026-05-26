import { beforeAll, describe, expect, it, vi } from "vitest";
import { QuickJsExecutor } from "../src/js-executor";

const defaultOptions = {
	fetchFn: vi.fn<() => Promise<string>>().mockResolvedValue(""),
	fetchWithOptions: vi.fn<() => Promise<string>>().mockResolvedValue(""),
	onLog: vi.fn(),
	evalRule: vi.fn<() => Promise<string>>().mockResolvedValue(""),
	evalRuleList: vi.fn<() => Promise<string[]>>().mockResolvedValue([]),
};

describe("QuickJsExecutor", () => {
	beforeAll(() => {
		vi.setConfig({ testTimeout: 30000 });
	});

	it("implements JsExecutor interface", async () => {
		const executor = new QuickJsExecutor({ ...defaultOptions });
		const result = await executor.eval("1 + 1", {});
		expect(result.success).toBe(true);
		expect(result.value).toBe(2);
		await executor.terminate();
	});

	it("passes context as globals", async () => {
		const executor = new QuickJsExecutor({ ...defaultOptions });
		const result = await executor.eval("baseUrl + '/api'", {
			baseUrl: "https://example.com",
		});
		expect(result.success).toBe(true);
		expect(result.value).toBe("https://example.com/api");
		await executor.terminate();
	});

	it("returns error on JS exception", async () => {
		const executor = new QuickJsExecutor({ ...defaultOptions });
		const result = await executor.eval("throw new Error('boom')", {});
		expect(result.success).toBe(false);
		expect(result.error).toContain("boom");
		await executor.terminate();
	});

	it("handles src context variable", async () => {
		const executor = new QuickJsExecutor({ ...defaultOptions });
		const result = await executor.eval("src", {
			src: "<div>hello</div>",
		});
		expect(result.success).toBe(true);
		expect(result.value).toBe("<div>hello</div>");
		await executor.terminate();
	});

	it("handles timeout", async () => {
		const executor = new QuickJsExecutor({ ...defaultOptions, timeout: 200 });
		const result = await executor.eval("while(true) {}", {});
		expect(result.success).toBe(false);
		await executor.terminate();
	});
});
