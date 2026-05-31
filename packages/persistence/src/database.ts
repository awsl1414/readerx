import type { Table } from "dexie";
import Dexie from "dexie";
import type {
	Book,
	BookChapter,
	BookGroup,
	Bookmark,
	BookSourceRecord,
	Cache,
	Cookie,
	RssSourceRecord,
	RuleRecord,
	SearchKeyword,
} from "./types";

export const DB_NAME = "readerx";
export const DB_VERSION = 3;

export class ReaderXDB extends Dexie {
	bookSources!: Table<BookSourceRecord, string>;
	books!: Table<Book, string>;
	chapters!: Table<BookChapter, string>;
	bookGroups!: Table<BookGroup, number>;
	bookmarks!: Table<Bookmark, number>;
	searchKeywords!: Table<SearchKeyword, string>;
	caches!: Table<Cache, string>;
	cookies!: Table<Cookie, string>;
	rssSources!: Table<RssSourceRecord, string>;
	rules!: Table<RuleRecord, string>;

	constructor(name = DB_NAME) {
		super(name);
		this.version(1).stores({
			bookSources:
				"bookSourceUrl, bookSourceName, *bookSourceGroup, enabled, enabledExplore, bookSourceType, customOrder, lastUpdateTime",
			books: "bookUrl, name, author, *groupIds, origin, durChapterTime, order",
			chapters: "[url+bookUrl], bookUrl, [bookUrl+index]",
			bookGroups: "groupId, groupName, order",
			bookmarks: "time, [bookName+bookAuthor], bookUrl",
			searchKeywords: "word, usage, lastUseTime",
			caches: "key, deadline",
			replaceRules: "++id, name, group, order, isEnabled",
			cookies: "url",
		});
		this.version(2)
			.stores({
				replaceRules: "id, name, group, order, enabled",
				rssSources:
					"sourceUrl, sourceName, *sourceGroup, enabled, [sourceGroup+enabled]",
				txtTocRules: "id, name, enabled",
				dictRules: "id, name, enabled",
			})
			.upgrade((tx) => {
				// Migrate replaceRules: numeric id → string id, isEnabled → enabled
				return tx
					.table("replaceRules")
					.toCollection()
					.modify((rule) => {
						rule.id = String(rule.id);
						rule.enabled = rule.isEnabled ?? true;
						rule.createdAt = rule.createdAt ?? Date.now();
						rule.updatedAt = rule.updatedAt ?? Date.now();
						delete rule.isEnabled;
					});
			});
		this.version(3)
			.stores({
				rules: "id, type, name, updatedAt",
				// Keep old tables alive during migration to prevent data loss
				replaceRules: "id, name, group, order, enabled",
				txtTocRules: "id, name, enabled",
				dictRules: "id, name, enabled",
			})
			.upgrade(async (tx) => {
				const rulesTable = tx.table("rules");
				const now = new Date().toISOString();

				// Migrate replaceRules → rules with type="replace"
				const replaceCount = await tx.table("replaceRules").count();
				if (replaceCount > 0) {
					const replaceRecords = await tx.table("replaceRules").toArray();
					const mapped = replaceRecords.map((r: Record<string, unknown>) => ({
						id: String(r.id),
						type: "replace" as const,
						name: (r.name as string | undefined) ?? "Unnamed Replace Rule",
						enabled: (r.enabled as boolean | undefined) ?? true,
						order: (r.order as number | undefined) ?? 0,
						createdAt: (r.createdAt as string | undefined) ?? now,
						updatedAt: (r.updatedAt as string | undefined) ?? now,
						tags: r.group ? [r.group as string] : [],
						data: r,
					}));
					await rulesTable.bulkAdd(mapped);
				}

				// Migrate txtTocRules → rules with type="txt-toc"
				const txtTocCount = await tx.table("txtTocRules").count();
				if (txtTocCount > 0) {
					const txtTocRecords = await tx.table("txtTocRules").toArray();
					const mapped = txtTocRecords.map((r: Record<string, unknown>) => ({
						id: String(r.id),
						type: "txt-toc" as const,
						name: (r.name as string | undefined) ?? "Unnamed TOC Rule",
						enabled: (r.enabled as boolean | undefined) ?? true,
						order: (r.order as number | undefined) ?? 0,
						createdAt: (r.createdAt as string | undefined) ?? now,
						updatedAt: (r.updatedAt as string | undefined) ?? now,
						tags: [] as string[],
						data: r,
					}));
					await rulesTable.bulkAdd(mapped);
				}

				// Migrate dictRules → rules with type="dict"
				const dictCount = await tx.table("dictRules").count();
				if (dictCount > 0) {
					const dictRecords = await tx.table("dictRules").toArray();
					const mapped = dictRecords.map((r: Record<string, unknown>) => ({
						id: String(r.id),
						type: "dict" as const,
						name: (r.name as string | undefined) ?? "Unnamed Dict Rule",
						enabled: (r.enabled as boolean | undefined) ?? true,
						order: (r.order as number | undefined) ?? 0,
						createdAt: (r.createdAt as string | undefined) ?? now,
						updatedAt: (r.updatedAt as string | undefined) ?? now,
						tags: [] as string[],
						data: r,
					}));
					await rulesTable.bulkAdd(mapped);
				}
			});
	}
}

export function createDB(name?: string): ReaderXDB {
	return new ReaderXDB(name);
}

export const db = createDB();
