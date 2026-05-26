// 主入口 — 导出所有公开 API

// 分析器
export { AnalyzeRule } from "./analyzer";

// 解析器（独立使用）
export {
	cssParser,
	getElements as cssGetElements,
	getString as cssGetString,
	getStringList as cssGetStringList,
	parseCssRule,
} from "./css";
export {
	getElements as jsonpathGetElements,
	getString as jsonpathGetString,
	getStringList as jsonpathGetStringList,
	jsonpathParser,
} from "./jsonpath";
export type { RuleParser } from "./parser-interface";
// 解析器辅助
export { fail, ok, okList } from "./parser-interface";
export { applyReplacements, parseReplaceChain } from "./regex";
// 操作符和正则
export { combineResults, splitRuleByOperators } from "./rule-operators";
// 校验 Schemas
export {
	bookInfoRuleSchema,
	bookSourceSchema,
	contentRuleSchema,
	exploreRuleSchema,
	isValidBookSourceType,
	parseBookSource,
	parseUrlOption,
	reviewRuleSchema,
	searchRuleSchema,
	tocRuleSchema,
	urlOptionSchema,
	validateBookSource,
} from "./schemas";
// 类型
export type {
	AnalyzeRuleMode,
	AnalyzeUrlContext,
	BookInfoRule,
	BookSource,
	BookSourceType,
	CombineOperator,
	ContentRule,
	ContentType,
	ExploreRule,
	JsEvalContext,
	JsEvalResult,
	JsExecutor,
	ParseFailure,
	ParseResult,
	ParseSuccess,
	ReviewRule,
	RuleOperator,
	RuleSegment,
	SearchRule,
	TocRule,
	UrlOption,
} from "./types";
export type { AnalyzeUrlOptions, AnalyzeUrlResult } from "./url-analyzer";
// URL 分析器
export { AnalyzeUrl, analyzeUrlAsync } from "./url-analyzer";
export {
	getElements as xpathGetElements,
	getString as xpathGetString,
	getStringList as xpathGetStringList,
	xpathParser,
} from "./xpath";
