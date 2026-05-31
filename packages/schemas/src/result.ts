/**
 * Result type for schema validation — local copy since @readerx/schemas has zero deps.
 * The rule-engine has its own Result type with RuleError; this one is specialized
 * for validation errors only.
 */

export type RuleValidationError = {
	readonly code: string;
	readonly message: string;
	readonly cause?: unknown;
};

export type Result<T, E = RuleValidationError> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

export function err<E = RuleValidationError>(error: E): Result<never, E> {
	return { ok: false, error };
}
