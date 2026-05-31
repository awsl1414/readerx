import { z } from "zod";
import type { Result } from "./result";
import { err, ok } from "./result";

// ---- Rule Expression Schema ----
// A rule can be: string shorthand | RuleObject (keyed) | RuleStep[] (pipeline)

const ruleExpressionSchema: z.ZodType = z.union([
	z.string(),
	z.record(z.string(), z.unknown()), // RuleObjectDef
	z.array(z.unknown()), // RuleStepDef[]
]);

// ---- Rule Step Schemas ----

const extractStepSchema = z.strictObject({
	type: z.literal("extract"),
	engine: z.enum(["css", "xpath", "jsonpath", "regex"]),
	selector: z.string(),
	output: z.string().optional(),
	attr: z.string().optional(),
	baseUrl: z.string().optional(),
});

const stringTransformSchema = z.strictObject({
	type: z.literal("transform"),
	category: z.literal("string"),
	action: z.enum(["replace", "match", "split", "template", "trim"]),
	pattern: z.string().optional(),
	with: z.string().optional(),
	flags: z.string().optional(),
	group: z.number().int().optional(),
	template: z.string().optional(),
});

const domTransformSchema = z.strictObject({
	type: z.literal("transform"),
	category: z.literal("dom"),
	action: z.enum(["remove", "unwrap", "strip"]),
	selector: z.string(),
	attrs: z.array(z.string()).optional(),
});

const transformStepSchema = z.union([
	stringTransformSchema,
	domTransformSchema,
]);

const scriptStepSchema = z.strictObject({
	type: z.literal("script"),
	code: z.string(),
});

const ruleStepSchema = z.union([
	extractStepSchema,
	transformStepSchema,
	scriptStepSchema,
]);

// ---- Request Config Schema (full-featured) ----

const requestBodySchema = z.union([
	z.string(),
	z.strictObject({
		type: z.enum(["form", "json", "raw"]),
		data: z.unknown(),
	}),
]);

export const requestConfigSchema = z.strictObject({
	url: z.string().optional(),
	method: z.enum(["GET", "POST"]).optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: requestBodySchema.optional(),
	charset: z.string().optional(),
	cookies: z.record(z.string(), z.string()).optional(),
	timeout: z.number().int().min(0).optional(),
	retry: z.number().int().min(0).optional(),
	cache: z.boolean().optional(),
	proxy: z.string().optional(),
	followRedirect: z.boolean().optional(),
	userAgent: z.string().optional(),
	rateLimit: z.number().int().min(0).optional(),
	variables: z.record(z.string(), z.string()).optional(),
});

// ---- Shared Schemas ----

const replaceScopeSchema = z.strictObject({
	include: z.array(z.string()).optional(),
	exclude: z.array(z.string()).optional(),
	target: z.enum(["content", "title", "both"]).optional(),
});

// ---- Source Module Schema ----

const sourceModuleSchema = z.strictObject({
	type: z.enum(["search", "explore", "detail", "toc", "content"]),
	enabled: z.boolean().optional(),
	request: requestConfigSchema.optional(),
	rules: z.record(z.string(), ruleExpressionSchema),
	nextUrl: ruleExpressionSchema.optional(),
});

// ---- Data-Level Schemas ----

// Replace Rule Data
export const replaceRuleDataSchema = z.strictObject({
	description: z.string().optional(),
	pattern: z.string(),
	flags: z.string().optional(),
	literal: z.boolean().optional(),
	replacement: z.string().optional(),
	replacementJs: z.string().optional(),
	scope: replaceScopeSchema.optional(),
});

// TXT TOC Rule Data
export const txtTocRuleDataSchema = z.strictObject({
	description: z.string().optional(),
	pattern: z.string(),
	flags: z.string().optional(),
});

// Dict Field Schema
const dictFieldSchema = z.strictObject({
	schema: z.enum(["html", "string", "html[]", "string[]"]).default("html"),
	pipeline: z.array(ruleStepSchema),
});

// Dict Rule Data
export const dictRuleDataSchema = z.strictObject({
	description: z.string().optional(),
	weight: z.number().int().min(0).max(100).optional(),
	variables: z.record(z.string(), z.string()).optional(),
	request: requestConfigSchema,
	fields: z.record(z.string(), dictFieldSchema).optional(),
});

// Book Source Data
export const bookSourceDataSchema = z.strictObject({
	description: z.string().optional(),
	author: z.string().optional(),
	version: z.number().int().min(1).optional(),
	baseUrl: z.string(),
	urlPattern: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	loginUrl: z.string().optional(),
	weight: z.number().int().min(0).max(100).optional(),
	rateLimit: z.number().int().min(0).optional(),
	modules: z.array(sourceModuleSchema),
});

