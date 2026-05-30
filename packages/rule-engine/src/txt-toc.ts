import type { ChapterBoundary, TxtTocRule } from "./types";

type PrecompiledRule = {
	readonly rule: TxtTocRule;
	readonly order: number;
	readonly originalIndex: number;
	readonly regex: RegExp | null; // null = empty pattern (fallback)
};

/**
 * Find chapter boundaries in TXT file lines using TOC rules.
 *
 * Rules are sorted by `order` ascending. First match per line wins.
 * Empty pattern matches all non-empty lines (fallback).
 */
export function findChapterBoundaries(
	lines: readonly string[],
	rules: readonly TxtTocRule[],
): ChapterBoundary[] {
	// Precompile regexes and sort by order once, outside the line loop
	const sorted = rules
		.filter((r) => r.enabled !== false)
		.map((rule, originalIndex) => {
			const pattern = rule.pattern;
			let regex: RegExp | null = null;
			if (pattern) {
				try {
					regex = new RegExp(pattern, rule.flags ?? "");
				} catch {
					// Invalid regex — skip this rule
					return null;
				}
			}
			return {
				rule,
				order: rule.order ?? 0,
				originalIndex,
				regex,
			} as const;
		})
		.filter((r): r is PrecompiledRule => r !== null)
		.sort((a, b) => a.order - b.order || a.originalIndex - b.originalIndex);

	const boundaries: ChapterBoundary[] = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		if (line === undefined || line.trim() === "") continue;

		for (const { rule, regex } of sorted) {
			if (!regex) {
				// Empty pattern = fallback, matches all non-empty lines
				boundaries.push({
					lineIndex,
					title: line.trim(),
					ruleName: rule.name,
				});
				break;
			}

			const match = regex.exec(line);
			if (match) {
				boundaries.push({
					lineIndex,
					title: match[1] ?? match[0],
					ruleName: rule.name,
				});
				break; // First match wins
			}
		}
	}

	return boundaries;
}
