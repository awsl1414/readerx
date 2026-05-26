/**
 * DOM 双环境抽象
 * 浏览器：原生 DOMParser + querySelectorAll + document.evaluate
 * Node：linkedom (HTML) + @xmldom/xmldom (XML)
 */

export interface ParsedDocument {
	querySelectorAll(selector: string): NodeListOf<Element>;
	/** XPath 求值（浏览器原生或 @xmldom polyfill） */
	evaluate(
		xpathExpression: string,
		contextNode: Node,
		resolver: XPathNSResolver | null,
		type: number,
		result: XPathResult | null,
	): XPathResult;
	readonly documentElement: Element;
}

/**
 * 解析 HTML 内容为 document
 * 浏览器用原生 DOMParser，Node 用 linkedom
 */
export function parseHTML(content: string): ParsedDocument {
	if (typeof DOMParser !== "undefined") {
		const parser = new DOMParser();
		const doc = parser.parseFromString(content, "text/html");
		return doc as unknown as ParsedDocument;
	}

	// Node: linkedom
	return parseHTMLWithLinkedom(content);
}

/**
 * 解析 XML 内容为 document
 * 浏览器用原生 DOMParser，Node 用 @xmldom/xmldom
 */
export function parseXML(content: string): ParsedDocument {
	if (typeof DOMParser !== "undefined") {
		const parser = new DOMParser();
		const doc = parser.parseFromString(content, "application/xml");
		return doc as unknown as ParsedDocument;
	}

	// Node: @xmldom/xmldom
	return parseXMLWithXmldom(content);
}

/** 修复 HTML 片段（与 Legado 一致的包裹策略） */
export function fixHtmlFragment(html: string): string {
	let result = html;
	if (result.endsWith("</td>")) {
		result = `<tr>${result}</tr>`;
	}
	if (result.endsWith("</tr>") || result.endsWith("</tbody>")) {
		result = `<table>${result}</table>`;
	}
	return result;
}

// --- Node 环境实现（延迟加载） ---
// 浏览器环境通过 typeof DOMParser 检测跳过，由 bundler tree-shake 移除

/**
 * ESM 兼容的同步模块加载器
 * 仅在 Node 环境调用（浏览器路径由原生 DOMParser 处理）
 */
function loadModule<T>(id: string): T {
	// Node / Vitest: 全局 require 可用
	if (typeof require === "function") {
		return require(id) as T;
	}
	throw new Error(
		`Cannot load "${id}" — no module loader available. ` +
			"This code path should only run in Node environments.",
	);
}

let linkedomModule: ReturnType<typeof loadModule<typeof import("linkedom")>>;

function parseHTMLWithLinkedom(content: string): ParsedDocument {
	if (!linkedomModule) {
		linkedomModule = loadModule<typeof import("linkedom")>("linkedom");
	}
	const { document } = linkedomModule.parseHTML(content);
	return document as unknown as ParsedDocument;
}

let xmldomModule: ReturnType<
	typeof loadModule<typeof import("@xmldom/xmldom")>
>;

function parseXMLWithXmldom(content: string): ParsedDocument {
	if (!xmldomModule) {
		xmldomModule =
			loadModule<typeof import("@xmldom/xmldom")>("@xmldom/xmldom");
	}
	const parser = new xmldomModule.DOMParser();
	const doc = parser.parseFromString(content, "application/xml");
	return doc as unknown as ParsedDocument;
}
