import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { RulesRepository } from "../src/rules-repo";
import type { RuleRecord, RuleType } from "@readerx/schemas";

function makeRule<T extends RuleType>(
	type: T,
	override: Partial<RuleRecord<T>> = {},
): RuleRecord<T> {
	const id = `test-${type}-${Math.random().toString(36).slice(2, 8)}`;
	return {
		id,
		type,
		name: `Test ${type} rule`,
		enabled: true,
		tags: [],
		order: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		data: getDefaultData(type),
		...override,
	} as RuleRecord<T>;
}

function getDefaultData(type: RuleType): unknown {
	switch (type) {
		case "replace":
			return { pattern: "foo", replacement: "bar" };
		case "txt-toc":
			return { pattern: "^Chapter" };
		case "dict":
			return { request: { url: "https://example.com" } };
		case "book-source":
			return { baseUrl: "https://example.com", modules: [] };
		default:
			return {};
	}
}

describe("RulesRepository", () => {
	async function setup() {
		const testDb = createDB(`test-rules-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new RulesRepository(testDb.rules);
		return { testDb, repo };
	}

	it("saves and retrieves by type", async () => {
		const { testDb, repo } = await setup();
		const rule = makeRule("replace", { name: "My Replace Rule" });
		await repo.save(rule);
		const results = await repo.getByType("replace");
		expect(results).toHaveLength(1);
		expect(results[0]?.name).toBe("My Replace Rule");
		await testDb.delete();
	});

	it("separates rules by type", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule("replace", { id: "r1" }));
		await repo.save(makeRule("txt-toc", { id: "r2" }));
		await repo.save(makeRule("dict", { id: "r3" }));
		const replaceRules = await repo.getByType("replace");
		const tocRules = await repo.getByType("txt-toc");
		const dictRules = await repo.getByType("dict");
		expect(replaceRules).toHaveLength(1);
		expect(tocRules).toHaveLength(1);
		expect(dictRules).toHaveLength(1);
		await testDb.delete();
	});

	it("gets enabled rules by type", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule("replace", { id: "r1", enabled: true }));
		await repo.save(makeRule("replace", { id: "r2", enabled: false }));
		const enabled = await repo.getEnabledByType("replace");
		expect(enabled).toHaveLength(1);
		expect(enabled[0]?.id).toBe("r1");
		await testDb.delete();
	});

	it("deletes a rule by id", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule("replace", { id: "r1" }));
		await repo.delete("r1");
		const result = await repo.getById("r1");
		expect(result).toBeUndefined();
		await testDb.delete();
	});

	it("saves a batch of rules", async () => {
		const { testDb, repo } = await setup();
		const rules = [
			makeRule("replace", { id: "r1" }),
			makeRule("txt-toc", { id: "r2" }),
			makeRule("dict", { id: "r3" }),
		];
		await repo.saveBatch(rules);
		const allReplace = await repo.getByType("replace");
		const allToc = await repo.getByType("txt-toc");
		const allDict = await repo.getByType("dict");
		expect(allReplace).toHaveLength(1);
		expect(allToc).toHaveLength(1);
		expect(allDict).toHaveLength(1);
		await testDb.delete();
	});

	it("deletes a batch of rules", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule("replace", { id: "r1" }));
		await repo.save(makeRule("replace", { id: "r2" }));
		await repo.save(makeRule("replace", { id: "r3" }));
		await repo.deleteBatch(["r1", "r3"]);
		const remaining = await repo.getByType("replace");
		expect(remaining).toHaveLength(1);
		expect(remaining[0]?.id).toBe("r2");
		await testDb.delete();
	});

	it("searches rules by name", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule("replace", { id: "r1", name: "Remove Ads" }));
		await repo.save(
			makeRule("replace", { id: "r2", name: "Fix Encoding" }),
		);
		await repo.save(
			makeRule("replace", { id: "r3", name: "ADvanced Cleanup" }),
		);
		const results = await repo.search("replace", "ads");
		expect(results).toHaveLength(1);
		expect(results[0]?.name).toBe("Remove Ads");
		await testDb.delete();
	});

	it("toggles enabled state", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule("replace", { id: "r1", enabled: true }));
		await repo.toggleEnabled("r1", false);
		const rule = await repo.getById("r1");
		expect(rule?.enabled).toBe(false);
		await testDb.delete();
	});

	it("counts rules by type", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule("replace", { id: "r1" }));
		await repo.save(makeRule("replace", { id: "r2" }));
		await repo.save(makeRule("txt-toc", { id: "r3" }));
		const replaceCount = await repo.count("replace");
		const tocCount = await repo.count("txt-toc");
		const totalCount = await repo.count();
		expect(replaceCount).toBe(2);
		expect(tocCount).toBe(1);
		expect(totalCount).toBe(3);
		await testDb.delete();
	});
});
