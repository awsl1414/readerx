// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock reader-engine with a document fixture (same pattern as session.test.ts)
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
	ContentProcessor: vi.fn(function(this: { process: unknown }) { this.process = vi.fn((doc: unknown) => doc); }),
	PretextLayouter: vi.fn(function() { return {}; }),
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
	httpFetcher: {
		fetch: vi.fn(async () => ({
			ok: true,
			status: 200,
			body: new TextEncoder().encode("<p>test</p>"),
			headers: { "content-type": "text/html" },
		})),
	},
	sourceRepo: {
		get: vi.fn(async () => ({
			bookSourceUrl: "src1",
			ruleContent: "class.content",
		})),
	},
};

import { useReaderSession } from "@/features/reader/hooks/use-reader-session";

describe("useReaderSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("opens session and provides state", async () => {
		const { result } = renderHook(() => useReaderSession(mockDeps as never));

		expect(result.current.session).toBeNull();
		expect(result.current.state).toBeNull();

		await act(async () => {
			await result.current.open("book1");
		});

		expect(result.current.session).not.toBeNull();
		expect(result.current.state).not.toBeNull();
		expect(result.current.state?.chapters).toHaveLength(3);
		expect(result.current.state?.currentChapter).toBe(0);
		expect(result.current.state?.currentPage).toBe(0);
	});

	it("close disposes session", async () => {
		const { result } = renderHook(() => useReaderSession(mockDeps as never));

		await act(async () => {
			await result.current.open("book1");
		});

		expect(result.current.session).not.toBeNull();

		act(() => {
			result.current.close();
		});

		expect(result.current.session).toBeNull();
		expect(result.current.state).toBeNull();
		expect(mockDeps.bookRepo.updateProgress).toHaveBeenCalled();
	});

	it("setAtmosphere updates state", async () => {
		const { result } = renderHook(() => useReaderSession(mockDeps as never));

		await act(async () => {
			await result.current.open("book1");
		});

		expect(result.current.state?.atmosphere.preset).toBe("novel");

		act(() => {
			result.current.setAtmosphere("focus");
		});

		// The atmosphere update triggers onStateChange which sets state
		expect(result.current.state?.atmosphere.preset).toBe("focus");
	});

	it("cleanup on unmount calls dispose", async () => {
		const { result, unmount } = renderHook(() =>
			useReaderSession(mockDeps as never),
		);

		await act(async () => {
			await result.current.open("book1");
		});

		// updateProgress is not called yet (only on dispose)
		expect(mockDeps.bookRepo.updateProgress).not.toHaveBeenCalled();

		// Unmounting triggers the useEffect cleanup which calls dispose
		unmount();

		expect(mockDeps.bookRepo.updateProgress).toHaveBeenCalledWith(
			"book1",
			0,
			0,
		);
	});
});
