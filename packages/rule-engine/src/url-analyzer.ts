/**
 * AnalyzeUrl — URL 规则解析
 * 参考 docs/book-source-rule-engine.md URL 解析器部分
 *
 * URL 规则语法：
 * 基础URL,@js:JS处理,{{变量}},<page>页码
 */

import type { AnalyzeUrlContext, UrlOption } from "./types";

const URL_OPTION_RE = /,\s*(?=\{)/;

const PAGE_RE = /<([^>]+)>/g;

export interface AnalyzeUrlResult {
	url: string;
	method: "GET" | "POST";
	charset?: string;
	headers: Record<string, string>;
	body?: string;
	webJs?: string;
	retry: number;
	type?: string;
}

/**
 * 将规则 URL 拆分为 URL 部分和 JSON 选项部分。
 * 匹配逗号后紧跟 `{` 的位置进行分割，避免误匹配查询参数中的 JSON。
 */
export function splitUrlOptions(ruleUrl: string): {
	urlPart: string;
	optionJson: string | null;
} {
	const match = ruleUrl.match(URL_OPTION_RE);
	if (!match?.index) {
		return { urlPart: ruleUrl, optionJson: null };
	}
	return {
		urlPart: ruleUrl.substring(0, match.index).trimEnd(),
		optionJson: ruleUrl.substring(match.index + 1).trim(),
	};
}

/**
 * 替换 URL 中的 {{变量}} 占位符为实际值。
 */
export function replaceVariables(
	url: string,
	variables: Record<string, string>,
): string {
	let result = url;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replaceAll(`{{${key}}}`, value);
	}
	return result;
}

/**
 * 解析 URL 中的页码占位符 `<...>`。
 * - `<page>` → 替换为页码数字
 * - `<a,b,c>` → 按页码索引取值（page 1 取 index 0）
 * - 超出列表范围取最后一项
 */
export function resolvePage(url: string, page: number | undefined): string {
	if (page === undefined) return url;
	return url.replace(PAGE_RE, (_match, content: string) => {
		const parts = content.split(",").map((s: string) => s.trim());
		if (parts.length === 1) {
			return String(page);
		}
		const index = Math.min(page - 1, parts.length - 1);
		return parts[index] ?? parts[parts.length - 1] ?? String(page);
	});
}

/**
 * 将相对 URL 解析为绝对 URL。
 * 如果无法解析（例如无效 URL），返回原始 URL。
 */
export function resolveRelativeUrl(
	url: string,
	baseUrl: string | undefined,
): string {
	if (!baseUrl) return url;
	try {
		return new URL(url, baseUrl).href;
	} catch {
		return url;
	}
}

/**
 * 从解析后的 URL 和选项 JSON 构建最终结果。
 */
function buildResult(
	url: string,
	optionJson: string | null,
	context: AnalyzeUrlContext,
): AnalyzeUrlResult {
	const result: AnalyzeUrlResult = {
		url,
		method: "GET",
		headers: { ...context.headers },
		retry: 0,
	};

	if (!optionJson) return result;

	let option: UrlOption;
	try {
		option = JSON.parse(optionJson) as UrlOption;
	} catch {
		return result;
	}

	if (option.method?.toUpperCase() === "POST") {
		result.method = "POST";
	}
	if (option.charset) result.charset = option.charset;
	if (option.body) {
		result.body = replaceVariables(option.body, context.variables ?? {});
	}
	if (option.webJs) result.webJs = option.webJs;
	if (option.type) result.type = option.type;
	if (typeof option.retry === "number" && option.retry >= 0) {
		result.retry = option.retry;
	}
	if (option.headers) {
		result.headers = { ...result.headers, ...option.headers };
	}

	return result;
}

/**
 * 纯函数：完整 URL 规则解析管线。
 * 依次执行：拆分选项 → 变量替换 → 页码解析 → 相对路径解析 → 构建结果
 */
export function analyzeUrl(
	rule: string,
	context: AnalyzeUrlContext = {},
): AnalyzeUrlResult {
	const { urlPart, optionJson } = splitUrlOptions(rule);
	const withVars = replaceVariables(urlPart, context.variables ?? {});
	const withPage = resolvePage(withVars, context.page);
	const resolved = resolveRelativeUrl(withPage, context.baseUrl);
	return buildResult(resolved, optionJson, context);
}

/**
 * 向后兼容的类 API。
 * 支持旧的 (rule, variables) 两参数调用和新的 (rule, context) 调用。
 */
export class AnalyzeUrl {
	analyze(
		rule: string,
		variablesOrContext?: Record<string, string> | AnalyzeUrlContext,
	): AnalyzeUrlResult {
		if (
			variablesOrContext === undefined ||
			"variables" in variablesOrContext ||
			"page" in variablesOrContext ||
			"baseUrl" in variablesOrContext ||
			"headers" in variablesOrContext
		) {
			return analyzeUrl(rule, variablesOrContext as AnalyzeUrlContext);
		}
		return analyzeUrl(rule, {
			variables: variablesOrContext as Record<string, string>,
		});
	}
}
