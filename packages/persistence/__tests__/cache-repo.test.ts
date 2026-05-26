import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { CacheRepository } from "../src/cache-repo";
import { createDB } from "../src/database";

describe("CacheRepository", () => {
	async function setup() {
		const testDb = createDB(`test-cache-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new CacheRepository(testDb.caches);
		return { testDb, repo };
	}

	it("sets and gets a value", async () => {
		const { testDb, repo } = await setup();
		await repo.set("key1", "value1");
		expect(await repo.get("key1")).toBe("value1");
		await testDb.delete();
	});

	it("returns undefined for missing key", async () => {
		const { testDb, repo } = await setup();
		expect(await repo.get("missing")).toBeUndefined();
		await testDb.delete();
	});

	it("respects TTL expiry", async () => {
		const { testDb, repo } = await setup();
		await repo.set("expired", "data", 1);
		await new Promise((r) => setTimeout(r, 10));
		expect(await repo.get("expired")).toBeUndefined();
		await testDb.delete();
	});

	it("keeps entry with no TTL", async () => {
		const { testDb, repo } = await setup();
		await repo.set("permanent", "data");
		expect(await repo.get("permanent")).toBe("data");
		await testDb.delete();
	});

	it("clears expired entries", async () => {
		const { testDb, repo } = await setup();
		await repo.set("expired", "data", 1);
		await repo.set("valid", "data");
		await new Promise((r) => setTimeout(r, 10));
		const deleted = await repo.clearExpired();
		expect(deleted).toBe(1);
		expect(await repo.get("valid")).toBe("data");
		await testDb.delete();
	});

	it("deletes a key", async () => {
		const { testDb, repo } = await setup();
		await repo.set("key1", "value1");
		await repo.delete("key1");
		expect(await repo.get("key1")).toBeUndefined();
		await testDb.delete();
	});
});
