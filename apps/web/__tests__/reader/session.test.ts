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
	ContentProcessor: { process: vi.fn((doc: unknown) => doc) },
}));

const mockDeps = {
	bridge: {
		executeRule: vi.fn(async () => ({
			ok: true,
			value: "&lt;p&gt;test&lt;/p&gt;",
		})),
	},
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
	viewport: { width: 1024, height: 768 },
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
		const state = listener.mock.calls[0][0] as ReaderState;
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
});
