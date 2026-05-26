/**
 * XPath 解析器
 * 浏览器：原生 document.evaluate()
 * Node：xpath 库 + @xmldom/xmldom
 */

import { createRequire } from "node:module";
import type { RuleParser } from "./parser-interface";
import { fail, ok, okList } from "./parser-interface";
import type { ParseResult } from "./types";

/**
 * XPath 单字符串解析
 */
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

/**
 * XPath 字符串列表解析
 */
export function getStringList(rule: string, content: string): ParseResult {
	try {
		const nodes = evaluateXPath(rule, content);
		const values = nodes.map(nodeText).filter((t) => t !== "");
		return okList(values);
	} catch (e) {
		return fail(`XPath evaluation failed: ${e}`);
	}
}

/**
 * XPath 元素提取
 */
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

/** RuleParser 接口实现 */
export const xpathParser: RuleParser = {
	getString,
	getStringList,
	getElements,
};

// --- 环境 detection ---

const isBrowser = typeof DOMParser !== "undefined";

// --- 统一求值入口 ---

function evaluateXPath(rule: string, content: string): unknown[] {
	const html = fixHtml(content);
	if (!html) return [];
	if (isBrowser) {
		return evaluateNative(rule, html);
	}
	return evaluateWithLib(rule, html);
}

// --- 浏览器路径 ---

function evaluateNative(rule: string, html: string): unknown[] {
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

// --- Node 路径 ---

const nodeRequire = createRequire(import.meta.url);

let xpathLib: typeof import("xpath") | undefined;
let xmldomDOMParser:
	| InstanceType<typeof import("@xmldom/xmldom").DOMParser>
	| undefined;

function evaluateWithLib(rule: string, html: string): unknown[] {
	if (!xpathLib) {
		xpathLib = nodeRequire("xpath") as typeof import("xpath");
	}
	if (!xmldomDOMParser) {
		const xmldom = nodeRequire("@xmldom/xmldom") as typeof import("@xmldom/xmldom");
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

/** xmldom 对 text/html 分配 XHTML 命名空间，导致 XPath 标签选择器失效。清除后恢复标准行为。 */
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

// --- 工具函数 ---

function nodeText(node: unknown): string {
	if (!node || typeof node !== "object") return String(node ?? "");
	const el = node as Element;
	if (el.nodeType === 2 && "value" in el) return (el as unknown as Attr).value;
	return el.textContent ?? "";
}

function isElement(node: unknown): boolean {
	return (
		node !== null && typeof node === "object" && "outerHTML" in (node as object)
	);
}

function fixHtml(content: string): string {
	let html = content.trim();
	if (html.endsWith("</td>")) html = `<tr>${html}</tr>`;
	if (html.endsWith("</tr>") || html.endsWith("</tbody>"))
		html = `<table>${html}</table>`;
	return html;
}
