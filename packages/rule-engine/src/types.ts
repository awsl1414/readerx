// ---- Re-exports from @readerx/schemas ----
// These types are the canonical definitions moving forward.
// Import them directly from @readerx/schemas in new code.
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

// ---- Error Types ----

export type RuleErrorCode =
	| "COMPILE_ERROR"
	| "INVALID_SELECTOR"
	| "JSONPATH_ERROR"
	| "XPATH_ERROR"
	| "REGEX_ERROR"
	| "SCRIPT_ERROR"
	| "SCRIPT_DISABLED"
	| "NO_JS_EXECUTOR"
	| "CONTENT_TYPE_MISMATCH"
	| "DOM_PARSE_ERROR"
	| "TYPE_MISMATCH";

export type RuleError = {
	readonly code: RuleErrorCode;
	readonly message: string;
	readonly step?: number;
	readonly rule?: string;
	readonly source?: string;
	readonly cause?: unknown;
};

// ---- Runtime Values ----

// RuntimeValue represents any value flowing through the rule pipeline.
// `unknown` is intentional — values can be strings, DOM nodes, or JSON values.
// Use duck-typing guards (see serialize.ts) to narrow at runtime.
export type RuntimeValue = unknown;
export type RuntimeResult = readonly RuntimeValue[];

// ---- Extract Step ----

export type ExtractEngine = "css" | "xpath" | "jsonpath" | "regex";
export type ExtractOutput = "html" | "text" | "outerHtml" | "attr";

export type ExtractStep = {
	readonly type: "extract";
	readonly engine: ExtractEngine;
	readonly selector: string;
	// scope is a runtime-only field, not present in JSON Schema
	// (JSON Schema validation does not include this field)
	readonly scope?: "current" | "root";
	readonly output?: ExtractOutput;
	readonly attr?: string;
	readonly baseUrl?: string;
};

// ---- Transform Steps ----

export type StringTransformStep = {
	readonly type: "transform";
	readonly category: "string";
	readonly action: "replace" | "match" | "split" | "template" | "trim";
	readonly pattern?: string;
	readonly with?: string;
	readonly flags?: string;
	readonly group?: number;
	readonly template?: string;
};

export type DomTransformStep = {
	readonly type: "transform";
	readonly category: "dom";
	readonly action: "remove" | "unwrap" | "strip";
	readonly selector: string;
	readonly attrs?: readonly string[];
};

export type TransformStep = StringTransformStep | DomTransformStep;

// ---- Script Step ----

export type ScriptStep = {
	readonly type: "script";
	readonly code: string;
};

// ---- Unified Step ----

export type RuleStep = ExtractStep | TransformStep | ScriptStep;

// ---- Rule ----

export type Rule = readonly RuleStep[];

export type RuleObject = {
	readonly jsonpath?: string;
	readonly css?: string;
	readonly xpath?: string;
	readonly regex?: string;
	readonly template?: string;
	readonly js?: string;
	readonly attr?: string;
	readonly separator?: string;
	readonly reverse?: boolean;
	readonly transform?: readonly TransformStep[];
};

// ---- Compiled Types ----

export type CompiledExtractStep = ExtractStep & {
	readonly compiledSelector?: unknown;
};

export type CompiledTransformStep = TransformStep & {
	readonly compiledRegex?: RegExp;
};

export type CompiledScriptStep = ScriptStep;

export type CompiledStep =
	| CompiledExtractStep
	| CompiledTransformStep
	| CompiledScriptStep;

export type CompiledRule = {
	readonly steps: readonly CompiledStep[];
};

// ---- Book Source ----
// @deprecated Use types from @readerx/schemas (BookSourceData, SourceModule, etc.)

/** @deprecated Use BookSourceData from @readerx/schemas */
export type BookSourceType = "novel" | "audio" | "comic" | "file";

/** @deprecated Use RequestConfig (aliased as SchemaRequestConfig) from @readerx/schemas */
export type RequestConfig = {
	readonly url?: string;
	readonly method?: "GET" | "POST";
	readonly charset?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: string;
	readonly responseType?: "html" | "json" | "xml" | "text";
};

/** @deprecated Use BookSourceData from @readerx/schemas */
export type BookSource = {
	readonly $schema: string;
	readonly id: string;
	readonly name: string;
	readonly type: BookSourceType;
	readonly baseUrl: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly author?: string;
	readonly version?: number;
	readonly headers?: Readonly<Record<string, string>>;
	readonly loginUrl?: string;
	readonly enabled?: boolean;
	readonly weight?: number;
	readonly order?: number;
	readonly rateLimit?: number;
	readonly urlPattern?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly search?: SearchModule;
	readonly explore?: ExploreModule;
	readonly bookInfo?: BookInfoModule;
	readonly toc?: TocModule;
	readonly content?: ContentModule;
};

export type SearchRules = {
	readonly list?: Rule;
	readonly name?: Rule;
	readonly url?: Rule;
	readonly author?: Rule;
	readonly cover?: Rule;
	readonly intro?: Rule;
	readonly kind?: Rule;
	readonly lastChapter?: Rule;
	readonly wordCount?: Rule;
};

/** @deprecated Use SourceModule from @readerx/schemas */
export type SearchModule = RequestConfig & {
	readonly url: string;
	readonly checkKeyWord?: string;
	readonly rules?: SearchRules;
};

/** @deprecated Use ExploreCategory from @readerx/schemas */
export type ExploreCategory = {
	readonly title: string;
	readonly url?: string;
};

/** @deprecated Use SourceModule from @readerx/schemas */
export type ExploreModule = RequestConfig & {
	readonly categories: readonly ExploreCategory[];
	readonly rules?: SearchRules;
};

