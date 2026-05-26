/**
 * AnalyzeUrl — URL 规则解析
 * 参考 docs/book-source-rule-engine.md URL 解析器部分
 *
 * URL 规则语法：
 * 基础URL,@js:JS处理,{{变量}},<page>页码
 */

const URL_OPTION_RE = /,\s*(?=\{)/;

const PAGE_RE = /<([^>]+)>/g;

export interface AnalyzeUrlResult {
	url: string;
	method?: string;
	charset?: string;
	headers?: Record<string, string>;
	body?: string;
	webJs?: string;
	retry?: number;
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

export class AnalyzeUrl {
	/**
	 * 解析 URL 规则字符串
	 * 支持：变量替换 {{key}}、页码 <page>、JS 嵌入 @js:、URL 选项 JSON
	 */
	analyze(
		rule: string,
		variables: Record<string, string> = {},
	): AnalyzeUrlResult {
		let url = rule;

		// 替换 {{变量}} 占位符
		for (const [key, value] of Object.entries(variables)) {
			url = url.replaceAll(`{{${key}}}`, value);
		}

		// TODO: 解析 URL 选项 JSON、JS 嵌入、页码占位符

		return { url };
	}
}
