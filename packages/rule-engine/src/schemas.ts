import { z } from "zod";
import type { BookSource } from "./types";

/**
 * Zod Schema 体系 — 书源配置校验
 * 参考 docs/book-source-fields.md
 * 所有 schema 使用 .passthrough() 允许社区书源的额外字段
 */

// ─── URL 选项 Schema ─────────────────────────────────────────────────────

export const urlOptionSchema = z
	.object({
		method: z.enum(["GET", "POST", "get", "post"]).optional(),
		charset: z.string().optional(),
		headers: z.record(z.string(), z.string()).optional(),
		body: z.string().optional(),
		retry: z.number().int().nonnegative().optional(),
		webJs: z.string().optional(),
		type: z.string().optional(),
		webView: z.boolean().optional(),
	})
	.passthrough();

/**
 * 解析 URL 选项 JSON — 书源 URL 规则中逗号后的 JSON 配置
 */
export function parseUrlOption(
	json: string,
):
	| { success: true; data: z.infer<typeof urlOptionSchema> }
	| { success: false; error: string } {
	try {
		const raw: unknown = JSON.parse(json);
		const result = urlOptionSchema.safeParse(raw);
		if (result.success) return { success: true, data: result.data };
		return {
			success: false,
			error: result.error.issues.map((i) => i.message).join("; "),
		};
	} catch {
		return { success: false, error: "Invalid JSON" };
	}
}

// ─── 规则 Schemas ─────────────────────────────────────────────────────────

/** 规则字符串类型 — 所有规则使用 z.string() */
const stringRule = z.string();

export const searchRuleSchema = z
	.object({
		checkKeyWord: stringRule.optional(),
		bookList: z.string(),
		name: z.string(),
		author: z.string(),
		intro: stringRule.optional(),
		kind: stringRule.optional(),
		lastChapter: stringRule.optional(),
		updateTime: stringRule.optional(),
		bookUrl: z.string(),
		coverUrl: stringRule.optional(),
		wordCount: stringRule.optional(),
	})
	.passthrough();

export const exploreRuleSchema = searchRuleSchema.omit({ checkKeyWord: true });

export const bookInfoRuleSchema = z
	.object({
		init: stringRule.optional(),
		name: stringRule.optional(),
		author: stringRule.optional(),
		intro: stringRule.optional(),
		kind: stringRule.optional(),
		lastChapter: stringRule.optional(),
		updateTime: stringRule.optional(),
		coverUrl: stringRule.optional(),
		tocUrl: stringRule.optional(),
		wordCount: stringRule.optional(),
		canReName: stringRule.optional(),
		downloadUrls: stringRule.optional(),
	})
	.passthrough();

export const tocRuleSchema = z
	.object({
		preUpdateJs: stringRule.optional(),
		chapterList: z.string(),
		chapterName: z.string(),
		chapterUrl: z.string(),
		formatJs: stringRule.optional(),
		isVolume: stringRule.optional(),
		isVip: stringRule.optional(),
		isPay: stringRule.optional(),
		updateTime: stringRule.optional(),
		nextTocUrl: stringRule.optional(),
	})
	.passthrough();

export const contentRuleSchema = z
	.object({
		content: z.string(),
		title: stringRule.optional(),
		nextContentUrl: stringRule.optional(),
		webJs: stringRule.optional(),
		sourceRegex: stringRule.optional(),
		replaceRegex: stringRule.optional(),
		imageStyle: stringRule.optional(),
		imageDecode: stringRule.optional(),
		payAction: stringRule.optional(),
	})
	.passthrough();

export const reviewRuleSchema = z
	.object({
		reviewUrl: stringRule.optional(),
		avatarRule: stringRule.optional(),
		contentRule: stringRule.optional(),
		postTimeRule: stringRule.optional(),
		reviewQuoteUrl: stringRule.optional(),
		voteUpUrl: stringRule.optional(),
		voteDownUrl: stringRule.optional(),
		postReviewUrl: stringRule.optional(),
		postQuoteUrl: stringRule.optional(),
		deleteUrl: stringRule.optional(),
	})
	.passthrough();

// ─── BookSource Schema ────────────────────────────────────────────────────

export const bookSourceSchema = z
	.object({
		bookSourceUrl: z.string().min(1),
		bookSourceName: z.string().min(1),
		bookSourceGroup: z.string().optional(),
		bookSourceType: z.union([
			z.literal(0),
			z.literal(1),
			z.literal(2),
			z.literal(3),
		]),
		bookUrlPattern: z.string().optional(),
		bookSourceComment: z.string().optional(),
		variableComment: z.string().optional(),
		enabled: z.boolean(),
		enabledExplore: z.boolean(),
		customOrder: z.number(),
		weight: z.number(),
		lastUpdateTime: z.number(),
		respondTime: z.number(),
		header: z.string().optional(),
		loginUrl: z.string().optional(),
		loginUi: z.string().optional(),
		loginCheckJs: z.string().optional(),
		enabledCookieJar: z.boolean().optional(),
		concurrentRate: z.string().optional(),
		jsLib: z.string().optional(),
		coverDecodeJs: z.string().optional(),
		searchUrl: z.string().optional(),
		exploreUrl: z.string().optional(),
		exploreScreen: z.string().optional(),
		ruleSearch: searchRuleSchema.optional(),
		ruleExplore: exploreRuleSchema.optional(),
		ruleBookInfo: bookInfoRuleSchema.optional(),
		ruleToc: tocRuleSchema.optional(),
		ruleContent: contentRuleSchema.optional(),
		ruleReview: reviewRuleSchema.optional(),
	})
	.passthrough();

// ─── 校验函数 ──────────────────────────────────────────────────────────────

/**
 * 解析并校验 BookSource 对象
 * 成功返回 data，失败返回 ZodError
 */
export function parseBookSource(
	source: unknown,
):
	| { success: true; data: z.infer<typeof bookSourceSchema> }
	| { success: false; errors: z.ZodError } {
	const result = bookSourceSchema.safeParse(source);
	if (result.success) return { success: true, data: result.data };
	return { success: false, errors: result.error };
}

/**
 * 类型守卫：判断输入是否为合法 BookSource
 */
export function validateBookSource(source: unknown): source is BookSource {
	return bookSourceSchema.safeParse(source).success;
}

/**
 * 判断 BookSourceType 是否合法 (0-3)
 */
export function isValidBookSourceType(value: number): boolean {
	return value === 0 || value === 1 || value === 2 || value === 3;
}
