/** 沙箱配置选项 */
export type SandboxOptions = {
	/** 执行超时（毫秒），默认 5000 */
	timeout?: number;
	/** 内存限制（字节），默认 8MB */
	memoryLimit?: number;
};

/** 注入到沙箱的 JS 上下文变量 */
export type JsContext = {
	/** 前一步规则结果 */
	result?: unknown;
	/** 当前页面基础 URL */
	baseUrl?: string;
	/** 当前书源配置 */
	source?: Record<string, unknown>;
	/** 当前书籍信息 */
	book?: Record<string, unknown>;
	/** 当前章节信息 */
	chapter?: Record<string, unknown>;
	/** 搜索关键词（URL 分析器场景） */
	key?: string;
	/** 页码（URL 分析器场景） */
	page?: number;
	/** 原始页面内容 */
	src?: string;
};

/** 沙箱执行结果 */
export type SandboxResult = {
	readonly success: boolean;
	readonly value: unknown;
	readonly error?: string;
};

/** 沙箱内向 JS 暴露的宿主函数接口 */
export type HostFunctions = {
	ajax(url: string): Promise<string>;
	log(message: string): void;
	base64Encode(str: string): string;
	base64Decode(str: string): string;
	put(key: string, value: string): void;
	get(key: string): string;
};
