/**
 * XPath 求值 — Node.js 实现
 * 使用 xpath 库 + @xmldom/xmldom
 *
 * 此文件仅用于 Node.js 环境（测试/SSR），
 * 浏览器构建通过 package.json browser 字段替换为 xpath-eval.browser.ts
 */

import { createRequire } from "node:module";
import { fixHtml } from "./xpath-shared";

const nodeRequire = createRequire(import.meta.url);

let xpathLib: typeof import("xpath") | undefined;
let xmldomDOMParser:
	| InstanceType<typeof import("@xmldom/xmldom").DOMParser>
	| undefined;

export function evaluateXPath(rule: string, content: string): unknown[] {
	const html = fixHtml(content);
	if (!html) return [];

	if (!xpathLib) {
		xpathLib = nodeRequire("xpath") as typeof import("xpath");
	}
	if (!xmldomDOMParser) {
		const xmldom = nodeRequire(
			"@xmldom/xmldom",
		) as typeof import("@xmldom/xmldom");
		xmldomDOMParser = new xmldom.DOMParser();
	}

	const isXml = html.trimStart().startsWith("<?xml");
	const doc = xmldomDOMParser.parseFromString(
		html,
		isXml ? "text/xml" : "text/html",
	);
	if (!isXml) stripNamespaces(doc);

	const selected = xpathLib.select(rule, doc as unknown as Node);
	return Array.isArray(selected) ? selected : selected ? [selected] : [];
}

function stripNamespaces(node: unknown): void {
	if (!node || typeof node !== "object") return;
	const el = node as Record<string, unknown>;
	if (el.nodeType === 1) {
		el.namespaceURI = null;
		el.prefix = null;
	}
	const children = el.childNodes as ArrayLike<unknown> | undefined;
	if (children) {
		for (let i = 0; i < children.length; i++) {
			stripNamespaces(children[i]);
		}
	}
}
