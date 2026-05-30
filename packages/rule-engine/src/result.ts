import type { RuleError } from "./types";

export type Result<T, E = RuleError> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

export function err<E = RuleError>(error: E): Result<never, E> {
	return { ok: false, error };
}

export function isOk<T, E>(
	result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
	return result.ok;
}

export function isErr<T, E>(
	result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
	return !result.ok;
}
