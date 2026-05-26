import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BookRepository } from "../src/book-repo";
import { createDB } from "../src/database";
import type { Book } from "../src/types";

function makeBook(override: Partial<Book> = {}): Book {
	return {
		bookUrl: "https://example.com/book/1",
		tocUrl: "",
		name: "Test Book",
		author: "Author",
		type: 0,
		groupIds: [],
		origin: "https://source.com",
		originName: "Source",
		durChapterIndex: 0,
		durChapterPos: 0,
		durChapterTime: 0,
		totalChapterNum: 100,
		canUpdate: true,
		order: 0,
		...override,
	};
}

describe("BookRepository", () => {
	async function setup() {
		const testDb = createDB(`test-book-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookRepository(testDb.books);
		return { testDb, repo };
	}

	it("saves and retrieves a book", async () => {
		const { testDb, repo } = await setup();
		const book = makeBook();
		await repo.save(book);
		const result = await repo.get("https://example.com/book/1");
		expect(result?.name).toBe("Test Book");
		await testDb.delete();
	});

	it("deletes a book", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook());
		await repo.delete("https://example.com/book/1");
		expect(await repo.get("https://example.com/book/1")).toBeUndefined();
		await testDb.delete();
	});

	it("returns all books ordered by order", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook({ bookUrl: "a", order: 2, name: "B" }));
		await repo.save(makeBook({ bookUrl: "b", order: 1, name: "A" }));
		const all = await repo.getAll();
		expect(all.map((b) => b.name)).toEqual(["A", "B"]);
		await testDb.delete();
	});

	it("queries by group using multi-entry index", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook({ bookUrl: "a", groupIds: [1, 3] }));
		await repo.save(makeBook({ bookUrl: "b", groupIds: [2] }));
		await repo.save(makeBook({ bookUrl: "c", groupIds: [1, 2] }));
		const group1 = await repo.getByGroup(1);
		expect(group1).toHaveLength(2);
		await testDb.delete();
	});

	it("searches by name and author", async () => {
		const { testDb, repo } = await setup();
		await repo.save(
			makeBook({ bookUrl: "a", name: "Naruto", author: "Kishimoto" }),
		);
		await repo.save(
			makeBook({ bookUrl: "b", name: "One Piece", author: "Oda" }),
		);
		const results = await repo.search("naruto");
		expect(results).toHaveLength(1);
		const byAuthor = await repo.search("oda");
		expect(byAuthor).toHaveLength(1);
		await testDb.delete();
	});

	it("updates reading progress", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook());
		await repo.updateProgress("https://example.com/book/1", 5, 200);
		const result = await repo.get("https://example.com/book/1");
		expect(result?.durChapterIndex).toBe(5);
		expect(result?.durChapterPos).toBe(200);
		expect(result?.durChapterTime).toBeGreaterThan(0);
		await testDb.delete();
	});

	it("adds and removes group", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook({ groupIds: [1] }));
		await repo.addGroup("https://example.com/book/1", 3);
		let result = await repo.get("https://example.com/book/1");
		expect(result?.groupIds).toEqual([1, 3]);
		await repo.removeGroup("https://example.com/book/1", 1);
		result = await repo.get("https://example.com/book/1");
		expect(result?.groupIds).toEqual([3]);
		await testDb.delete();
	});
});
