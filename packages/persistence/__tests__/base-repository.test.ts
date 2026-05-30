import "fake-indexeddb/auto";
import { Dexie } from "dexie";
import type { Table } from "dexie";
import { describe, it, expect, beforeEach } from "vitest";
import { BaseDexieRepository } from "../src/base-repository";

type TestEntity = {
	id: string;
	name: string;
	enabled: boolean;
};

class TestDB extends Dexie {
	items!: Table<TestEntity, string>;
	constructor() {
		super("test-base-repo");
		this.version(1).stores({ items: "id, name, enabled" });
	}
}

function makeRepo(): { repo: BaseDexieRepository<TestEntity>; db: TestDB } {
	const db = new TestDB();
	const repo = new BaseDexieRepository<TestEntity>(db.items);
	return { repo, db };
}

describe("BaseDexieRepository", () => {
	beforeEach(async () => {
		const db = new TestDB();
		await db.items.clear();
		db.close();
	});

	it("saves and retrieves an entity by id", async () => {
		const { repo } = makeRepo();
		const entity: TestEntity = { id: "a", name: "Alpha", enabled: true };
		await repo.save(entity);
		const result = await repo.getById("a");
		expect(result).toEqual(entity);
	});

	it("getAll returns all entities", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "1", name: "A", enabled: true });
		await repo.save({ id: "2", name: "B", enabled: false });
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
	});

	it("delete removes an entity", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "x", name: "X", enabled: true });
		await repo.delete("x");
		const result = await repo.getById("x");
		expect(result).toBeUndefined();
	});

	it("deleteBatch removes multiple entities", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "1", name: "A", enabled: true });
		await repo.save({ id: "2", name: "B", enabled: true });
		await repo.save({ id: "3", name: "C", enabled: true });
		await repo.deleteBatch(["1", "3"]);
		const all = await repo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0]?.id).toBe("2");
	});

	it("save upserts an existing entity", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "a", name: "Old", enabled: true });
		await repo.save({ id: "a", name: "New", enabled: false });
		const result = await repo.getById("a");
		expect(result?.name).toBe("New");
		expect(result?.enabled).toBe(false);
	});
});
