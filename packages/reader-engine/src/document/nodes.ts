import { nanoid } from "nanoid";

// --- Base ---

type BaseNode = {
	readonly id: string;
};

// --- Document ---

type DocumentMeta = {
	readonly title?: string;
	readonly url?: string;
	readonly charset?: string;
	readonly [key: string]: unknown;
};

type Document = BaseNode & {
	readonly type: "document";
	readonly children: readonly BlockNode[];
	readonly meta?: DocumentMeta;
};

// --- Block Nodes ---

type ParagraphNode = BaseNode & {
	readonly type: "paragraph";
	readonly children: readonly InlineNode[];
};

type HeadingNode = BaseNode & {
	readonly type: "heading";
	readonly level: 1 | 2 | 3 | 4 | 5 | 6;
	readonly children: readonly InlineNode[];
};

type ImageNode = BaseNode & {
	readonly type: "image";
	readonly src: string;
	readonly alt?: string;
	readonly width?: number;
	readonly height?: number;
};

type BlockquoteNode = BaseNode & {
	readonly type: "blockquote";
	readonly children: readonly BlockNode[];
};

type SeparatorNode = BaseNode & {
	readonly type: "separator";
};

type BlockNode =
	| ParagraphNode
	| HeadingNode
	| ImageNode
	| BlockquoteNode
	| SeparatorNode;

// --- Inline Nodes ---

type TextNode = BaseNode & {
	readonly type: "text";
	readonly value: string;
};

type StrongNode = BaseNode & {
	readonly type: "strong";
	readonly children: readonly InlineNode[];
};

type EmphasisNode = BaseNode & {
	readonly type: "emphasis";
	readonly children: readonly InlineNode[];
};

type LinkNode = BaseNode & {
	readonly type: "link";
	readonly href: string;
	readonly children: readonly InlineNode[];
};

type ImageInlineNode = BaseNode & {
	readonly type: "image-inline";
	readonly src: string;
	readonly alt?: string;
};

type InlineNode =
	| TextNode
	| StrongNode
	| EmphasisNode
	| LinkNode
	| ImageInlineNode;

// --- ID Helper ---

function nodeId(): string {
	return nanoid(10);
}

// --- Node Constructors ---

function textNode(text: string): TextNode {
	return { id: nodeId(), type: "text", value: text };
}

function paragraphNode(inlines: readonly InlineNode[]): ParagraphNode {
	return { id: nodeId(), type: "paragraph", children: inlines };
}

function headingNode(
	level: 1 | 2 | 3 | 4 | 5 | 6,
	inlines: readonly InlineNode[],
): HeadingNode {
	return { id: nodeId(), type: "heading", level, children: inlines };
}

function documentNode(
	blocks: readonly BlockNode[],
	meta?: DocumentMeta,
): Document {
	return {
		id: nodeId(),
		type: "document",
		children: blocks,
		...(meta !== undefined ? { meta } : {}),
	};
}

export type {
	BaseNode,
	BlockNode,
	BlockquoteNode,
	Document,
	DocumentMeta,
	EmphasisNode,
	HeadingNode,
	ImageInlineNode,
	ImageNode,
	InlineNode,
	LinkNode,
	ParagraphNode,
	SeparatorNode,
	StrongNode,
	TextNode,
};

export { documentNode, headingNode, nodeId, paragraphNode, textNode };
