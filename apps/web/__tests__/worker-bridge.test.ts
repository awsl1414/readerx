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

/**
 * Enhanced mock Worker supporting Comlink's wire protocol.
 *
 * Comlink's expose() side responds with toWireValue(returnValue) which
 * produces { type: "RAW", value }. The wrap() side receives that as event.data,
 * passes it through fromWireValue() which extracts .value for RAW types.
 *
 * So our responses must use { id, type: "RAW", value } format.
 * Comlink also sends argumentList (not args) for APPLY messages.
 */
function createControllableWorker() {
	const listeners = new Map<string, Set<(ev: MessageEvent) => void>>();
	type EvalHandler = (
		code: string,
		context?: unknown,
		options?: unknown,
	) => Promise<unknown>;
	let evalHandler: EvalHandler | null = null;
	let evalDelay = 0;

	const postMessage = (data: unknown, _transfer?: unknown[]): void => {
		const msg = data as Record<string, unknown>;
		if (msg?.type === "SET") {
			// Comlink exposes() responds: toWireValue(true) → { type: "RAW", value: true }
			const response = { id: msg.id, type: "RAW", value: true };
			const event = new MessageEvent("message", { data: response });
			for (const handler of listeners.get("message") ?? new Set()) {
				handler(event);
			}
		} else if (msg?.type === "APPLY") {
			const path = msg.path as string[];
			// Comlink sends argumentList, not args
			const argumentList = (msg.argumentList as Array<{ type: string; value: unknown }>)?.map(
				(item) => {
					if (item.type === "RAW") return item.value;
					return item;
				},
			) ?? [];
			if (path[0] === "eval" && evalHandler) {
				const result = (async () => {
					if (evalDelay > 0) {
						await new Promise((r) => setTimeout(r, evalDelay));
					}
					return evalHandler(
						argumentList[0] as string,
						argumentList[1],
						argumentList[2],
					);
				})();
				result
					.then((value) => {
						const response = { id: msg.id, type: "RAW", value };
						const event = new MessageEvent("message", { data: response });
						for (const handler of listeners.get("message") ?? new Set()) {
							handler(event);
						}
					})
					.catch((err: unknown) => {
						// Replicate Comlink's throwTransferHandler serialization:
						// expose() wraps thrown errors as { value, [throwMarker]: 0 },
						// then toWireValue produces a HANDLER wire value with name "throw".
						// fromWireValue calls throwTransferHandler.deserialize which throws.
						const errObj =
							err instanceof Error
								? {
										isError: true,
										value: {
											message: err.message,
											name: err.name,
											stack: err.stack,
										},
									}
								: { isError: false, value: err };
						const response = {
							id: msg.id,
							type: "HANDLER",
							name: "throw",
							value: errObj,
						};
						const event = new MessageEvent("message", { data: response });
						for (const handler of listeners.get("message") ?? new Set()) {
							handler(event);
						}
					});
			} else if (path[0] === "terminate") {
				const response = { id: msg.id, type: "RAW", value: undefined };
				const event = new MessageEvent("message", { data: response });
				for (const handler of listeners.get("message") ?? new Set()) {
					handler(event);
				}
			}
		}
	};

	const worker = {
		postMessage,
		addEventListener(type: string, handler: (ev: MessageEvent) => void): void {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)?.add(handler);
		},
		removeEventListener(type: string, handler: (ev: MessageEvent) => void): void {
			listeners.get(type)?.delete(handler);
		},
		terminate(): void {
			listeners.clear();
		},
	} as unknown as Worker;

	return {
		worker,
		onEval: (handler: EvalHandler) => {
			evalHandler = handler;
		},
		setEvalDelay: (ms: number) => {
			evalDelay = ms;
		},
	};
}

