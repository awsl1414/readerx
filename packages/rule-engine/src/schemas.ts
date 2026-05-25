import type { BookSource } from "./types";

/**
 * 规则校验
 * 参考 docs/book-source-fields.md
 */

export function isValidBookSourceType(value: number): boolean {
	return value === 0 || value === 1 || value === 2 || value === 3;
}

export function validateBookSource(source: unknown): source is BookSource {
	if (typeof source !== "object" || source === null) return false;
	const s = source as Record<string, unknown>;

	if (typeof s.bookSourceUrl !== "string" || !s.bookSourceUrl) return false;
	if (typeof s.bookSourceName !== "string" || !s.bookSourceName) return false;
	if (!isValidBookSourceType(s.bookSourceType as number)) return false;

	return true;
}
