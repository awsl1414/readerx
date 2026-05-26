import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BookmarkRepository } from "../src/bookmark-repo";
import { createDB } from "../src/database";
import type { Bookmark } from "../src/types";

function makeBookmark(override: Partial<Bookmark> = {}): Bookmark {
	return {
		time: Date.now(),
		bookUrl: "https://example.com/book/1",
		bookName: "Test Book",
		bookAuthor: "Author",
		chapterIndex: 0,
		chapterPos: 100,
		chapterName: "Chapter 1",
		bookText: "some text",
		content: "bookmark content",
		...override,
	};
}

describe("BookmarkRepository", () => {
	async function setup() {
		const testDb = createDB(`test-bm-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookmarkRepository(testDb.bookmarks);
		return { testDb, repo };
	}

	it("saves and retrieves a bookmark", async () => {
		const { testDb, repo } = await setup();
		const bm = makeBookmark({ time: 1000 });
		await repo.save(bm);
		const result = await repo.get(1000);
		expect(result?.content).toBe("bookmark content");
		await testDb.delete();
	});

	it("queries bookmarks by book", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBookmark({ time: 1, bookName: "A", bookAuthor: "X" }));
		await repo.save(makeBookmark({ time: 2, bookName: "A", bookAuthor: "X" }));
		await repo.save(makeBookmark({ time: 3, bookName: "B", bookAuthor: "Y" }));
		const results = await repo.getByBook("A", "X");
		expect(results).toHaveLength(2);
		await testDb.delete();
	});

	it("deletes a bookmark", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBookmark({ time: 1000 }));
		await repo.delete(1000);
		expect(await repo.get(1000)).toBeUndefined();
		await testDb.delete();
	});

	it("returns all bookmarks ordered by time desc", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBookmark({ time: 100 }));
		await repo.save(makeBookmark({ time: 300 }));
		await repo.save(makeBookmark({ time: 200 }));
		const all = await repo.getAll();
		expect(all.map((b) => b.time)).toEqual([300, 200, 100]);
		await testDb.delete();
	});
});