export type BookInfoRules = {
	readonly init?: Rule;
	readonly name?: Rule;
	readonly author?: Rule;
	readonly cover?: Rule;
	readonly intro?: Rule;
	readonly kind?: Rule;
	readonly lastChapter?: Rule;
	readonly wordCount?: Rule;
	readonly tocUrl?: Rule;
	readonly [key: string]: Rule | undefined;
};

/** @deprecated Use SourceModule from @readerx/schemas */
export type BookInfoModule = RequestConfig & {
	readonly rules?: BookInfoRules;
};

export type TocRules = {
	readonly list?: Rule;
	readonly name?: Rule;
	readonly url?: Rule;
	readonly isVip?: Rule;
	readonly isVolume?: Rule;
	readonly updateTime?: Rule;
	readonly [key: string]: Rule | undefined;
};

/** @deprecated Use SourceModule from @readerx/schemas */
export type TocModule = RequestConfig & {
	readonly nextUrl?: Rule;
	readonly rules?: TocRules;
};

export type ContentRules = {
	readonly text?: Rule;
	readonly [key: string]: Rule | undefined;
};

/** @deprecated Use SourceModule from @readerx/schemas */
export type ContentModule = RequestConfig & {
	readonly nextUrl?: Rule;
	readonly replaceRegex?: readonly ReplacePair[];
	readonly rules?: ContentRules;
};

/** @deprecated Use ReplacePair from @readerx/schemas */
export type ReplacePair = {
	readonly pattern: string;
	readonly with: string;
};

// ---- Dict Rule ----
// @deprecated Use DictRuleData and related types from @readerx/schemas

/** @deprecated Use DictRuleFile types from @readerx/schemas */
export type DictRuleFile = {
	readonly $schema: string;
	readonly authors?: readonly string[];
	readonly description?: string;
	readonly updatedAt?: string;
	readonly rules: readonly DictRule[];
};

/** @deprecated Use DictRuleData from @readerx/schemas */
export type DictRule = {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly enabled?: boolean;
	readonly weight?: number;
	readonly variables?: Readonly<Record<string, string>>;
	readonly request: DictRequest;
	readonly fields?: Readonly<Record<string, DictField>>;
};

/** @deprecated Use RequestConfig from @readerx/schemas */
export type DictRequest = {
	readonly url: string;
	readonly method?: "GET" | "POST";
	readonly charset?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: DictRequestBody;
};

/** @deprecated Use RequestBody from @readerx/schemas */
export type DictRequestBody =
	| string
	| { readonly type: "form" | "json" | "raw"; readonly data: unknown };

/** @deprecated Field schema type — see DictField in @readerx/schemas */
export type FieldSchema = "html" | "string" | "html[]" | "string[]";

/** @deprecated Use DictField from @readerx/schemas */
export type DictField = {
	readonly schema?: FieldSchema;
	readonly pipeline: readonly RuleStep[];
};

// ---- Replace Rule ----
// @deprecated Use ReplaceRuleData and related types from @readerx/schemas

/** @deprecated Use ReplaceRuleFile types from @readerx/schemas */
export type ReplaceRuleFile = {
	readonly $schema: string;
	readonly rules: readonly ReplaceRule[];
};

/** @deprecated Use ReplaceRuleData from @readerx/schemas */
export type ReplaceRule = {
	readonly name: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly enabled?: boolean;
	readonly order?: number;
	readonly scope?: ReplaceScope;
	readonly pattern: string;
	readonly flags?: string;
	readonly literal?: boolean;
	readonly replacement?: string;
	readonly replacementJs?: string;
};

/** @deprecated Use ReplaceScope from @readerx/schemas */
export type ReplaceScope = {
	readonly include?: readonly string[];
	readonly exclude?: readonly string[];
	readonly target?: "content" | "title" | "both";
};

// ---- TXT TOC Rule ----
// @deprecated Use TxtTocRuleData and related types from @readerx/schemas

/** @deprecated Use TxtTocRuleFile types from @readerx/schemas */
export type TxtTocRuleFile = {
	readonly $schema: string;
	readonly rules: readonly TxtTocRule[];
};

/** @deprecated Use TxtTocRuleData from @readerx/schemas */
export type TxtTocRule = {
	readonly name: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly enabled?: boolean;
	readonly order?: number;
	readonly pattern: string;
	readonly flags?: string;
};

export type ChapterBoundary = {
	readonly lineIndex: number;
	readonly title: string;
	readonly ruleName: string;
};

// ---- Evaluation Context ----

export type JsExecutor = {
	eval(code: string, context: JsEvalContext): Promise<JsEvalResult>;
};

export type JsEvalContext = {
	readonly result: string;
	readonly baseUrl?: string;
	readonly src?: string;
	readonly source?: Readonly<Record<string, unknown>>;
	readonly book?: Readonly<Record<string, unknown>>;
	readonly chapter?: Readonly<Record<string, unknown>>;
	readonly key?: string;
	readonly page?: number;
};

export type JsEvalResult = {
	readonly success: boolean;
	readonly value?: unknown;
	readonly error?: string;
};

export type DocumentCache = {
	getHTML(html: string, url?: string): Document;
	getXML(xml: string): Document;
	getJSON(json: string): unknown;
	dispose(): void;
};

export type EvalContext = {
	readonly baseUrl?: string;
	readonly variables?: Readonly<Record<string, string>>;
	readonly allowScript?: boolean;
	readonly jsExecutor?: JsExecutor;
	readonly documentCache?: DocumentCache;
	readonly source?: Readonly<Record<string, unknown>>;
	readonly book?: Readonly<Record<string, unknown>>;
	readonly chapter?: Readonly<Record<string, unknown>>;
	readonly key?: string;
	readonly page?: number;
};
