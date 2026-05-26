import { describe, expect, it, vi } from "vitest";
import { createHostFunctions } from "../src/host-functions";

const defaultOptions = {
	onLog: vi.fn(),
	fetchFn: vi.fn(),
	fetchWithOptions: vi.fn(),
	evalRule: vi.fn(),
	evalRuleList: vi.fn(),
};

describe("createHostFunctions", () => {
	it("log calls onLog callback", () => {
		const fns = createHostFunctions({ ...defaultOptions });
		fns.log("hello");
		expect(defaultOptions.onLog).toHaveBeenCalledWith("hello");
	});

	it("base64Encode encodes string", () => {
		const fns = createHostFunctions({ ...defaultOptions });
		expect(fns.base64Encode("hello")).toBe("aGVsbG8=");
	});

	it("base64Decode decodes string", () => {
		const fns = createHostFunctions({ ...defaultOptions });
		expect(fns.base64Decode("aGVsbG8=")).toBe("hello");
	});

	it("put/get stores and retrieves values", () => {
		const fns = createHostFunctions({ ...defaultOptions });
		fns.put("key1", "value1");
		expect(fns.get("key1")).toBe("value1");
	});

	it("get returns empty string for missing key", () => {
		const fns = createHostFunctions({ ...defaultOptions });
		expect(fns.get("missing")).toBe("");
	});

	it("ajax calls fetchFn and returns text", async () => {
		const fetchFn = vi.fn().mockResolvedValue("response body");
		const fns = createHostFunctions({ ...defaultOptions, fetchFn });
		const result = await fns.ajax("https://example.com");
		expect(fetchFn).toHaveBeenCalledWith("https://example.com");
		expect(result).toBe("response body");
	});

	it("evalRule delegates to callback", async () => {
		const evalRule = vi.fn().mockResolvedValue("rule result");
		const fns = createHostFunctions({ ...defaultOptions, evalRule });
		const result = await fns.evalRule("div.title");
		expect(evalRule).toHaveBeenCalledWith("div.title");
		expect(result).toBe("rule result");
	});

	it("evalRuleList delegates to callback", async () => {
		const evalRuleList = vi.fn().mockResolvedValue(["a", "b"]);
		const fns = createHostFunctions({ ...defaultOptions, evalRuleList });
		const result = await fns.evalRuleList("div.title");
		expect(evalRuleList).toHaveBeenCalledWith("div.title");
		expect(result).toEqual(["a", "b"]);
	});

	it("ajaxWithOption parses JSON and delegates", async () => {
		const fetchWithOptions = vi.fn().mockResolvedValue("post result");
		const fns = createHostFunctions({ ...defaultOptions, fetchWithOptions });
		const result = await fns.ajaxWithOption(
			"https://example.com",
			'{"method":"POST"}',
		);
		expect(fetchWithOptions).toHaveBeenCalledWith("https://example.com", {
			method: "POST",
		});
		expect(result).toBe("post result");
	});

	it("ajaxWithOption handles invalid JSON", async () => {
		const fetchWithOptions = vi.fn().mockResolvedValue("ok");
		const fns = createHostFunctions({ ...defaultOptions, fetchWithOptions });
		const result = await fns.ajaxWithOption("https://example.com", "not json");
		expect(fetchWithOptions).toHaveBeenCalledWith("https://example.com", {});
		expect(result).toBe("ok");
	});
});
