import { describe, expect, it } from "vitest";
import {
	addLine,
	createPaginationState,
	flushPage,
} from "../src/layout/pagination";
import type { LayoutLine } from "../src/layout/types";

function makeLine(height: number): LayoutLine {
	return {
		runs: [],
		width: 100,
		height,
		x: 0,
		y: 0,
	};
}

describe("createPaginationState", () => {
	it("returns empty state", () => {
		const state = createPaginationState();

		expect(state.currentPageLines).toHaveLength(0);
		expect(state.currentHeight).toBe(0);
		expect(state.pages).toHaveLength(0);
		expect(state.pageIndex).toBe(0);
	});
});

describe("addLine", () => {
	it("adds a line to empty page", () => {
		const state = createPaginationState();
		const line = makeLine(20);

		const next = addLine(state, line, 100);

		expect(next.currentPageLines).toHaveLength(1);
		expect(next.currentHeight).toBe(20);
		expect(next.pages).toHaveLength(0);
	});

	it("accumulates lines within maxContentHeight", () => {
		let state = createPaginationState();

		state = addLine(state, makeLine(30), 100);
		state = addLine(state, makeLine(30), 100);

		expect(state.currentPageLines).toHaveLength(2);
		expect(state.currentHeight).toBe(60);
		expect(state.pages).toHaveLength(0);
	});

	it("flushes page when line exceeds maxContentHeight", () => {
		let state = createPaginationState();

		state = addLine(state, makeLine(40), 100);
		state = addLine(state, makeLine(40), 100);
		// currentHeight = 80, still fits

		state = addLine(state, makeLine(40), 100);
		// 80 + 40 = 120 > 100, so flush first page, start new page with this line

		expect(state.pages).toHaveLength(1);
		expect(state.pages[0]?.lines).toHaveLength(2);
		expect(state.currentPageLines).toHaveLength(1);
		expect(state.currentHeight).toBe(40);
		expect(state.pageIndex).toBe(1);
	});

	it("does not flush empty page for first oversized line", () => {
		const state = createPaginationState();
		const line = makeLine(200);

		const next = addLine(state, line, 100);

		// Even though 200 > 100, page has no lines yet, so add anyway
		expect(next.currentPageLines).toHaveLength(1);
		expect(next.currentHeight).toBe(200);
		expect(next.pages).toHaveLength(0);
	});

	it("handles multiple page breaks", () => {
		let state = createPaginationState();
		const lineHeight = 30;
		const maxHeight = 60;

		// Page 1: lines 0,1
		state = addLine(state, makeLine(lineHeight), maxHeight);
		state = addLine(state, makeLine(lineHeight), maxHeight);
		// Page 2: lines 2,3
		state = addLine(state, makeLine(lineHeight), maxHeight);
		state = addLine(state, makeLine(lineHeight), maxHeight);
		// Page 3: line 4
		state = addLine(state, makeLine(lineHeight), maxHeight);

		state = flushPage(state);

		expect(state.pages).toHaveLength(3);
		expect(state.pages[0]?.lines).toHaveLength(2);
		expect(state.pages[1]?.lines).toHaveLength(2);
		expect(state.pages[2]?.lines).toHaveLength(1);
	});
});

describe("flushPage", () => {
	it("creates a page from current lines", () => {
		let state = createPaginationState();
		state = addLine(state, makeLine(20), 100);
		state = addLine(state, makeLine(20), 100);

		const flushed = flushPage(state);

		expect(flushed.pages).toHaveLength(1);
		expect(flushed.pages[0]?.index).toBe(0);
		expect(flushed.pages[0]?.lines).toHaveLength(2);
		expect(flushed.currentPageLines).toHaveLength(0);
		expect(flushed.currentHeight).toBe(0);
		expect(flushed.pageIndex).toBe(1);
	});

	it("returns same state when no lines to flush", () => {
		const state = createPaginationState();
		const flushed = flushPage(state);

		expect(flushed.pages).toHaveLength(0);
		expect(flushed).toBe(state);
	});
});
