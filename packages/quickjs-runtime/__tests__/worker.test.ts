import { beforeAll, describe, expect, it, vi } from "vitest";
import { createWorkerApi } from "../src/worker";

describe("createWorkerApi", () => {
	beforeAll(() => {
		vi.setConfig({ testTimeout: 30000 });
	});

	it("evaluates code and returns result", async () => {
		const api = createWorkerApi();
		const result = await api.eval("1 + 2");
		expect(result.success).toBe(true);
		expect(result.value).toBe(3);
		await api.terminate();
	});

	it("evaluates with context", async () => {
		const api = createWorkerApi();
		const result = await api.eval("result + 10", { result: 5 });
		expect(result.success).toBe(true);
		expect(result.value).toBe(15);
		await api.terminate();
	});

	it("evaluates with custom timeout", async () => {
		const api = createWorkerApi();
		const result = await api.eval("while(true){}", undefined, {
			timeout: 200,
		});
		expect(result.success).toBe(false);
		await api.terminate();
	});

	it("sets and uses host functions", async () => {
		const api = createWorkerApi();
		const logs: string[] = [];
		api.setHostFunctions({
			ajax: async (url: string) => `mock: ${url}`,
			log: (msg: string) => {
				logs.push(msg);
			},
			base64Encode: (s: string) => btoa(s),
			base64Decode: (s: string) => atob(s),
			put: () => {},
			get: () => "",
		});
		const result = await api.eval("log('worker test'); 'ok'");
		expect(result.success).toBe(true);
		expect(logs).toContain("worker test");
		await api.terminate();
	});
});
