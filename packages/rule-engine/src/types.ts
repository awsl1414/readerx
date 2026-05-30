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
	readonly attributes?: readonly string[];
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

export type BookSourceType = "novel" | "audio" | "comic" | "file";

export type RequestConfig = {
	readonly url?: string;
	readonly method?: "GET" | "POST";
	readonly charset?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: string;
	readonly responseType?: "html" | "json" | "xml" | "text";
};

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

export type SearchModule = RequestConfig & {
	readonly url: string;
	readonly checkKeyWord?: string;
	readonly rules?: SearchRules;
};

export type ExploreCategory = {
	readonly title: string;
	readonly url?: string;
};

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

export type TocModule = RequestConfig & {
	readonly nextUrl?: Rule;
	readonly rules?: TocRules;
};

export type ContentRules = {
	readonly text?: Rule;
	readonly [key: string]: Rule | undefined;
};

export type ContentModule = RequestConfig & {
	readonly nextUrl?: Rule;
	readonly replaceRegex?: readonly ReplacePair[];
	readonly rules?: ContentRules;
};

export type ReplacePair = {
	readonly pattern: string;
	readonly with: string;
};

// ---- Dict Rule ----

export type DictRuleFile = {
	readonly $schema: string;
	readonly authors: readonly string[];
	readonly description?: string;
	readonly updatedAt?: string;
	readonly rules: readonly DictRule[];
};

export type DictRule = {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly tags?: readonly string[];
	readonly enabled?: boolean;
	readonly weight?: number;
	readonly variables?: Readonly<Record<string, string>>;
	readonly request: DictRequest;
	readonly fields: Readonly<Record<string, DictField>>;
};

export type DictRequest = {
	readonly url: string;
	readonly method?: "GET" | "POST";
	readonly charset?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: string;
};

export type FieldSchema = "html" | "string" | "html[]" | "string[]";

export type DictField = {
	readonly schema?: FieldSchema;
	readonly pipeline: readonly RuleStep[];
};

// ---- Replace Rule ----

export type ReplaceRuleFile = {
	readonly $schema: string;
	readonly rules: readonly ReplaceRule[];
};

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

export type ReplaceScope = {
	readonly include?: readonly string[];
	readonly exclude?: readonly string[];
	readonly target?: "content" | "title" | "both";
};

// ---- TXT TOC Rule ----

export type TxtTocRuleFile = {
	readonly $schema: string;
	readonly rules: readonly TxtTocRule[];
};

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
