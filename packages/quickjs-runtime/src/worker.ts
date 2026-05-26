import * as Comlink from "comlink";
import { QuickJSSandbox } from "./sandbox";
import type {
	HostFunctions,
	JsContext,
	SandboxOptions,
	SandboxResult,
} from "./types";

const sandbox = new QuickJSSandbox();

const workerApi = {
	async eval(
		code: string,
		context?: JsContext,
		options?: SandboxOptions,
	): Promise<SandboxResult> {
		return sandbox.eval(code, context, options);
	},

	setHostFunctions(fns: HostFunctions): void {
		sandbox.setHostFunctions(fns);
	},

	async terminate(): Promise<void> {
		await sandbox.terminate();
	},
};

export type WorkerApi = typeof workerApi;

export function createWorkerApi(): WorkerApi {
	const instance = new QuickJSSandbox();
	return {
		async eval(
			code: string,
			context?: JsContext,
			options?: SandboxOptions,
		): Promise<SandboxResult> {
			return instance.eval(code, context, options);
		},
		setHostFunctions(fns: HostFunctions): void {
			instance.setHostFunctions(fns);
		},
		async terminate(): Promise<void> {
			await instance.terminate();
		},
	};
}

// 仅在 Worker 环境中 expose（Node 测试环境中 self/addEventListener 不存在）
if (
	typeof self !== "undefined" &&
	typeof self.addEventListener === "function"
) {
	Comlink.expose(workerApi);
}
