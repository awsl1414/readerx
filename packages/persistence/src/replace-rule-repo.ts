import type { Table } from "dexie";
import type { ReplaceRule } from "./types";

export class ReplaceRuleRepository {
	private table: Table<ReplaceRule, number>;

	constructor(table: Table<ReplaceRule, number>) {
		this.table = table;
	}

	async save(rule: ReplaceRule): Promise<void> {
		await this.table.put(rule);
	}

	async get(id: number): Promise<ReplaceRule | undefined> {
		return this.table.get(id);
	}

	async delete(id: number): Promise<void> {
		await this.table.delete(id);
	}

	async getAll(): Promise<ReplaceRule[]> {
		return this.table.orderBy("order").toArray();
	}

	async getEnabled(): Promise<ReplaceRule[]> {
		const all = await this.table.toArray();
		return all
			.filter((rule) => rule.isEnabled)
			.sort((a, b) => a.order - b.order);
	}

	async getByScope(
		name: string,
		origin: string,
		scope: "title" | "content",
	): Promise<ReplaceRule[]> {
		const all = await this.getEnabled();
		return all.filter((rule) => {
			if (scope === "title" && !rule.scopeTitle) return false;
			if (scope === "content" && !rule.scopeContent) return false;
			if (rule.excludeScope) {
				const excludeList = rule.excludeScope.split(",");
				if (excludeList.some((s) => s.trim() === name || s.trim() === origin)) {
					return false;
				}
			}
			if (rule.scope) {
				const scopeList = rule.scope.split(",");
				return scopeList.some((s) => s.trim() === name || s.trim() === origin);
			}
			return true;
		});
	}
}
