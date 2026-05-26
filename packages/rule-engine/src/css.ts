/**
 * CSS 选择器解析器（Legado JSoup 兼容）
 *
 * 支持：
 * - 标准 CSS 选择器（querySelectorAll）
 * - Legado 简写：tag.name, class.name, id.name, text.value
 * - 属性提取：@text, @href, @src, @html, @ownText, @textNodes, @all
 * - 索引：-1 (倒数), [start:end:step] 范围, ! 排除
 */

import { parseHTML } from "./dom-utils";
import { fail, ok, okList } from "./parser-interface";
import type { RuleParser } from "./parser-interface";
import type { ParseResult } from "./types";

/** 解析后的 CSS 规则结构 */
interface ParsedCssRule {
	/** CSS 选择器部分 */
	selector: string;
	/** 属性提取目标 */
	attribute: string | undefined;
	/** 索引表达式（未解析） */
	indexExpr: string | undefined;
}

/**
 * CSS 单字符串解析
 */
export function getString(rule: string, content: string): ParseResult {
	const parsed = parseCssRule(rule);
	const doc = parseHTML(content);

	try {
		const elements = selectElements(doc, parsed);
		if (elements.length === 0) return ok("");

		const values = elements.map((el) => extractAttribute(el, parsed.attribute));
		const filtered = values.filter((v) => v !== "");
		if (filtered.length === 0) return ok("");

		return okList(filtered);
	} catch (e) {
		return fail(`CSS parse error: ${e}`);
	}
}

/**
 * CSS 字符串列表解析
 */
export function getStringList(rule: string, content: string): ParseResult {
	const parsed = parseCssRule(rule);
	const doc = parseHTML(content);

	try {
		const elements = selectElements(doc, parsed);
		const values = elements.map((el) => extractAttribute(el, parsed.attribute));
		return okList(values);
	} catch (e) {
		return fail(`CSS parse error: ${e}`);
	}
}

/**
 * CSS 元素提取（返回 outerHTML，供嵌套规则使用）
 */
export function getElements(rule: string, content: string): ParseResult {
	const parsed = parseCssRule(rule);
	const doc = parseHTML(content);

	try {
		const elements = selectElements(doc, parsed);
		return okList(elements.map((el) => el.outerHTML ?? el.innerHTML ?? ""));
	} catch (e) {
		return fail(`CSS parse error: ${e}`);
	}
}

/**
 * 解析 CSS 规则字符串
 * 将 "div.content@href.-1" 拆分为 selector + attribute + index
 */
/** 索引后缀正则：.N, .-N, .!N, .start:end:step */
const INDEX_RE = /^([^.]+?)\.([!]?-?\d+(?::-?\d+(?::-?\d+)?)?)$/;

/**
 * 解析 CSS 规则字符串
 *
 * Legado 格式：selector[@attribute][.index]
 * 例如 "div.content@text.-1" → selector=div.content, attr=text, index=-1
 */
export function parseCssRule(rule: string): ParsedCssRule {
	let remaining = rule.trim();
	let attribute: string | undefined;
	let indexExpr: string | undefined;

	// 1. 提取 @attribute[.index] 后缀
	const lastAt = remaining.lastIndexOf("@");
	if (lastAt !== -1) {
		const afterAt = remaining.substring(lastAt + 1);
		remaining = remaining.substring(0, lastAt).trim();

		// 从 @ 后部分分离 attribute 和 index
		const idxMatch = afterAt.match(INDEX_RE);
		if (idxMatch) {
			attribute = idxMatch[1] || undefined;
			indexExpr = idxMatch[2];
		} else {
			attribute = afterAt || undefined;
		}
	}

	// 2. 从 selector 部分提取索引（selector.index@attr 格式）
	const selMatch = remaining.match(
		/^(.+)\.([!]?-?\d+(?::-?\d+(?::-?\d+)?)?)$/,
	);
	if (selMatch?.[1]) {
		remaining = selMatch[1];
		// @attr.index 优先级更高
		if (!indexExpr) {
			indexExpr = selMatch[2];
		}
	}

	// 3. 转换 Legado 简写为标准 CSS
	remaining = expandLegadoShorthand(remaining);

	return { selector: remaining, attribute, indexExpr };
}

/**
 * 将 Legado 简写转换为标准 CSS 选择器
 *
 * - tag.name → name（按标签名）
 * - class.name → .name（按类名）
 * - id.name → #name（按 ID）
 * - text.value → [包含文本的元素，后续通过 :contains 处理]
 */
