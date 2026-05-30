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
	DictRule,
	ReplaceRule,
	RssSourceRecord,
	SearchKeyword,
	TxtTocRule,
} from "./types";

export const DB_NAME = "readerx";
export const DB_VERSION = 2;

export class ReaderXDB extends Dexie {
	bookSources!: Table<BookSourceRecord, string>;
	books!: Table<Book, string>;
	chapters!: Table<BookChapter, string>;
	bookGroups!: Table<BookGroup, number>;
	bookmarks!: Table<Bookmark, number>;
	searchKeywords!: Table<SearchKeyword, string>;
	caches!: Table<Cache, string>;
	replaceRules!: Table<ReplaceRule, string>;
	cookies!: Table<Cookie, string>;
	rssSources!: Table<RssSourceRecord, string>;
	txtTocRules!: Table<TxtTocRule, string>;
	dictRules!: Table<DictRule, string>;

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
		this.version(2).stores({
			replaceRules: "id, name, group, order, enabled",
			rssSources:
				"sourceUrl, sourceName, *sourceGroup, enabled, [sourceGroup+enabled]",
			txtTocRules: "id, name, enabled",
			dictRules: "id, name, enabled",
		});
	}
}

export function createDB(name?: string): ReaderXDB {
	return new ReaderXDB(name);
}

export const db = createDB();
