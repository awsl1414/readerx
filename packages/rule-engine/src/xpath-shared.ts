/**
 * XPath 共享工具函数
 * 不依赖任何 Node 或浏览器专有 API
 */

export function fixHtml(content: string): string {
	let html = content.trim();
	if (html.endsWith("</td>")) html = `<tr>${html}</tr>`;
	if (html.endsWith("</tr>") || html.endsWith("</tbody>"))
		html = `<table>${html}</table>`;
	return html;
}

export function nodeText(node: unknown): string {
	if (!node || typeof node !== "object") return String(node ?? "");
	const el = node as Element;
	if (el.nodeType === 2 && "value" in el) return (el as unknown as Attr).value;
	return el.textContent ?? "";
}

export function isElement(node: unknown): boolean {
	return (
		node !== null && typeof node === "object" && "outerHTML" in (node as object)
	);
}
