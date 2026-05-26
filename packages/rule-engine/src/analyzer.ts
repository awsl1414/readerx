/**
 * AnalyzeRule — 规则解析主入口
 *
 * 整合所有解析器（CSS、XPath、JSONPath）和操作符处理（&& || %%）。
 * JS 规则通过依赖倒置的 JsExecutor 接口执行（Step 1.5）。
 */

import * as css from "./css";
import * as jsonpath from "./jsonpath";
import type { RuleParser } from "./parser-interface";
import { applyReplacements, parseReplaceChain } from "./regex";
import { combineResults, splitRuleByOperators } from "./rule-operators";
import type {
	AnalyzeRuleMode,
	CombineOperator,
	ContentType,
	JsEvalContext,
	JsExecutor,
	ParseResult,
} from "./types";
import * as xpath from "./xpath";

export class AnalyzeRule {
	private content = "";
	private contentType: ContentType = "text";
	private jsExecutor: JsExecutor | null = null;
	private evalContext: Partial<JsEvalContext> = {};

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

	/** 注入 JS 执行器（依赖倒置） */
	setJsExecutor(executor: JsExecutor): void {
		this.jsExecutor = executor;
	}

	/** 设置 JS 执行上下文变量 */
	setEvalContext(ctx: Partial<JsEvalContext>): void {
		this.evalContext = ctx;
	}

	/** 解析规则，返回单个字符串结果（多值用 \n 连接） */
	async getString(rule: string): Promise<ParseResult> {
		return this.evaluate(rule, "string");
	}

	/** 解析规则，返回字符串列表 */
	async getStringList(rule: string): Promise<ParseResult> {
		return this.evaluate(rule, "list");
	}

	/** 解析规则，返回元素引用（outerHTML / JSON 字符串） */
	async getElements(rule: string): Promise<ParseResult> {
		return this.evaluate(rule, "elements");
	}

	/** 同步版本 — 仅支持非 JS 规则，含 JS 时返回错误 */
	getStringSync(rule: string): ParseResult {
		return this.evaluateSync(rule, "string");
	}

	/** 同步版本 — 仅支持非 JS 规则 */
	getStringListSync(rule: string): ParseResult {
		return this.evaluateSync(rule, "list");
	}

	/** 同步版本 — 仅支持非 JS 规则 */
	getElementsSync(rule: string): ParseResult {
		return this.evaluateSync(rule, "elements");
	}

	/** 检测规则模式（公开方法，供外部使用） */
	detectRuleMode(rule: string): AnalyzeRuleMode {
		return detectMode(rule);
	}

	/** 核心异步评估逻辑 */
	private async evaluate(
		rule: string,
		mode: "string" | "list" | "elements",
	): Promise<ParseResult> {
		if (!rule.trim()) {
			return { ok: true, value: "", values: [] };
		}

		const segments = splitRuleByOperators(rule);
		const segmentResults: Array<{
			values: string[];
			operator: CombineOperator | undefined;
		}> = [];

		let accumulatedResult: string | undefined;

		for (const segment of segments) {
			const result = await this.evaluateSegment(
				segment,
				mode,
				accumulatedResult,
			);
			if (!result.ok) return result;

			const replaced = applySegmentReplacements(result.values, segment.rule);
			segmentResults.push({
				values: replaced,
				operator: segment.operator,
			});

			if (replaced.length > 0) {
				accumulatedResult = replaced.join("\n");
			}
		}

		const finalValues = combineResults(segmentResults);
		return { ok: true, value: finalValues.join("\n"), values: finalValues };
	}

	/** 同步评估 — 不支持 JS 规则 */
	private evaluateSync(
		rule: string,
		mode: "string" | "list" | "elements",
	): ParseResult {
		if (!rule.trim()) {
			return { ok: true, value: "", values: [] };
		}

		const segments = splitRuleByOperators(rule);
		const segmentResults: Array<{
			values: string[];
			operator: CombineOperator | undefined;
		}> = [];

		for (const segment of segments) {
			const { rule: cleanRule } = parseReplaceChain(segment.rule);
			const ruleMode = detectMode(cleanRule);

			if (ruleMode === "js") {
				return {
					ok: false,
					error:
						"Rule contains JS — use async getString()/getStringList()/getElements() instead",
				};
			}

			const actualRule = stripModePrefix(cleanRule, ruleMode);
			const method = toParserMethod(mode);
			const result = this.callParserByMode(ruleMode, method, actualRule);
			if (!result.ok) return result;

			const replaced = applySegmentReplacements(result.values, segment.rule);
			segmentResults.push({
				values: replaced,
				operator: segment.operator,
			});
		}

		const finalValues = combineResults(segmentResults);
		return { ok: true, value: finalValues.join("\n"), values: finalValues };
	}

	/** 评估单个规则段（异步，支持 JS） */
	private async evaluateSegment(
		segment: { rule: string; operator: CombineOperator | undefined },
		mode: "string" | "list" | "elements",
		priorResult?: string,
	): Promise<ParseResult> {
		const { rule: cleanRule } = parseReplaceChain(segment.rule);
		const ruleMode = detectMode(cleanRule);
		const actualRule = stripModePrefix(cleanRule, ruleMode);

		if (ruleMode === "js") {
			return this.evaluateJs(actualRule, priorResult);
		}

		const method = toParserMethod(mode);
		return this.callParserByMode(ruleMode, method, actualRule);
	}

	/** 调用对应模式的解析器 */
	private callParserByMode(
		ruleMode: AnalyzeRuleMode,
		method: ParserMethod,
		actualRule: string,
	): ParseResult {
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

	/** 执行 JS 规则 */
	private async evaluateJs(
		code: string,
		priorResult?: string,
	): Promise<ParseResult> {
		if (!this.jsExecutor) {
			return {
				ok: false,
				error: "No JsExecutor configured — call setJsExecutor() first",
			};
		}

		const ctx: JsEvalContext = {
			...this.evalContext,
			src: this.content,
			...(priorResult !== undefined ? { result: priorResult } : {}),
		};

		const result = await this.jsExecutor.eval(code, ctx);

		if (!result.success) {
			return { ok: false, error: result.error ?? "JS execution failed" };
		}

		return jsValueToParseResult(result.value);
	}
}

/** 将 JS 返回值转换为 ParseResult */
function jsValueToParseResult(value: unknown): ParseResult {
	if (value === null || value === undefined) {
		return { ok: true, value: "", values: [] };
	}
	if (Array.isArray(value)) {
		const strings = value.map((v) => String(v));
		return { ok: true, value: strings.join("\n"), values: strings };
	}
	if (typeof value === "string") {
		return { ok: true, value, values: [value] };
	}
	const str = String(value);
	return { ok: true, value: str, values: [str] };
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
