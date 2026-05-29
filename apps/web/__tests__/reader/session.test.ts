import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReaderSession } from "@/features/reader/session";
import type { ReaderState } from "@/features/reader/types";

// Mock reader-engine with a document fixture
const mockDocument = { type: "document" } as never;
vi.mock("@readerx/reader-engine", () => ({
	layoutDocument: vi.fn(() => ({
		pages: [
			{
				index: 0,
				lines: [],
				dimensions: {
					width: 600,
					height: 600,
					contentHeight: 560,
					paddingTop: 20,
					paddingBottom: 20,
					paddingLeft: 40,
					paddingRight: 40,
				},
			},
			{
				index: 1,
				lines: [],
				dimensions: {
					width: 600,
					height: 600,
					contentHeight: 560,
					paddingTop: 20,
					paddingBottom: 20,
					paddingLeft: 40,
					paddingRight: 40,
				},
			},
		],
		totalPages: 2,
	})),
	toRenderModel: vi.fn((layout: { pages: unknown[] }) => ({
		pages: layout.pages,
		totalPages: layout.pages.length,
	})),
	fetchAndParse: vi.fn(async () => mockDocument),
	ContentProcessor: vi.fn(function (this: { process: unknown }) {
		this.process = vi.fn((doc: unknown) => doc);
	}),
	// biome-ignore lint/complexity/useArrowFunction: mock is called with `new`, requires function syntax
	PretextLayouter: vi.fn(function () {
		return {};
	}),
}));

const mockHttpFetcher = {
	fetch: vi.fn(async () => ({
		ok: true,
		status: 200,
		body: new TextEncoder().encode("<p>test</p>"),
		headers: { "content-type": "text/html" },
	})),
};

const mockDeps = {
	bookRepo: {
		get: vi.fn(async () => ({
			bookUrl: "book1",
			name: "Test Book",
			durChapterIndex: 0,
			durChapterPos: 0,
			totalChapterNum: 3,
			origin: "src1",
		})),
		updateProgress: vi.fn(async () => {}),
	},
	chapterRepo: {
		getByBook: vi.fn(async () => [
			{
				bookUrl: "book1",
				url: "ch1",
				index: 0,
				title: "Chapter 1",
				isVolume: false,
				resourceUrl: "http://ex.com/ch1",
			},
			{
				bookUrl: "book1",
				url: "ch2",
				index: 1,
				title: "Chapter 2",
				isVolume: false,
				resourceUrl: "http://ex.com/ch2",
			},
			{
				bookUrl: "book1",
				url: "ch3",
				index: 2,
				title: "Chapter 3",
				isVolume: false,
				resourceUrl: "http://ex.com/ch3",
			},
		]),
		getByIndex: vi.fn(async () => ({
			bookUrl: "book1",
			url: "ch1",
			index: 0,
			title: "Chapter 1",
			resourceUrl: "http://ex.com/ch1",
		})),
	},
	isMobile: false,
	httpFetcher: mockHttpFetcher,
	sourceRepo: {
		get: vi.fn(async () => ({
			bookSourceUrl: "src1",
			ruleContent: "class.content",
		})),
	},
};

