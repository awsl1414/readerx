import type { Table } from "dexie";
import type { BookGroup } from "./types";

const SYSTEM_GROUPS: BookGroup[] = [
	{
		groupId: -1,
		groupName: "全部",
		order: -1,
		enableRefresh: false,
		show: true,
		bookSort: 0,
	},
	{
		groupId: -2,
		groupName: "本地",
		order: -2,
		enableRefresh: false,
		show: true,
		bookSort: 0,
	},
];

export class BookGroupRepository {
	private table: Table<BookGroup, number>;

	constructor(table: Table<BookGroup, number>) {
		this.table = table;
	}

	async save(group: BookGroup): Promise<void> {
		await this.table.put(group);
	}

	async get(groupId: number): Promise<BookGroup | undefined> {
		return this.table.get(groupId);
	}

	async delete(groupId: number): Promise<void> {
		await this.table.delete(groupId);
	}

	async getAll(): Promise<BookGroup[]> {
		return this.table.orderBy("order").toArray();
	}

	async seedDefaults(): Promise<void> {
		const count = await this.table.count();
		if (count === 0) {
			await this.table.bulkAdd(SYSTEM_GROUPS);
		}
	}

	async getByName(name: string): Promise<BookGroup | undefined> {
		return this.table.where("groupName").equals(name).first();
	}

	async maxOrder(): Promise<number> {
		const all = await this.table.orderBy("order").reverse().toArray();
		const first = all[0];
		return first?.order ?? 0;
	}
}
