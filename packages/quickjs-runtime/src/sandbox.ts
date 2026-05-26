import RELEASE_SYNC from "@jitl/quickjs-wasmfile-release-sync";
import type {
	QuickJSContext,
	QuickJSHandle,
	QuickJSRuntime,
	QuickJSWASMModule,
} from "quickjs-emscripten-core";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import type {
	HostFunctions,
	JsContext,
	SandboxOptions,
	SandboxResult,
} from "./types";

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_MEMORY_LIMIT = 8 * 1024 * 1024;
const ASYNC_SETTLE_GRACE_MS = 3000;

let modulePromise: Promise<QuickJSWASMModule> | null = null;

async function getModule(): Promise<QuickJSWASMModule> {
	if (!modulePromise) {
		modulePromise = newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
	}
	return modulePromise;
}

/**
 * 桥接宿主异步 Promise 到 QuickJS deferred。
 * 使用 async/await 统一错误处理：原 promise reject、onResolve throw、onReject throw
 * 都不会产生 unhandled rejection（completion promise 始终 settle）。
 */
async function settleHostPromise(
	promise: Promise<unknown>,
	onResolve: (val: unknown) => void,
	onReject: (err: unknown) => void,
): Promise<void> {
	try {
		const val = await promise;
		onResolve(val);
	} catch (err: unknown) {
		try {
			onReject(err);
		} catch {
			// onReject 内部异常（如 VM 已释放）静默吞掉，避免 unhandled rejection
		}
	}
}

export class QuickJSSandbox {
	private module: QuickJSWASMModule | null = null;
	private hostFunctions: HostFunctions | null = null;

	async eval(
		code: string,
		context: JsContext = {},
		options: SandboxOptions = {},
	): Promise<SandboxResult> {
		if (!this.module) {
			this.module = await getModule();
		}

		const timeout = options.timeout ?? DEFAULT_TIMEOUT;
		const memoryLimit = options.memoryLimit ?? DEFAULT_MEMORY_LIMIT;
		const deadline = Date.now() + timeout;

		const runtime = this.module.newRuntime();
		runtime.setMemoryLimit(memoryLimit);
		runtime.setMaxStackSize(1024 * 320);
		runtime.setInterruptHandler(() => Date.now() > deadline);

		const vm = runtime.newContext();
		const global = vm.global;

		const hostCompletions: Array<Promise<void>> = [];

		try {
			for (const [key, value] of Object.entries(context)) {
				if (value === undefined) continue;
				const handle = vm.unwrapResult(
					vm.evalCode(`(${JSON.stringify(value)})`),
				);
				vm.setProp(global, key, handle);
				handle.dispose();
			}

			if (this.hostFunctions) {
				this.injectHostFunctions(vm, runtime, global, hostCompletions);
			}

			const result = vm.evalCode(code);
			if (result.error) {
				const dumped = result.error.consume((h) => vm.dump(h));
				const errorVal =
					dumped != null && typeof dumped === "object" && "message" in dumped
						? (dumped as { message: string }).message
						: String(dumped);
				return {
					success: false,
					value: undefined,
					error: errorVal,
				};
			}

			const value = result.value.consume((h) => vm.dump(h));
			return { success: true, value };
		} catch (err) {
			return {
				success: false,
				value: undefined,
				error: err instanceof Error ? err.message : String(err),
			};
		} finally {
			if (hostCompletions.length > 0) {
				const settleDeadline = Date.now() + ASYNC_SETTLE_GRACE_MS;
				await Promise.race([
					Promise.allSettled(hostCompletions),
					new Promise<void>((resolve) => {
						const remaining = Math.max(0, settleDeadline - Date.now());
						setTimeout(resolve, remaining);
					}),
				]);
			}
			vm.dispose();
			runtime.dispose();
		}
	}

	setHostFunctions(fns: HostFunctions): void {
		this.hostFunctions = fns;
	}

	async terminate(): Promise<void> {
		this.module = null;
		modulePromise = null;
	}

