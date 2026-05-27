import type { LayoutLine, LayoutPage } from "./types";

type PaginationState = {
	readonly currentPageLines: readonly LayoutLine[];
	readonly currentHeight: number;
	readonly pages: readonly LayoutPage[];
	readonly pageIndex: number;
};

function createPaginationState(): PaginationState {
	return {
		currentPageLines: [],
		currentHeight: 0,
		pages: [],
		pageIndex: 0,
	};
}

function addLine(
	state: PaginationState,
	line: LayoutLine,
	maxContentHeight: number,
): PaginationState {
	const newHeight = state.currentHeight + line.height;

	// If adding this line exceeds maxContentHeight AND there are already lines on current page
	if (newHeight > maxContentHeight && state.currentPageLines.length > 0) {
		// Flush current page, start new page with this line
		const flushedState = flushPage(state);
		return {
			currentPageLines: [line],
			currentHeight: line.height,
			pages: flushedState.pages,
			pageIndex: flushedState.pageIndex,
		};
	}

	return {
		...state,
		currentPageLines: [...state.currentPageLines, line],
		currentHeight: newHeight,
	};
}

function flushPage(state: PaginationState): PaginationState {
	if (state.currentPageLines.length === 0) {
		return state;
	}

	const newPage: LayoutPage = {
		index: state.pageIndex,
		lines: state.currentPageLines,
		dimensions: {
			width: 0,
			height: 0,
			contentHeight: 0,
			paddingTop: 0,
			paddingBottom: 0,
			paddingLeft: 0,
			paddingRight: 0,
		},
	};

	return {
		currentPageLines: [],
		currentHeight: 0,
		pages: [...state.pages, newPage],
		pageIndex: state.pageIndex + 1,
	};
}

export type { PaginationState };
export { addLine, createPaginationState, flushPage };
