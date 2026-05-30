import { parseHTML } from "./dom-parse";
import type { Result } from "./result";
import { err, ok } from "./result";
import { serializeValue } from "./serialize";
import type { ExtractOutput, RuntimeResult } from "./types";
import { evaluateXPath } from "./xpath-eval";

export function extractXPath(
	expression: string,
	content: string | Element | Document,
	options?: { readonly output?: ExtractOutput },
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

		const { nodes } = evaluateXPath(expression, root);
		const elements = nodes.filter((n): n is Element => n.nodeType === 1);

		if (options?.output) {
			const results: RuntimeResult = elements.map((el) =>
				serializeValue(el, options.output),
			);
			dispose?.();
			return ok(results);
		}

		return ok(elements as RuntimeResult);
	} catch (e) {
		return err({
			code: "XPATH_ERROR",
			message: `XPath evaluation failed: ${expression}`,
			rule: expression,
			cause: e,
		});
	}
}
