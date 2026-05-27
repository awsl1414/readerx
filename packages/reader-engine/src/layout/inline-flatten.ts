import type { ImageInlineNode, InlineNode, LinkNode } from "../document/nodes";
import type { InlineStyle } from "./types";

type InlineSegment = {
	readonly text: string;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

function flattenInlines(
	inlines: readonly InlineNode[],
	parentStyle?: InlineStyle,
): readonly InlineSegment[] {
	const result: InlineSegment[] = [];

	for (const node of inlines) {
		switch (node.type) {
			case "text": {
				result.push({
					text: node.value,
					sourceNodeId: node.id,
					...(parentStyle !== undefined ? { style: parentStyle } : {}),
				});
				break;
			}
			case "strong": {
				const childStyle: InlineStyle = {
					...parentStyle,
					bold: true,
				};
				const childSegments = flattenInlines(node.children, childStyle);
				for (const seg of childSegments) {
					result.push(seg);
				}
				break;
			}
			case "emphasis": {
				const childStyle: InlineStyle = {
					...parentStyle,
					italic: true,
				};
				const childSegments = flattenInlines(node.children, childStyle);
				for (const seg of childSegments) {
					result.push(seg);
				}
				break;
			}
			case "link": {
				const linkNode = node as LinkNode;
				const childStyle: InlineStyle = {
					...parentStyle,
					href: linkNode.href,
				};
				const childSegments = flattenInlines(linkNode.children, childStyle);
				for (const seg of childSegments) {
					result.push(seg);
				}
				break;
			}
			case "image-inline": {
				const imgNode = node as ImageInlineNode;
				result.push({
					text: imgNode.alt ?? "",
					sourceNodeId: imgNode.id,
					...(parentStyle !== undefined ? { style: parentStyle } : {}),
				});
				break;
			}
			default: {
				const _exhaustive: never = node;
				break;
			}
		}
	}

	return result;
}

export type { InlineSegment };
export { flattenInlines };
