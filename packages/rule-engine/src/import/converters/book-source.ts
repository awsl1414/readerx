import type {
	BookInfoModule,
	BookInfoRules,
	BookSource,
	BookSourceType,
	ContentModule,
	ContentRules,
	ExploreCategory,
	ExploreModule,
	ReplacePair,
	Rule,
	RuleStep,
	ScriptStep,
	SearchModule,
	SearchRules,
	TocModule,
	TocRules,
} from "../../types";
import type {
	ConversionResult,
	ImportedResult,
	ImportError,
	LegadoBookSource,
	LegadoRuleBookInfo,
	LegadoRuleContent,
	LegadoRuleFields,
	LegadoRuleToc,
} from "../types";
import { parseLegadoRule } from "../parser";
import { createReport } from "../report";

const SCHEMA_ID = "readerx/book-source-rule/v1" as const;

// ── Mutable Builder Type ──────────────────────────────────────

type BookSourceBuilder = {
	-readonly [K in keyof BookSource]: BookSource[K];
};

// ── Type Mapping ──────────────────────────────────────────────

const BOOK_SOURCE_TYPE_MAP: Record<number, BookSourceType> = {
	0: "novel",
	1: "audio",
	2: "comic",
	3: "file",
};

// ── Rule Field Mapping ────────────────────────────────────────

const SEARCH_FIELD_MAP: Record<string, string> = {
	bookList: "list",
	name: "name",
	author: "author",
	bookUrl: "url",
	coverUrl: "cover",
	intro: "intro",
	kind: "kind",
	lastChapter: "lastChapter",
	wordCount: "wordCount",
};

const BOOK_INFO_FIELD_MAP: Record<string, string> = {
	name: "name",
	author: "author",
	coverUrl: "cover",
	intro: "intro",
	kind: "kind",
	lastChapter: "lastChapter",
	tocUrl: "tocUrl",
	wordCount: "wordCount",
};

const TOC_FIELD_MAP: Record<string, string> = {
	chapterList: "list",
	chapterName: "name",
	chapterUrl: "url",
	isVip: "isVip",
	isVolume: "isVolume",
	updateTime: "updateTime",
};

// ── Helpers ───────────────────────────────────────────────────

function convertToRule(conversion: ConversionResult): Rule | undefined {
	if (conversion.legacyScript && (!conversion.steps || conversion.steps.length === 0)) {
		const scriptStep: ScriptStep = {
			type: "script",
			code: conversion.legacyScript,
		};
		return [scriptStep];
	}
	if (conversion.steps && conversion.steps.length > 0) {
		return conversion.steps as readonly RuleStep[];
	}
	return undefined;
}

function convertRuleFields(
	ruleFields: LegadoRuleFields,
	fieldMap: Record<string, string>,
): { rules: Record<string, Rule>; conversions: ConversionResult[] } {
	const rules: Record<string, Rule> = {};
	const conversions: ConversionResult[] = [];

	for (const [legadoKey, value] of Object.entries(ruleFields)) {
		if (value === undefined || value === "") continue;

		// checkKeyWord is not a rule, skip it
		if (legadoKey === "checkKeyWord") continue;

		const readerXKey = fieldMap[legadoKey];
		if (readerXKey === undefined) continue;

		const conversion = parseLegadoRule(value);
		conversions.push(conversion);

		const rule = convertToRule(conversion);
		if (rule) {
			rules[readerXKey] = rule;
		}
	}

	return { rules, conversions };
}

function convertBookInfoRules(
	ruleBookInfo: LegadoRuleBookInfo,
): { rules: BookInfoRules; conversions: ConversionResult[] } {
	const rules: Record<string, Rule> = {};
	const conversions: ConversionResult[] = [];

	for (const [legadoKey, value] of Object.entries(ruleBookInfo)) {
		if (value === undefined || value === "") continue;

		const readerXKey = BOOK_INFO_FIELD_MAP[legadoKey];
		if (readerXKey === undefined) {
			// init goes directly as "init"
			if (legadoKey === "init") {
				const conversion = parseLegadoRule(value);
				conversions.push(conversion);
				const rule = convertToRule(conversion);
				if (rule) {
					rules["init"] = rule;
				}
			}
			continue;
		}

		const conversion = parseLegadoRule(value);
		conversions.push(conversion);
		const rule = convertToRule(conversion);
		if (rule) {
			rules[readerXKey] = rule;
		}
	}

	return { rules: rules as BookInfoRules, conversions };
}

