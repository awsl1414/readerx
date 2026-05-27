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

export type { RuleError, RuleOptions, RuleResult };
export { BridgeDisposedError, WorkerUnavailableError };
