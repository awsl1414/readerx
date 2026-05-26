import type { Table } from "dexie";
import type { Bookmark } from "./types";

export class BookmarkRepository {
	private table: Table<Bookmark, number>;

	constructor(table: Table<Bookmark, number>) {
		this.table = table;
	}

	async save(bookmark: Bookmark): Promise<void> {
		await this.table.put(bookmark);
	}

	async get(time: number): Promise<Bookmark | undefined> {
		return this.table.get(time);
	}

	async delete(time: number): Promise<void> {
		await this.table.delete(time);
	}

	async getByBook(bookName: string, bookAuthor: string): Promise<Bookmark[]> {
		return this.table
			.where("[bookName+bookAuthor]")
			.equals([bookName, bookAuthor])
			.toArray();
	}

	async getAll(): Promise<Bookmark[]> {
		return this.table.orderBy("time").reverse().toArray();
	}
}
