import type { TextLayoutLine } from "../contracts/text-layouter";
import type { InlineSegment } from "./inline-flatten";
import type { InlineStyle } from "./types";

type RunMapperResult = {
	readonly text: string;
	readonly x: number;
	readonly width: number;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

function mapLineToRuns(
	line: TextLayoutLine,
	segments: readonly InlineSegment[],
): readonly RunMapperResult[] {
	const runs: RunMapperResult[] = [];
	const startSeg = line.start.segmentIndex;
	const endSeg = line.end.segmentIndex;
	const startGrapheme = line.start.graphemeIndex;
	const endGrapheme = line.end.graphemeIndex;

	type SegmentSlice = {
		readonly text: string;
		readonly graphemeCount: number;
		readonly segmentIndex: number;
	};

	const slices: SegmentSlice[] = [];

	for (let i = startSeg; i <= endSeg; i++) {
		const segment = segments[i];
		if (segment === undefined) continue;

		let sliceStart = 0;
		let sliceEnd = segment.text.length;

		if (i === startSeg) {
			sliceStart = startGrapheme;
		}
		if (i === endSeg) {
			sliceEnd = endGrapheme;
		}

		// NOTE: graphemeIndex from pretext corresponds to code unit indices
		// for ASCII and single-codepoint CJK characters. Multi-codepoint
		// graphemes (emoji ZWJ sequences, flags) may be mis-split here.
		// This is acceptable for v1 (novel content is predominantly CJK/ASCII).
		const sliceText = segment.text.slice(sliceStart, sliceEnd);
		if (sliceText.length === 0) continue;

		slices.push({
			text: sliceText,
			graphemeCount: sliceText.length,
			segmentIndex: i,
		});
	}

	if (slices.length === 0) return runs;

	let totalGraphemes = 0;
	for (const s of slices) {
		totalGraphemes += s.graphemeCount;
	}

	let cumulativeX = 0;
	for (const slice of slices) {
		const segment = segments[slice.segmentIndex];
		if (segment === undefined) continue;

		const proportion =
			totalGraphemes > 0 ? slice.graphemeCount / totalGraphemes : 0;
		const runWidth = line.width * proportion;

		runs.push({
			text: slice.text,
			x: cumulativeX,
			width: runWidth,
			sourceNodeId: segment.sourceNodeId,
			...(segment.style !== undefined ? { style: segment.style } : {}),
		});

		cumulativeX += runWidth;
	}

	return runs;
}

export type { RunMapperResult };
export { mapLineToRuns };
