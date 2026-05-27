/**
 * XPath 解析器 — 公共 API
 * 平台相关求值委托给 xpath-eval（Node）/ xpath-eval.browser（browser）
 * 由 package.json browser 字段自动路由
 */

import type { RuleParser } from "./parser-interface";
import { fail, ok, okList } from "./parser-interface";
import type { ParseResult } from "./types";
import { evaluateXPath } from "./xpath-eval";
import { isElement, nodeText } from "./xpath-shared";

export function getString(rule: string, content: string): ParseResult {
	try {
		const nodes = evaluateXPath(rule, content);
		if (nodes.length === 0) return ok("");
		const texts = nodes.map(nodeText);
		const first = texts.find((t) => t !== "") ?? "";
		return ok(first || texts.join("\n"));
	} catch (e) {
		return fail(`XPath evaluation failed: ${e}`);
	}
}

export function getStringList(rule: string, content: string): ParseResult {
	try {
		const nodes = evaluateXPath(rule, content);
		const values = nodes.map(nodeText).filter((t) => t !== "");
		return okList(values);
	} catch (e) {
		return fail(`XPath evaluation failed: ${e}`);
	}
}

export function getElements(rule: string, content: string): ParseResult {
	try {
		const nodes = evaluateXPath(rule, content);
		const elements = nodes.map((n) => {
			if (isElement(n)) return (n as Element).outerHTML;
			return (n as Element).textContent ?? "";
		});
		return okList(elements);
	} catch (e) {
		return fail(`XPath evaluation failed: ${e}`);
	}
}

export const xpathParser: RuleParser = {
	getString,
	getStringList,
	getElements,
};

// Re-export shared helpers for other modules
export { fixHtml, isElement, nodeText } from "./xpath-shared";
