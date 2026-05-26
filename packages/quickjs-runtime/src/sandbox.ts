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

let modulePromise: Promise<QuickJSWASMModule> | null = null;

async function getModule(): Promise<QuickJSWASMModule> {
	if (!modulePromise) {
		modulePromise = newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
	}
	return modulePromise;
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
				this.injectHostFunctions(vm, runtime, global);
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
	): void {
		if (!this.hostFunctions) return;

		const fns = this.hostFunctions;

		const ajaxHandle = vm.newFunction("ajax", (urlHandle) => {
			const url = vm.dump(urlHandle) as string;
			const promise = fns.ajax(url);
			const deferred = vm.newPromise();
			promise.then(
				(val) => {
					const strHandle = vm.newString(val);
					deferred.resolve(strHandle);
					strHandle.dispose();
				},
				(err) => {
					const errHandle = vm.newString(
						err instanceof Error ? err.message : String(err),
					);
					deferred.reject(errHandle);
					errHandle.dispose();
				},
			);
			deferred.settled.then(() => deferred.dispose());
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
			const promise = fns.evalRule(rule);
			const deferred = vm.newPromise();
			promise.then(
				(val) => {
					const h = vm.newString(val);
					deferred.resolve(h);
					h.dispose();
				},
				(err) => {
					const h = vm.newString(
						err instanceof Error ? err.message : String(err),
					);
					deferred.reject(h);
					h.dispose();
				},
			);
			deferred.settled.then(() => deferred.dispose());
			runtime.executePendingJobs();
			return deferred.handle;
		});
		vm.setProp(global, "evalRule", evalRuleHandle);
		evalRuleHandle.dispose();

		// evalRuleList — async, returns JSON stringified array
		const evalRuleListHandle = vm.newFunction(
			"evalRuleList",
			(ruleHandle) => {
				const rule = vm.dump(ruleHandle) as string;
				const promise = fns.evalRuleList(rule);
				const deferred = vm.newPromise();
				promise.then(
					(vals) => {
						const h = vm.newString(JSON.stringify(vals));
						deferred.resolve(h);
						h.dispose();
					},
					(err) => {
						const h = vm.newString(
							err instanceof Error ? err.message : String(err),
						);
						deferred.reject(h);
						h.dispose();
					},
				);
				deferred.settled.then(() => deferred.dispose());
				runtime.executePendingJobs();
				return deferred.handle;
			},
		);
		vm.setProp(global, "evalRuleList", evalRuleListHandle);
		evalRuleListHandle.dispose();

		// ajaxWithOption — async
		const ajaxWithOptHandle = vm.newFunction(
			"ajaxWithOption",
			(urlHandle, optHandle) => {
				const url = vm.dump(urlHandle) as string;
				const opt = vm.dump(optHandle) as string;
				const promise = fns.ajaxWithOption(url, opt);
				const deferred = vm.newPromise();
				promise.then(
					(val) => {
						const h = vm.newString(val);
						deferred.resolve(h);
						h.dispose();
					},
					(err) => {
						const h = vm.newString(
							err instanceof Error ? err.message : String(err),
						);
						deferred.reject(h);
						h.dispose();
					},
				);
				deferred.settled.then(() => deferred.dispose());
				runtime.executePendingJobs();
				return deferred.handle;
			},
		);
		vm.setProp(global, "ajaxWithOption", ajaxWithOptHandle);
		ajaxWithOptHandle.dispose();
	}
}