// ---- File-Level Schemas (for import/export) ----

export const replaceRuleFileSchema = z.strictObject({
	$schema: z.string(),
	rules: z.array(
		z.strictObject({
			name: z.string(),
			pattern: z.string(),
			description: z.string().optional(),
			tags: z.array(z.string()).optional(),
			enabled: z.boolean().optional(),
			order: z.number().int().min(0).optional(),
			scope: replaceScopeSchema.optional(),
			flags: z.string().optional(),
			literal: z.boolean().optional(),
			replacement: z.string().optional(),
			replacementJs: z.string().optional(),
		}),
	),
});

export const txtTocRuleFileSchema = z.strictObject({
	$schema: z.string(),
	rules: z.array(
		z.strictObject({
			name: z.string(),
			pattern: z.string(),
			description: z.string().optional(),
			tags: z.array(z.string()).optional(),
			enabled: z.boolean().optional(),
			order: z.number().int().min(0).optional(),
			flags: z.string().optional(),
		}),
	),
});

export const dictRuleFileSchema = z.strictObject({
	$schema: z.string(),
	authors: z.array(z.string()).optional(),
	description: z.string().optional(),
	updatedAt: z.string().optional(),
	rules: z.array(
		z.strictObject({
			id: z.string(),
			name: z.string(),
			description: z.string().optional(),
			tags: z.array(z.string()).optional(),
			enabled: z.boolean().optional(),
			weight: z.number().int().min(0).max(100).optional(),
			variables: z.record(z.string(), z.string()).optional(),
			request: requestConfigSchema,
			fields: z.record(z.string(), dictFieldSchema).optional(),
		}),
	),
});

export const bookSourceSchema = z.strictObject({
	$schema: z.string(),
	id: z.string(),
	name: z.string(),
	type: z.enum(["novel", "audio", "comic", "file"]),
	baseUrl: z.string(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	author: z.string().optional(),
	version: z.number().int().min(1).optional(),
	urlPattern: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	loginUrl: z.string().optional(),
	enabled: z.boolean().optional(),
	weight: z.number().int().min(0).max(100).optional(),
	order: z.number().int().min(0).optional(),
	rateLimit: z.number().int().min(0).optional(),
	modules: z.array(sourceModuleSchema),
});

// ---- Inferred Types from Schemas ----

export type ReplaceRuleFileInput = z.input<typeof replaceRuleFileSchema>;
export type ReplaceRuleFileOutput = z.output<typeof replaceRuleFileSchema>;
export type TxtTocRuleFileInput = z.input<typeof txtTocRuleFileSchema>;
export type TxtTocRuleFileOutput = z.output<typeof txtTocRuleFileSchema>;
export type DictRuleFileInput = z.input<typeof dictRuleFileSchema>;
export type DictRuleFileOutput = z.output<typeof dictRuleFileSchema>;
export type BookSourceInput = z.input<typeof bookSourceSchema>;
export type BookSourceOutput = z.output<typeof bookSourceSchema>;

// ---- Validation Helpers ----

function validate<T>(schema: z.ZodType<T>, data: unknown): Result<T> {
	const result = schema.safeParse(data);
	if (result.success) {
		return ok(result.data);
	}
	const issues = result.error.issues;
	const message = issues
		.map((i) => `${i.path.join(".")}: ${i.message}`)
		.join("; ");
	return err({
		code: "VALIDATION_ERROR",
		message: `Validation failed: ${message}`,
		cause: result.error,
	});
}

export function validateReplaceRuleData(data: unknown) {
	return validate(replaceRuleDataSchema, data);
}

export function validateTxtTocRuleData(data: unknown) {
	return validate(txtTocRuleDataSchema, data);
}

export function validateDictRuleData(data: unknown) {
	return validate(dictRuleDataSchema, data);
}

export function validateBookSourceData(data: unknown) {
	return validate(bookSourceDataSchema, data);
}

export function validateReplaceRuleFile(data: unknown) {
	return validate(replaceRuleFileSchema, data);
}

export function validateTxtTocRuleFile(data: unknown) {
	return validate(txtTocRuleFileSchema, data);
}

export function validateDictRuleFile(data: unknown) {
	return validate(dictRuleFileSchema, data);
}

export function validateBookSource(data: unknown) {
	return validate(bookSourceSchema, data);
}
