import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { BookSourceRepository } from "../src/book-source-repo";
import { createDB } from "../src/database";
import type { BookSourceRecord } from "../src/types";

function makeSource(
	override: Partial<BookSourceRecord> = {},
): BookSourceRecord {
	return {
		bookSourceUrl: "https://example.com",
		bookSourceName: "Test Source",
		bookSourceType: 0,
		enabled: true,
		enabledExplore: true,
		customOrder: 0,
		lastUpdateTime: 0,
		weight: 0,
		respondTime: 180000,
		...override,
	};
}

describe("BookSourceRepository", () => {
	async function setup() {
		const testDb = createDB(`test-bs-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookSourceRepository(testDb.bookSources);
		return { testDb, repo };
	}

	it("saves and retrieves a source", async () => {
		const { testDb, repo } = await setup();
		const source = makeSource();
		await repo.save(source);
		const result = await repo.get("https://example.com");
		expect(result?.bookSourceName).toBe("Test Source");
		await testDb.delete();
	});

	it("overwrites on duplicate save", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeSource({ bookSourceName: "v1" }));
		await repo.save(makeSource({ bookSourceName: "v2" }));
		const result = await repo.get("https://example.com");
		expect(result?.bookSourceName).toBe("v2");
		await testDb.delete();
	});

	it("deletes a source", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeSource());
		await repo.delete("https://example.com");
		const result = await repo.get("https://example.com");
		expect(result).toBeUndefined();
		await testDb.delete();
	});

	it("batch saves multiple sources", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({ bookSourceUrl: "https://a.com", bookSourceName: "A" }),
			makeSource({ bookSourceUrl: "https://b.com", bookSourceName: "B" }),
		]);
		const count = await repo.count();
		expect(count).toBe(2);
		await testDb.delete();
	});

	it("returns all sources", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({ bookSourceUrl: "https://a.com" }),
			makeSource({ bookSourceUrl: "https://b.com" }),
		]);
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
		await testDb.delete();
	});

	it("searches by name", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({
				bookSourceUrl: "https://a.com",
				bookSourceName: "Hello World",
			}),
			makeSource({
				bookSourceUrl: "https://b.com",
				bookSourceName: "Goodbye",
			}),
		]);
		const results = await repo.search("hello");
		expect(results).toHaveLength(1);
		expect(results[0]?.bookSourceName).toBe("Hello World");
		await testDb.delete();
	});

	it("enables and disables a source", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeSource({ enabled: true }));
		await repo.enable("https://example.com", false);
		const result = await repo.get("https://example.com");
		expect(result?.enabled).toBe(false);
		await testDb.delete();
	});

	it("filters enabled sources", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({
				bookSourceUrl: "https://a.com",
				enabled: true,
			}),
			makeSource({
				bookSourceUrl: "https://b.com",
				enabled: false,
			}),
		]);
		const enabled = await repo.getEnabled();
		expect(enabled).toHaveLength(1);
		expect(enabled[0]?.bookSourceUrl).toBe("https://a.com");
		await testDb.delete();
	});

	it("filters enabled explore sources", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({
				bookSourceUrl: "https://a.com",
				enabledExplore: true,
			}),
			makeSource({
				bookSourceUrl: "https://b.com",
				enabledExplore: false,
			}),
		]);
		const enabled = await repo.getEnabledExplore();
		expect(enabled).toHaveLength(1);
		expect(enabled[0]?.bookSourceUrl).toBe("https://a.com");
		await testDb.delete();
	});

	it("checks existence", async () => {
		const { testDb, repo } = await setup();
		expect(await repo.has("https://example.com")).toBe(false);
		await repo.save(makeSource());
		expect(await repo.has("https://example.com")).toBe(true);
		await testDb.delete();
	});
});
