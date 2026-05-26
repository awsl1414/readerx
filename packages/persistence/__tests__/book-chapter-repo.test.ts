import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BookChapterRepository } from "../src/book-chapter-repo";
import { createDB } from "../src/database";
import type { BookChapter } from "../src/types";

function makeChapter(override: Partial<BookChapter> = {}): BookChapter {
	return {
		url: "https://example.com/ch/1",
		bookUrl: "https://example.com/book",
		title: "Chapter 1",
		index: 0,
		isVolume: false,
		isVip: false,
		isPay: false,
		...override,
	};
}

describe("BookChapterRepository", () => {
	async function setup() {
		const testDb = createDB(`test-ch-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookChapterRepository(testDb.chapters);
		return { testDb, repo };
	}

	it("saves and retrieves chapters by book", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch1", index: 0, title: "Ch 0" }),
			makeChapter({ url: "ch2", index: 1, title: "Ch 1" }),
			makeChapter({
				url: "ch3",
				index: 2,
				title: "Ch 2",
				bookUrl: "other-book",
			}),
		]);
		const chapters = await repo.getByBook("https://example.com/book");
		expect(chapters).toHaveLength(2);
		expect(chapters[0]?.index).toBe(0);
		expect(chapters[1]?.index).toBe(1);
		await testDb.delete();
	});

	it("gets chapter by composite key", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([makeChapter()]);
		const ch = await repo.get(
			"https://example.com/book",
			"https://example.com/ch/1",
		);
		expect(ch?.title).toBe("Chapter 1");
		await testDb.delete();
	});

	it("gets chapter by index", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([makeChapter()]);
		const ch = await repo.getByIndex("https://example.com/book", 0);
		expect(ch?.title).toBe("Chapter 1");
		await testDb.delete();
	});

	it("deletes all chapters for a book", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch1", index: 0 }),
			makeChapter({ url: "ch2", index: 1 }),
		]);
		await repo.deleteByBook("https://example.com/book");
		const chapters = await repo.getByBook("https://example.com/book");
		expect(chapters).toHaveLength(0);
		await testDb.delete();
	});

	it("queries range of chapters", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch0", index: 0 }),
			makeChapter({ url: "ch1", index: 1 }),
			makeChapter({ url: "ch2", index: 2 }),
			makeChapter({ url: "ch3", index: 3 }),
		]);
		const range = await repo.getByBookRange("https://example.com/book", 1, 2);
		expect(range).toHaveLength(2);
		expect(range[0]?.index).toBe(1);
		expect(range[1]?.index).toBe(2);
		await testDb.delete();
	});

	it("counts chapters for a book", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch1", index: 0 }),
			makeChapter({ url: "ch2", index: 1 }),
		]);
		const count = await repo.count("https://example.com/book");
		expect(count).toBe(2);
		await testDb.delete();
	});
});
