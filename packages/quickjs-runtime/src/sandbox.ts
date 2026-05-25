/**
 * QuickJS 沙箱封装
 * 在 Web Worker 中运行 QuickJS，提供安全的 JS 执行环境
 */

export interface SandboxOptions {
	timeout?: number;
	memoryLimit?: number;
}

export class QuickJSSandbox {
	private options: SandboxOptions;

	constructor(options: SandboxOptions = {}) {
		this.options = options;
	}

	async eval(
		code: string,
		context: Record<string, unknown> = {},
	): Promise<unknown> {
		// TODO: 实现 QuickJS 沙箱执行
		void code;
		void context;
		throw new Error("QuickJS runtime not implemented");
	}

	async terminate(): Promise<void> {
		// TODO: 实现沙箱终止
	}
}
