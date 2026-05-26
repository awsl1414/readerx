import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";

describe("ReaderXDB", () => {
	it("creates all tables", () => {
		const testDb = createDB("test-tables");
		expect(testDb.bookSources).toBeDefined();
		expect(testDb.books).toBeDefined();
		expect(testDb.chapters).toBeDefined();
		expect(testDb.bookGroups).toBeDefined();
		expect(testDb.bookmarks).toBeDefined();
		expect(testDb.searchKeywords).toBeDefined();
		expect(testDb.caches).toBeDefined();
		expect(testDb.replaceRules).toBeDefined();
		expect(testDb.cookies).toBeDefined();
		return testDb.delete();
	});

	it("opens without error", async () => {
		const testDb = createDB("test-open");
		await testDb.open();
		expect(testDb.isOpen()).toBe(true);
		await testDb.delete();
	});
});
