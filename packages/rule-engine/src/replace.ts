import type { ReplaceRule, ReplaceScope } from "./types";

/**
 * Apply replace rules to text content.
 * Rules are processed in order; each rule's pattern is applied globally.
 */
export async function applyReplaceRules(
	text: string,
	rules: readonly ReplaceRule[],
	options?: {
		readonly sourceId?: string;
		readonly sourceName?: string;
		readonly target?: "content" | "title" | "both";
	},
): Promise<string> {
	let result = text;

	for (const rule of rules) {
		if (rule.enabled === false) continue;
		if (!matchesScope(rule.scope, options)) continue;

		if (rule.literal) {
			// Literal string replacement (no regex)
			const flags = rule.flags ?? "g";
			const hasGlobal = flags.includes("g");
			if (hasGlobal) {
				result = result.replaceAll(rule.pattern, rule.replacement ?? "");
			} else {
				result = result.replace(rule.pattern, rule.replacement ?? "");
			}
		} else {
			const flags = rule.flags ?? "g";
			const regex = new RegExp(rule.pattern, flags);
			result = result.replace(regex, rule.replacement ?? "");
		}
	}

	return result;
}

/**
 * Check if a replace rule's scope matches the current context.
 * No scope = matches everything.
 */
export function matchesScope(
	scope: ReplaceScope | undefined,
	options?: {
		readonly sourceId?: string;
		readonly sourceName?: string;
		readonly target?: "content" | "title" | "both";
	},
): boolean {
	if (!scope) return true;

	const target = options?.target;
	if (scope.target && target) {
		if (scope.target !== "both" && scope.target !== target) {
			return false;
		}
	}

	const sourceId = options?.sourceId;
	const sourceName = options?.sourceName;

	if (scope.include && scope.include.length > 0) {
		const included =
			(sourceId && scope.include.includes(sourceId)) ||
			(sourceName && scope.include.includes(sourceName));
		if (!included) return false;
	}

	if (scope.exclude && scope.exclude.length > 0) {
		const excluded =
			(sourceId && scope.exclude.includes(sourceId)) ||
			(sourceName && scope.exclude.includes(sourceName));
		if (excluded) return false;
	}

	return true;
}
