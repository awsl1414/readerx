import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { CookieRepository } from "../src/cookie-repo";
import { createDB } from "../src/database";
import type { Cookie } from "../src/types";

function makeCookie(override: Partial<Cookie> = {}): Cookie {
	return { url: "https://example.com", cookie: "session=abc", ...override };
}

describe("CookieRepository", () => {
	async function setup() {
		const testDb = createDB(`test-cookie-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new CookieRepository(testDb.cookies);
		return { testDb, repo };
	}

	it("saves and retrieves a cookie", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie());
		const result = await repo.get("https://example.com");
		expect(result?.cookie).toBe("session=abc");
		await testDb.delete();
	});

	it("overwrites on duplicate save", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie({ cookie: "v1" }));
		await repo.save(makeCookie({ cookie: "v2" }));
		const result = await repo.get("https://example.com");
		expect(result?.cookie).toBe("v2");
		await testDb.delete();
	});

	it("deletes a cookie", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie());
		await repo.delete("https://example.com");
		expect(await repo.get("https://example.com")).toBeUndefined();
		await testDb.delete();
	});

	it("returns all cookies", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie({ url: "https://a.com" }));
		await repo.save(makeCookie({ url: "https://b.com" }));
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
		await testDb.delete();
	});
});