	private injectHostFunctions(
		vm: QuickJSContext,
		runtime: QuickJSRuntime,
		global: QuickJSHandle,
		hostCompletions: Array<Promise<void>>,
	): void {
		if (!this.hostFunctions) return;

		const fns = this.hostFunctions;

		const rejectDeferred = (
			err: unknown,
			deferred: ReturnType<QuickJSContext["newPromise"]>,
		) => {
			const h = vm.newString(err instanceof Error ? err.message : String(err));
			deferred.reject(h);
			h.dispose();
		};

		const trackDeferred = (
			deferred: ReturnType<QuickJSContext["newPromise"]>,
		) => {
			deferred.settled.then(() => {
				try {
					deferred.dispose();
				} catch {}
			});
		};

		// ajax — async
		const ajaxHandle = vm.newFunction("ajax", (urlHandle) => {
			const url = vm.dump(urlHandle) as string;
			const deferred = vm.newPromise();

			const completion = settleHostPromise(
				fns.ajax(url),
				(val) => {
					const strHandle = vm.newString(val as string);
					deferred.resolve(strHandle);
					strHandle.dispose();
				},
				(err) => {
					rejectDeferred(err, deferred);
				},
			);
			hostCompletions.push(completion);
			trackDeferred(deferred);
			runtime.executePendingJobs();
			return deferred.handle;
		});
		vm.setProp(global, "ajax", ajaxHandle);
		ajaxHandle.dispose();

		const logHandle = vm.newFunction("log", (msgHandle) => {
			fns.log(vm.dump(msgHandle) as string);
		});
		vm.setProp(global, "log", logHandle);
		logHandle.dispose();

		const b64eHandle = vm.newFunction("base64Encode", (strHandle) => {
			return vm.newString(fns.base64Encode(vm.dump(strHandle) as string));
		});
		vm.setProp(global, "base64Encode", b64eHandle);
		b64eHandle.dispose();

		const b64dHandle = vm.newFunction("base64Decode", (strHandle) => {
			return vm.newString(fns.base64Decode(vm.dump(strHandle) as string));
		});
		vm.setProp(global, "base64Decode", b64dHandle);
		b64dHandle.dispose();

		const putHandle = vm.newFunction("put", (keyHandle, valHandle) => {
			fns.put(vm.dump(keyHandle) as string, vm.dump(valHandle) as string);
		});
		vm.setProp(global, "put", putHandle);
		putHandle.dispose();

		const getHandle = vm.newFunction("get", (keyHandle) => {
			return vm.newString(fns.get(vm.dump(keyHandle) as string));
		});
		vm.setProp(global, "get", getHandle);
		getHandle.dispose();

		// evalRule — async, returns Promise<string>
		const evalRuleHandle = vm.newFunction("evalRule", (ruleHandle) => {
			const rule = vm.dump(ruleHandle) as string;
			const deferred = vm.newPromise();

			const completion = settleHostPromise(
				fns.evalRule(rule),
				(val) => {
					const h = vm.newString(val as string);
					deferred.resolve(h);
					h.dispose();
				},
				(err) => {
					rejectDeferred(err, deferred);
				},
			);
			hostCompletions.push(completion);
			trackDeferred(deferred);
			runtime.executePendingJobs();
			return deferred.handle;
		});
		vm.setProp(global, "evalRule", evalRuleHandle);
		evalRuleHandle.dispose();

		// evalRuleList — async, returns native QuickJS array
		const evalRuleListHandle = vm.newFunction("evalRuleList", (ruleHandle) => {
			const rule = vm.dump(ruleHandle) as string;
			const deferred = vm.newPromise();

			const completion = settleHostPromise(
				fns.evalRuleList(rule),
				(val) => {
					const vals = val as string[];
					const arr = vm.newArray();
					for (let i = 0; i < vals.length; i++) {
						const el = vm.newString(vals[i] ?? "");
						vm.setProp(arr, i, el);
						el.dispose();
					}
					deferred.resolve(arr);
					arr.dispose();
				},
				(err) => {
					rejectDeferred(err, deferred);
				},
			);
			hostCompletions.push(completion);
			trackDeferred(deferred);
			runtime.executePendingJobs();
			return deferred.handle;
		});
		vm.setProp(global, "evalRuleList", evalRuleListHandle);
		evalRuleListHandle.dispose();

		// ajaxWithOption — async
		const ajaxWithOptHandle = vm.newFunction(
			"ajaxWithOption",
			(urlHandle, optHandle) => {
				const url = vm.dump(urlHandle) as string;
				const opt = vm.dump(optHandle) as string;
				const deferred = vm.newPromise();

				const completion = settleHostPromise(
					fns.ajaxWithOption(url, opt),
					(val) => {
						const h = vm.newString(val as string);
						deferred.resolve(h);
						h.dispose();
					},
					(err) => {
						rejectDeferred(err, deferred);
					},
				);
				hostCompletions.push(completion);
				trackDeferred(deferred);
				runtime.executePendingJobs();
				return deferred.handle;
			},
		);
		vm.setProp(global, "ajaxWithOption", ajaxWithOptHandle);
		ajaxWithOptHandle.dispose();
	}
}
