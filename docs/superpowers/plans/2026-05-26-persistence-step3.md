# Persistence Step 3 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的客户端持久层（IndexedDB + OPFS），支持书源管理、书架、章节、搜索历史、缓存等 MVP 功能。

**Architecture:** Dexie（IndexedDB）存储结构化数据，OPFS 存储二进制文件。每个实体一个 Repository 类，封装 CRUD + 业务逻辑。工厂模式创建数据库实例。Discriminated Union 返回结果。

**Tech Stack:** Dexie 4、fake-indexeddb（测试）、Vitest、TypeScript strict

**Analysis doc:** `docs/analysis/step3-persistence-analysis.md`

---

## File Structure

```
packages/persistence/
├── src/
│   ├── types.ts                  # 更新：全部 9 个存储类型
│   ├── database.ts               # 新建：Dexie 数据库类
│   ├── book-source-repo.ts       # 新建
│   ├── book-repo.ts              # 新建
│   ├── book-chapter-repo.ts      # 新建
│   ├── book-group-repo.ts        # 新建
│   ├── bookmark-repo.ts          # 新建
│   ├── search-keyword-repo.ts    # 新建
│   ├── cache-repo.ts             # 新建
│   ├── replace-rule-repo.ts      # 新建
│   ├── cookie-repo.ts            # 新建
│   ├── opfs.ts                   # 更新：真实实现
│   └── index.ts                  # 更新：干净导出
├── __tests__/
│   ├── database.test.ts
│   ├── book-source-repo.test.ts
│   ├── book-repo.test.ts
│   ├── book-chapter-repo.test.ts
│   ├── book-group-repo.test.ts
│   ├── bookmark-repo.test.ts
│   ├── search-keyword-repo.test.ts
│   ├── cache-repo.test.ts
│   ├── replace-rule-repo.test.ts
│   ├── cookie-repo.test.ts
│   └── opfs.test.ts
└── package.json                  # 更新：添加依赖和脚本
```

---

### Task 1: Setup + Types + Database

**Files:**
- Modify: `packages/persistence/package.json`
- Delete: `packages/persistence/src/indexeddb.ts`
- Modify: `packages/persistence/src/types.ts`
- Create: `packages/persistence/src/database.ts`

- [ ] **Step 1: Add test dependencies**

```bash
cd /Users/logan/Desktop/workspaces/front/readerx
pnpm --filter @readerx/persistence add -D fake-indexeddb vitest
```

Update `packages/persistence/package.json` scripts:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome check",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Delete old indexeddb.ts**

Delete `packages/persistence/src/indexeddb.ts` (replaced by `database.ts`).

- [ ] **Step 3: Update types.ts**

Replace entire file with:

```typescript
/**
 * 客户端持久层 — 存储类型定义
 * 参考 docs/database-schema.md、docs/analysis/step3-persistence-analysis.md
 */

// ─── BookSource ────────────────────────────────────────────

/**
 * 书源存储记录。
 * 仅定义索引字段，其余 BookSource 字段通过 passthrough 存储。
 * 完整 BookSource 类型定义在 @readerx/rule-engine 中，校验由 app 层负责。
 */
export interface BookSourceRecord {
	bookSourceUrl: string;
	bookSourceName: string;
	bookSourceGroup?: string;
	bookSourceType: number;
	enabled: boolean;
	enabledExplore: boolean;
	customOrder: number;
	lastUpdateTime: number;
	weight: number;
	respondTime: number;
	[key: string]: unknown;
}

// ─── Book ──────────────────────────────────────────────────

export interface Book {
	bookUrl: string;
	tocUrl: string;
	name: string;
	author: string;
	kind?: string;
	coverUrl?: string;
	intro?: string;
	type: number;
	groupIds: number[];
	origin: string;
	originName: string;
	durChapterIndex: number;
	durChapterPos: number;
	durChapterTime: number;
	durChapterTitle?: string;
	totalChapterNum: number;
	latestChapterTitle?: string;
	latestChapterTime?: number;
	canUpdate: boolean;
	order: number;
	variable?: string;
}

// ─── BookChapter ───────────────────────────────────────────

export interface BookChapter {
	url: string;
	bookUrl: string;
	title: string;
	index: number;
	isVolume: boolean;
	isVip: boolean;
	isPay: boolean;
	resourceUrl?: string;
	tag?: string;
	baseUrl?: string;
	variable?: string;
}

// ─── BookGroup ─────────────────────────────────────────────

export interface BookGroup {
	groupId: number;
	groupName: string;
	order: number;
	enableRefresh: boolean;
	show: boolean;
	bookSort: number;
}

// ─── Bookmark ──────────────────────────────────────────────

export interface Bookmark {
	time: number;
	bookUrl: string;
	bookName: string;
	bookAuthor: string;
	chapterIndex: number;
	chapterPos: number;
	chapterName: string;
	bookText: string;
	content: string;
}

// ─── SearchKeyword ─────────────────────────────────────────

export interface SearchKeyword {
	word: string;
	usage: number;
	lastUseTime: number;
}

// ─── Cache ─────────────────────────────────────────────────

export interface Cache {
	key: string;
	value?: string;
	deadline: number;
}

// ─── ReplaceRule ───────────────────────────────────────────

export interface ReplaceRule {
	id: number;
	name: string;
	group?: string;
	pattern: string;
	replacement: string;
	scope?: string;
	scopeTitle: boolean;
	scopeContent: boolean;
	excludeScope?: string;
	isEnabled: boolean;
	isRegex: boolean;
	timeoutMillisecond: number;
	order: number;
}

// ─── Cookie ────────────────────────────────────────────────

export interface Cookie {
	url: string;
	cookie: string;
}
```

