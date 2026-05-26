import { describe, expect, it, vi } from "vitest";
import { createHostFunctions } from "../src/host-functions";

describe("createHostFunctions", () => {
	it("log calls onLog callback", () => {
		const onLog = vi.fn();
		const fns = createHostFunctions({ onLog, fetchFn: vi.fn() });
		fns.log("hello");
		expect(onLog).toHaveBeenCalledWith("hello");
	});

	it("base64Encode encodes string", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		expect(fns.base64Encode("hello")).toBe("aGVsbG8=");
	});

	it("base64Decode decodes string", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		expect(fns.base64Decode("aGVsbG8=")).toBe("hello");
	});

	it("put/get stores and retrieves values", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		fns.put("key1", "value1");
		expect(fns.get("key1")).toBe("value1");
	});

	it("get returns empty string for missing key", () => {
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn: vi.fn() });
		expect(fns.get("missing")).toBe("");
	});

	it("ajax calls fetchFn and returns text", async () => {
		const fetchFn = vi.fn().mockResolvedValue("response body");
		const fns = createHostFunctions({ onLog: vi.fn(), fetchFn });
		const result = await fns.ajax("https://example.com");
		expect(fetchFn).toHaveBeenCalledWith("https://example.com");
		expect(result).toBe("response body");
	});
});
