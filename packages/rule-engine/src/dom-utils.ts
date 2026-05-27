/**
 * DOM 双环境抽象 — 公共 API
 * 平台相关解析委托给 dom-parse（Node）/ dom-parse.browser（browser）
 * 由 package.json browser 字段自动路由
 */

export interface ParsedDocument {
	querySelectorAll(selector: string): NodeListOf<Element>;
	evaluate(
		xpathExpression: string,
		contextNode: Node,
		resolver: XPathNSResolver | null,
		type: number,
		result: XPathResult | null,
	): XPathResult;
	readonly documentElement: Element;
}

export { parseHTML, parseXML } from "./dom-parse";

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