- [ ] **Step 4: Create database.ts**

```typescript
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
```

- [ ] **Step 5: Create database test**

Create `packages/persistence/__tests__/database.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";

describe("ReaderXDB", () => {
	it("creates all tables", () => {
		const testDb = createDB("test-tables");
		expect(testDb.bookSources).toBeDefined();
		expect(testDb.books).toBeDefined();
		expect(testDb.chapters).toBeDefined();
		expect(testDb.bookGroups).toBeDefined();
		expect(testDb.bookmarks).toBeDefined();
		expect(testDb.searchKeywords).toBeDefined();
		expect(testDb.caches).toBeDefined();
		expect(testDb.replaceRules).toBeDefined();
		expect(testDb.cookies).toBeDefined();
		return testDb.delete();
	});

	it("opens without error", async () => {
		const testDb = createDB("test-open");
		await testDb.open();
		expect(testDb.isOpen()).toBe(true);
		await testDb.delete();
	});
});
```

- [ ] **Step 6: Verify**

```bash
cd /Users/logan/Desktop/workspaces/front/readerx
pnpm --filter @readerx/persistence typecheck
pnpm --filter @readerx/persistence test
```

- [ ] **Step 7: Commit**

```bash
git add packages/persistence/
git commit -m "feat(persistence): add types, Dexie database, and test setup"
```

---

### Task 2: BookSourceRepository

**Files:**
- Create: `packages/persistence/src/book-source-repo.ts`
- Create: `packages/persistence/__tests__/book-source-repo.test.ts`

- [ ] **Step 1: Create book-source-repo.ts**

```typescript
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
		return this.table.where("enabled").equals(1).toArray();
	}

	async getEnabledExplore(): Promise<BookSourceRecord[]> {
		return this.table
			.where("enabledExplore")
			.equals(1)
			.toArray();
	}

	async getByGroup(group: string): Promise<BookSourceRecord[]> {
		return this.table
			.where("bookSourceGroup")
			.equals(group)
			.toArray();
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
		const count = await this.table.where("bookSourceUrl").equals(url).count();
		return count > 0;
	}
}
```

- [ ] **Step 2: Create book-source-repo test**

Create `packages/persistence/__tests__/book-source-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { BookSourceRepository } from "../src/book-source-repo";
import type { BookSourceRecord } from "../src/types";

function makeSource(
	override: Partial<BookSourceRecord> = {},
): BookSourceRecord {
	return {
		bookSourceUrl: "https://example.com",
		bookSourceName: "Test Source",
		bookSourceType: 0,
		enabled: true,
		enabledExplore: true,
		customOrder: 0,
		lastUpdateTime: 0,
		weight: 0,
		respondTime: 180000,
		...override,
	};
}

describe("BookSourceRepository", () => {
	async function setup() {
		const testDb = createDB(`test-bs-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookSourceRepository(testDb.bookSources);
		return { testDb, repo };
	}

	it("saves and retrieves a source", async () => {
		const { testDb, repo } = await setup();
		const source = makeSource();
		await repo.save(source);
		const result = await repo.get("https://example.com");
		expect(result?.bookSourceName).toBe("Test Source");
		await testDb.delete();
	});

	it("overwrites on duplicate save", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeSource({ bookSourceName: "v1" }));
		await repo.save(
			makeSource({ bookSourceName: "v2" }),
		);
		const result = await repo.get("https://example.com");
		expect(result?.bookSourceName).toBe("v2");
		await testDb.delete();
	});

	it("deletes a source", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeSource());
		await repo.delete("https://example.com");
		const result = await repo.get("https://example.com");
		expect(result).toBeUndefined();
		await testDb.delete();
	});

	it("batch saves multiple sources", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({ bookSourceUrl: "https://a.com", bookSourceName: "A" }),
			makeSource({ bookSourceUrl: "https://b.com", bookSourceName: "B" }),
		]);
		const count = await repo.count();
		expect(count).toBe(2);
		await testDb.delete();
	});

	it("returns all sources", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({ bookSourceUrl: "https://a.com" }),
			makeSource({ bookSourceUrl: "https://b.com" }),
		]);
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
		await testDb.delete();
	});

	it("searches by name", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeSource({
				bookSourceUrl: "https://a.com",
				bookSourceName: "Hello World",
			}),
			makeSource({
				bookSourceUrl: "https://b.com",
				bookSourceName: "Goodbye",
			}),
		]);
		const results = await repo.search("hello");
		expect(results).toHaveLength(1);
		expect(results[0]?.bookSourceName).toBe("Hello World");
		await testDb.delete();
	});

	it("enables and disables a source", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeSource({ enabled: true }));
		await repo.enable("https://example.com", false);
		const result = await repo.get("https://example.com");
		expect(result?.enabled).toBe(false);
		await testDb.delete();
	});

	it("checks existence", async () => {
		const { testDb, repo } = await setup();
		expect(await repo.has("https://example.com")).toBe(false);
		await repo.save(makeSource());
		expect(await repo.has("https://example.com")).toBe(true);
		await testDb.delete();
	});
});
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @readerx/persistence test
```

- [ ] **Step 4: Commit**

```bash
git add packages/persistence/src/book-source-repo.ts packages/persistence/__tests__/book-source-repo.test.ts
git commit -m "feat(persistence): add BookSourceRepository with CRUD and search"
```

---

### Task 3: BookRepository

**Files:**
- Create: `packages/persistence/src/book-repo.ts`
- Create: `packages/persistence/__tests__/book-repo.test.ts`

- [ ] **Step 1: Create book-repo.ts**

```typescript
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
		return this.table
			.where("groupIds")
			.equals(groupId)
			.toArray();
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
		const count = await this.table
			.where("bookUrl")
			.equals(bookUrl)
			.count();
		return count > 0;
	}

	async addGroup(bookUrl: string, groupId: number): Promise<void> {
		const book = await this.table.get(bookUrl);
		if (!book) return;
		if (!book.groupIds.includes(groupId)) {
			book.groupIds.push(groupId);
			await this.table.update(bookUrl, { groupIds: book.groupIds });
		}
	}

	async removeGroup(bookUrl: string, groupId: number): Promise<void> {
		const book = await this.table.get(bookUrl);
		if (!book) return;
		const updated = book.groupIds.filter((id) => id !== groupId);
		await this.table.update(bookUrl, { groupIds: updated });
	}
}
```

- [ ] **Step 2: Create book-repo test**

Create `packages/persistence/__tests__/book-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { BookRepository } from "../src/book-repo";
import type { Book } from "../src/types";

