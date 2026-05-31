import type { RuleStep } from "../types";

// ── Legado Raw Types ──────────────────────────────────────

export type LegadoBookSource = {
	bookSourceUrl?: string;
	bookSourceName?: string;
	bookSourceType?: number;
	bookSourceGroup?: string;
	bookSourceComment?: string;
	bookUrlPattern?: string;
	customOrder?: number;
	enabled?: boolean;
	enabledExplore?: boolean;
	exploreUrl?: string;
	header?: string;
	lastUpdateTime?: number;
	weight?: number;
	concurrentRate?: string;
	loginUrl?: string;
	searchUrl?: string;
	enabledCookieJar?: boolean;
	loginUi?: string;
	loginCheckJs?: string;
	respondTime?: number;
	ruleSearch?: LegadoRuleFields;
	ruleExplore?: LegadoRuleFields;
	ruleBookInfo?: LegadoRuleBookInfo;
	ruleToc?: LegadoRuleToc;
	ruleContent?: LegadoRuleContent;
};

export type LegadoRuleFields = {
	bookList?: string;
	name?: string;
	author?: string;
	bookUrl?: string;
	coverUrl?: string;
	intro?: string;
	kind?: string;
	lastChapter?: string;
	wordCount?: string;
	checkKeyWord?: string;
};

export type LegadoRuleBookInfo = {
	init?: string;
	name?: string;
	author?: string;
	coverUrl?: string;
	intro?: string;
	kind?: string;
	lastChapter?: string;
	tocUrl?: string;
	wordCount?: string;
};

export type LegadoRuleToc = {
	chapterList?: string;
	chapterName?: string;
	chapterUrl?: string;
	isVip?: string;
	isVolume?: string;
	updateTime?: string;
	nextTocUrl?: string;
};

export type LegadoRuleContent = {
	content?: string;
	nextContentUrl?: string;
	replaceRegex?: string;
};

export type LegadoDictRule = {
	name?: string;
	urlRule?: string;
	showRule?: string;
	enabled?: boolean;
	sortNumber?: number;
};

export type LegadoReplaceRule = {
	id?: number;
	name?: string;
	group?: string;
	pattern?: string;
	replacement?: string;
	scope?: string;
	scopeTitle?: boolean;
	scopeContent?: boolean;
	excludeScope?: string;
	isEnabled?: boolean;
	isRegex?: boolean;
	timeoutMillisecond?: number;
	sortOrder?: number;
};

export type LegadoTxtTocRule = {
	id?: number;
	name?: string;
	rule?: string;
	example?: string;
	serialNumber?: number;
	enable?: boolean;
};

// ── Import Result Types ───────────────────────────────────

export type ImportError = {
	readonly kind: "parse_error" | "convert_error" | "unsupported_feature";
	readonly message: string;
	readonly path?: string;
	readonly original?: unknown;
};

export type ImportOptions = {
	readonly collectWarnings?: boolean;
};

export type ConversionResult = {
	readonly steps?: readonly RuleStep[];
	readonly legacyScript?: string;
	readonly unsupported: readonly string[];
};

export type ConversionReport = {
	readonly totalRules: number;
	readonly convertedRules: number;
	readonly partialConvertedRules: number;
	readonly scriptFallbackRules: number;
	readonly unsupportedFeatures: readonly string[];
};

export type ImportedResult<T> = {
	readonly data: T;
	readonly report: ConversionReport;
	readonly warnings: readonly ImportError[];
};

export type RuleFormatKind =
	| "readerx-book-source"
	| "readerx-dict"
	| "readerx-replace"
	| "readerx-txt-toc"
	| "legado-book-source"
	| "legado-dict"
	| "legado-replace"
	| "legado-txt-toc"
	| "unknown";
