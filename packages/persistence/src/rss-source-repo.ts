import type { Table } from "dexie";
import type { RssSourceRecord } from "./types";

class RssSourceRepository {
	private table: Table<RssSourceRecord, string>;

	constructor(table: Table<RssSourceRecord, string>) {
		this.table = table;
	}

	async getAll(): Promise<RssSourceRecord[]> {
		return this.table.toArray();
	}

	async get(sourceUrl: string): Promise<RssSourceRecord | undefined> {
		return this.table.get(sourceUrl);
	}

	async save(source: RssSourceRecord): Promise<void> {
		await this.table.put(source);
	}

	async saveBatch(sources: RssSourceRecord[]): Promise<void> {
		await this.table.bulkPut(sources);
	}

	async delete(sourceUrl: string): Promise<void> {
		await this.table.delete(sourceUrl);
	}

	async deleteBatch(urls: string[]): Promise<void> {
		await this.table.bulkDelete(urls);
	}

	async search(query: string): Promise<RssSourceRecord[]> {
		const q = query.toLowerCase();
		return this.table
			.filter(
				(s) =>
					s.sourceName.toLowerCase().includes(q) ||
					s.sourceUrl.toLowerCase().includes(q) ||
					(s.sourceGroup?.toLowerCase().includes(q) ?? false),
			)
			.toArray();
	}

	async enable(sourceUrl: string, enabled: boolean): Promise<void> {
		await this.table.update(sourceUrl, { enabled });
	}

	async count(): Promise<number> {
		return this.table.count();
	}
}

export { RssSourceRepository };
