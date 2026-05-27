/**
 * DOM 解析 — 浏览器实现
 * 使用原生 DOMParser
 */

import type { ParsedDocument } from "./dom-utils";

export function parseHTML(content: string): ParsedDocument {
	const parser = new DOMParser();
	const doc = parser.parseFromString(content, "text/html");
	return doc as unknown as ParsedDocument;
}

export function parseXML(content: string): ParsedDocument {
	const parser = new DOMParser();
	const doc = parser.parseFromString(content, "application/xml");
	return doc as unknown as ParsedDocument;
}