function convertTocRules(
	ruleToc: LegadoRuleToc,
): { rules: TocRules; nextUrl?: Rule; conversions: ConversionResult[] } {
	const rules: Record<string, Rule> = {};
	const conversions: ConversionResult[] = [];
	let nextUrl: Rule | undefined;

	for (const [legadoKey, value] of Object.entries(ruleToc)) {
		if (value === undefined || value === "") continue;

		// nextTocUrl → module-level nextUrl
		if (legadoKey === "nextTocUrl") {
			const conversion = parseLegadoRule(value);
			conversions.push(conversion);
			nextUrl = convertToRule(conversion);
			continue;
		}

		const readerXKey = TOC_FIELD_MAP[legadoKey];
		if (readerXKey === undefined) continue;

		const conversion = parseLegadoRule(value);
		conversions.push(conversion);
		const rule = convertToRule(conversion);
		if (rule) {
			rules[readerXKey] = rule;
		}
	}

	const result: { rules: TocRules; nextUrl?: Rule; conversions: ConversionResult[] } = {
		rules: rules as TocRules,
		conversions,
	};
	if (nextUrl) {
		result.nextUrl = nextUrl;
	}
	return result;
}

function convertContentRules(
	ruleContent: LegadoRuleContent,
): {
	rules: ContentRules;
	nextUrl?: Rule;
	replaceRegex?: readonly ReplacePair[];
	conversions: ConversionResult[];
} {
	const rules: Record<string, Rule> = {};
	const conversions: ConversionResult[] = [];
	let nextUrl: Rule | undefined;
	let replaceRegex: ReplacePair[] | undefined;

	for (const [legadoKey, value] of Object.entries(ruleContent)) {
		if (value === undefined || value === "") continue;

		if (legadoKey === "content") {
			const conversion = parseLegadoRule(value);
			conversions.push(conversion);
			const rule = convertToRule(conversion);
			if (rule) {
				rules["text"] = rule;
			}
		} else if (legadoKey === "nextContentUrl") {
			const conversion = parseLegadoRule(value);
			conversions.push(conversion);
			nextUrl = convertToRule(conversion);
		} else if (legadoKey === "replaceRegex") {
			const segments = value.split("##").filter((s) => s.length > 0);
			if (segments.length > 0) {
				replaceRegex = segments.map((segment) => ({
					pattern: segment,
					with: "",
				}));
			}
		}
	}

	const contentResult: {
		rules: ContentRules;
		nextUrl?: Rule;
		replaceRegex?: readonly ReplacePair[];
		conversions: ConversionResult[];
	} = {
		rules: rules as ContentRules,
		conversions,
	};
	if (nextUrl) {
		contentResult.nextUrl = nextUrl;
	}
	if (replaceRegex) {
		contentResult.replaceRegex = replaceRegex;
	}
	return contentResult;
}

function parseExploreUrl(exploreUrl: string): ExploreCategory[] {
	return exploreUrl
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const separatorIndex = line.indexOf("::");
			if (separatorIndex === -1) {
				return { title: line };
			}
			return {
				title: line.slice(0, separatorIndex),
				url: line.slice(separatorIndex + 2),
			};
		});
}

// ── Header Parser ─────────────────────────────────────────────

function parseHeader(header?: string): Record<string, string> | undefined {
	if (!header) return undefined;
	try {
		const parsed = JSON.parse(header);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
		const headers: Record<string, string> = {};
		for (const [k, v] of Object.entries(parsed)) {
			if (typeof v === "string") headers[k] = v;
		}
		return Object.keys(headers).length > 0 ? headers : undefined;
	} catch {
		return undefined;
	}
}

// ── Main Converter ────────────────────────────────────────────

