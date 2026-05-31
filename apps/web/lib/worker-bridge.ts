import type { HostFunctionOptions } from "@readerx/quickjs-runtime";
import { createHostFunctions } from "@readerx/quickjs-runtime";
import type { WorkerApi } from "@readerx/quickjs-runtime/worker";
import type {
	JsEvalContext,
	JsEvalResult,
	JsExecutor,
} from "@readerx/rule-engine";
import { evaluateRule, toRule } from "@readerx/rule-engine";
import * as Comlink from "comlink";

// --- Public types ---

type RuleOptions = {
	baseUrl?: string;
	timeout?: number;
	signal?: AbortSignal;
};

type RuleResult =
	| { ok: true; value: string | string[] }
	| { ok: false; error: RuleError };

type RuleError =
	| { type: "timeout"; message: string }
	| { type: "syntax"; message: string }
	| { type: "runtime"; message: string }
	| { type: "worker_crash"; message: string };

// --- Error classes ---

class BridgeDisposedError extends Error {
	override readonly name = "BridgeDisposedError";
	constructor() {
		super("WorkerBridge has been disposed");
	}
}

class WorkerUnavailableError extends Error {
	override readonly name = "WorkerUnavailableError";
	constructor(reason: string) {
		super(`Worker unavailable: ${reason}`);
	}
}

// --- Sandbox option sanitization ---

import { sanitizeFetchOptions } from "./worker-bridge-utils";

// --- Helper: parse raw rule string into Rule ---

const SELECTOR_PREFIX_MAP: Record<string, "css" | "xpath" | "jsonpath"> = {
	"//": "xpath",
	$: "jsonpath",
};

function stringToRule(ruleStr: string) {
	// Auto-detect engine from prefix; default to CSS
	for (const [prefix, engine] of Object.entries(SELECTOR_PREFIX_MAP)) {
		if (ruleStr.startsWith(prefix)) {
			return toRule({ [engine]: ruleStr });
		}
	}
	// Default: treat as CSS selector
	return toRule({ css: ruleStr });
}

// --- WorkerBridge ---

const DEFAULT_TIMEOUT = 10_000;

type WorkerFactory = () => Worker;

class WorkerBridge {
	#worker: Worker | null = null;
	#api: Comlink.Remote<WorkerApi> | null = null;
	#queue: Promise<unknown> = Promise.resolve();
	#disposed = false;
	#workerFactory: WorkerFactory;
	#activeContent: string | null = null;

	constructor(options?: { workerFactory?: WorkerFactory }) {
		this.#workerFactory = options?.workerFactory ?? this.#defaultWorkerFactory;
	}

