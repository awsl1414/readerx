import Dexie from "dexie";
import type { Table } from "dexie";
import type {
	Book,
	BookChapter,
	BookGroup,
	Bookmark,
	BookSourceRecord,
	Cache,
	Cookie,
	ReplaceRule,
	SearchKeyword,
} from "./types";

export const DB_NAME = "readerx";
export const DB_VERSION = 1;

export class ReaderXDB extends Dexie {
	bookSources!: Table<BookSourceRecord, string>;
	books!: Table<Book, string>;
	chapters!: Table<BookChapter, string>;
	bookGroups!: Table<BookGroup, number>;
	bookmarks!: Table<Bookmark, number>;
	searchKeywords!: Table<SearchKeyword, string>;
	caches!: Table<Cache, string>;
	replaceRules!: Table<ReplaceRule, number>;
	cookies!: Table<Cookie, string>;

	constructor(name = DB_NAME) {
		super(name);
		this.version(DB_VERSION).stores({
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
	}
}

export function createDB(name?: string): ReaderXDB {
	return new ReaderXDB(name);
}

export const db = createDB();
