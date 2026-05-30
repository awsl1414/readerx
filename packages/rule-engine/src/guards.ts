/**
 * Shared type guards for rule-engine runtime values.
 * Centralized to avoid inconsistent duck-typing across modules.
 */

export function isElement(value: unknown): value is Element {
	return (
		typeof value === "object" &&
		value !== null &&
		"querySelectorAll" in value &&
		"getAttribute" in value &&
		!("write" in value)
	);
}

export function isDocument(value: unknown): value is Document {
	return (
		typeof value === "object" &&
		value !== null &&
		"querySelectorAll" in value &&
		"write" in value
	);
}

export function isDomNode(value: unknown): value is Element | Document {
	return isElement(value) || isDocument(value);
}
