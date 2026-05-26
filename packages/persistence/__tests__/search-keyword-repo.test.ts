import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { SearchKeywordRepository } from "../src/search-keyword-repo";

describe("SearchKeywordRepository", () => {
	async function setup() {
		const testDb = createDB(`test-sk-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new SearchKeywordRepository(testDb.searchKeywords);
		return { testDb, repo };
	}

	it("creates keyword on first use", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("hello");
		const byUsage = await repo.getByUsage();
		expect(byUsage).toHaveLength(1);
		expect(byUsage[0]?.usage).toBe(1);
		await testDb.delete();
	});

	it("increments usage on repeat", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("hello");
		await repo.recordUse("hello");
		await repo.recordUse("hello");
		const byUsage = await repo.getByUsage();
		expect(byUsage[0]?.usage).toBe(3);
		await testDb.delete();
	});

	it("sorts by usage descending", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("a");
		await repo.recordUse("b");
		await repo.recordUse("b");
		await repo.recordUse("c");
		await repo.recordUse("c");
		await repo.recordUse("c");
		const byUsage = await repo.getByUsage();
		expect(byUsage.map((k) => k.word)).toEqual(["c", "b", "a"]);
		await testDb.delete();
	});

	it("searches keywords", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("fantasy");
		await repo.recordUse("science fiction");
		await repo.recordUse("history");
		const results = await repo.search("fan");
		expect(results).toHaveLength(1);
		await testDb.delete();
	});

	it("deletes all keywords", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("a");
		await repo.recordUse("b");
		await repo.deleteAll();
		const byUsage = await repo.getByUsage();
		expect(byUsage).toHaveLength(0);
		await testDb.delete();
	});
});