export function convertLegadoBookSources(
	sources: readonly LegadoBookSource[],
): ImportedResult<BookSource[]> {
	const allConversions: ConversionResult[] = [];
	const warnings: ImportError[] = [];
	const convertedSources: BookSource[] = [];

	for (const source of sources) {
		const sourceConversions: ConversionResult[] = [];

		// ── Top-level field mapping ──────────────────────────
		const id = source.bookSourceUrl ?? "";
		const name = source.bookSourceName ?? "";
		const type: BookSourceType = BOOK_SOURCE_TYPE_MAP[source.bookSourceType ?? 0] ?? "novel";

		const builder: BookSourceBuilder = {
			$schema: SCHEMA_ID,
			id,
			name,
			type,
			baseUrl: id,
		};

		// bookSourceGroup → tags
		if (source.bookSourceGroup) {
			const tags = source.bookSourceGroup
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0);
			if (tags.length > 0) {
				builder.tags = tags;
			}
		}

		// Simple direct mappings
		if (source.bookSourceComment) {
			builder.description = source.bookSourceComment;
		}
		if (source.bookUrlPattern) {
			builder.urlPattern = source.bookUrlPattern;
		}
		if (source.enabled !== undefined) {
			builder.enabled = source.enabled;
		}
		if (source.weight !== undefined) {
			builder.weight = source.weight;
		}
		if (source.customOrder !== undefined) {
			builder.order = source.customOrder;
		}
		if (source.loginUrl) {
			builder.loginUrl = source.loginUrl;
		}

		// concurrentRate (string) → rateLimit (int)
		if (source.concurrentRate !== undefined) {
			const parsed = Number.parseInt(source.concurrentRate, 10);
			if (!Number.isNaN(parsed)) {
				builder.rateLimit = parsed;
			}
		}

		// header (JSON string) → headers (object)
		const headers = parseHeader(source.header);
		if (headers) {
			builder.headers = headers;
		}

		// lastUpdateTime (epoch ms) → updatedAt (ISO 8601)
		if (source.lastUpdateTime !== undefined) {
			builder.updatedAt = new Date(source.lastUpdateTime).toISOString();
		}

		// ── Unsupported feature warnings ─────────────────────
		if (source.enabledCookieJar !== undefined) {
			warnings.push({
				kind: "unsupported_feature",
				message: `Field "enabledCookieJar" is not supported in ReaderX format and will be ignored`,
				path: "enabledCookieJar",
			});
		}
		if (source.loginUi !== undefined) {
			warnings.push({
				kind: "unsupported_feature",
				message: `Field "loginUi" is not supported in ReaderX format and will be ignored`,
				path: "loginUi",
			});
		}
		if (source.loginCheckJs !== undefined) {
			warnings.push({
				kind: "unsupported_feature",
				message: `Field "loginCheckJs" is not supported in ReaderX format and will be ignored`,
				path: "loginCheckJs",
			});
		}
		// respondTime is silently ignored (runtime metric)

		// ── searchUrl → search module ────────────────────────
		if (source.searchUrl) {
			if (source.searchUrl.startsWith("@js:")) {
				warnings.push({
					kind: "unsupported_feature",
					message: `searchUrl with "@js:" prefix is not supported and will be skipped`,
					path: "searchUrl",
				});
			} else {
				const searchModuleBuilder: Record<string, unknown> = {
					url: source.searchUrl,
				};

				// ruleSearch
				if (source.ruleSearch) {
					// checkKeyWord stays on search module directly
					if (source.ruleSearch.checkKeyWord) {
						searchModuleBuilder["checkKeyWord"] = source.ruleSearch.checkKeyWord;
					}

					const { rules, conversions } = convertRuleFields(
						source.ruleSearch,
						SEARCH_FIELD_MAP,
					);
					sourceConversions.push(...conversions);

					if (Object.keys(rules).length > 0) {
						searchModuleBuilder["rules"] = rules as SearchRules;
					}
				}

				builder.search = searchModuleBuilder as unknown as SearchModule;
			}
		}

		// ── exploreUrl → explore module ──────────────────────
		if (source.exploreUrl) {
			const categories = parseExploreUrl(source.exploreUrl);

			const exploreModuleBuilder: Record<string, unknown> = {
				categories,
			};

			// ruleExplore
			if (source.ruleExplore) {
				const { rules, conversions } = convertRuleFields(
					source.ruleExplore,
					SEARCH_FIELD_MAP,
				);
				sourceConversions.push(...conversions);

				if (Object.keys(rules).length > 0) {
					exploreModuleBuilder["rules"] = rules as SearchRules;
				}
			}

			builder.explore = exploreModuleBuilder as unknown as ExploreModule;
		}

		// ── ruleBookInfo → bookInfo module ────────────────────
		if (source.ruleBookInfo) {
			const { rules, conversions } = convertBookInfoRules(source.ruleBookInfo);
			sourceConversions.push(...conversions);

			if (Object.keys(rules).length > 0) {
				builder.bookInfo = { rules } as BookInfoModule;
			}
		}

		// ── ruleToc → toc module ──────────────────────────────
		if (source.ruleToc) {
			const { rules, nextUrl, conversions } = convertTocRules(source.ruleToc);
			sourceConversions.push(...conversions);

			const tocModuleBuilder: Record<string, unknown> = {};
			if (Object.keys(rules).length > 0) {
				tocModuleBuilder["rules"] = rules;
			}
			if (nextUrl) {
				tocModuleBuilder["nextUrl"] = nextUrl;
			}

			if (Object.keys(tocModuleBuilder).length > 0) {
				builder.toc = tocModuleBuilder as unknown as TocModule;
			}
		}

		// ── ruleContent → content module ──────────────────────
		if (source.ruleContent) {
			const { rules, nextUrl, replaceRegex, conversions } = convertContentRules(
				source.ruleContent,
			);
			sourceConversions.push(...conversions);

			const contentModuleBuilder: Record<string, unknown> = {};
			if (Object.keys(rules).length > 0) {
				contentModuleBuilder["rules"] = rules;
			}
			if (nextUrl) {
				contentModuleBuilder["nextUrl"] = nextUrl;
			}
			if (replaceRegex) {
				contentModuleBuilder["replaceRegex"] = replaceRegex;
			}

			if (Object.keys(contentModuleBuilder).length > 0) {
				builder.content = contentModuleBuilder as unknown as ContentModule;
			}
		}

		allConversions.push(...sourceConversions);
		convertedSources.push(builder as BookSource);
	}

	const report = createReport(allConversions);

	return {
		data: convertedSources,
		report,
		warnings,
	};
}
