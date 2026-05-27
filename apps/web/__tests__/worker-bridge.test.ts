import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RuleError, RuleResult } from "@/lib/worker-bridge";
import { WorkerBridge } from "@/lib/worker-bridge";

/**
 * Minimal mock Worker that satisfies Comlink's wire protocol.
 * Comlink.wrap() calls postMessage and listens for message events.
 * We intercept messages, handle setHostFunctions, and reply with acks.
 */
function createMockWorker(): Worker {
	const listeners = new Map<string, Set<(ev: MessageEvent) => void>>();
	const worker = {
		postMessage(data: unknown, _transfer?: unknown[]): void {
			// Comlink sends { id, type, path } messages.
			// We only need to respond to SET calls (setHostFunctions).
			const msg = data as Record<string, unknown>;
			if (msg?.type === "SET") {
				// Acknowledge the SET — Comlink expects a response with the same id
				const response = { id: msg.id, type: "SET", value: true };
				const event = new MessageEvent("message", { data: response });
				for (const handler of listeners.get("message") ?? new Set()) {
					handler(event);
				}
			}
		},
		addEventListener(type: string, handler: (ev: MessageEvent) => void): void {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)?.add(handler);
		},
		removeEventListener(
			type: string,
			handler: (ev: MessageEvent) => void,
		): void {
			listeners.get(type)?.delete(handler);
		},
		terminate(): void {
			listeners.clear();
		},
	} as unknown as Worker;
	return worker;
}

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

describe("WorkerBridge: CSS rule execution (main thread)", () => {
	let bridge: WorkerBridge;
	beforeEach(() => {
		bridge = new WorkerBridge({ workerFactory: createMockWorker });
	});
	afterEach(() => {
		bridge.dispose();
	});

	it("extracts text from HTML with CSS rule", async () => {
		const result = await bridge.executeRule(
			"p.title",
			'<p class="title">Hello</p>',
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("Hello");
	});

	it("extracts href attribute", async () => {
		const result = await bridge.executeRule(
			"a@href",
			'<a href="http://example.com">Link</a>',
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("http://example.com");
	});

	it("extracts multiple values as array", async () => {
		const result = await bridge.executeRule(
			"li",
			"<ul><li>A</li><li>B</li><li>C</li></ul>",
		);
		expect(result.ok).toBe(true);
		if (result.ok && Array.isArray(result.value)) {
			expect(result.value).toEqual(["A", "B", "C"]);
		}
	});

	it("returns empty result for no match", async () => {
		const result = await bridge.executeRule(
			"nonexistent.class",
			"<div>text</div>",
		);
		expect(result.ok).toBe(true);
		// No match returns empty string
	});
});

describe("WorkerBridge: JSONPath execution (main thread)", () => {
	let bridge: WorkerBridge;
	beforeEach(() => {
		bridge = new WorkerBridge({ workerFactory: createMockWorker });
	});
	afterEach(() => {
		bridge.dispose();
	});

	it("extracts value from JSON with explicit prefix", async () => {
		const json = JSON.stringify({ data: { name: "Test" } });
		const result = await bridge.executeRule("$.data.name", json);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toBe("Test");
	});
});

describe("WorkerBridge: dispose behavior", () => {
	it("double dispose throws", () => {
		const bridge = new WorkerBridge();
		bridge.dispose();
		expect(() => bridge.dispose()).toThrow("WorkerBridge has been disposed");
	});

	it("executeRule after dispose throws", async () => {
		const bridge = new WorkerBridge();
		bridge.dispose();
		await expect(bridge.executeRule("p", "<p>hi</p>")).rejects.toThrow(
			"WorkerBridge has been disposed",
		);
	});

	it("evalJs after dispose throws", async () => {
		const bridge = new WorkerBridge();
		bridge.dispose();
		await expect(bridge.evalJs("1+1")).rejects.toThrow(
			"WorkerBridge has been disposed",
		);
	});
});
