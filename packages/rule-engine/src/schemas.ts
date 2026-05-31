import { z } from "zod";
import type { Result } from "./result";
import { err, ok } from "./result";

// ---- Re-exports from @readerx/schemas ----
// Prefer importing validation functions directly from @readerx/schemas in new code.
export {
	validateBookSource as validateBookSourceFromSchemas,
	validateDictRuleFile as validateDictRuleFileFromSchemas,
	validateReplaceRuleFile as validateReplaceRuleFileFromSchemas,
	validateTxtTocRuleFile as validateTxtTocRuleFileFromSchemas,
	validateReplaceRuleData,
	validateTxtTocRuleData,
	validateDictRuleData,
	validateBookSourceData,
} from "@readerx/schemas";

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
// Zod schema validates JSON input format and transforms to TS-compatible output:
// - Infers `category` from `action` (JSON Schema has no `category` field)
// - Flattens `{type:"attr", name:...}` output object to `{output:"attr", attr:...}`

const DOM_ACTIONS = ["remove", "unwrap", "strip"] as const;
const STRING_ACTIONS = ["replace"] as const;

const dictExtractStepSchema = z
	.strictObject({
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
	})
	.transform((step) => {
		// Flatten {type:"attr", name:...} → {output:"attr", attr:name}
		if (
			typeof step.output === "object" &&
			step.output !== null &&
			"type" in step.output
		) {
			const { output, ...rest } = step;
			return {
				...rest,
				output: "attr" as const,
				attr: output.name,
			};
		}
		return step;
	});

const dictTransformStepSchema = z
	.strictObject({
		type: z.literal("transform"),
		action: z.enum([...DOM_ACTIONS, ...STRING_ACTIONS]),
		selector: z.string().optional(),
		attrs: z.array(z.string()).optional(),
		pattern: z.string().optional(),
		with: z.string().optional(),
		flags: z.string().optional(),
	})
	.transform((step) => {
		// Infer category from action
		const category = DOM_ACTIONS.includes(
			step.action as (typeof DOM_ACTIONS)[number],
		)
			? ("dom" as const)
			: ("string" as const);
		return { ...step, category };
	});

const dictScriptStepSchema = z.strictObject({
	type: z.literal("script"),
	code: z.string(),
});

const dictFieldSchema = z.strictObject({
	schema: z.enum(["html", "string", "html[]", "string[]"]).default("html"),
	pipeline: z.array(
		z.union([
			dictExtractStepSchema,
			dictTransformStepSchema,
			dictScriptStepSchema,
		]),
	),
});

const dictRequestBodySchema = z.union([
	z.string(),
	z.strictObject({
		type: z.enum(["form", "json", "raw"]),
		data: z.unknown(),
	}),
]);

