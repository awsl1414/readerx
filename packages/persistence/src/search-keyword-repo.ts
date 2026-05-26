import type { Table } from "dexie";
import type { SearchKeyword } from "./types";

export class SearchKeywordRepository {
	private table: Table<SearchKeyword, string>;

	constructor(table: Table<SearchKeyword, string>) {
		this.table = table;
	}

	async recordUse(word: string): Promise<void> {
		const existing = await this.table.get(word);
		if (existing) {
			await this.table.update(word, {
				usage: existing.usage + 1,
				lastUseTime: Date.now(),
			});
		} else {
			await this.table.put({
				word,
				usage: 1,
				lastUseTime: Date.now(),
			});
		}
	}

	async getByUsage(): Promise<SearchKeyword[]> {
		return this.table.orderBy("usage").reverse().toArray();
	}

	async getByRecent(): Promise<SearchKeyword[]> {
		return this.table.orderBy("lastUseTime").reverse().toArray();
	}

	async search(query: string): Promise<SearchKeyword[]> {
		const q = query.toLowerCase();
		return this.table
			.filter((kw) => kw.word.toLowerCase().includes(q))
			.toArray();
	}

	async delete(word: string): Promise<void> {
		await this.table.delete(word);
	}

	async deleteAll(): Promise<void> {
		await this.table.clear();
	}
}
