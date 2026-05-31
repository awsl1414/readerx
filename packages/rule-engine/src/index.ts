// ---- Types from @readerx/schemas ----
// Re-export canonical schema types for consumers.
export type {
	BookSourceData,
	DictField as SchemaDictField,
	DictRuleData,
	DomTransformDef,
	ExploreCategory as SchemaExploreCategory,
	ExtractStepDef,
	ReplacePair as SchemaReplacePair,
	ReplaceRuleData,
	ReplaceScope as SchemaReplaceScope,
	RequestBody,
	RequestConfig as SchemaRequestConfig,
	RuleDataType,
	RuleExpression,
	RuleObjectDef,
	RuleRecord,
	RuleStepDef,
	RuleType,
	ScriptStepDef,
	SourceModule,
	SourceModuleType,
	StringTransformDef,
	TransformStepDef,
	TxtTocRuleData,
} from "@readerx/schemas";

// Validation functions from @readerx/schemas
export {
	validateBookSourceData,
	validateDictRuleData,
	validateReplaceRuleData,
	validateTxtTocRuleData,
} from "@readerx/schemas";

// ---- Types (legacy, @deprecated where applicable) ----

export type { CachedCompiledPlan, CompileCache } from "./cache/interface";
// ---- Compile ----
export { compileRule, compileSteps } from "./compile";
// ---- Runtime interfaces ----
export type { RuleCompiler } from "./compiler/interface";
// ---- Extract (individual engines) ----
export { extractCss } from "./css";
export { createDocumentCache } from "./document-cache";
// ---- Evaluate ----
export { evaluateCompiled, evaluateRule } from "./evaluate";
export type { Executor } from "./executor/interface";
export type {
	ConversionReport,
	ConversionResult,
	ImportError,
	ImportedResult,
	ImportOptions,
	LegadoBookSource,
	LegadoDictRule,
	LegadoReplaceRule,
	LegadoTxtTocRule,
	RuleFormatKind,
} from "./import/index";
// ── Import module ─────────────────────────────────────────
export {
	importBookSource,
	importDictRuleFile,
	importLegadoBookSources,
	importLegadoDictRules,
	importLegadoReplaceRules,
	importLegadoTxtTocRules,
	importReplaceRuleFile,
	importTxtTocRuleFile,
	tryDetectFormat,
} from "./import/index";
// ---- DAG IR types ----
export type {
	BranchNode,
	ExecutionContext,
	ExecutionNode,
	ExecutionPlan,
	ExecutionResult,
	ExtractNode,
	MergeNode,
	RequestNode,
	RuntimeAPI,
	ScriptNode,
	TransformNode,
} from "./ir/types";
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
