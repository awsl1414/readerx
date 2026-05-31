import type { Table } from "dexie";
import type { RuleRecord, RuleType } from "@readerx/schemas";

class RulesRepository {
	private table: Table<RuleRecord, string>;

	constructor(table: Table<RuleRecord, string>) {
		this.table = table;
	}

	async getByType<T extends RuleType>(type: T): Promise<RuleRecord<T>[]> {
		const results = await this.table.where("type").equals(type).toArray();
		return results as unknown as RuleRecord<T>[];
	}

	async getEnabledByType<T extends RuleType>(
		type: T,
	): Promise<RuleRecord<T>[]> {
		// IndexedDB does not support boolean keys,
		// so we filter in-memory after querying by type.
		const results = await this.table.where("type").equals(type).toArray();
		return results.filter((r) => r.enabled) as unknown as RuleRecord<T>[];
	}

	async getById(id: string): Promise<RuleRecord | undefined> {
		return this.table.get(id);
	}

	async save<T extends RuleType>(record: RuleRecord<T>): Promise<void> {
		await this.table.put(record);
	}

	async saveBatch(records: RuleRecord[]): Promise<void> {
		await this.table.bulkPut(records);
	}

	async delete(id: string): Promise<void> {
		await this.table.delete(id);
	}

	async deleteBatch(ids: string[]): Promise<void> {
		await this.table.bulkDelete(ids);
	}

	async search(type: RuleType, query: string): Promise<RuleRecord[]> {
		const all = await this.getByType(type);
		const q = query.toLowerCase();
		return all.filter((rule) => rule.name.toLowerCase().includes(q));
	}

	async toggleEnabled(id: string, enabled: boolean): Promise<void> {
		await this.table.update(id, {
			enabled,
			updatedAt: new Date().toISOString(),
		});
	}

	async count(type?: RuleType): Promise<number> {
		if (type) {
			return this.table.where("type").equals(type).count();
		}
		return this.table.count();
	}
}

export { RulesRepository };
