import type { ParseResult } from "./types";

/**
 * 统一解析器契约
 * 所有解析器（CSS、XPath、JSONPath）实现相同接口
 */
export interface RuleParser {
	/** 解析单个字符串结果（多值用 \n 连接） */
	getString(rule: string, content: string): ParseResult;

	/** 解析字符串列表 */
	getStringList(rule: string, content: string): ParseResult;

	/** 解析原始元素引用（供嵌套规则使用） */
	getElements(rule: string, content: string): ParseResult;
}

/** 创建成功的 ParseResult */
export function ok(value: string, values?: string[]): ParseResult {
	return { ok: true, value, values: values ?? [value] };
}

/** 创建成功的 ParseResult（多值） */
export function okList(values: string[]): ParseResult {
	return { ok: true, value: values.join("\n"), values };
}

/** 创建失败的 ParseResult */
export function fail(error: string): ParseResult {
	return { ok: false, error };
}
