export type XPathEvalResult = {
	readonly nodes: Node[];
};

export function evaluateXPath(
	expression: string,
	contextNode: Document | Element,
): XPathEvalResult {
	const doc =
		contextNode instanceof Document ? contextNode : contextNode.ownerDocument;
	if (!doc) throw new Error("No owner document");

	const result = doc.evaluate(
		expression,
		contextNode,
		null,
		XPathResult.ORDERED_NODE_ITERATOR_TYPE,
		null,
	);
	const nodes: Node[] = [];
	let node: Node | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: XPath iterateNext pattern
	while ((node = result.iterateNext()) !== null) {
		nodes.push(node);
	}
	return { nodes };
}
