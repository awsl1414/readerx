import type { Table } from "dexie";
import type { Book } from "./types";

export class BookRepository {
	private table: Table<Book, string>;

	constructor(table: Table<Book, string>) {
		this.table = table;
	}

	async save(book: Book): Promise<void> {
		await this.table.put(book);
	}

	async get(bookUrl: string): Promise<Book | undefined> {
		return this.table.get(bookUrl);
	}

	async delete(bookUrl: string): Promise<void> {
		await this.table.delete(bookUrl);
	}

	async getAll(): Promise<Book[]> {
		return this.table.orderBy("order").toArray();
	}

	async getByGroup(groupId: number): Promise<Book[]> {
		return this.table.where("groupIds").equals(groupId).toArray();
	}

	async search(query: string): Promise<Book[]> {
		const q = query.toLowerCase();
		return this.table
			.filter(
				(book) =>
					book.name.toLowerCase().includes(q) ||
					book.author.toLowerCase().includes(q),
			)
			.toArray();
	}

	async updateProgress(
		bookUrl: string,
		durChapterIndex: number,
		durChapterPos: number,
	): Promise<void> {
		await this.table.update(bookUrl, {
			durChapterIndex,
			durChapterPos,
			durChapterTime: Date.now(),
		});
	}

	async count(): Promise<number> {
		return this.table.count();
	}

	async has(bookUrl: string): Promise<boolean> {
		const result = await this.table.get(bookUrl);
		return result !== undefined;
	}

	async addGroup(bookUrl: string, groupId: number): Promise<void> {
		const book = await this.table.get(bookUrl);
		if (!book) return;
		if (!book.groupIds.includes(groupId)) {
			await this.table.update(bookUrl, {
				groupIds: [...book.groupIds, groupId],
			});
		}
	}

	async removeGroup(bookUrl: string, groupId: number): Promise<void> {
		const book = await this.table.get(bookUrl);
		if (!book) return;
		const updated = book.groupIds.filter((id) => id !== groupId);
		await this.table.update(bookUrl, { groupIds: updated });
	}
}