function expandLegadoShorthand(selector: string): string {
	// 已经是标准 CSS 选择器（以 . # : [ 开头）直接返回
	if (/^[.#:[*]/.test(selector)) return selector;

	// tag.name → 标签名选择
	const tagMatch = selector.match(/^tag\.(.+)$/);
	if (tagMatch?.[1]) return tagMatch[1];

	// class.name → .name
	const classMatch = selector.match(/^class\.(.+)$/);
	if (classMatch) return `.${classMatch[1]}`;

	// id.name → #name
	const idMatch = selector.match(/^id\.(.+)$/);
	if (idMatch) return `#${idMatch[1]}`;

	// text.value → 按文本内容过滤（存储到 data-text-filter 供 selectElements 使用）
	const textMatch = selector.match(/^text\.(.+)$/);
	if (textMatch?.[1]) {
		return `__TEXT_FILTER__${textMatch[1]}`;
	}

	// children → 子元素
	if (selector === "children") return "> *";

	// 其他情况保持原样（可能是标准 CSS）
	return selector;
}

/**
 * 选择元素并应用索引
 */
function selectElements(
	doc: ReturnType<typeof parseHTML>,
	parsed: ParsedCssRule,
): Element[] {
	let elements: Element[];

	try {
		// 处理 text.value 简写的文本过滤
		if (parsed.selector.startsWith("__TEXT_FILTER__")) {
			const searchText = parsed.selector.substring("__TEXT_FILTER__".length);
			const allElements = doc.querySelectorAll("*");
			elements = Array.from(allElements).filter(
				(el) => el.textContent?.includes(searchText) ?? false,
			);
		} else {
			const nodeList = doc.querySelectorAll(parsed.selector);
			elements = Array.from(nodeList);
		}
	} catch {
		// 选择器语法错误
		return [];
	}

	// 应用索引过滤
	if (parsed.indexExpr) {
		elements = applyIndex(elements, parsed.indexExpr);
	}

	return elements;
}

/**
 * 应用 Legado 索引语法
 *
 * 支持格式：
 * - "0" → 第一个
 * - "-1" → 最后一个
 * - "!0" → 排除第一个
 * - "0:10:2" → 从 0 到 10，步长 2
 */
function applyIndex(elements: Element[], indexExpr: string): Element[] {
	const len = elements.length;
	if (len === 0) return [];

	// 排除模式
	if (indexExpr.startsWith("!")) {
		const excludeIdx = Number.parseInt(indexExpr.substring(1), 10);
		return elements.filter((_, i) => i !== toPositiveIndex(excludeIdx, len));
	}

	// 范围模式 start:end:step
	if (indexExpr.includes(":")) {
		return applyRangeIndex(elements, indexExpr);
	}

	// 单索引
	const idx = toPositiveIndex(Number.parseInt(indexExpr, 10), len);
	if (idx < 0 || idx >= len) return [];
	const el = elements[idx];
	return el ? [el] : [];
}

/** 范围索引 */
function applyRangeIndex(elements: Element[], expr: string): Element[] {
	const parts = expr.split(":");
	const len = elements.length;

	const startStr = parts[0];
	const endStr = parts[1];
	const stepStr = parts[2];

	const start = startStr
		? toPositiveIndex(Number.parseInt(startStr, 10), len)
		: 0;
	const end = endStr
		? toPositiveIndex(Number.parseInt(endStr, 10), len)
		: len - 1;
	const step = stepStr ? Number.parseInt(stepStr, 10) : 1;

	if (step === 0) return [];

	const result: Element[] = [];
	if (step > 0) {
		for (let i = start; i <= end && i < len; i += step) {
			if (i >= 0) result.push(elements[i]!);
		}
	} else {
		for (let i = start; i >= end && i >= 0; i += step) {
			if (i < len) result.push(elements[i]!);
		}
	}

	return result;
}

/** 负索引转正索引 */
function toPositiveIndex(idx: number, length: number): number {
	return idx < 0 ? length + idx : idx;
}

/**
 * 从元素提取属性值
 */
function extractAttribute(el: Element, attr: string | undefined): string {
	if (!attr || attr === "text") {
		return el.textContent?.trim() ?? "";
	}

	if (attr === "html") {
		return (el as HTMLElement).innerHTML ?? el.innerHTML ?? "";
	}

	if (attr === "outerHtml") {
		return (el as HTMLElement).outerHTML ?? el.outerHTML ?? "";
	}

	if (attr === "ownText") {
		// 仅直接文本节点，不包括子元素的文本
		const texts: string[] = [];
		for (const node of Array.from(el.childNodes)) {
			if (node.nodeType === 3) {
				// TEXT_NODE
				const text = node.textContent?.trim();
				if (text) texts.push(text);
			}
		}
		return texts.join(" ");
	}

	if (attr === "textNodes") {
		// 所有文本节点
		return getAllTextNodes(el).join("\n");
	}

	if (attr === "all") {
		return (el as HTMLElement).outerHTML ?? el.outerHTML ?? "";
	}

	// 标准 HTML 属性
	return el.getAttribute(attr) ?? "";
}

/** 递归获取所有文本节点 */
function getAllTextNodes(el: Element): string[] {
	const texts: string[] = [];
	for (const node of Array.from(el.childNodes)) {
		if (node.nodeType === 3) {
			const text = node.textContent?.trim();
			if (text) texts.push(text);
		} else if (node.nodeType === 1) {
			texts.push(...getAllTextNodes(node as Element));
		}
	}
	return texts;
}

/** RuleParser 接口实现 */
export const cssParser: RuleParser = { getString, getStringList, getElements };
