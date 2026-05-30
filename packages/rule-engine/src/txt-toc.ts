import type { ChapterBoundary, TxtTocRule } from "./types";

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
	// Sort by order ascending (default 0), then by array position
	const sorted = rules
		.filter((r) => r.enabled !== false)
		.map((rule, originalIndex) => ({
			rule,
			order: rule.order ?? 0,
			originalIndex,
		}))
		.sort((a, b) => a.order - b.order || a.originalIndex - b.originalIndex);

	const boundaries: ChapterBoundary[] = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		if (line === undefined || line.trim() === "") continue;

		for (const { rule } of sorted) {
			const pattern = rule.pattern;
			if (!pattern) {
				// Empty pattern = fallback, matches all non-empty lines
				boundaries.push({
					lineIndex,
					title: line.trim(),
					ruleName: rule.name ?? "fallback",
				});
				break;
			}

			const flags = rule.flags ?? "";
			const regex = new RegExp(pattern, flags);
			const match = regex.exec(line);
			if (match) {
				boundaries.push({
					lineIndex,
					title: match[1] ?? match[0],
					ruleName: rule.name ?? "unnamed",
				});
				break; // First match wins
			}
		}
	}

	return boundaries;
}
