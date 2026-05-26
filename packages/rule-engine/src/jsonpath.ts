/**
 * JSONPath 解析器
 * 使用 jsonpath-plus 实现 JSONPath 查询
 */

import { JSONPath } from "jsonpath-plus";
import { fail, okList } from "./parser-interface";
import type { RuleParser } from "./parser-interface";
import type { ParseResult } from "./types";

/**
 * JSONPath 单字符串解析（多结果用 \n 连接）
 */
export function getString(rule: string, content: string): ParseResult {
	const json = parseJSON(content);
	if (!json) return fail("Invalid JSON content");

	const results = query(rule, json);
	if (results.length === 0) return okList([""]);

	const strings = results.map((r) => (typeof r === "string" ? r : String(r)));
	return okList(strings);
}

/**
 * JSONPath 字符串列表解析
 */
export function getStringList(rule: string, content: string): ParseResult {
	const json = parseJSON(content);
	if (!json) return fail("Invalid JSON content");

	const results = query(rule, json);
	const strings = results.map((r) => (typeof r === "string" ? r : String(r)));
	return okList(strings);
}

/**
 * JSONPath 元素提取（返回序列化的 JSON 对象，供嵌套规则使用）
 */
export function getElements(rule: string, content: string): ParseResult {
	const json = parseJSON(content);
	if (!json) return fail("Invalid JSON content");

	const results = query(rule, json);
	return okList(results.map((r) => JSON.stringify(r)));
}

function parseJSON(content: string): unknown {
	try {
		return JSON.parse(content);
	} catch {
		return null;
	}
}

function query(rule: string, json: unknown): unknown[] {
	try {
		const result = JSONPath({
			path: rule,
			json: json as Record<string, unknown>,
			wrap: true,
		});
		return Array.isArray(result) ? result : [result];
	} catch {
		return [];
	}
}

/** RuleParser 接口实现 */
export const jsonpathParser: RuleParser = {
	getString,
	getStringList,
	getElements,
};
