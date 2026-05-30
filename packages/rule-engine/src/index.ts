// ---- Types ----

// ---- Compile ----
export { compileRule, compileSteps } from "./compile";
// ---- Extract (individual engines) ----
export { extractCss } from "./css";
export { createDocumentCache } from "./document-cache";
// ---- Evaluate ----
export { evaluateCompiled, evaluateRule } from "./evaluate";
export { extractJsonPath } from "./jsonpath";
// ---- Normalize ----
export { normalizeRule, toRule } from "./normalize";
export { extractRegex } from "./regex";
export { applyReplaceRules, matchesScope } from "./replace";
// ---- Result ----
export type { Result } from "./result";
export { err, isErr, isOk, ok } from "./result";
export type {
	BookSourceInput,
	BookSourceOutput,
	DictRuleFileInput,
	DictRuleFileOutput,
	ReplaceRuleFileInput,
	ReplaceRuleFileOutput,
	TxtTocRuleFileInput,
	TxtTocRuleFileOutput,
} from "./schemas";
// ---- Zod Schemas ----
export {
	bookSourceSchema,
	dictRuleFileSchema,
	parseBookSource,
	parseDictRuleFile,
	parseReplaceRuleFile,
	parseTxtTocRuleFile,
	replaceRuleFileSchema,
	txtTocRuleFileSchema,
	validateBookSource,
	validateDictRuleFile,
	validateReplaceRuleFile,
	validateTxtTocRuleFile,
} from "./schemas";
export { elementToText, serializeResult, serializeValue } from "./serialize";
export { expandTemplate } from "./template";
// ---- Transform ----
export { applyDomTransform, applyStringTransform } from "./transform";
export { findChapterBoundaries } from "./txt-toc";
export type {
	BookInfoModule,
	BookSource,
	BookSourceType,
	ChapterBoundary,
	CompiledExtractStep,
	CompiledRule,
	CompiledScriptStep,
	CompiledStep,
	CompiledTransformStep,
	ContentModule,
	DictField,
	DictRequest,
	DictRule,
	DictRuleFile,
	DocumentCache,
	DomTransformStep,
	EvalContext,
	ExploreCategory,
	ExploreModule,
	ExtractEngine,
	ExtractOutput,
	ExtractStep,
	FieldSchema,
	JsEvalContext,
	JsEvalResult,
	JsExecutor,
	ReplacePair,
	ReplaceRule,
	ReplaceRuleFile,
	ReplaceScope,
	RequestConfig,
	Rule,
	RuleError,
	RuleErrorCode,
	RuleObject,
	RuleStep,
	RuntimeResult,
	RuntimeValue,
	ScriptStep,
	SearchModule,
	StringTransformStep,
	TocModule,
	TransformStep,
	TxtTocRule,
	TxtTocRuleFile,
} from "./types";
// ---- Utilities ----
export { resolveUrl } from "./url";
export { extractXPath } from "./xpath";
