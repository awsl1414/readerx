import type { RuntimeResult } from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";

export function extractRegex(
	pattern: string,
	content: string,
	flags?: string,
): Result<RuntimeResult> {
	try {
		const re = new RegExp(pattern, flags ?? "g");
		const matches = [...content.matchAll(re)];
		return ok(matches.map((m) => m[0] ?? ""));
	} catch (e) {
		return err({
			code: "REGEX_ERROR",
			message: `Invalid regex pattern: ${pattern}`,
			rule: pattern,
			cause: e,
		});
	}
}
