import { describe, expect, it } from "vitest";
import type { TextLayoutLine } from "../src/contracts/text-layouter";
import { type InlineNode, textNode } from "../src/document/nodes";
import type { InlineSegment } from "../src/layout/inline-flatten";
import { flattenInlines } from "../src/layout/inline-flatten";
import { mapLineToRuns } from "../src/layout/run-mapper";

// --- flattenInlines tests ---

describe("flattenInlines", () => {
	it("flattens a single TextNode", () => {
		const text = textNode("Hello");
		const segments = flattenInlines([text]);

		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("Hello");
		expect(segments[0]?.style).toBeUndefined();
		expect(segments[0]?.sourceNodeId).toBe(text.id);
	});

	it("flattens multiple TextNodes", () => {
		const t1 = textNode("Hello ");
		const t2 = textNode("World");
		const segments = flattenInlines([t1, t2]);

		expect(segments).toHaveLength(2);
		expect(segments[0]?.text).toBe("Hello ");
		expect(segments[1]?.text).toBe("World");
	});

	it("flattens StrongNode with bold style", () => {
		const text = textNode("bold");
		const strong: InlineNode = {
			id: "strong-1",
			type: "strong",
			children: [text],
		};
		const segments = flattenInlines([strong]);

		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("bold");
		expect(segments[0]?.style).toEqual({ bold: true });
	});

	it("flattens EmphasisNode with italic style", () => {
		const text = textNode("italic");
		const emphasis: InlineNode = {
			id: "em-1",
			type: "emphasis",
			children: [text],
		};
		const segments = flattenInlines([emphasis]);

		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("italic");
		expect(segments[0]?.style).toEqual({ italic: true });
	});

	it("flattens LinkNode with href style", () => {
		const text = textNode("click here");
		const link: InlineNode = {
			id: "link-1",
			type: "link",
			href: "https://example.com",
			children: [text],
		};
		const segments = flattenInlines([link]);

		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("click here");
		expect(segments[0]?.style).toEqual({ href: "https://example.com" });
	});

	it("flattens nested styles (strong > emphasis > text)", () => {
		const text = textNode("bold italic");
		const emphasis: InlineNode = {
			id: "em-1",
			type: "emphasis",
			children: [text],
		};
		const strong: InlineNode = {
			id: "strong-1",
			type: "strong",
			children: [emphasis],
		};
		const segments = flattenInlines([strong]);

		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("bold italic");
		expect(segments[0]?.style).toEqual({ bold: true, italic: true });
	});

	it("flattens ImageInlineNode with alt text", () => {
		const img: InlineNode = {
			id: "img-1",
			type: "image-inline",
			src: "photo.png",
			alt: "A photo",
		};
		const segments = flattenInlines([img]);

		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("A photo");
		expect(segments[0]?.sourceNodeId).toBe("img-1");
	});

	it("flattens ImageInlineNode without alt as empty string", () => {
		const img: InlineNode = {
			id: "img-2",
			type: "image-inline",
			src: "photo.png",
		};
		const segments = flattenInlines([img]);

		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("");
	});

	it("handles mixed inline nodes", () => {
		const t1 = textNode("normal ");
		const t2 = textNode("bold");
		const strong: InlineNode = {
			id: "strong-1",
			type: "strong",
			children: [t2],
		};
		const t3 = textNode(" end");

		const segments = flattenInlines([t1, strong, t3]);

		expect(segments).toHaveLength(3);
		expect(segments[0]?.text).toBe("normal ");
		expect(segments[0]?.style).toBeUndefined();
		expect(segments[1]?.text).toBe("bold");
		expect(segments[1]?.style).toEqual({ bold: true });
		expect(segments[2]?.text).toBe(" end");
		expect(segments[2]?.style).toBeUndefined();
	});

	it("returns empty array for empty input", () => {
		const segments = flattenInlines([]);
		expect(segments).toHaveLength(0);
	});
});

// --- mapLineToRuns tests ---

describe("mapLineToRuns", () => {
	function makeSegments(
		...items: readonly { readonly text: string; readonly id: string }[]
	): InlineSegment[] {
		return items.map((item) => ({
			text: item.text,
			sourceNodeId: item.id,
		}));
	}

	it("maps a single-segment line to a single run", () => {
		const segments = makeSegments({ text: "Hello World", id: "t1" });
		const line: TextLayoutLine = {
			text: "Hello World",
			width: 100,
			start: { segmentIndex: 0, graphemeIndex: 0 },
			end: { segmentIndex: 0, graphemeIndex: 11 },
		};

		const runs = mapLineToRuns(line, segments);

		expect(runs).toHaveLength(1);
		expect(runs[0]?.text).toBe("Hello World");
		expect(runs[0]?.x).toBe(0);
		expect(runs[0]?.width).toBe(100);
		expect(runs[0]?.sourceNodeId).toBe("t1");
	});

	it("maps a multi-segment line to multiple runs", () => {
		const segments = makeSegments(
			{ text: "Hello ", id: "t1" },
			{ text: "World", id: "t2" },
		);
		const line: TextLayoutLine = {
			text: "Hello World",
			width: 110,
			start: { segmentIndex: 0, graphemeIndex: 0 },
			end: { segmentIndex: 1, graphemeIndex: 5 },
		};

		const runs = mapLineToRuns(line, segments);

		expect(runs).toHaveLength(2);
		expect(runs[0]?.text).toBe("Hello ");
		expect(runs[0]?.sourceNodeId).toBe("t1");
		expect(runs[0]?.x).toBe(0);
		expect(runs[0]?.width).toBeGreaterThan(0);

		expect(runs[1]?.text).toBe("World");
		expect(runs[1]?.sourceNodeId).toBe("t2");
		expect(runs[1]?.x).toBeGreaterThan(0);
	});

	it("handles partial segment coverage at start", () => {
		const segments = makeSegments({ text: "Hello World", id: "t1" });
		const line: TextLayoutLine = {
			text: "World",
			width: 50,
			start: { segmentIndex: 0, graphemeIndex: 6 },
			end: { segmentIndex: 0, graphemeIndex: 11 },
		};

		const runs = mapLineToRuns(line, segments);

		expect(runs).toHaveLength(1);
		expect(runs[0]?.text).toBe("World");
		expect(runs[0]?.width).toBe(50);
	});

	it("returns empty runs for empty line", () => {
		const segments = makeSegments({ text: "Hello", id: "t1" });
		const line: TextLayoutLine = {
			text: "",
			width: 0,
			start: { segmentIndex: 0, graphemeIndex: 0 },
			end: { segmentIndex: 0, graphemeIndex: 0 },
		};

		const runs = mapLineToRuns(line, segments);

		expect(runs).toHaveLength(0);
	});

	it("preserves style from segments", () => {
		const segments: InlineSegment[] = [
			{
				text: "bold",
				style: { bold: true },
				sourceNodeId: "t1",
			},
		];
		const line: TextLayoutLine = {
			text: "bold",
			width: 40,
			start: { segmentIndex: 0, graphemeIndex: 0 },
			end: { segmentIndex: 0, graphemeIndex: 4 },
		};

		const runs = mapLineToRuns(line, segments);

		expect(runs).toHaveLength(1);
		expect(runs[0]?.style).toEqual({ bold: true });
	});
});
