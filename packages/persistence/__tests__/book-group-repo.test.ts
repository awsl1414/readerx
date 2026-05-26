import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BookGroupRepository } from "../src/book-group-repo";
import { createDB } from "../src/database";
import type { BookGroup } from "../src/types";

function makeGroup(override: Partial<BookGroup> = {}): BookGroup {
	return {
		groupId: 1,
		groupName: "Test Group",
		order: 0,
		enableRefresh: true,
		show: true,
		bookSort: 0,
		...override,
	};
}

describe("BookGroupRepository", () => {
	async function setup() {
		const testDb = createDB(`test-bg-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookGroupRepository(testDb.bookGroups);
		return { testDb, repo };
	}

	it("saves and retrieves a group", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup());
		const result = await repo.get(1);
		expect(result?.groupName).toBe("Test Group");
		await testDb.delete();
	});

	it("returns all groups ordered", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup({ groupId: 1, order: 2, groupName: "B" }));
		await repo.save(makeGroup({ groupId: 2, order: 1, groupName: "A" }));
		const all = await repo.getAll();
		expect(all.map((g) => g.groupName)).toEqual(["A", "B"]);
		await testDb.delete();
	});

	it("seeds default groups when empty", async () => {
		const { testDb, repo } = await setup();
		await repo.seedDefaults();
		const all = await repo.getAll();
		expect(all.length).toBeGreaterThanOrEqual(2);
		expect(all.some((g) => g.groupId === -1)).toBe(true);
		await testDb.delete();
	});

	it("does not re-seed when groups exist", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup({ groupId: 99 }));
		await repo.seedDefaults();
		const all = await repo.getAll();
		const count99 = all.filter((g) => g.groupId === 99).length;
		expect(count99).toBe(1);
		await testDb.delete();
	});

	it("finds group by name", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup({ groupName: "Fantasy" }));
		const result = await repo.getByName("Fantasy");
		expect(result).toBeDefined();
		await testDb.delete();
	});

	it("deletes a group", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup());
		await repo.delete(1);
		expect(await repo.get(1)).toBeUndefined();
		await testDb.delete();
	});
});
