/**
 * AnalyzeUrl — URL 规则解析
 * 参考 docs/book-source-rule-engine.md URL 解析器部分
 *
 * URL 规则语法：
 * 基础URL,@js:JS处理,{{变量}},<page>页码
 */

import type {
	AnalyzeUrlContext,
	JsEvalContext,
	JsExecutor,
	UrlOption,
} from "./types";

const URL_OPTION_RE = /,\s*(?=\{)/g;

const PAGE_RE = /<([^>]+)>/g;

const JS_PATTERN = /<js>([\w\W]*?)<\/js>|@js:([\w\W]*)/i;

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

/** analyzeUrlAsync 的扩展选项 */
export interface AnalyzeUrlOptions extends AnalyzeUrlContext {
	jsExecutor?: JsExecutor;
}

/**
 * 将规则 URL 拆分为 URL 部分和 JSON 选项部分。
 * 从末尾查找最后一个 ",{" 分割点，避免误匹配查询参数中的 JSON。
 */
export function splitUrlOptions(ruleUrl: string): {
	urlPart: string;
	optionJson: string | null;
} {
	const matches = [...ruleUrl.matchAll(URL_OPTION_RE)];
	if (matches.length === 0) {
		return { urlPart: ruleUrl, optionJson: null };
	}

	const lastMatch = matches[matches.length - 1];
	if (!lastMatch?.index) {
		return { urlPart: ruleUrl, optionJson: null };
	}
	const splitIndex = lastMatch.index;
	if (splitIndex === undefined) {
		return { urlPart: ruleUrl, optionJson: null };
	}

	const urlPart = ruleUrl.substring(0, splitIndex).trimEnd();
	const optionJson = ruleUrl.substring(splitIndex + 1).trim();

	if (!optionJson.startsWith("{") || !optionJson.endsWith("}")) {
		return { urlPart: ruleUrl, optionJson: null };
	}

	return { urlPart, optionJson };
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
	if (page === undefined || page < 1) return url;
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
		const raw: unknown = JSON.parse(optionJson);
		if (typeof raw !== "object" || raw === null) return result;
		option = raw as UrlOption;
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
 * 异步版本：支持 URL 中的 @js: 和 <js> 段，以及 option.webJs。
 */
export async function analyzeUrlAsync(
	rule: string,
	options: AnalyzeUrlOptions = {},
): Promise<AnalyzeUrlResult> {
	const { jsExecutor, ...context } = options;
	const { urlPart, optionJson } = splitUrlOptions(rule);
	let url = replaceVariables(urlPart, context.variables ?? {});

	if (jsExecutor && JS_PATTERN.test(url)) {
		const jsResult = await resolveJsInUrl(url, jsExecutor, context);
		if (jsResult !== null) url = jsResult;
	}

	url = resolvePage(url, context.page);
	url = resolveRelativeUrl(url, context.baseUrl);
	const result = buildResult(url, optionJson, context);

	if (jsExecutor && result.webJs) {
		const jsResult = await jsExecutor.eval(result.webJs, {
			...context,
			result: result.url,
			src: result.url,
		});
		if (jsResult.success && jsResult.value != null) {
			result.url = String(jsResult.value);
		}
	}

	return result;
}

/** 解析 URL 中的 JS 段 */
async function resolveJsInUrl(
	url: string,
	executor: JsExecutor,
	context: AnalyzeUrlContext,
): Promise<string | null> {
	const match = url.match(JS_PATTERN);
	if (!match) return null;
	const jsCode = (match[2] ?? match[1] ?? "").trim();
	if (!jsCode) return url.replace(JS_PATTERN, "");

	const ctx: JsEvalContext = {
		src: url.replace(JS_PATTERN, ""),
		...context,
	};
	const result = await executor.eval(jsCode, ctx);
	if (!result.success || result.value == null) return null;
	return String(result.value);
}

/**
 * 区分 AnalyzeUrlContext 与 Record<string, string>（变量 map）。
 * Context 的值类型包含 object/number，变量 map 的值全是 string。
 */
function isAnalyzeUrlContext(obj: Record<string, unknown>): boolean {
	const values = Object.values(obj);
	return values.some((v) => typeof v !== "string");
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
		if (variablesOrContext === undefined) {
			return analyzeUrl(rule);
		}
		if (isAnalyzeUrlContext(variablesOrContext as Record<string, unknown>)) {
			return analyzeUrl(rule, variablesOrContext as AnalyzeUrlContext);
		}
		return analyzeUrl(rule, {
			variables: variablesOrContext as Record<string, string>,
		});
	}

	async analyzeAsync(
		rule: string,
		options: AnalyzeUrlOptions = {},
	): Promise<AnalyzeUrlResult> {
		return analyzeUrlAsync(rule, options);
	}
}
