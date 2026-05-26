import { beforeAll, describe, expect, it, vi } from "vitest";
import { createHostFunctions } from "../src/host-functions";
import { QuickJSSandbox } from "../src/sandbox";

// QuickJS WASM 加载较慢，增加超时
describe("QuickJSSandbox", () => {
	beforeAll(() => {
		vi.setConfig({ testTimeout: 30000 });
	});

	it("evaluates simple expression", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("1 + 1");
		expect(result.success).toBe(true);
		expect(result.value).toBe(2);
		await sandbox.terminate();
	});

	it("returns string result", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("'hello' + ' ' + 'world'");
		expect(result.success).toBe(true);
		expect(result.value).toBe("hello world");
		await sandbox.terminate();
	});

	it("returns error on syntax error", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("invalid {{{");
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
		await sandbox.terminate();
	});

	it("returns error on runtime error", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("throw new Error('test error')");
		expect(result.success).toBe(false);
		expect(result.error).toContain("test error");
		await sandbox.terminate();
	});

	it("injects context variables", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("result", { result: "hello" });
		expect(result.success).toBe(true);
		expect(result.value).toBe("hello");
		await sandbox.terminate();
	});

	it("injects multiple context variables", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("baseUrl + '?page=' + page", {
			baseUrl: "https://example.com",
			page: 2,
		});
		expect(result.success).toBe(true);
		expect(result.value).toBe("https://example.com?page=2");
		await sandbox.terminate();
	});

	it("times out on infinite loop", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval("while(true) {}", undefined, {
			timeout: 500,
		});
		expect(result.success).toBe(false);
		expect(result.error).toBeTruthy();
		await sandbox.terminate();
	});

	it("enforces memory limit", async () => {
		const sandbox = new QuickJSSandbox();
		const result = await sandbox.eval(
			"const arr = []; for(let i = 0; i < 100000; i++) arr.push(new Array(1000)); arr.length",
			undefined,
			{ memoryLimit: 1024 * 1024 },
		);
		expect(result.success).toBe(false);
		await sandbox.terminate();
	});

	it("injects host functions and allows calling them", async () => {
		const sandbox = new QuickJSSandbox();
		const logFn = vi.fn();
		sandbox.setHostFunctions({
			ajax: async (url: string) => `response from ${url}`,
			log: logFn,
			base64Encode: (s: string) => btoa(s),
			base64Decode: (s: string) => atob(s),
			put: () => {},
			get: () => "",
		});
		const result = await sandbox.eval("log('test message'); 'done'");
		expect(result.success).toBe(true);
		expect(logFn).toHaveBeenCalledWith("test message");
		await sandbox.terminate();
	});

	it("does not share state across eval calls", async () => {
		const sandbox = new QuickJSSandbox();
		const r1 = await sandbox.eval("var x = 42; x");
		expect(r1.value).toBe(42);
		const r2 = await sandbox.eval(
			"typeof x === 'undefined' ? 'fresh' : 'stale'",
		);
		expect(r2.value).toBe("fresh");
		await sandbox.terminate();
	});

	it("base64Encode/Decode work inside sandbox", async () => {
		const sandbox = new QuickJSSandbox();
		sandbox.setHostFunctions({
			ajax: async () => "",
			log: () => {},
			base64Encode: (s: string) => btoa(s),
			base64Decode: (s: string) => atob(s),
			put: () => {},
			get: () => "",
		});
		const r = await sandbox.eval("base64Decode(base64Encode('hello'))");
		expect(r.success).toBe(true);
		expect(r.value).toBe("hello");
		await sandbox.terminate();
	});

	it("put/get work inside sandbox", async () => {
		const sandbox = new QuickJSSandbox();
		const hostFns = createHostFunctions({
			fetchFn: async () => "",
			onLog: () => {},
		});
		sandbox.setHostFunctions(hostFns);
		const r = await sandbox.eval("put('k','v'); get('k')");
		expect(r.success).toBe(true);
		expect(r.value).toBe("v");
		await sandbox.terminate();
	});
});
