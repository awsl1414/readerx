import type { LayoutCursor, TextLayoutLine } from "../contracts/text-layouter";
import type { InlineStyle } from "./types";
import type { InlineSegment } from "./inline-flatten";

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

	// Collect covered segments with their substring info
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

		const sliceText = segment.text.slice(sliceStart, sliceEnd);
		if (sliceText.length === 0) continue;

		slices.push({
			text: sliceText,
			graphemeCount: sliceText.length,
			segmentIndex: i,
		});
	}

	if (slices.length === 0) return runs;

	// Calculate total grapheme count across all slices for proportional width distribution
	let totalGraphemes = 0;
	for (const s of slices) {
		totalGraphemes += s.graphemeCount;
	}

	let cumulativeX = 0;
	for (const slice of slices) {
		const segment =
			slices.length > 0 ? segments[slice.segmentIndex] : undefined;
		if (segment === undefined) continue;

		// Proportional width based on grapheme count
		const proportion =
			totalGraphemes > 0 ? slice.graphemeCount / totalGraphemes : 0;
		const runWidth = line.width * proportion;

		const run: RunMapperResult = {
			text: slice.text,
			x: cumulativeX,
			width: runWidth,
			sourceNodeId: segment.sourceNodeId,
		};
		if (segment.style !== undefined) {
			(run as { style: InlineStyle }).style = segment.style;
		}
		runs.push(run);

		cumulativeX += runWidth;
	}

	return runs;
}

export type { RunMapperResult };
export { mapLineToRuns };
