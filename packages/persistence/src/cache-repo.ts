import type { Table } from "dexie";
import type { Cache } from "./types";

export class CacheRepository {
	private table: Table<Cache, string>;

	constructor(table: Table<Cache, string>) {
		this.table = table;
	}

	async get(key: string): Promise<string | undefined> {
		const entry = await this.table.get(key);
		if (!entry) return undefined;
		if (entry.deadline > 0 && entry.deadline < Date.now()) {
			await this.table.delete(key);
			return undefined;
		}
		return entry.value;
	}

	async set(key: string, value: string, ttlMs?: number): Promise<void> {
		const deadline = ttlMs ? Date.now() + ttlMs : 0;
		await this.table.put({ key, value, deadline });
	}

	async delete(key: string): Promise<void> {
		await this.table.delete(key);
	}

	async clearExpired(): Promise<number> {
		const now = Date.now();
		return this.table
			.where("deadline")
			.below(now)
			.filter((entry) => entry.deadline > 0)
			.delete();
	}
}
