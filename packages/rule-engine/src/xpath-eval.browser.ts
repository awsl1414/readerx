/**
 * XPath 求值 — 浏览器实现
 * 使用原生 document.evaluate()
 */

import { fixHtml } from "./xpath-shared";

export function evaluateXPath(rule: string, content: string): unknown[] {
	const html = fixHtml(content);
	if (!html) return [];

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const root = doc.documentElement;
	if (!root) return [];

	const result = doc.evaluate(
		rule,
		root,
		null,
		1, // XPathResult.ORDERED_NODE_ITERATOR_TYPE
		null,
	);

	const nodes: unknown[] = [];
	let node: Node | null = result.iterateNext();
	while (node) {
		nodes.push(node);
		node = result.iterateNext();
	}
	return nodes;
}
