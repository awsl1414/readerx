// ---- Rule Type Discriminator ----

export type RuleType = "book-source" | "dict" | "replace" | "txt-toc";

// ---- Unified Storage Types ----

export type RuleRecord<T extends RuleType = RuleType> = {
	readonly id: string;
	readonly type: T;
	readonly name: string;
	readonly enabled: boolean;
	readonly tags: readonly string[];
	readonly order: number;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly data: RuleDataType<T>;
};

export type RuleDataType<T extends RuleType> = T extends "book-source"
	? BookSourceData
	: T extends "dict"
		? DictRuleData
		: T extends "replace"
			? ReplaceRuleData
			: T extends "txt-toc"
				? TxtTocRuleData
				: never;

// ---- Book Source ----

export type BookSourceData = {
	readonly description?: string;
	readonly author?: string;
	readonly version?: number;
	readonly baseUrl: string;
	readonly urlPattern?: string;
	readonly headers?: Readonly<Record<string, string>>;
	readonly loginUrl?: string;
	readonly weight?: number;
	readonly rateLimit?: number;
	readonly modules: readonly SourceModule[];
};

export type SourceModuleType =
	| "search"
	| "explore"
	| "detail"
	| "toc"
	| "content";

export type SourceModule = {
	readonly type: SourceModuleType;
	readonly enabled?: boolean;
	readonly request?: RequestConfig;
	readonly rules: Readonly<Record<string, RuleExpression>>;
	readonly nextUrl?: RuleExpression;
};

// ---- Rule Expression (the flexible rule format) ----

export type RuleExpression = string | RuleObjectDef | readonly RuleStepDef[];

export type RuleObjectDef = {
	readonly css?: string;
	readonly xpath?: string;
	readonly jsonpath?: string;
	readonly regex?: string;
	readonly template?: string;
	readonly js?: string;
	readonly attr?: string;
	readonly output?: string;
	readonly reverse?: boolean;
	readonly separator?: string;
	readonly transform?: readonly RuleStepDef[];
};

// ---- Rule Step Definitions (pipeline steps) ----

export type RuleStepDef = ExtractStepDef | TransformStepDef | ScriptStepDef;

export type ExtractStepDef = {
	readonly type: "extract";
	readonly engine: "css" | "xpath" | "jsonpath" | "regex";
	readonly selector: string;
	readonly output?: string;
	readonly attr?: string;
	readonly baseUrl?: string;
};

export type TransformStepDef = StringTransformDef | DomTransformDef;

export type StringTransformDef = {
	readonly type: "transform";
	readonly category: "string";
	readonly action: "replace" | "match" | "split" | "template" | "trim";
	readonly pattern?: string;
	readonly with?: string;
	readonly flags?: string;
	readonly group?: number;
	readonly template?: string;
};

export type DomTransformDef = {
	readonly type: "transform";
	readonly category: "dom";
	readonly action: "remove" | "unwrap" | "strip";
	readonly selector: string;
	readonly attrs?: readonly string[];
};

export type ScriptStepDef = {
	readonly type: "script";
	readonly code: string;
};

// ---- Replace Rule ----

export type ReplaceRuleData = {
	readonly description?: string;
	readonly pattern: string;
	readonly flags?: string;
	readonly literal?: boolean;
	readonly replacement?: string;
	readonly replacementJs?: string;
	readonly scope?: ReplaceScope;
};

export type ReplaceScope = {
	readonly include?: readonly string[];
	readonly exclude?: readonly string[];
	readonly target?: "content" | "title" | "both";
};

// ---- TXT TOC Rule ----

export type TxtTocRuleData = {
	readonly description?: string;
	readonly pattern: string;
	readonly flags?: string;
};

// ---- Dict Rule ----

export type DictRuleData = {
	readonly description?: string;
	readonly weight?: number;
	readonly variables?: Readonly<Record<string, string>>;
	readonly request: RequestConfig;
	readonly fields?: Readonly<Record<string, DictField>>;
};

export type DictField = {
	readonly schema?: "html" | "string" | "html[]" | "string[]";
	readonly pipeline: readonly RuleStepDef[];
};

// ---- Request Config (full-featured) ----

export type RequestConfig = {
	readonly url?: string;
	readonly method?: "GET" | "POST";
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: RequestBody;
	readonly charset?: string;
	readonly cookies?: Readonly<Record<string, string>>;
	readonly timeout?: number;
	readonly retry?: number;
	readonly cache?: boolean;
	readonly proxy?: string;
	readonly followRedirect?: boolean;
	readonly userAgent?: string;
	readonly rateLimit?: number;
	readonly variables?: Readonly<Record<string, string>>;
};

export type RequestBody =
	| string
	| {
			readonly type: "form" | "json" | "raw";
			readonly data: unknown;
	  };

// ---- Shared helper types ----

export type ExploreCategory = {
	readonly title: string;
	readonly url?: string;
};

export type ReplacePair = {
	readonly pattern: string;
	readonly with: string;
};
