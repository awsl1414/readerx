import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { ReplaceRuleRepository } from "../src/replace-rule-repo";
import type { ReplaceRule } from "../src/types";

function makeRule(override: Partial<ReplaceRule> = {}): ReplaceRule {
	return {
		id: 1,
		name: "test rule",
		pattern: "foo",
		replacement: "bar",
		scopeTitle: true,
		scopeContent: true,
		isEnabled: true,
		isRegex: false,
		timeoutMillisecond: 0,
		order: 0,
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
		const result = await repo.get(1);
		expect(result?.pattern).toBe("foo");
		await testDb.delete();
	});

	it("returns all rules ordered", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule({ id: 1, order: 2, name: "B" }));
		await repo.save(makeRule({ id: 2, order: 1, name: "A" }));
		const all = await repo.getAll();
		expect(all.map((r) => r.name)).toEqual(["A", "B"]);
		await testDb.delete();
	});

	it("gets enabled rules", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule({ id: 1, isEnabled: true }));
		await repo.save(makeRule({ id: 2, isEnabled: false }));
		const enabled = await repo.getEnabled();
		expect(enabled).toHaveLength(1);
		await testDb.delete();
	});

	it("filters by scope", async () => {
		const { testDb, repo } = await setup();
		await repo.save(
			makeRule({
				id: 1,
				scopeTitle: true,
				scopeContent: false,
				isEnabled: true,
			}),
		);
		await repo.save(
			makeRule({
				id: 2,
				scopeTitle: false,
				scopeContent: true,
				isEnabled: true,
			}),
		);
		const titleRules = await repo.getByScope("book", "origin", "title");
		expect(titleRules).toHaveLength(1);
		expect(titleRules[0]?.id).toBe(1);
		const contentRules = await repo.getByScope("book", "origin", "content");
		expect(contentRules).toHaveLength(1);
		expect(contentRules[0]?.id).toBe(2);
		await testDb.delete();
	});
});
