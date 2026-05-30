import { parseHTML } from "./dom-parse";
import type { Result } from "./result";
import { err, ok } from "./result";
import { serializeValue } from "./serialize";
import type { ExtractOutput, RuntimeResult } from "./types";

export function extractCss(
	selector: string,
	content: string | Element | Document,
	options?: { readonly output?: ExtractOutput; readonly attr?: string },
): Result<RuntimeResult> {
	try {
		let root: Document | Element;
		let dispose: (() => void) | undefined;

		if (typeof content === "string") {
			const parsed = parseHTML(content);
			root = parsed.document;
			dispose = parsed.dispose;
		} else {
			root = content;
		}

		const elements = root.querySelectorAll(selector);

		// If serializing (output specified), do it before dispose
		if (options?.output) {
			const results: RuntimeResult = Array.from(elements).map((el) =>
				serializeValue(el, options.output, options.attr),
			);
			dispose?.();
			return ok(results);
		}

		// Returning Elements — don't dispose, caller owns the document
		return ok(Array.from(elements) as RuntimeResult);
	} catch (e) {
		return err({
			code: "INVALID_SELECTOR",
			message: `Invalid CSS selector: ${selector}`,
			rule: selector,
			cause: e,
		});
	}
}
