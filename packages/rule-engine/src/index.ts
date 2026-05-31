// ---- Types from @readerx/schemas ----
// Re-export canonical schema types for consumers.
export type {
	RuleType,
	RuleRecord,
	RuleDataType,
	BookSourceData,
	SourceModuleType,
	SourceModule,
	RuleExpression,
	RuleObjectDef,
	RuleStepDef,
	ExtractStepDef,
	TransformStepDef,
	StringTransformDef,
	DomTransformDef,
	ScriptStepDef,
	ReplaceRuleData,
	ReplaceScope as SchemaReplaceScope,
	TxtTocRuleData,
	DictRuleData,
	DictField as SchemaDictField,
	RequestConfig as SchemaRequestConfig,
	RequestBody,
	ExploreCategory as SchemaExploreCategory,
	ReplacePair as SchemaReplacePair,
} from "@readerx/schemas";

// Validation functions from @readerx/schemas
export {
	validateBookSourceData,
	validateDictRuleData,
	validateReplaceRuleData,
	validateTxtTocRuleData,
} from "@readerx/schemas";

// ---- Types (legacy, @deprecated where applicable) ----

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
	DictRequestBody,
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
// ── Import module ─────────────────────────────────────────
export {
	importBookSource,
	importDictRuleFile,
	importReplaceRuleFile,
	importTxtTocRuleFile,
	importLegadoBookSources,
	importLegadoDictRules,
	importLegadoReplaceRules,
	importLegadoTxtTocRules,
	tryDetectFormat,
} from "./import/index.js";

export type {
	ImportError,
	ImportOptions,
	ConversionResult,
	ConversionReport,
	ImportedResult,
	RuleFormatKind,
	LegadoBookSource,
	LegadoDictRule,
	LegadoReplaceRule,
	LegadoTxtTocRule,
} from "./import/index.js";
