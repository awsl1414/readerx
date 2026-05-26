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
// 校验
export { isValidBookSourceType, validateBookSource } from "./schemas";
// 类型
export type {
	AnalyzeRuleMode,
	BookInfoRule,
	BookSource,
	BookSourceType,
	CombineOperator,
	ContentRule,
	ContentType,
	ExploreRule,
	ParseFailure,
	ParseResult,
	ParseSuccess,
	ReviewRule,
	RuleOperator,
	RuleSegment,
	SearchRule,
	TocRule,
} from "./types";
export type { AnalyzeUrlResult } from "./url-analyzer";
// URL 分析器
export { AnalyzeUrl } from "./url-analyzer";
export {
	getElements as xpathGetElements,
	getString as xpathGetString,
	getStringList as xpathGetStringList,
	xpathParser,
} from "./xpath";
