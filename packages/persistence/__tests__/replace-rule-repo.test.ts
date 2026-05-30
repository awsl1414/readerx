import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { ReplaceRuleRepository } from "../src/replace-rule-repo";
import type { ReplaceRule } from "../src/types";

function makeRule(override: Partial<ReplaceRule> = {}): ReplaceRule {
	return {
		id: "test-id-1",
		name: "test rule",
		pattern: "foo",
		replacement: "bar",
		scopeTitle: true,
		scopeContent: true,
		enabled: true,
		isRegex: false,
		timeoutMillisecond: 0,
		order: 0,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		...override,
	};
}

describe("ReplaceRuleRepository", () => {
	async function setup() {
		const testDb = createDB(`test-rr-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new ReplaceRuleRepository(testDb.replaceRules);
		return { testDb, repo };
	}

	it("saves and retrieves a rule", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule());
		const result = await repo.getById("test-id-1");
		expect(result?.pattern).toBe("foo");
		await testDb.delete();
	});

	it("returns all rules ordered", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule({ id: "id-a", order: 2, name: "B" }));
		await repo.save(makeRule({ id: "id-b", order: 1, name: "A" }));
		const all = await repo.getAll();
		expect(all.map((r) => r.name)).toEqual(["A", "B"]);
		await testDb.delete();
	});

	it("gets enabled rules", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule({ id: "id-1", enabled: true }));
		await repo.save(makeRule({ id: "id-2", enabled: false }));
		const enabled = await repo.getEnabled();
		expect(enabled).toHaveLength(1);
		await testDb.delete();
	});

	it("filters by scope", async () => {
		const { testDb, repo } = await setup();
		await repo.save(
			makeRule({
				id: "id-1",
				scopeTitle: true,
				scopeContent: false,
				enabled: true,
			}),
		);
		await repo.save(
			makeRule({
				id: "id-2",
				scopeTitle: false,
				scopeContent: true,
				enabled: true,
			}),
		);
		const titleRules = await repo.getByScope("book", "origin", "title");
		expect(titleRules).toHaveLength(1);
		expect(titleRules[0]?.id).toBe("id-1");
		const contentRules = await repo.getByScope("book", "origin", "content");
		expect(contentRules).toHaveLength(1);
		expect(contentRules[0]?.id).toBe("id-2");
		await testDb.delete();
	});
});