	#defaultWorkerFactory(): Worker {
		try {
			return new Worker(
				new URL("@readerx/quickjs-runtime/worker", import.meta.url),
				{ type: "module" },
			);
		} catch (e: unknown) {
			throw new WorkerUnavailableError(String(e));
		}
	}

	#ensureNotDisposed(): void {
		if (this.#disposed) throw new BridgeDisposedError();
	}

	async #ensureWorker(): Promise<Comlink.Remote<WorkerApi>> {
		this.#ensureNotDisposed();
		if (this.#api) return this.#api;

		this.#worker = this.#workerFactory();
		this.#api = Comlink.wrap<WorkerApi>(this.#worker);
		const hostFns = this.#createHostFunctionOptions();
		this.#api.setHostFunctions(createHostFunctions(hostFns));
		return this.#api;
	}

	#createHostFunctionOptions(): HostFunctionOptions {
		return {
			fetchFn: async (url: string) => {
				const resp = await fetch(url);
				return resp.text();
			},
			fetchWithOptions: async (
				url: string,
				options: Record<string, unknown>,
			) => {
				const safeOptions = sanitizeFetchOptions(options);
				const resp = await fetch(url, safeOptions);
				return resp.text();
			},
			onLog: (message: string) => {
				if (process.env.NODE_ENV === "development")
					console.log("[QuickJS]", message);
			},
			evalRule: async (rule: string) => {
				const content = this.#activeContent ?? "";
				const parsed = stringToRule(rule);
				if (!parsed.ok) return "";
				const result = await evaluateRule(parsed.value, content);
				if (result.ok && result.value.length > 0) return result.value[0] ?? "";
				return "";
			},
			evalRuleList: async (rule: string) => {
				const content = this.#activeContent ?? "";
				const parsed = stringToRule(rule);
				if (!parsed.ok) return [];
				const result = await evaluateRule(parsed.value, content);
				if (result.ok) return result.value;
				return [];
			},
		};
	}

	#enqueue<T>(
		fn: (api: Comlink.Remote<WorkerApi>) => Promise<T>,
		timeout: number = DEFAULT_TIMEOUT,
		signal?: AbortSignal,
	): Promise<T> {
		this.#ensureNotDisposed();

		const execute = async (): Promise<T> => {
			if (signal?.aborted) {
				throw new DOMException("Operation aborted", "AbortError");
			}

			const api = await this.#ensureWorker();

			const timeoutPromise = new Promise<never>((_, reject) => {
				const timer = setTimeout(
					() => reject(new DOMException("Execution timeout", "TimeoutError")),
					timeout,
				);
				signal?.addEventListener(
					"abort",
					() => {
						clearTimeout(timer);
						reject(new DOMException("Operation aborted", "AbortError"));
					},
					{ once: true },
				);
			});

			try {
				return await Promise.race([fn(api), timeoutPromise]);
			} catch (error: unknown) {
				if (this.#isWorkerError(error)) {
					this.#destroyWorker();
				}
				throw error;
			}
		};

		const chain = this.#queue.then(() => execute());
		this.#queue = chain.catch(() => {});
		return chain as Promise<T>;
	}

	#isWorkerError(error: unknown): boolean {
		if (error instanceof Error) {
			const msg = error.message;
			return (
				msg.includes("Worker") ||
				msg.includes("comlink") ||
				msg.includes("MessagePort") ||
				msg.includes("terminated")
			);
		}
		return false;
	}

	#destroyWorker(): void {
		this.#worker?.terminate();
		this.#worker = null;
		this.#api?.[Comlink.releaseProxy]();
		this.#api = null;
	}

	#createJsExecutor(): JsExecutor {
		const bridge = this;
		return {
			async eval(code: string, context: JsEvalContext): Promise<JsEvalResult> {
				return bridge.evalJs(code, context);
			},
		};
	}

	// --- Public API ---

	async executeRule(
		rule: string,
		content: string,
		options?: RuleOptions,
	): Promise<RuleResult> {
		this.#ensureNotDisposed();

		const prevContent = this.#activeContent;
		this.#activeContent = content;

		try {
			const parsed = stringToRule(rule);
			if (!parsed.ok) {
				return {
					ok: false,
					error: { type: "syntax", message: "Failed to parse rule" },
				};
			}

			const evalResult = await evaluateRule(parsed.value, content, {
				...(options?.baseUrl ? { baseUrl: options.baseUrl } : {}),
				allowScript: true,
			});

			if (evalResult.ok) {
				return {
					ok: true,
					value:
						evalResult.value.length > 1
							? evalResult.value
							: (evalResult.value[0] ?? ""),
				};
			}
			return {
				ok: false,
				error: { type: "runtime", message: evalResult.error.message },
			};
		} catch (error: unknown) {
			if (error instanceof DOMException && error.name === "TimeoutError") {
				return {
					ok: false,
					error: { type: "timeout", message: error.message },
				};
			}
			if (error instanceof DOMException && error.name === "AbortError") {
				throw error;
			}
			const msg = error instanceof Error ? error.message : String(error);
			return { ok: false, error: { type: "runtime", message: msg } };
		} finally {
			this.#activeContent = prevContent;
		}
	}

	async evalJs(
		code: string,
		context?: JsEvalContext,
		options?: RuleOptions,
	): Promise<JsEvalResult> {
		this.#ensureNotDisposed();

		return this.#enqueue(
			async (api) => {
				const result = await api.eval(code, context);
				const out: JsEvalResult = {
					success: result.success,
					value: result.value ?? null,
					...(result.error ? { error: result.error } : {}),
				};
				return out;
			},
			options?.timeout,
			options?.signal,
		);
	}

	createJsExecutor(): JsExecutor {
		return this.#createJsExecutor();
	}

	dispose(): void {
		if (this.#disposed) throw new BridgeDisposedError();
		this.#disposed = true;
		this.#destroyWorker();
	}
}

export type { RuleError, RuleOptions, RuleResult };
export { BridgeDisposedError, WorkerBridge, WorkerUnavailableError };