describe("ReaderSession", () => {
	let session: ReaderSession;

	beforeEach(async () => {
		vi.clearAllMocks();
		session = await ReaderSession.open("book1", mockDeps as never);
	});

	it("opens a session and returns page count", () => {
		expect(session.pageCount).toBe(2);
		expect(session.chapters).toHaveLength(3);
		expect(session.currentChapter).toBe(0);
	});

	it("navigates pages with nextPage/prevPage", () => {
		expect(session.currentPage).toBe(0);
		const next = session.nextPage();
		expect(next).toBe(1);
		expect(session.currentPage).toBe(1);
		const prev = session.prevPage();
		expect(prev).toBe(0);
	});

	it("clamps page navigation at boundaries", () => {
		session.nextPage(); // page 1
		session.nextPage(); // would go to 2, but max is 1 (0-indexed, 2 pages)
		expect(session.currentPage).toBe(1);
		session.prevPage();
		session.prevPage(); // would go below 0
		expect(session.currentPage).toBe(0);
	});

	it("notifies listeners on state change", () => {
		const listener = vi.fn();
		session.onStateChange(listener);
		session.nextPage();
		expect(listener).toHaveBeenCalledOnce();
		const call = listener.mock.calls[0];
		expect(call).toBeDefined();
		const state = call?.[0] as ReaderState;
		expect(state.currentPage).toBe(1);
	});

	it("unsubscribes listener", () => {
		const listener = vi.fn();
		const unsub = session.onStateChange(listener);
		unsub();
		session.nextPage();
		expect(listener).not.toHaveBeenCalled();
	});

	it("changes atmosphere and re-layouts", () => {
		session.setAtmosphere("focus");
		expect(session.atmosphere.preset).toBe("focus");
	});

	it("saves progress on dispose", () => {
		session.nextPage();
		session.dispose();
		expect(mockDeps.bookRepo.updateProgress).toHaveBeenCalledWith(
			"book1",
			0, // chapterIndex
			1, // page position
		);
	});

	it("fetches source using book origin, not empty string", () => {
		expect(mockDeps.sourceRepo.get).toHaveBeenCalledWith("src1");
	});

	it("calls fetchAndParse with proper pipeline deps and config", async () => {
		const { fetchAndParse } = await import("@readerx/reader-engine");
		// fetchAndParse is called once for chapter 0 during open,
		// plus adjacent prefetches for chapters 1 and -1 (out of range)
		const calls = vi.mocked(fetchAndParse).mock.calls;
		expect(calls.length).toBeGreaterThanOrEqual(1);
		const firstCall = calls[0];
		expect(firstCall).toBeDefined();
		const [deps, config] = firstCall ?? [];
		// PipelineDeps should have httpFetcher wired from session deps
		expect(deps).toHaveProperty("httpFetcher", mockHttpFetcher);
		// PipelineConfig should have contentRule and url
		expect(config).toHaveProperty("contentRule");
		expect(config).toHaveProperty("url", "http://ex.com/ch1");
	});

	it("jumpToChapter navigates to correct chapter", async () => {
		await session.jumpToChapter(1);
		expect(session.currentChapter).toBe(1);
		expect(session.currentPage).toBe(0);
	});

	it("jumpToChapter with invalid index does nothing", async () => {
		const originalChapter = session.currentChapter;
		await session.jumpToChapter(-1);
		expect(session.currentChapter).toBe(originalChapter);
		await session.jumpToChapter(99);
		expect(session.currentChapter).toBe(originalChapter);
	});

	it("LRU eviction removes farthest chapter", async () => {
		// Re-open with a book that has 7 chapters so we can populate 6 cache entries.
		vi.mocked(mockDeps.bookRepo.get).mockResolvedValueOnce({
			bookUrl: "book-lru",
			name: "LRU Book",
			durChapterIndex: 0,
			durChapterPos: 0,
			totalChapterNum: 7,
			origin: "src1",
		});
		const chapters = Array.from({ length: 7 }, (_, i) => ({
			bookUrl: "book-lru",
			url: `ch${i}`,
			index: i,
			title: `Chapter ${i}`,
			isVolume: false,
			resourceUrl: `http://ex.com/ch${i}`,
		}));
		vi.mocked(mockDeps.chapterRepo.getByBook).mockResolvedValueOnce(chapters);
		const lruSession = await ReaderSession.open("book-lru", mockDeps as never);

		// Navigate to chapters 1-5 to populate 6 cache entries (0-5).
		for (let i = 1; i <= 5; i++) {
			await lruSession.jumpToChapter(i);
		}

		// After loading chapter 5, cache has been evicted to 5 entries.
		// The farthest from chapter 5 is chapter 0, so it should be evicted.
		// Verify by checking that navigating back to chapter 0 triggers a new load.
		const getByIndexCallsBefore =
			mockDeps.chapterRepo.getByIndex.mock.calls.length;
		await lruSession.jumpToChapter(0);
		// chapter 0 was evicted, so getByIndex should be called again for it
		expect(mockDeps.chapterRepo.getByIndex.mock.calls.length).toBeGreaterThan(
			getByIndexCallsBefore,
		);

		lruSession.dispose();
	});

	it("dispose after chapter navigation saves correct position", async () => {
		await session.jumpToChapter(2);
		// Navigate to page 3 (pageCount is 2, so max page index is 1)
		session.nextPage(); // page 1
		session.nextPage(); // stays at 1 (max page)
		session.nextPage(); // stays at 1 (max page)
		session.dispose();
		expect(mockDeps.bookRepo.updateProgress).toHaveBeenCalledWith(
			"book1",
			2, // chapter index
			1, // page position (capped at pageCount - 1 = 1)
		);
	});

	it("prefetch calls loadChapter for adjacent chapters", async () => {
		// After open, chapter 0 is loaded. Adjacent chapters are -1 (invalid) and 1.
		// So chapterRepo.getByIndex should have been called for chapter 1.
		const calls = mockDeps.chapterRepo.getByIndex.mock.calls;
		const adjacentCall = calls.find((call: unknown[]) => {
			const idx = call[1];
			return idx !== undefined && idx === 1;
		});
		expect(adjacentCall).toBeDefined();
	});

	it("throws when source has no content rule", async () => {
		vi.mocked(mockDeps.sourceRepo.get).mockResolvedValueOnce(
			undefined as never,
		);
		await expect(
			ReaderSession.open("book-norule", mockDeps as never),
		).rejects.toThrow("No content rule found for source");
	});

	it("throws when source is missing ruleContent", async () => {
		vi.mocked(mockDeps.sourceRepo.get).mockResolvedValueOnce({
			bookSourceUrl: "src1",
		} as never);
		await expect(
			ReaderSession.open("book-norule", mockDeps as never),
		).rejects.toThrow("No content rule found for source");
	});

	it("prefetch does not clobber active render result", async () => {
		// Open loads chapter 0. The prefetch for chapter 1 is in-flight.
		// Ensure _renderResult still reflects chapter 0 after prefetch completes.
		const pageCountBefore = session.pageCount;
		// Wait for any pending prefetches to settle
		await vi.waitFor(() => {
			expect(mockDeps.chapterRepo.getByIndex).toHaveBeenCalled();
		});
		expect(session.pageCount).toBe(pageCountBefore);
		expect(session.currentChapter).toBe(0);
	});

	it("dispose catches progress save failure", async () => {
		const error = new Error("write failed");
		vi.mocked(mockDeps.bookRepo.updateProgress).mockRejectedValueOnce(error);
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		session.dispose();

		// Wait for the rejected promise to be caught
		await vi.waitFor(() => {
			expect(warnSpy).toHaveBeenCalledWith(
				"Failed to save reading progress:",
				error,
			);
		});
		warnSpy.mockRestore();
	});
});