const dictRequestSchema = z.strictObject({
	url: z.string(),
	method: z.enum(["GET", "POST"]).optional(),
	charset: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: dictRequestBodySchema.optional(),
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
// Book-source rules use a different format than dict-rule:
// - Rule = string shorthand | RuleObject (keyed) | RuleStep[] (keyed-object pipeline)
// - normalizeRule() handles conversion to internal RuleStep[] format
// The Zod schema validates the JSON input structure; detailed rule validation
// happens in normalizeRule() at runtime.

const bookSourceRuleSchema = z.union([
	z.string(),
	z.record(z.string(), z.unknown()), // RuleObject or keyed RuleStep
	z.array(z.unknown()), // RuleStep[] pipeline
]);

const requestConfigSchema = z.strictObject({
	url: z.string().optional(),
	method: z.enum(["GET", "POST"]).optional(),
	charset: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: z.string().optional(),
	responseType: z.enum(["html", "json", "xml", "text"]).optional(),
});

const searchRulesSchema = z
	.object({
		list: bookSourceRuleSchema.optional(),
		name: bookSourceRuleSchema.optional(),
		url: bookSourceRuleSchema.optional(),
		author: bookSourceRuleSchema.optional(),
		cover: bookSourceRuleSchema.optional(),
		intro: bookSourceRuleSchema.optional(),
		kind: bookSourceRuleSchema.optional(),
		lastChapter: bookSourceRuleSchema.optional(),
		wordCount: bookSourceRuleSchema.optional(),
	})
	.passthrough();

const searchModuleSchema = z
	.strictObject({
		url: z.string(),
		checkKeyWord: z.string().optional(),
		rules: searchRulesSchema,
	})
	.merge(requestConfigSchema);

const exploreCategorySchema = z.strictObject({
	title: z.string(),
	url: z.string().optional(),
});

const exploreModuleSchema = z
	.strictObject({
		categories: z.array(exploreCategorySchema),
		rules: searchRulesSchema.optional(),
	})
	.merge(requestConfigSchema);

const bookInfoRulesSchema = z
	.object({
		init: bookSourceRuleSchema.optional(),
		name: bookSourceRuleSchema.optional(),
		author: bookSourceRuleSchema.optional(),
		cover: bookSourceRuleSchema.optional(),
		intro: bookSourceRuleSchema.optional(),
		kind: bookSourceRuleSchema.optional(),
		lastChapter: bookSourceRuleSchema.optional(),
		wordCount: bookSourceRuleSchema.optional(),
		tocUrl: bookSourceRuleSchema.optional(),
	})
	.passthrough();

const bookInfoModuleSchema = z
	.strictObject({
		init: bookSourceRuleSchema.optional(),
		rules: bookInfoRulesSchema.optional(),
	})
	.merge(requestConfigSchema);

const tocRulesSchema = z
	.object({
		list: bookSourceRuleSchema.optional(),
		name: bookSourceRuleSchema.optional(),
		url: bookSourceRuleSchema.optional(),
		isVip: bookSourceRuleSchema.optional(),
		isVolume: bookSourceRuleSchema.optional(),
		updateTime: bookSourceRuleSchema.optional(),
	})
	.passthrough();

const tocModuleSchema = z
	.strictObject({
		nextUrl: bookSourceRuleSchema.optional(),
		rules: tocRulesSchema.optional(),
	})
	.merge(requestConfigSchema);

const replacePairSchema = z.strictObject({
	pattern: z.string(),
	with: z.string(),
});

const contentRulesSchema = z
	.object({
		text: bookSourceRuleSchema.optional(),
	})
	.passthrough();

const contentModuleSchema = z
	.strictObject({
		nextUrl: bookSourceRuleSchema.optional(),
		replaceRegex: z.array(replacePairSchema).optional(),
		rules: contentRulesSchema.optional(),
	})
	.merge(requestConfigSchema);

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
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
	search: searchModuleSchema.optional(),
	explore: exploreModuleSchema.optional(),
	bookInfo: bookInfoModuleSchema.optional(),
	toc: tocModuleSchema.optional(),
	content: contentModuleSchema.optional(),
});

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

/** @deprecated Use validateBookSource from @readerx/schemas instead */
export function validateBookSource(data: unknown): Result<BookSourceOutput> {
	return validate(bookSourceSchema, data);
}

/** @deprecated Use validateDictRuleFile from @readerx/schemas instead */
export function validateDictRuleFile(
	data: unknown,
): Result<DictRuleFileOutput> {
	return validate(dictRuleFileSchema, data);
}

/** @deprecated Use validateReplaceRuleFile from @readerx/schemas instead */
export function validateReplaceRuleFile(
	data: unknown,
): Result<ReplaceRuleFileOutput> {
	return validate(replaceRuleFileSchema, data);
}

/** @deprecated Use validateTxtTocRuleFile from @readerx/schemas instead */
export function validateTxtTocRuleFile(
	data: unknown,
): Result<TxtTocRuleFileOutput> {
	return validate(txtTocRuleFileSchema, data);
}

/** @deprecated Use validateBookSource from @readerx/schemas and unwrap the Result instead */
export function parseBookSource(data: unknown): BookSourceOutput {
	return bookSourceSchema.parse(data);
}

/** @deprecated Use validateDictRuleFile from @readerx/schemas and unwrap the Result instead */
export function parseDictRuleFile(data: unknown): DictRuleFileOutput {
	return dictRuleFileSchema.parse(data);
}

/** @deprecated Use validateReplaceRuleFile from @readerx/schemas and unwrap the Result instead */
export function parseReplaceRuleFile(data: unknown): ReplaceRuleFileOutput {
	return replaceRuleFileSchema.parse(data);
}

/** @deprecated Use validateTxtTocRuleFile from @readerx/schemas and unwrap the Result instead */
export function parseTxtTocRuleFile(data: unknown): TxtTocRuleFileOutput {
	return txtTocRuleFileSchema.parse(data);
}
