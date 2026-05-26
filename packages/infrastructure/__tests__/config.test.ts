import { describe, expect, it } from "vitest";
import { getEnv } from "../src/config";

describe("getEnv", () => {
	it("returns environment variable value when set", () => {
		process.env._TEST_READERX_KEY = "hello";
		expect(getEnv("_TEST_READERX_KEY")).toBe("hello");
		delete process.env._TEST_READERX_KEY;
	});

	it("returns defaultValue when variable not set", () => {
		delete process.env._TEST_READERX_MISSING;
		expect(getEnv("_TEST_READERX_MISSING", "fallback")).toBe("fallback");
	});

	it("returns undefined when variable not set and no default", () => {
		delete process.env._TEST_READERX_MISSING;
		expect(getEnv("_TEST_READERX_MISSING")).toBeUndefined();
	});

	it("prefers env value over defaultValue", () => {
		process.env._TEST_READERX_KEY = "env";
		expect(getEnv("_TEST_READERX_KEY", "fallback")).toBe("env");
		delete process.env._TEST_READERX_KEY;
	});
});
