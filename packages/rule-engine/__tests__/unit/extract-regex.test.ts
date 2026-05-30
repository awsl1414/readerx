import { describe, expect, it } from "vitest";
import { extractRegex } from "../../src/regex.js";

describe("extractRegex", () => {
	it("extracts all numeric matches", () => {
		const result = extractRegex("\\d+", "abc123def456");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["123", "456"]);
		}
	});

	it("extracts capture group full matches", () => {
		const result = extractRegex("(\\w+)@(\\w+)", "user@host and admin@server");
		expect(result.ok).toBe(true);
		if (result.ok) {
			// matchAll returns full match at index 0
			expect(result.value).toEqual(["user@host", "admin@server"]);
		}
	});

	it("respects flags parameter", () => {
		const result = extractRegex("hello", "Hello hello HELLO", "gi");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["Hello", "hello", "HELLO"]);
		}
	});

	it("returns empty array for no matches", () => {
		const result = extractRegex("\\d+", "no digits here");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual([]);
		}
	});

	it("returns error for invalid regex pattern", () => {
		const result = extractRegex("[invalid", "content");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("REGEX_ERROR");
			expect(result.error.rule).toBe("[invalid");
		}
	});
});
