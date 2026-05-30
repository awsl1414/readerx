import type { RuntimeResult, RuntimeValue, ExtractOutput } from "./types";

function isElement(value: unknown): value is Element {
	return (
		typeof value === "object" &&
		value !== null &&
		"querySelectorAll" in value &&
		"getAttribute" in value &&
		!("write" in value)
	);
}

function isDocument(value: unknown): value is Document {
	return (
		typeof value === "object" &&
		value !== null &&
		"querySelectorAll" in value &&
		"write" in value
	);
}

function isDomNode(value: unknown): value is Element | Document {
	return isElement(value) || isDocument(value);
}

export function serializeValue(
	value: RuntimeValue,
	output?: ExtractOutput,
	attr?: string,
): string {
	if (typeof value === "string") return value;
	if (value === null || value === undefined) return "";
	if (isDomNode(value)) {
		return serializeElement(value, output ?? "text", attr);
	}
	return String(value);
}

export function serializeElement(
	el: Element | Document,
	output: ExtractOutput,
	attr?: string,
): string {
	switch (output) {
		case "text":
			return el.textContent ?? "";
		case "html":
			return "innerHTML" in el ? (el.innerHTML as string) : "";
		case "outerHtml":
			return "outerHTML" in el ? (el.outerHTML as string) : "";
		case "attr":
			return isElement(el) && attr ? (el.getAttribute(attr) ?? "") : "";
		default:
			return el.textContent ?? "";
	}
}

export function elementToText(value: RuntimeValue): string {
	if (typeof value === "string") return value;
	if (isDomNode(value)) {
		return value.textContent ?? "";
	}
	return String(value ?? "");
}

export function serializeResult(values: RuntimeResult): string[] {
	return values.map((v) => {
		if (typeof v === "string") return v;
		if (v === null || v === undefined) return "";
		if (isDomNode(v)) return v.textContent ?? "";
		return "";
	});
}
