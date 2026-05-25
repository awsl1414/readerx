/**
 * AnalyzeUrl — URL 规则解析
 * 参考 docs/book-source-rule-engine.md URL 解析器部分
 *
 * URL 规则语法：
 * 基础URL,@js:JS处理,{{变量}},<page>页码
 */

export interface AnalyzeUrlResult {
	url: string;
	method?: string;
	charset?: string;
	headers?: Record<string, string>;
	body?: string;
	webJs?: string;
	retry?: number;
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
