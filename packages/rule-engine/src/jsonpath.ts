import type { RuntimeResult } from "./types";
import type { Result } from "./result";
import { err, ok } from "./result";
import { evaluate } from "@swaggerexpert/jsonpath";

export function extractJsonPath(
	path: string,
	data: unknown | string,
): Result<RuntimeResult> {
	try {
		const parsed = typeof data === "string" ? (JSON.parse(data) as unknown) : data;
		const result = evaluate(parsed, path);
		return ok(result as RuntimeResult);
	} catch (e) {
		return err({
			code: "JSONPATH_ERROR",
			message: `JSONPath query failed: ${path}`,
			rule: path,
			cause: e,
		});
	}
}
