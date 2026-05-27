/**
 * DOM 解析 — Node.js 实现
 * 使用 linkedom (HTML) + @xmldom/xmldom (XML)
 *
 * 此文件仅用于 Node.js 环境（测试/SSR），
 * 浏览器构建通过 package.json browser 字段替换为 dom-parse.browser.ts
 */

import { createRequire } from "node:module";
import type { ParsedDocument } from "./dom-utils";

const nodeRequire = createRequire(import.meta.url);

function loadModule<T>(id: string): T {
	return nodeRequire(id) as T;
}

let linkedomModule: ReturnType<typeof loadModule<typeof import("linkedom")>>;

export function parseHTML(content: string): ParsedDocument {
	if (!linkedomModule) {
		linkedomModule = loadModule<typeof import("linkedom")>("linkedom");
	}
	const { document } = linkedomModule.parseHTML(content);
	return document as unknown as ParsedDocument;
}

let xmldomModule: ReturnType<
	typeof loadModule<typeof import("@xmldom/xmldom")>
>;

export function parseXML(content: string): ParsedDocument {
	if (!xmldomModule) {
		xmldomModule =
			loadModule<typeof import("@xmldom/xmldom")>("@xmldom/xmldom");
	}
	const parser = new xmldomModule.DOMParser();
	const doc = parser.parseFromString(content, "application/xml");
	return doc as unknown as ParsedDocument;
}
