import { z } from "zod";
import type { Result } from "./result";
import { err, ok } from "./result";

// ---- Replace Rule Schema ----

const replaceScopeSchema = z.strictObject({
	include: z.array(z.string()).optional(),
	exclude: z.array(z.string()).optional(),
	target: z.enum(["content", "title", "both"]).optional(),
});

const replaceRuleSchema = z.strictObject({
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
});

export const replaceRuleFileSchema = z.strictObject({
	$schema: z.string(),
	rules: z.array(replaceRuleSchema),
});

export type ReplaceRuleFileInput = z.input<typeof replaceRuleFileSchema>;
export type ReplaceRuleFileOutput = z.output<typeof replaceRuleFileSchema>;

// ---- TXT TOC Rule Schema ----

const txtTocRuleSchema = z.strictObject({
	name: z.string(),
	pattern: z.string(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	enabled: z.boolean().optional(),
	order: z.number().int().min(0).optional(),
	flags: z.string().optional(),
});

export const txtTocRuleFileSchema = z.strictObject({
	$schema: z.string(),
	rules: z.array(txtTocRuleSchema),
});

export type TxtTocRuleFileInput = z.input<typeof txtTocRuleFileSchema>;
export type TxtTocRuleFileOutput = z.output<typeof txtTocRuleFileSchema>;

// ---- Dict Rule Schema ----

const dictFieldSchema = z.strictObject({
	schema: z.enum(["html", "string", "html[]", "string[]"]).default("html"),
	pipeline: z.array(
		z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("extract"),
				engine: z.enum(["css", "xpath", "jsonpath", "regex"]),
				selector: z.string(),
				output: z
					.union([
						z.enum(["html", "text", "outerHtml"]),
						z.strictObject({ type: z.literal("attr"), name: z.string() }),
					])
					.optional(),
				baseUrl: z.string().optional(),
			}),
			z.strictObject({
				type: z.literal("transform"),
				action: z.enum(["remove", "unwrap", "strip", "replace"]),
				selector: z.string().optional(),
				attrs: z.array(z.string()).optional(),
				pattern: z.string().optional(),
				with: z.string().optional(),
				flags: z.string().optional(),
			}),
			z.strictObject({
				type: z.literal("script"),
				code: z.string(),
			}),
		]),
	),
});

const dictRequestSchema = z.strictObject({
	url: z.string(),
	method: z.enum(["GET", "POST"]).optional(),
	charset: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: z.unknown().optional(),
});

const dictRuleSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	enabled: z.boolean().optional(),
	weight: z.number().int().min(0).max(100).optional(),
	variables: z.record(z.string(), z.string()).optional(),
	request: dictRequestSchema,
	fields: z.record(z.string(), dictFieldSchema).optional(),
});

export const dictRuleFileSchema = z.strictObject({
	$schema: z.string(),
	authors: z.array(z.string()).optional(),
	description: z.string().optional(),
	updatedAt: z.string().optional(),
	rules: z.array(dictRuleSchema),
});

export type DictRuleFileInput = z.input<typeof dictRuleFileSchema>;
export type DictRuleFileOutput = z.output<typeof dictRuleFileSchema>;

// ---- Book Source Schema ----

const requestConfigSchema = z.strictObject({
	url: z.string().optional(),
	method: z.enum(["GET", "POST"]).optional(),
	charset: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: z.string().optional(),
	responseType: z.enum(["html", "json", "xml", "text"]).optional(),
});

const bookSourceSchema_top = z.strictObject({
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
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
	search: z
		.strictObject({
			url: z.string(),
		})
		.merge(requestConfigSchema)
		.optional(),
	explore: z
		.strictObject({
			categories: z.array(
				z.strictObject({
					title: z.string(),
					url: z.string().optional(),
				}),
			),
		})
		.merge(requestConfigSchema)
		.optional(),
	bookInfo: z.strictObject({}).merge(requestConfigSchema).optional(),
	toc: z.strictObject({}).merge(requestConfigSchema).optional(),
	content: z.strictObject({}).merge(requestConfigSchema).optional(),
});

export const bookSourceSchema = bookSourceSchema_top;

export type BookSourceInput = z.input<typeof bookSourceSchema>;
export type BookSourceOutput = z.output<typeof bookSourceSchema>;

// ---- Validation helpers ----

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
		code: "COMPILE_ERROR",
		message: `Validation failed: ${message}`,
		cause: result.error,
	});
}

export function validateBookSource(data: unknown): Result<BookSourceOutput> {
	return validate(bookSourceSchema, data);
}

export function validateDictRuleFile(
	data: unknown,
): Result<DictRuleFileOutput> {
	return validate(dictRuleFileSchema, data);
}

export function validateReplaceRuleFile(
	data: unknown,
): Result<ReplaceRuleFileOutput> {
	return validate(replaceRuleFileSchema, data);
}

export function validateTxtTocRuleFile(
	data: unknown,
): Result<TxtTocRuleFileOutput> {
	return validate(txtTocRuleFileSchema, data);
}

export function parseBookSource(data: unknown): BookSourceOutput {
	return bookSourceSchema.parse(data);
}

export function parseDictRuleFile(data: unknown): DictRuleFileOutput {
	return dictRuleFileSchema.parse(data);
}

export function parseReplaceRuleFile(data: unknown): ReplaceRuleFileOutput {
	return replaceRuleFileSchema.parse(data);
}

export function parseTxtTocRuleFile(data: unknown): TxtTocRuleFileOutput {
	return txtTocRuleFileSchema.parse(data);
}
