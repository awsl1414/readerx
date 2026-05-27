import { describe, expect, it } from "vitest";
import type { RuleError, RuleOptions, RuleResult } from "@/lib/worker-bridge";

describe("WorkerBridge types", () => {
	it("RuleResult ok shape", () => {
		const result: RuleResult = { ok: true, value: "hello" };
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("hello");
		}
	});

	it("RuleResult ok with array value", () => {
		const result: RuleResult = { ok: true, value: ["a", "b"] };
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["a", "b"]);
		}
	});

	it("RuleResult error shape", () => {
		const error: RuleError = { type: "timeout", message: "timed out" };
		const result: RuleResult = { ok: false, error };
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe("timeout");
		}
	});

	it("all error types are representable", () => {
		const types: Array<RuleError["type"]> = [
			"timeout",
			"syntax",
			"runtime",
			"worker_crash",
		];
		expect(types).toHaveLength(4);
	});
});
