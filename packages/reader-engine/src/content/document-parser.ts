import type {
	BlockNode,
	BlockquoteNode,
	Document,
	DocumentMeta,
	EmphasisNode,
	ImageNode,
	InlineNode,
	LinkNode,
	SeparatorNode,
	StrongNode,
} from "../document/nodes";
import {
	documentNode,
	headingNode,
	nodeId,
	paragraphNode,
	textNode,
} from "../document/nodes";

/**
 * Parse plain text into a Document AST.
 * Each non-empty line becomes a ParagraphNode containing a single TextNode.
 */
function parseTextToDocument(text: string, title?: string): Document {
	const lines = text.split("\n");
	const blocks: BlockNode[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) continue;
		blocks.push(paragraphNode([textNode(trimmed)]));
	}

	const meta: DocumentMeta | undefined =
		title !== undefined ? { title } : undefined;

	return documentNode(blocks, meta);
}

/**
 * Parse an HTML string into a Document AST using DOMParser.
 * Walks the DOM tree and maps elements to AST nodes.
 */
function parseHtmlToDocument(html: string, title?: string): Document {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const body = doc.body;

	const blocks = parseBlockChildren(body);

	const meta: DocumentMeta | undefined =
		title !== undefined ? { title } : undefined;

	return documentNode(blocks, meta);
}

function parseBlockChildren(parent: Element): BlockNode[] {
	const blocks: BlockNode[] = [];

	for (const child of Array.from(parent.childNodes)) {
		const block = parseBlockNode(child);
		if (block !== undefined) {
			if (Array.isArray(block)) {
				blocks.push(...block);
			} else {
				blocks.push(block);
			}
		}
	}

	return blocks;
}

function parseBlockNode(node: Node): BlockNode | BlockNode[] | undefined {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.textContent?.trim() ?? "";
		if (text.length === 0) return undefined;
		return paragraphNode([textNode(text)]);
	}

	if (node.nodeType !== Node.ELEMENT_NODE) return undefined;

	const el = node as Element;
	const tag = el.tagName.toLowerCase();

	switch (tag) {
		case "p":
		case "div": {
			const inlines = parseInlineChildren(el);
			if (inlines.length === 0) return undefined;
			return paragraphNode(inlines);
		}
		case "h1":
		case "h2":
		case "h3":
		case "h4":
		case "h5":
		case "h6": {
			const digit = tag[1] ?? "1";
			const level = Number.parseInt(digit, 10) as 1 | 2 | 3 | 4 | 5 | 6;
			const inlines = parseInlineChildren(el);
			return headingNode(level, inlines);
		}
		case "img": {
			const src = el.getAttribute("src") ?? "";
			const altAttr = el.getAttribute("alt");
			const imageNode: ImageNode = {
				id: nodeId(),
				type: "image",
				src,
				...(altAttr !== null ? { alt: altAttr } : {}),
			};
			return imageNode;
		}
		case "blockquote": {
			const children = parseBlockChildren(el);
			const bqNode: BlockquoteNode = {
				id: nodeId(),
				type: "blockquote",
				children,
			};
			return bqNode;
		}
		case "hr": {
			const sepNode: SeparatorNode = { id: nodeId(), type: "separator" };
			return sepNode;
		}
		case "br":
			return undefined;
		case "head":
		case "script":
		case "style":
		case "meta":
		case "link":
		case "title":
			return undefined;
		default:
			return parseBlockChildren(el);
	}
}

function parseInlineChildren(parent: Element): InlineNode[] {
	const inlines: InlineNode[] = [];

	for (const child of Array.from(parent.childNodes)) {
		const inline = parseInlineNode(child);
		if (inline !== undefined) {
			if (Array.isArray(inline)) {
				inlines.push(...inline);
			} else {
				inlines.push(inline);
			}
		}
	}

	return inlines;
}

function parseInlineNode(node: Node): InlineNode | InlineNode[] | undefined {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.textContent ?? "";
		if (text.trim().length === 0) return undefined;
		return textNode(text);
	}

	if (node.nodeType !== Node.ELEMENT_NODE) return undefined;

	const el = node as Element;
	const tag = el.tagName.toLowerCase();

	switch (tag) {
		case "strong":
		case "b": {
			const children = parseInlineChildren(el);
			const strongNode: StrongNode = {
				id: nodeId(),
				type: "strong",
				children,
			};
			return strongNode;
		}
		case "em":
		case "i": {
			const children = parseInlineChildren(el);
			const emNode: EmphasisNode = {
				id: nodeId(),
				type: "emphasis",
				children,
			};
			return emNode;
		}
		case "a": {
			const href = el.getAttribute("href") ?? "";
			const children = parseInlineChildren(el);
			const linkNode: LinkNode = {
				id: nodeId(),
				type: "link",
				href,
				children,
			};
			return linkNode;
		}
		case "br":
			return undefined;
		case "script":
		case "style":
			return undefined;
		default:
			return parseInlineChildren(el);
	}
}

export { parseHtmlToDocument, parseTextToDocument };
