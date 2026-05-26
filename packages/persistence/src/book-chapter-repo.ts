import type { Table } from "dexie";
import type { BookChapter } from "./types";

export class BookChapterRepository {
	private table: Table<BookChapter, string>;

	constructor(table: Table<BookChapter, string>) {
		this.table = table;
	}

	async saveBatch(chapters: BookChapter[]): Promise<void> {
		await this.table.bulkPut(chapters);
	}

	async getByBook(bookUrl: string): Promise<BookChapter[]> {
		return this.table.where("bookUrl").equals(bookUrl).sortBy("index");
	}

	async getByBookRange(
		bookUrl: string,
		start: number,
		end: number,
	): Promise<BookChapter[]> {
		return this.table
			.where("[bookUrl+index]")
			.between([bookUrl, start], [bookUrl, end], true, true)
			.toArray();
	}

	async get(bookUrl: string, url: string): Promise<BookChapter | undefined> {
		return this.table.where("[url+bookUrl]").equals([url, bookUrl]).first();
	}

	async getByIndex(
		bookUrl: string,
		index: number,
	): Promise<BookChapter | undefined> {
		return this.table.where("[bookUrl+index]").equals([bookUrl, index]).first();
	}

	async deleteByBook(bookUrl: string): Promise<void> {
		await this.table.where("bookUrl").equals(bookUrl).delete();
	}

	async count(bookUrl: string): Promise<number> {
		return this.table.where("bookUrl").equals(bookUrl).count();
	}
}
