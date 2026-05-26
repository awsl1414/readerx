import type { Table } from "dexie";
import type { Cookie } from "./types";

export class CookieRepository {
	private table: Table<Cookie, string>;

	constructor(table: Table<Cookie, string>) {
		this.table = table;
	}

	async save(cookie: Cookie): Promise<void> {
		await this.table.put(cookie);
	}

	async get(url: string): Promise<Cookie | undefined> {
		return this.table.get(url);
	}

	async delete(url: string): Promise<void> {
		await this.table.delete(url);
	}

	async getAll(): Promise<Cookie[]> {
		return this.table.toArray();
	}
}
