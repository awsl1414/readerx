import { describe, expect, it } from "vitest";
import { err, isErr, isOk, ok } from "../../src/result.js";

describe("result", () => {
	describe("ok", () => {
		it("creates a successful result", () => {
			const r = ok(42);
			expect(r.ok).toBe(true);
			if (r.ok) expect(r.value).toBe(42);
		});

		it("creates a successful result with array", () => {
			const r = ok(["a", "b"]);
			expect(r.ok).toBe(true);
			if (r.ok) expect(r.value).toEqual(["a", "b"]);
		});
	});

	describe("err", () => {
		it("creates an error result", () => {
			const r = err({ code: "INVALID_SELECTOR" as const, message: "bad" });
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.error.code).toBe("INVALID_SELECTOR");
		});
	});

	describe("isOk / isErr", () => {
		it("isOk returns true for ok results", () => {
			expect(isOk(ok(1))).toBe(true);
			expect(isOk(err({ code: "REGEX_ERROR" as const, message: "" }))).toBe(
				false,
			);
		});

		it("isErr returns true for err results", () => {
			expect(isErr(err({ code: "REGEX_ERROR" as const, message: "" }))).toBe(
				true,
			);
			expect(isErr(ok(1))).toBe(false);
		});
	});
});
