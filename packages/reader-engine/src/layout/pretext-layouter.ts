import {
	layoutNextLine as pretextLayoutNextLine,
	prepareWithSegments,
} from "@chenglou/pretext";
import type {
	LayoutCursor,
	TextLayouter,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayoutOptions,
} from "../contracts/text-layouter";

type PretextPrepareOptions = {
	readonly letterSpacing?: number;
	readonly wordBreak?: "normal" | "keep-all";
};

class PretextLayouter implements TextLayouter {
	prepare(text: string, options: TextLayoutOptions): TextLayoutHandle {
		const pretextOpts: PretextPrepareOptions = {};
		if (options.letterSpacing !== undefined) {
			(pretextOpts as { letterSpacing: number }).letterSpacing =
				options.letterSpacing;
		}
		if (options.wordBreak !== undefined) {
			(pretextOpts as { wordBreak: "normal" | "keep-all" }).wordBreak =
				options.wordBreak;
		}
		return prepareWithSegments(
			text,
			options.font,
			pretextOpts,
		) as unknown as TextLayoutHandle;
	}

	layoutNextLine(
		handle: TextLayoutHandle,
		start: LayoutCursor | null,
		maxWidth: number,
	): TextLayoutLine | null {
		const prepared = handle as unknown as Parameters<
			typeof pretextLayoutNextLine
		>[0];

		const startCursor: LayoutCursor = start ?? {
			segmentIndex: 0,
			graphemeIndex: 0,
		};

		const result = pretextLayoutNextLine(prepared, startCursor, maxWidth);

		if (result === null) return null;

		return {
			text: result.text,
			width: result.width,
			start: {
				segmentIndex: result.start.segmentIndex,
				graphemeIndex: result.start.graphemeIndex,
			},
			end: {
				segmentIndex: result.end.segmentIndex,
				graphemeIndex: result.end.graphemeIndex,
			},
		};
	}
}

export { PretextLayouter };
