import type {
	JsEvalContext,
	JsEvalResult,
	JsExecutor,
} from "@readerx/rule-engine";
import { createHostFunctions, type HostFunctionOptions } from "./host-functions";
import { QuickJSSandbox } from "./sandbox";

export interface QuickJsExecutorOptions extends HostFunctionOptions {
	timeout?: number;
	memoryLimit?: number;
}

export class QuickJsExecutor implements JsExecutor {
	private sandbox = new QuickJSSandbox();
	private options: QuickJsExecutorOptions;

	constructor(options: QuickJsExecutorOptions) {
		this.options = options;
		this.sandbox.setHostFunctions(createHostFunctions(options));
	}

	async eval(code: string, context: JsEvalContext): Promise<JsEvalResult> {
		const options: { timeout?: number; memoryLimit?: number } = {};
		if (this.options.timeout !== undefined) options.timeout = this.options.timeout;
		if (this.options.memoryLimit !== undefined) options.memoryLimit = this.options.memoryLimit;

		const result = await this.sandbox.eval(code, context, options);
		return {
			success: result.success,
			value: result.value,
			...(result.error !== undefined ? { error: result.error } : {}),
		};
	}

	async terminate(): Promise<void> {
		await this.sandbox.terminate();
	}
}
