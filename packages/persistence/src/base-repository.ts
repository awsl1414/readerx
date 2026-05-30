import type { Table } from "dexie";

/**
 * Generic base repository for Dexie tables.
 * Provides CRUD only — no search/filter/sort.
 * Concrete repositories extend this and add domain-specific queries.
 */
class BaseDexieRepository<T extends { id: string }> {
	constructor(protected table: Table<T, string>) {}

	async getAll(): Promise<T[]> {
		return this.table.toArray();
	}

	async getById(id: string): Promise<T | undefined> {
		return this.table.get(id);
	}

	async save(entity: T): Promise<void> {
		await this.table.put(entity);
	}

	async delete(id: string): Promise<void> {
		await this.table.delete(id);
	}

	async deleteBatch(ids: string[]): Promise<void> {
		await this.table.bulkDelete(ids);
	}
}

export { BaseDexieRepository };
