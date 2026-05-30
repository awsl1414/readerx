import { Window } from "happy-dom";
import wgxpath from "wicked-good-xpath";

export type XPathEvalResult = {
	readonly nodes: Node[];
};

// Lazily initialized wgxpath evaluate function (Node.js only)
let wgxpathEvaluate:
	| ((
			expression: string,
			contextNode: Node,
			resolver: null,
			type: number,
			result: null,
	  ) => XPathResult)
	| undefined;

function getWgxpathEvaluate() {
	if (wgxpathEvaluate !== undefined) return wgxpathEvaluate;

	// Create a temporary Window to get the Document constructor,
	// then install wgxpath on it to extract the evaluate function.
	const tempWindow = new Window({
		settings: { disableJavaScriptEvaluation: true },
	});
	wgxpath.install(tempWindow);
	// wgxpath.install adds evaluate to the Document prototype
	const fn = (tempWindow.Document.prototype as Record<string, unknown>)
		.evaluate;
	if (typeof fn !== "function") {
		throw new Error(
			"wgxpath.install did not add evaluate to Document prototype",
		);
	}
	wgxpathEvaluate = fn as typeof wgxpathEvaluate;
	tempWindow.close();
	return wgxpathEvaluate;
}

function isDocument(node: Document | Element): node is Document {
	return node.nodeType === 9;
}

export function evaluateXPath(
	expression: string,
	contextNode: Document | Element,
): XPathEvalResult {
	const doc = isDocument(contextNode) ? contextNode : contextNode.ownerDocument;
	if (!doc) throw new Error("No owner document");

	// Use native evaluate if available (browser or patched environment)
	const evaluate =
		typeof doc.evaluate === "function"
			? doc.evaluate.bind(doc)
			: getWgxpathEvaluate();

	const result = evaluate.call(doc, expression, contextNode, null, 5, null);
	const nodes: Node[] = [];
	let node: Node | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: XPath iterateNext pattern
	while ((node = result.iterateNext()) !== null) {
		nodes.push(node);
	}
	return { nodes };
}
