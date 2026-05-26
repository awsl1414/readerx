import type { Table } from "dexie";
import type { BookSourceRecord } from "./types";

export class BookSourceRepository {
	private table: Table<BookSourceRecord, string>;

	constructor(table: Table<BookSourceRecord, string>) {
		this.table = table;
	}

	async save(source: BookSourceRecord): Promise<void> {
		await this.table.put(source);
	}

	async saveBatch(sources: BookSourceRecord[]): Promise<void> {
		await this.table.bulkPut(sources);
	}

	async get(url: string): Promise<BookSourceRecord | undefined> {
		return this.table.get(url);
	}

	async delete(url: string): Promise<void> {
		await this.table.delete(url);
	}

	async deleteBatch(urls: string[]): Promise<void> {
		await this.table.bulkDelete(urls);
	}

	async getAll(): Promise<BookSourceRecord[]> {
		return this.table.toArray();
	}

	async getEnabled(): Promise<BookSourceRecord[]> {
		const all = await this.table.toArray();
		return all.filter((source) => source.enabled);
	}

	async getEnabledExplore(): Promise<BookSourceRecord[]> {
		const all = await this.table.toArray();
		return all.filter((source) => source.enabledExplore);
	}

	async getByGroup(group: string): Promise<BookSourceRecord[]> {
		return this.table.where("bookSourceGroup").equals(group).toArray();
	}

	async search(query: string): Promise<BookSourceRecord[]> {
		const q = query.toLowerCase();
		return this.table
			.filter(
				(source) =>
					source.bookSourceName.toLowerCase().includes(q) ||
					source.bookSourceUrl.toLowerCase().includes(q) ||
					(source.bookSourceGroup?.toLowerCase().includes(q) ?? false),
			)
			.toArray();
	}

	async enable(url: string, enabled: boolean): Promise<void> {
		await this.table.update(url, { enabled });
	}

	async enableExplore(url: string, enabled: boolean): Promise<void> {
		await this.table.update(url, { enabledExplore: enabled });
	}

	async updateOrder(url: string, order: number): Promise<void> {
		await this.table.update(url, { customOrder: order });
	}

	async updateGroup(url: string, group: string): Promise<void> {
		await this.table.update(url, { bookSourceGroup: group });
	}

	async count(): Promise<number> {
		return this.table.count();
	}

	async has(url: string): Promise<boolean> {
		const result = await this.table.get(url);
		return result !== undefined;
	}
}
