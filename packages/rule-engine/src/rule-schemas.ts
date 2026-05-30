import { z } from "zod";

export const replaceRuleSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		group: z.string().optional(),
		pattern: z.string().min(1),
		replacement: z.string(),
		scope: z.string().optional(),
		scopeTitle: z.boolean(),
		scopeContent: z.boolean(),
		excludeScope: z.string().optional(),
		enabled: z.boolean(),
		isRegex: z.boolean(),
		timeoutMillisecond: z.number(),
		order: z.number(),
		createdAt: z.number(),
		updatedAt: z.number(),
	})
	.passthrough();

export const txtTocRuleSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		rule: z.string().min(1),
		enabled: z.boolean(),
	})
	.passthrough();

export const dictRuleSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		urlRule: z.string().optional(),
		showRule: z.string().optional(),
		enabled: z.boolean(),
	})
	.passthrough();

export const rssSourceSchema = z
	.object({
		sourceUrl: z.string().min(1),
		sourceName: z.string().min(1),
		sourceGroup: z.string().optional(),
		enabled: z.boolean(),
		customOrder: z.number(),
		createdAt: z.number(),
		updatedAt: z.number(),
		raw: z.record(z.string(), z.unknown()),
	})
	.passthrough();

export function parseReplaceRule(raw: unknown) {
	return replaceRuleSchema.safeParse(raw);
}

export function parseTxtTocRule(raw: unknown) {
	return txtTocRuleSchema.safeParse(raw);
}

export function parseDictRule(raw: unknown) {
	return dictRuleSchema.safeParse(raw);
}

export function parseRssSource(raw: unknown) {
	return rssSourceSchema.safeParse(raw);
}
