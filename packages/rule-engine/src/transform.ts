import type { Result } from "./result";
import { err, ok } from "./result";
import { elementToText } from "./serialize";
import type {
	CompiledTransformStep,
	DomTransformStep,
	RuntimeResult,
	StringTransformStep,
} from "./types";

function asStringStep(
	step: CompiledTransformStep,
): step is CompiledTransformStep & StringTransformStep {
	return step.category === "string";
}

export function applyStringTransform(
	step: CompiledTransformStep,
	input: RuntimeResult,
): Result<RuntimeResult> {
	if (!asStringStep(step)) {
		return err({
			code: "TYPE_MISMATCH",
			message: `Expected string transform, got "${step.category}"`,
		});
	}

	const strings = input.map((v) =>
		typeof v === "string" ? v : elementToText(v),
	);

	const def = step;
	switch (def.action) {
		case "replace": {
			const re =
				step.compiledRegex ?? new RegExp(def.pattern ?? "", def.flags ?? "g");
			return ok(strings.map((s) => s.replaceAll(re, def.replacement ?? "")));
		}
		case "match": {
			const re =
				step.compiledRegex ?? new RegExp(def.pattern ?? "", def.flags ?? "g");
			const groupIndex = def.group ?? 0;
			return ok(
				strings.flatMap((s) => {
					const matches = [...s.matchAll(re)];
					return matches.map((m) => m[groupIndex] ?? "");
				}),
			);
		}
		case "split": {
			const re =
				step.compiledRegex ?? new RegExp(def.pattern ?? "", def.flags ?? "g");
			return ok(strings.flatMap((s) => s.split(re)));
		}
		case "template":
			return ok(
				strings.map((s) => (def.template ?? "").replaceAll("{{result}}", s)),
			);
		case "trim":
			return ok(strings.map((s) => s.trim()));
	}
}

function isElement(value: unknown): value is Element {
	return (
		typeof value === "object" &&
		value !== null &&
		"querySelectorAll" in value &&
		"getAttribute" in value &&
		!("write" in value)
	);
}

export function applyDomTransform(
	step: DomTransformStep,
	input: RuntimeResult,
): Result<RuntimeResult> {
	const elements = input.filter(isElement);
	if (elements.length !== input.length) {
		return err({
			code: "TYPE_MISMATCH",
			message: `DomTransform action "${step.action}" requires Element input`,
		});
	}

	switch (step.action) {
		case "remove":
			return ok(
				elements.map((el) => {
					const clone = el.cloneNode(true) as Element;
					clone.querySelectorAll(step.selector).forEach((child) => {
						child.remove();
					});
					return clone as unknown;
				}),
			);
		case "unwrap":
			return ok(
				elements.map((el) => {
					const clone = el.cloneNode(true) as Element;
					clone.querySelectorAll(step.selector).forEach((child) => {
						const parent = child.parentNode;
						if (parent) {
							while (child.firstChild) {
								parent.insertBefore(child.firstChild, child);
							}
							child.remove();
						}
					});
					return clone as unknown;
				}),
			);
		case "strip":
			return ok(
				elements.map((el) => {
					const clone = el.cloneNode(true) as Element;
					clone.querySelectorAll(step.selector).forEach((child) => {
						for (const attr of step.attributes ?? []) {
							child.removeAttribute(attr);
						}
					});
					return clone as unknown;
				}),
			);
	}
}
