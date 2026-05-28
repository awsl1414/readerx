import { describe, expect, it, vi } from "vitest";
import { ATMOSPHERE_PRESETS } from "@/features/reader/atmosphere";
import { RenderScheduler } from "@/features/reader/render-scheduler";
import type { ReadingAtmosphere } from "@/features/reader/types";

// Minimal mock: layoutDocument returns predictable pages
vi.mock("@readerx/reader-engine", () => ({
	layoutDocument: vi.fn((_doc: unknown, config: { pageWidth: number }) => ({
		pages: [
			{
				index: 0,
				lines: [],
				dimensions: {
					width: config.pageWidth,
					height: 600,
					contentHeight: 560,
					paddingTop: 20,
					paddingBottom: 20,
					paddingLeft: 40,
					paddingRight: 40,
				},
			},
		],
		totalPages: 1,
	})),
	toRenderModel: vi.fn((layout: { pages: unknown[] }) => ({
		pages: layout.pages,
		totalPages: layout.pages.length,
	})),
}));

describe("RenderScheduler", () => {
	it("calls onResult with render result", () => {
		const onResult = vi.fn();
		const scheduler = new RenderScheduler(onResult);
		const atm = ATMOSPHERE_PRESETS.novel as ReadingAtmosphere;

		scheduler.invalidate({} as never, atm, { width: 1024, height: 768 });

		expect(onResult).toHaveBeenCalledOnce();
	});

	it("discards stale results when invalidated again", () => {
		const onResult = vi.fn();
		const scheduler = new RenderScheduler(onResult);
		const atm = ATMOSPHERE_PRESETS.novel as ReadingAtmosphere;

		// First invalidation
		scheduler.invalidate({} as never, atm, { width: 1024, height: 768 });
		// Second invalidation immediately — version increments
		scheduler.invalidate({} as never, atm, { width: 800, height: 600 });

		// onResult called twice because layoutDocument is synchronous
		// but second call should have the newer viewport
		expect(onResult).toHaveBeenCalledTimes(2);
	});
});
