import type {
	BlockNode,
	BlockquoteNode,
	Document,
	EmphasisNode,
	HeadingNode,
	InlineNode,
	LinkNode,
	ParagraphNode,
	StrongNode,
	TextNode,
} from "../document/nodes";
import { documentNode, nodeId } from "../document/nodes";
import type { ReplaceRule } from "./types";

/**
 * Content processor -- applies replace rules on Document AST.
 * Immutable transform: returns a new Document, never modifies input.
 */
export class ContentProcessor {
	private rules: ReplaceRule[] = [];

	setRules(rules: ReplaceRule[]): void {
		this.rules = [...rules].sort((a, b) => a.order - b.order);
	}

	process(doc: Document): Document {
		const newBlocks = doc.children.map((block) =>
			this.processBlock(block, false),
		);
		return documentNode(newBlocks, doc.meta);
	}

	private processBlock(block: BlockNode, isTitle: boolean): BlockNode {
		switch (block.type) {
			case "paragraph":
				return this.processParagraph(block, isTitle);
			case "heading":
				return this.processHeading(block);
			case "blockquote":
				return this.processBlockquote(block);
			case "image":
				return { ...block, id: nodeId() };
			case "separator":
				return { ...block, id: nodeId() };
			default: {
				const _exhaustive: never = block;
				return _exhaustive;
			}
		}
	}

	private processParagraph(
		node: ParagraphNode,
		isTitle: boolean,
	): ParagraphNode {
		return {
			id: nodeId(),
			type: "paragraph",
			children: node.children.map((inline) =>
				this.processInline(inline, isTitle),
			),
		};
	}

	private processHeading(node: HeadingNode): HeadingNode {
		return {
			id: nodeId(),
			type: "heading",
			level: node.level,
			children: node.children.map((inline) => this.processInline(inline, true)),
		};
	}

	private processBlockquote(node: BlockquoteNode): BlockquoteNode {
		return {
			id: nodeId(),
			type: "blockquote",
			children: node.children.map((block) => this.processBlock(block, false)),
		};
	}

	private processInline(inline: InlineNode, isTitle: boolean): InlineNode {
		switch (inline.type) {
			case "text":
				return this.processTextNode(inline, isTitle);
			case "strong":
				return this.processStrong(inline, isTitle);
			case "emphasis":
				return this.processEmphasis(inline, isTitle);
			case "link":
				return this.processLink(inline, isTitle);
			case "image-inline":
				return { ...inline, id: nodeId() };
			default: {
				const _exhaustive: never = inline;
				return _exhaustive;
			}
		}
	}

	private processTextNode(node: TextNode, isTitle: boolean): TextNode {
		return {
			id: nodeId(),
			type: "text",
			value: this.applyRules(node.value, isTitle),
		};
	}

	private processStrong(node: StrongNode, isTitle: boolean): StrongNode {
		return {
			id: nodeId(),
			type: "strong",
			children: node.children.map((inline) =>
				this.processInline(inline, isTitle),
			),
		};
	}

	private processEmphasis(node: EmphasisNode, isTitle: boolean): EmphasisNode {
		return {
			id: nodeId(),
			type: "emphasis",
			children: node.children.map((inline) =>
				this.processInline(inline, isTitle),
			),
		};
	}

	private processLink(node: LinkNode, isTitle: boolean): LinkNode {
		return {
			id: nodeId(),
			type: "link",
			href: node.href,
			children: node.children.map((inline) =>
				this.processInline(inline, isTitle),
			),
		};
	}

	private applyRules(content: string, isTitle: boolean): string {
		let result = content;
		for (const rule of this.rules) {
			if (!rule.isEnabled) continue;
			if (isTitle && !rule.scopeTitle) continue;
			if (!isTitle && !rule.scopeContent) continue;

			if (rule.isRegex) {
				try {
					result = result.replace(
						new RegExp(rule.pattern, "g"),
						rule.replacement,
					);
				} catch {
					// Invalid regex, skip
				}
			} else {
				result = result.replaceAll(rule.pattern, rule.replacement);
			}
		}
		return result;
	}
}