function makeBook(override: Partial<Book> = {}): Book {
	return {
		bookUrl: "https://example.com/book/1",
		tocUrl: "",
		name: "Test Book",
		author: "Author",
		type: 0,
		groupIds: [],
		origin: "https://source.com",
		originName: "Source",
		durChapterIndex: 0,
		durChapterPos: 0,
		durChapterTime: 0,
		totalChapterNum: 100,
		canUpdate: true,
		order: 0,
		...override,
	};
}

describe("BookRepository", () => {
	async function setup() {
		const testDb = createDB(`test-book-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookRepository(testDb.books);
		return { testDb, repo };
	}

	it("saves and retrieves a book", async () => {
		const { testDb, repo } = await setup();
		const book = makeBook();
		await repo.save(book);
		const result = await repo.get("https://example.com/book/1");
		expect(result?.name).toBe("Test Book");
		await testDb.delete();
	});

	it("deletes a book", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook());
		await repo.delete("https://example.com/book/1");
		expect(await repo.get("https://example.com/book/1")).toBeUndefined();
		await testDb.delete();
	});

	it("returns all books ordered by order", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook({ bookUrl: "a", order: 2, name: "B" }));
		await repo.save(makeBook({ bookUrl: "b", order: 1, name: "A" }));
		const all = await repo.getAll();
		expect(all.map((b) => b.name)).toEqual(["A", "B"]);
		await testDb.delete();
	});

	it("queries by group", async () => {
		const { testDb, repo } = await setup();
		await repo.save(
			makeBook({ bookUrl: "a", groupIds: [1, 3] }),
		);
		await repo.save(
			makeBook({ bookUrl: "b", groupIds: [2] }),
		);
		await repo.save(
			makeBook({ bookUrl: "c", groupIds: [1, 2] }),
		);
		const group1 = await repo.getByGroup(1);
		expect(group1).toHaveLength(2);
		await testDb.delete();
	});

	it("searches by name and author", async () => {
		const { testDb, repo } = await setup();
		await repo.save(
			makeBook({ bookUrl: "a", name: "Naruto", author: "Kishimoto" }),
		);
		await repo.save(
			makeBook({ bookUrl: "b", name: "One Piece", author: "Oda" }),
		);
		const results = await repo.search("naruto");
		expect(results).toHaveLength(1);
		const byAuthor = await repo.search("oda");
		expect(byAuthor).toHaveLength(1);
		await testDb.delete();
	});

	it("updates reading progress", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook());
		await repo.updateProgress("https://example.com/book/1", 5, 200);
		const result = await repo.get("https://example.com/book/1");
		expect(result?.durChapterIndex).toBe(5);
		expect(result?.durChapterPos).toBe(200);
		expect(result?.durChapterTime).toBeGreaterThan(0);
		await testDb.delete();
	});

	it("adds and removes group", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBook({ groupIds: [1] }));
		await repo.addGroup("https://example.com/book/1", 3);
		let result = await repo.get("https://example.com/book/1");
		expect(result?.groupIds).toEqual([1, 3]);
		await repo.removeGroup("https://example.com/book/1", 1);
		result = await repo.get("https://example.com/book/1");
		expect(result?.groupIds).toEqual([3]);
		await testDb.delete();
	});
});
```

- [ ] **Step 3: Verify + Commit**

```bash
pnpm --filter @readerx/persistence test
git add packages/persistence/src/book-repo.ts packages/persistence/__tests__/book-repo.test.ts
git commit -m "feat(persistence): add BookRepository with group queries and progress"
```

---

### Task 4: BookChapterRepository

**Files:**
- Create: `packages/persistence/src/book-chapter-repo.ts`
- Create: `packages/persistence/__tests__/book-chapter-repo.test.ts`

- [ ] **Step 1: Create book-chapter-repo.ts**

```typescript
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
		return this.table
			.where("bookUrl")
			.equals(bookUrl)
			.sortBy("index");
	}

	async getByBookRange(
		bookUrl: string,
		start: number,
		end: number,
	): Promise<BookChapter[]> {
		return this.table
			.where("[bookUrl+index]")
			.between(
				[bookUrl, start],
				[bookUrl, end],
				true,
				true,
			)
			.toArray();
	}

	async get(
		bookUrl: string,
		url: string,
	): Promise<BookChapter | undefined> {
		return this.table
			.where("[url+bookUrl]")
			.equals([url, bookUrl])
			.first();
	}

	async getByIndex(
		bookUrl: string,
		index: number,
	): Promise<BookChapter | undefined> {
		return this.table
			.where("[bookUrl+index]")
			.equals([bookUrl, index])
			.first();
	}

	async deleteByBook(bookUrl: string): Promise<void> {
		await this.table.where("bookUrl").equals(bookUrl).delete();
	}

	async count(bookUrl: string): Promise<number> {
		return this.table.where("bookUrl").equals(bookUrl).count();
	}
}
```

- [ ] **Step 2: Create book-chapter-repo test**

Create `packages/persistence/__tests__/book-chapter-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { BookChapterRepository } from "../src/book-chapter-repo";
import type { BookChapter } from "../src/types";

function makeChapter(
	override: Partial<BookChapter> = {},
): BookChapter {
	return {
		url: "https://example.com/ch/1",
		bookUrl: "https://example.com/book",
		title: "Chapter 1",
		index: 0,
		isVolume: false,
		isVip: false,
		isPay: false,
		...override,
	};
}

describe("BookChapterRepository", () => {
	async function setup() {
		const testDb = createDB(
			`test-ch-${Date.now()}-${Math.random()}`,
		);
		await testDb.open();
		const repo = new BookChapterRepository(testDb.chapters);
		return { testDb, repo };
	}

	it("saves and retrieves chapters by book", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch1", index: 0, title: "Ch 0" }),
			makeChapter({ url: "ch2", index: 1, title: "Ch 1" }),
			makeChapter({
				url: "ch3",
				index: 2,
				title: "Ch 2",
				bookUrl: "other-book",
			}),
		]);
		const chapters = await repo.getByBook("https://example.com/book");
		expect(chapters).toHaveLength(2);
		expect(chapters[0]?.index).toBe(0);
		expect(chapters[1]?.index).toBe(1);
		await testDb.delete();
	});

	it("gets chapter by composite key", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([makeChapter()]);
		const ch = await repo.get(
			"https://example.com/book",
			"https://example.com/ch/1",
		);
		expect(ch?.title).toBe("Chapter 1");
		await testDb.delete();
	});

	it("gets chapter by index", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([makeChapter()]);
		const ch = await repo.getByIndex("https://example.com/book", 0);
		expect(ch?.title).toBe("Chapter 1");
		await testDb.delete();
	});

	it("deletes all chapters for a book", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch1", index: 0 }),
			makeChapter({ url: "ch2", index: 1 }),
		]);
		await repo.deleteByBook("https://example.com/book");
		const chapters = await repo.getByBook("https://example.com/book");
		expect(chapters).toHaveLength(0);
		await testDb.delete();
	});

	it("queries range of chapters", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch0", index: 0 }),
			makeChapter({ url: "ch1", index: 1 }),
			makeChapter({ url: "ch2", index: 2 }),
			makeChapter({ url: "ch3", index: 3 }),
		]);
		const range = await repo.getByBookRange(
			"https://example.com/book",
			1,
			2,
		);
		expect(range).toHaveLength(2);
		expect(range[0]?.index).toBe(1);
		expect(range[1]?.index).toBe(2);
		await testDb.delete();
	});

	it("counts chapters for a book", async () => {
		const { testDb, repo } = await setup();
		await repo.saveBatch([
			makeChapter({ url: "ch1", index: 0 }),
			makeChapter({ url: "ch2", index: 1 }),
		]);
		const count = await repo.count("https://example.com/book");
		expect(count).toBe(2);
		await testDb.delete();
	});
});
```

- [ ] **Step 3: Verify + Commit**

```bash
pnpm --filter @readerx/persistence test
git add packages/persistence/src/book-chapter-repo.ts packages/persistence/__tests__/book-chapter-repo.test.ts
git commit -m "feat(persistence): add BookChapterRepository with range queries"
```

---

### Task 5: BookGroupRepository

**Files:**
- Create: `packages/persistence/src/book-group-repo.ts`
- Create: `packages/persistence/__tests__/book-group-repo.test.ts`

- [ ] **Step 1: Create book-group-repo.ts**

```typescript
import type { Table } from "dexie";
import type { BookGroup } from "./types";

const SYSTEM_GROUPS: BookGroup[] = [
	{ groupId: -1, groupName: "全部", order: -1, enableRefresh: false, show: true, bookSort: 0 },
	{ groupId: -2, groupName: "本地", order: -2, enableRefresh: false, show: true, bookSort: 0 },
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
```

- [ ] **Step 2: Create book-group-repo test**

Create `packages/persistence/__tests__/book-group-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { BookGroupRepository } from "../src/book-group-repo";
import type { BookGroup } from "../src/types";

function makeGroup(override: Partial<BookGroup> = {}): BookGroup {
	return {
		groupId: 1,
		groupName: "Test Group",
		order: 0,
		enableRefresh: true,
		show: true,
		bookSort: 0,
		...override,
	};
}

describe("BookGroupRepository", () => {
	async function setup() {
		const testDb = createDB(
			`test-bg-${Date.now()}-${Math.random()}`,
		);
		await testDb.open();
		const repo = new BookGroupRepository(testDb.bookGroups);
		return { testDb, repo };
	}

	it("saves and retrieves a group", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup());
		const result = await repo.get(1);
		expect(result?.groupName).toBe("Test Group");
		await testDb.delete();
	});

	it("returns all groups ordered", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup({ groupId: 1, order: 2, groupName: "B" }));
		await repo.save(makeGroup({ groupId: 2, order: 1, groupName: "A" }));
		const all = await repo.getAll();
		expect(all.map((g) => g.groupName)).toEqual(["A", "B"]);
		await testDb.delete();
	});

	it("seeds default groups when empty", async () => {
		const { testDb, repo } = await setup();
		await repo.seedDefaults();
		const all = await repo.getAll();
		expect(all.length).toBeGreaterThanOrEqual(2);
		expect(all.some((g) => g.groupId === -1)).toBe(true);
		await testDb.delete();
	});

	it("does not re-seed when groups exist", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup({ groupId: 99 }));
		await repo.seedDefaults();
		const all = await repo.getAll();
		// Should not duplicate
		const count99 = all.filter((g) => g.groupId === 99).length;
		expect(count99).toBe(1);
		await testDb.delete();
	});

	it("finds group by name", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup({ groupName: "Fantasy" }));
		const result = await repo.getByName("Fantasy");
		expect(result).toBeDefined();
		await testDb.delete();
	});

	it("deletes a group", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeGroup());
		await repo.delete(1);
		expect(await repo.get(1)).toBeUndefined();
		await testDb.delete();
	});
});
```

- [ ] **Step 3: Verify + Commit**

```bash
pnpm --filter @readerx/persistence test
git add packages/persistence/src/book-group-repo.ts packages/persistence/__tests__/book-group-repo.test.ts
git commit -m "feat(persistence): add BookGroupRepository with default seeding"
```

---

### Task 6: Supporting Repositories (Bookmark, SearchKeyword, Cache, ReplaceRule, Cookie)

**Files:**
- Create: `packages/persistence/src/bookmark-repo.ts`
- Create: `packages/persistence/src/search-keyword-repo.ts`
- Create: `packages/persistence/src/cache-repo.ts`
- Create: `packages/persistence/src/replace-rule-repo.ts`
- Create: `packages/persistence/src/cookie-repo.ts`
- Create: `packages/persistence/__tests__/bookmark-repo.test.ts`
- Create: `packages/persistence/__tests__/search-keyword-repo.test.ts`
- Create: `packages/persistence/__tests__/cache-repo.test.ts`
- Create: `packages/persistence/__tests__/replace-rule-repo.test.ts`
- Create: `packages/persistence/__tests__/cookie-repo.test.ts`

These repositories follow the same pattern. Each has CRUD operations plus entity-specific queries.

- [ ] **Step 1: Create bookmark-repo.ts**

```typescript
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
```

- [ ] **Step 2: Create search-keyword-repo.ts**

```typescript
import type { Table } from "dexie";
import type { SearchKeyword } from "./types";

export class SearchKeywordRepository {
	private table: Table<SearchKeyword, string>;

	constructor(table: Table<SearchKeyword, string>) {
		this.table = table;
	}

	async recordUse(word: string): Promise<void> {
		const existing = await this.table.get(word);
		if (existing) {
			await this.table.update(word, {
				usage: existing.usage + 1,
				lastUseTime: Date.now(),
			});
		} else {
			await this.table.put({
				word,
				usage: 1,
				lastUseTime: Date.now(),
			});
		}
	}

	async getByUsage(): Promise<SearchKeyword[]> {
		return this.table.orderBy("usage").reverse().toArray();
	}

	async getByRecent(): Promise<SearchKeyword[]> {
		return this.table.orderBy("lastUseTime").reverse().toArray();
	}

	async search(query: string): Promise<SearchKeyword[]> {
		const q = query.toLowerCase();
		return this.table
			.filter((kw) => kw.word.toLowerCase().includes(q))
			.toArray();
	}

	async delete(word: string): Promise<void> {
		await this.table.delete(word);
	}

	async deleteAll(): Promise<void> {
		await this.table.clear();
	}
}
```

- [ ] **Step 3: Create cache-repo.ts**

```typescript
import type { Table } from "dexie";
import type { Cache } from "./types";

export class CacheRepository {
	private table: Table<Cache, string>;

	constructor(table: Table<Cache, string>) {
		this.table = table;
	}

	async get(key: string): Promise<string | undefined> {
		const entry = await this.table.get(key);
		if (!entry) return undefined;
		if (entry.deadline > 0 && entry.deadline < Date.now()) {
			await this.table.delete(key);
			return undefined;
		}
		return entry.value;
	}

	async set(key: string, value: string, ttlMs?: number): Promise<void> {
		const deadline = ttlMs ? Date.now() + ttlMs : 0;
		await this.table.put({ key, value, deadline });
	}

	async delete(key: string): Promise<void> {
		await this.table.delete(key);
	}

	async clearExpired(): Promise<number> {
		const now = Date.now();
		return this.table
			.where("deadline")
			.below(now)
			.filter((entry) => entry.deadline > 0)
			.delete();
	}
}
```

- [ ] **Step 4: Create replace-rule-repo.ts**

```typescript
import type { Table } from "dexie";
import type { ReplaceRule } from "./types";

export class ReplaceRuleRepository {
	private table: Table<ReplaceRule, number>;

	constructor(table: Table<ReplaceRule, number>) {
		this.table = table;
	}

	async save(rule: ReplaceRule): Promise<void> {
		await this.table.put(rule);
	}

	async get(id: number): Promise<ReplaceRule | undefined> {
		return this.table.get(id);
	}

	async delete(id: number): Promise<void> {
		await this.table.delete(id);
	}

	async getAll(): Promise<ReplaceRule[]> {
		return this.table.orderBy("order").toArray();
	}

	async getEnabled(): Promise<ReplaceRule[]> {
		return this.table
			.where("isEnabled")
			.equals(1)
			.sortBy("order");
	}

	async getByScope(
		name: string,
		origin: string,
		scope: "title" | "content",
	): Promise<ReplaceRule[]> {
		const all = await this.getEnabled();
		return all.filter((rule) => {
			if (scope === "title" && !rule.scopeTitle) return false;
			if (scope === "content" && !rule.scopeContent) return false;
			if (rule.excludeScope) {
				const excludeList = rule.excludeScope.split(",");
				if (excludeList.some((s) => s.trim() === name || s.trim() === origin)) {
					return false;
				}
			}
			if (rule.scope) {
				const scopeList = rule.scope.split(",");
				return scopeList.some(
					(s) => s.trim() === name || s.trim() === origin,
				);
			}
			return true;
		});
	}
}
```

- [ ] **Step 5: Create cookie-repo.ts**

```typescript
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
```

- [ ] **Step 6: Create tests for all 5 repositories**

`__tests__/bookmark-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { BookmarkRepository } from "../src/bookmark-repo";
import type { Bookmark } from "../src/types";

function makeBookmark(override: Partial<Bookmark> = {}): Bookmark {
	return {
		time: Date.now(),
		bookUrl: "https://example.com/book/1",
		bookName: "Test Book",
		bookAuthor: "Author",
		chapterIndex: 0,
		chapterPos: 100,
		chapterName: "Chapter 1",
		bookText: "some text",
		content: "bookmark content",
		...override,
	};
}

describe("BookmarkRepository", () => {
	async function setup() {
		const testDb = createDB(`test-bm-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new BookmarkRepository(testDb.bookmarks);
		return { testDb, repo };
	}

	it("saves and retrieves a bookmark", async () => {
		const { testDb, repo } = await setup();
		const bm = makeBookmark({ time: 1000 });
		await repo.save(bm);
		const result = await repo.get(1000);
		expect(result?.content).toBe("bookmark content");
		await testDb.delete();
	});

	it("queries bookmarks by book", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBookmark({ time: 1, bookName: "A", bookAuthor: "X" }));
		await repo.save(makeBookmark({ time: 2, bookName: "A", bookAuthor: "X" }));
		await repo.save(makeBookmark({ time: 3, bookName: "B", bookAuthor: "Y" }));
		const results = await repo.getByBook("A", "X");
		expect(results).toHaveLength(2);
		await testDb.delete();
	});

	it("deletes a bookmark", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeBookmark({ time: 1000 }));
		await repo.delete(1000);
		expect(await repo.get(1000)).toBeUndefined();
		await testDb.delete();
	});
});
```

`__tests__/search-keyword-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { SearchKeywordRepository } from "../src/search-keyword-repo";