describe("WorkerBridge: timeout behavior", () => {
	it("returns timeout error when Worker eval exceeds timeout", async () => {
		const { worker, onEval } = createControllableWorker();
		// Simulate slow eval (100ms) with 10ms timeout
		onEval(async () => {
			await new Promise((r) => setTimeout(r, 100));
			return { success: true, value: "late" };
		});

		const bridge = new WorkerBridge({ workerFactory: () => worker });
		try {
			const result = await bridge.executeRule("@js:result", "content", {
				timeout: 10,
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe("timeout");
			}
		} finally {
			bridge.dispose();
		}
	});

	it("returns timeout error from evalJs", async () => {
		const { worker, onEval } = createControllableWorker();
		onEval(async () => {
			await new Promise((r) => setTimeout(r, 100));
			return { success: true, value: "late" };
		});

		const bridge = new WorkerBridge({ workerFactory: () => worker });
		try {
			await expect(
				bridge.evalJs("while(true){}", undefined, { timeout: 10 }),
			).rejects.toThrow();
		} finally {
			bridge.dispose();
		}
	});
});

describe("WorkerBridge: AbortSignal", () => {
	it("throws AbortError when signal is already aborted", async () => {
		const { worker } = createControllableWorker();
		const bridge = new WorkerBridge({ workerFactory: () => worker });
		const controller = new AbortController();
		controller.abort();

		try {
			await expect(
				bridge.executeRule("@js:1+1", "content", {
					signal: controller.signal,
				}),
			).rejects.toThrow("aborted");
		} finally {
			bridge.dispose();
		}
	});

	it("throws AbortError from evalJs when signal aborts", async () => {
		const { worker, onEval } = createControllableWorker();
		onEval(async () => {
			await new Promise((r) => setTimeout(r, 500));
			return { success: true, value: "late" };
		});

		const bridge = new WorkerBridge({ workerFactory: () => worker });
		const controller = new AbortController();

		try {
			const promise = bridge.evalJs("slow code", undefined, {
				timeout: 1000,
				signal: controller.signal,
			});
			// Abort after a short delay
			setTimeout(() => controller.abort(), 10);
			await expect(promise).rejects.toThrow();
		} finally {
			bridge.dispose();
		}
	});
});

describe("WorkerBridge: serial queue", () => {
	it("executes requests sequentially", async () => {
		const { worker, onEval } = createControllableWorker();
		const order: number[] = [];

		onEval(async (code: string) => {
			const num = Number.parseInt(code.replace("code", ""), 10);
			// First request is slow, second is fast
			if (num === 1) {
				await new Promise((r) => setTimeout(r, 50));
			}
			order.push(num);
			return { success: true, value: `result${num}` };
		});

		const bridge = new WorkerBridge({ workerFactory: () => worker });
		try {
			// Fire two evalJs calls concurrently
			const p1 = bridge.evalJs("code1");
			const p2 = bridge.evalJs("code2");

			const [r1, r2] = await Promise.all([p1, p2]);
			expect(order).toEqual([1, 2]); // Serial, not interleaved
			expect(r1.success).toBe(true);
			expect(r2.success).toBe(true);
		} finally {
			bridge.dispose();
		}
	});
});

describe("WorkerBridge: crash recovery", () => {
	it("rebuilds Worker after crash on next call", async () => {
		const { worker: worker1, onEval: onEval1 } = createControllableWorker();
		const { worker: worker2, onEval: onEval2 } = createControllableWorker();

		onEval1(async () => {
			// Simulate crash — reject with a "Worker" error
			throw new Error("Worker thread crashed unexpectedly");
		});
		onEval2(async () => {
			return { success: true, value: "recovered" };
		});

		let factoryCallCount = 0;
		const workers = [worker1, worker2];
		const workerFactory = () => {
			const w = workers[factoryCallCount];
			factoryCallCount++;
			return w;
		};

		const bridge = new WorkerBridge({ workerFactory });
		try {
			// First call crashes — evalJs throws, and #isWorkerError triggers #destroyWorker
			await expect(bridge.evalJs("crash")).rejects.toThrow(
				"Worker thread crashed unexpectedly",
			);

			// Second call should create a new Worker (factory called again)
			const result2 = await bridge.evalJs("recover");
			expect(result2.success).toBe(true);
			if (result2.success) {
				expect(result2.value).toBe("recovered");
			}
			expect(factoryCallCount).toBe(2); // Worker was rebuilt
		} finally {
			bridge.dispose();
		}
	});
});

describe("WorkerBridge: evalJs direct call", () => {
	it("returns successful result from Worker", async () => {
		const { worker, onEval } = createControllableWorker();
		onEval(async (code: string) => {
			return { success: true, value: code === "1+1" ? 2 : 0 };
		});

		const bridge = new WorkerBridge({ workerFactory: () => worker });
		try {
			const result = await bridge.evalJs("1+1");
			expect(result.success).toBe(true);
			expect(result.value).toBe(2);
		} finally {
			bridge.dispose();
		}
	});

	it("returns error result from Worker", async () => {
		const { worker, onEval } = createControllableWorker();
		onEval(async () => {
			return { success: false, error: "SyntaxError: unexpected token" };
		});

		const bridge = new WorkerBridge({ workerFactory: () => worker });
		try {
			const result = await bridge.evalJs("invalid{");
			expect(result.success).toBe(false);
			expect(result.error).toContain("SyntaxError");
		} finally {
			bridge.dispose();
		}
	});
});
