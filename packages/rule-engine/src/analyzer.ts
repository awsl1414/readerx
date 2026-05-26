/**
 * AnalyzeRule — 规则解析主入口
 *
 * 整合所有解析器（CSS、XPath、JSONPath）和操作符处理（&& || %%）。
 * 不包含 JS 规则执行（延迟到 Step 1.5 的 quickjs-runtime）。
 */

import * as css from "./css";
import * as jsonpath from "./jsonpath";
import * as xpath from "./xpath";
import { applyReplacements, parseReplaceChain } from "./regex";
import { combineResults, splitRuleByOperators } from "./rule-operators";
import type { RuleParser } from "./parser-interface";
import type {
	AnalyzeRuleMode,
	CombineOperator,
	ContentType,
	ParseResult,
} from "./types";

export class AnalyzeRule {
	private content = "";
	private contentType: ContentType = "text";

	setContent(content: string): void {
		this.content = content;
		this.contentType = detectContentType(content);
	}

	getContent(): string {
		return this.content;
	}

	getContentType(): ContentType {
		return this.contentType;
	}

	/**
	 * 解析规则，返回单个字符串结果（多值用 \n 连接）
	 */
	getString(rule: string): ParseResult {
		return this.evaluate(rule, "string");
	}

	/**
	 * 解析规则，返回字符串列表
	 */
	getStringList(rule: string): ParseResult {
		return this.evaluate(rule, "list");
	}

	/**
	 * 解析规则，返回元素引用（outerHTML / JSON 字符串）
	 */
	getElements(rule: string): ParseResult {
		return this.evaluate(rule, "elements");
	}

	/**
	 * 检测规则模式（公开方法，供外部使用）
	 */
	detectRuleMode(rule: string): AnalyzeRuleMode {
		return detectMode(rule);
	}

	/**
	 * 核心评估逻辑
	 */
	private evaluate(
		rule: string,
		mode: "string" | "list" | "elements",
	): ParseResult {
		if (!rule.trim()) {
			return { ok: true, value: "", values: [] };
		}

		// 1. 拆分操作符
		const segments = splitRuleByOperators(rule);

		// 2. 逐段评估
		const segmentResults: Array<{
			values: string[];
			operator: CombineOperator | undefined;
		}> = [];

		for (const segment of segments) {
			const result = this.evaluateSegment(segment, mode);
			if (!result.ok) return result;

			// 应用 ## 正则替换
			const replaced = applySegmentReplacements(result.values, segment.rule);

			segmentResults.push({
				values: replaced,
				operator: segment.operator,
			});
		}

		// 3. 按操作符合并
		const finalValues = combineResults(segmentResults);
		return { ok: true, value: finalValues.join("\n"), values: finalValues };
	}

	/**
	 * 评估单个规则段
	 */
	private evaluateSegment(
		segment: { rule: string; operator: CombineOperator | undefined },
		mode: "string" | "list" | "elements",
	): ParseResult {
		const { rule: cleanRule } = parseReplaceChain(segment.rule);
		const ruleMode = detectMode(cleanRule);
		const actualRule = stripModePrefix(cleanRule, ruleMode);

		if (ruleMode === "js") {
			return {
				ok: false,
				error:
					"JS rules require quickjs-runtime (Step 1.5). Not yet implemented.",
			};
		}

		const method = toParserMethod(mode);

		switch (ruleMode) {
			case "json":
				return callParser(jsonpath, method, actualRule, this.content);
			case "xpath":
				return callParser(xpath, method, actualRule, this.content);
			case "default":
				if (this.contentType === "json") {
					return callParser(jsonpath, method, actualRule, this.content);
				}
				return callParser(css, method, actualRule, this.content);
			case "regex":
				return applyRegexMode(actualRule, this.content);
			default:
				return { ok: false, error: `Unknown rule mode: ${ruleMode}` };
		}
	}
}

/** 检测内容类型 */
function detectContentType(content: string): ContentType {
	const trimmed = content.trim();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
	if (trimmed.startsWith("<?xml")) return "xml";
	if (trimmed.includes("<") && trimmed.includes(">")) return "html";
	return "text";
}

/** 检测规则模式 */
function detectMode(rule: string): AnalyzeRuleMode {
	if (rule.startsWith("@CSS:") || rule.startsWith("@css:")) return "default";
	if (rule.startsWith("@XPath:") || rule.startsWith("@xpath:")) return "xpath";
	if (rule.startsWith("@Json:") || rule.startsWith("@json:")) return "json";
	if (rule.startsWith("@js:") || rule.startsWith("<js>")) return "js";

	// 自动检测（无前缀时）
	if (rule.startsWith("//") || rule.startsWith("/")) return "xpath";
	if (rule.startsWith("$.") || rule.startsWith("$[")) return "json";
	return "default";
}

/** 去掉模式前缀 */
function stripModePrefix(rule: string, mode: AnalyzeRuleMode): string {
	switch (mode) {
		case "default":
			if (rule.startsWith("@CSS:") || rule.startsWith("@css:")) {
				return rule.substring(5).trim();
			}
			return rule;
		case "xpath":
			if (rule.startsWith("@XPath:") || rule.startsWith("@xpath:")) {
				return rule.substring(7).trim();
			}
			return rule;
		case "json":
			if (rule.startsWith("@Json:") || rule.startsWith("@json:")) {
				return rule.substring(6).trim();
			}
			return rule;
		case "js":
			if (rule.startsWith("@js:")) return rule.substring(4).trim();
			if (rule.startsWith("<js>"))
				return rule
					.substring(4)
					.replace(/<\/js>\s*$/, "")
					.trim();
			return rule;
		default:
			return rule;
	}
}

/** 对段结果应用 ## 正则替换 */
function applySegmentReplacements(values: string[], ruleStr: string): string[] {
	const { replacements } = parseReplaceChain(ruleStr);
	if (replacements.length === 0) return values;
	return values.map((v) => applyReplacements(v, replacements));
}

/** 解析器方法名映射 */
type ParserMethod = "getString" | "getStringList" | "getElements";

function toParserMethod(mode: "string" | "list" | "elements"): ParserMethod {
	if (mode === "elements") return "getElements";
	if (mode === "list") return "getStringList";
	return "getString";
}

function callParser(
	parser: RuleParser,
	method: ParserMethod,
	rule: string,
	content: string,
): ParseResult {
	return parser[method](rule, content);
}

/** 纯正则模式 */
function applyRegexMode(rule: string, content: string): ParseResult {
	try {
		const regex = new RegExp(rule, "g");
		const matches = [...content.matchAll(regex)];
		const values = matches.map((m) => m[0] ?? "");
		return {
			ok: true,
			value: values.join("\n"),
			values,
		};
	} catch (e) {
		return { ok: false, error: `Regex error: ${e}` };
	}
}