describe("SearchKeywordRepository", () => {
	async function setup() {
		const testDb = createDB(`test-sk-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new SearchKeywordRepository(testDb.searchKeywords);
		return { testDb, repo };
	}

	it("creates keyword on first use", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("hello");
		const byUsage = await repo.getByUsage();
		expect(byUsage).toHaveLength(1);
		expect(byUsage[0]?.usage).toBe(1);
		await testDb.delete();
	});

	it("increments usage on repeat", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("hello");
		await repo.recordUse("hello");
		await repo.recordUse("hello");
		const byUsage = await repo.getByUsage();
		expect(byUsage[0]?.usage).toBe(3);
		await testDb.delete();
	});

	it("sorts by usage descending", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("a");
		await repo.recordUse("b");
		await repo.recordUse("b");
		await repo.recordUse("c");
		await repo.recordUse("c");
		await repo.recordUse("c");
		const byUsage = await repo.getByUsage();
		expect(byUsage.map((k) => k.word)).toEqual(["c", "b", "a"]);
		await testDb.delete();
	});

	it("searches keywords", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("fantasy");
		await repo.recordUse("science fiction");
		await repo.recordUse("history");
		const results = await repo.search("fan");
		expect(results).toHaveLength(1);
		await testDb.delete();
	});

	it("deletes all keywords", async () => {
		const { testDb, repo } = await setup();
		await repo.recordUse("a");
		await repo.recordUse("b");
		await repo.deleteAll();
		const byUsage = await repo.getByUsage();
		expect(byUsage).toHaveLength(0);
		await testDb.delete();
	});
});
```

`__tests__/cache-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { CacheRepository } from "../src/cache-repo";

describe("CacheRepository", () => {
	async function setup() {
		const testDb = createDB(`test-cache-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new CacheRepository(testDb.caches);
		return { testDb, repo };
	}

	it("sets and gets a value", async () => {
		const { testDb, repo } = await setup();
		await repo.set("key1", "value1");
		expect(await repo.get("key1")).toBe("value1");
		await testDb.delete();
	});

	it("returns undefined for missing key", async () => {
		const { testDb, repo } = await setup();
		expect(await repo.get("missing")).toBeUndefined();
		await testDb.delete();
	});

	it("respects TTL expiry", async () => {
		const { testDb, repo } = await setup();
		await repo.set("expired", "data", 1); // 1ms TTL
		await new Promise((r) => setTimeout(r, 10));
		expect(await repo.get("expired")).toBeUndefined();
		await testDb.delete();
	});

	it("keeps entry with no TTL", async () => {
		const { testDb, repo } = await setup();
		await repo.set("permanent", "data"); // no TTL
		expect(await repo.get("permanent")).toBe("data");
		await testDb.delete();
	});

	it("clears expired entries", async () => {
		const { testDb, repo } = await setup();
		await repo.set("expired", "data", 1);
		await repo.set("valid", "data");
		await new Promise((r) => setTimeout(r, 10));
		const deleted = await repo.clearExpired();
		expect(deleted).toBe(1);
		expect(await repo.get("valid")).toBe("data");
		await testDb.delete();
	});

	it("deletes a key", async () => {
		const { testDb, repo } = await setup();
		await repo.set("key1", "value1");
		await repo.delete("key1");
		expect(await repo.get("key1")).toBeUndefined();
		await testDb.delete();
	});
});
```

`__tests__/replace-rule-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { ReplaceRuleRepository } from "../src/replace-rule-repo";
import type { ReplaceRule } from "../src/types";

function makeRule(override: Partial<ReplaceRule> = {}): ReplaceRule {
	return {
		id: 1,
		name: "test rule",
		pattern: "foo",
		replacement: "bar",
		scopeTitle: true,
		scopeContent: true,
		isEnabled: true,
		isRegex: false,
		timeoutMillisecond: 0,
		order: 0,
		...override,
	};
}

describe("ReplaceRuleRepository", () => {
	async function setup() {
		const testDb = createDB(`test-rr-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new ReplaceRuleRepository(testDb.replaceRules);
		return { testDb, repo };
	}

	it("saves and retrieves a rule", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule());
		const result = await repo.get(1);
		expect(result?.pattern).toBe("foo");
		await testDb.delete();
	});

	it("returns all rules ordered", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule({ id: 1, order: 2, name: "B" }));
		await repo.save(makeRule({ id: 2, order: 1, name: "A" }));
		const all = await repo.getAll();
		expect(all.map((r) => r.name)).toEqual(["A", "B"]);
		await testDb.delete();
	});

	it("gets enabled rules", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeRule({ id: 1, isEnabled: true }));
		await repo.save(makeRule({ id: 2, isEnabled: false }));
		const enabled = await repo.getEnabled();
		expect(enabled).toHaveLength(1);
		await testDb.delete();
	});

	it("filters by scope", async () => {
		const { testDb, repo } = await setup();
		await repo.save(
			makeRule({
				id: 1,
				scopeTitle: true,
				scopeContent: false,
				isEnabled: true,
			}),
		);
		await repo.save(
			makeRule({
				id: 2,
				scopeTitle: false,
				scopeContent: true,
				isEnabled: true,
			}),
		);
		const titleRules = await repo.getByScope("book", "origin", "title");
		expect(titleRules).toHaveLength(1);
		expect(titleRules[0]?.id).toBe(1);
		const contentRules = await repo.getByScope("book", "origin", "content");
		expect(contentRules).toHaveLength(1);
		expect(contentRules[0]?.id).toBe(2);
		await testDb.delete();
	});
});
```

`__tests__/cookie-repo.test.ts`:

```typescript
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createDB } from "../src/database";
import { CookieRepository } from "../src/cookie-repo";
import type { Cookie } from "../src/types";

function makeCookie(override: Partial<Cookie> = {}): Cookie {
	return { url: "https://example.com", cookie: "session=abc", ...override };
}

describe("CookieRepository", () => {
	async function setup() {
		const testDb = createDB(`test-cookie-${Date.now()}-${Math.random()}`);
		await testDb.open();
		const repo = new CookieRepository(testDb.cookies);
		return { testDb, repo };
	}

	it("saves and retrieves a cookie", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie());
		const result = await repo.get("https://example.com");
		expect(result?.cookie).toBe("session=abc");
		await testDb.delete();
	});

	it("overwrites on duplicate save", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie({ cookie: "v1" }));
		await repo.save(makeCookie({ cookie: "v2" }));
		const result = await repo.get("https://example.com");
		expect(result?.cookie).toBe("v2");
		await testDb.delete();
	});

	it("deletes a cookie", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie());
		await repo.delete("https://example.com");
		expect(await repo.get("https://example.com")).toBeUndefined();
		await testDb.delete();
	});

	it("returns all cookies", async () => {
		const { testDb, repo } = await setup();
		await repo.save(makeCookie({ url: "https://a.com" }));
		await repo.save(makeCookie({ url: "https://b.com" }));
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
		await testDb.delete();
	});
});
```

- [ ] **Step 7: Verify all tests**

```bash
pnpm --filter @readerx/persistence test
```

- [ ] **Step 8: Commit**

```bash
git add packages/persistence/
git commit -m "feat(persistence): add Bookmark, SearchKeyword, Cache, ReplaceRule, Cookie repositories"
```

---

### Task 7: OPFS Implementation

**Files:**
- Modify: `packages/persistence/src/opfs.ts`
- Create: `packages/persistence/__tests__/opfs.test.ts`

- [ ] **Step 1: Update opfs.ts**

Replace entire file with:

```typescript
/**
 * OPFS（Origin Private File System）文件存储
 * 用于存储二进制数据（书籍内容缓存、封面图片等）
 */

export class OPFSStorage {
	private root: FileSystemDirectoryHandle | null = null;

	private async getRoot(): Promise<FileSystemDirectoryHandle> {
		if (!this.root) {
			this.root = await navigator.storage.getDirectory();
		}
		return this.root;
	}

	private async getFileHandle(
		path: string,
		create = false,
	): Promise<FileSystemFileHandle> {
		const parts = path.split("/").filter(Boolean);
		const fileName = parts.pop();
		if (!fileName) {
			throw new Error(`Invalid path: ${path}`);
		}
		let dir = await this.getRoot();
		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part, { create });
		}
		return dir.getFileHandle(fileName, { create });
	}

	async writeFile(path: string, data: ArrayBuffer): Promise<void> {
		const handle = await this.getFileHandle(path, true);
		const writable = await handle.createWritable();
		try {
			await writable.write(data);
		} finally {
			await writable.close();
		}
	}

	async readFile(path: string): Promise<ArrayBuffer | null> {
		try {
			const handle = await this.getFileHandle(path);
			const file = await handle.getFile();
			return file.arrayBuffer();
		} catch {
			return null;
		}
	}

	async deleteFile(path: string): Promise<void> {
		const parts = path.split("/").filter(Boolean);
		const fileName = parts.pop();
		if (!fileName) return;
		let dir = await this.getRoot();
		for (const part of parts) {
			dir = await dir.getDirectoryHandle(part);
		}
		await dir.removeEntry(fileName);
	}

	async exists(path: string): Promise<boolean> {
		try {
			await this.getFileHandle(path);
			return true;
		} catch {
			return false;
		}
	}
}
```

- [ ] **Step 2: Note on OPFS testing**

OPFS API (`navigator.storage.getDirectory()`) is only available in secure browser contexts. In Node/Vitest, it cannot be tested directly. Tests should mock the OPFS APIs.

Create `__tests__/opfs.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { OPFSStorage } from "../src/opfs";

function mockFileSystemFileHandle(
	content: ArrayBuffer,
): FileSystemFileHandle {
	return {
		kind: "file",
		name: "test",
		isSameEntry: vi.fn(),
		getFile: vi.fn().mockResolvedValue({
			arrayBuffer: vi.fn().mockResolvedValue(content),
		}),
		createWritable: vi.fn().mockResolvedValue({
			write: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
		}),
	} as unknown as FileSystemFileHandle;
}

describe("OPFSStorage", () => {
	it("writeFile calls storage API", async () => {
		const rootDir = {
			getDirectoryHandle: vi.fn().mockResolvedValue({
				getFileHandle: vi
					.fn()
					.mockResolvedValue(
						mockFileSystemFileHandle(new ArrayBuffer(0)),
					),
			}),
		};
		vi.spyOn(navigator.storage, "getDirectory").mockResolvedValue(
			rootDir as unknown as FileSystemDirectoryHandle,
		);

		const storage = new OPFSStorage();
		const data = new TextEncoder().encode("hello").buffer;
		await storage.writeFile("book/1.txt", data);

		expect(navigator.storage.getDirectory).toHaveBeenCalled();
		vi.restoreAllMocks();
	});

	it("readFile returns null for missing file", async () => {
		const rootDir = {
			getDirectoryHandle: vi
				.fn()
				.mockRejectedValue(new Error("not found")),
		};
		vi.spyOn(navigator.storage, "getDirectory").mockResolvedValue(
			rootDir as unknown as FileSystemDirectoryHandle,
		);

		const storage = new OPFSStorage();
		const result = await storage.readFile("missing.txt");
		expect(result).toBeNull();
		vi.restoreAllMocks();
	});

	it("exists returns false for missing file", async () => {
		const rootDir = {
			getDirectoryHandle: vi
				.fn()
				.mockRejectedValue(new Error("not found")),
		};
		vi.spyOn(navigator.storage, "getDirectory").mockResolvedValue(
			rootDir as unknown as FileSystemDirectoryHandle,
		);

		const storage = new OPFSStorage();
		expect(await storage.exists("missing.txt")).toBe(false);
		vi.restoreAllMocks();
	});
});
```

- [ ] **Step 3: Verify + Commit**

```bash
pnpm --filter @readerx/persistence test
git add packages/persistence/src/opfs.ts packages/persistence/__tests__/opfs.test.ts
git commit -m "feat(persistence): implement OPFS file storage with mocked tests"
```

---

### Task 8: Update index.ts + Final Integration

**Files:**
- Modify: `packages/persistence/src/index.ts`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Update index.ts**

Replace with clean exports:

```typescript
// Database
export { createDB, db, DB_NAME, DB_VERSION } from "./database";
export type { ReaderXDB } from "./database";

// Repositories
export { BookSourceRepository } from "./book-source-repo";
export { BookRepository } from "./book-repo";
export { BookChapterRepository } from "./book-chapter-repo";
export { BookGroupRepository } from "./book-group-repo";
export { BookmarkRepository } from "./bookmark-repo";
export { SearchKeywordRepository } from "./search-keyword-repo";
export { CacheRepository } from "./cache-repo";
export { ReplaceRuleRepository } from "./replace-rule-repo";
export { CookieRepository } from "./cookie-repo";

// OPFS
export { OPFSStorage } from "./opfs";

// Types
export type {
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
```

- [ ] **Step 2: Run full verification**

```bash
pnpm --filter @readerx/persistence typecheck
pnpm --filter @readerx/persistence lint
pnpm --filter @readerx/persistence test
```

- [ ] **Step 3: Update docs/roadmap.md**

Change persistence row:

```
| persistence | IndexedDB(Dexie) + OPFS + 9 Repositories, 45+ 测试 | ✅ 完成 |
```

- [ ] **Step 4: Commit**

```bash
git add packages/persistence/src/index.ts docs/roadmap.md
git commit -m "feat(persistence): finalize exports and update roadmap"
```
