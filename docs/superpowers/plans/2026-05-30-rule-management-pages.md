# Rule Management Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 rule management pages under /my — rewrite source-manager with Tailwind + shadcn/ui, add RSS source manager, replace-rule manager, TXT rule manager, and dict rule manager.

**Architecture:** Two-tier repository (BaseDexieRepository<T> + concrete repos). Composable type traits (EnableableEntity, SortableEntity, TimestampEntity). Query keys without search/filter (client-side useMemo). Source manager and RSS source manager use Workspace mode; replace-rule is independent feature; TXT/dict use SimpleRuleManager template.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand 5, TanStack Query 5, shadcn/ui + Radix UI + Tailwind CSS 4, Zod 4, Dexie (IndexedDB), next-intl, Lucide icons, Sonner toasts

---

## File Structure

### New files (~28)

```
packages/persistence/src/base-repository.ts
packages/persistence/src/rss-source-repo.ts
packages/persistence/src/txt-toc-rule-repo.ts
packages/persistence/src/dict-rule-repo.ts
packages/persistence/__tests__/base-repository.test.ts
packages/persistence/__tests__/rss-source-repo.test.ts
packages/rule-engine/src/rule-schemas.ts
apps/web/app/my/rss-sources/page.tsx
apps/web/app/my/replace-rules/page.tsx
apps/web/app/my/txt-rules/page.tsx
apps/web/app/my/dict-rules/page.tsx
apps/web/features/rss-source-manager/components/rss-source-workspace.tsx
apps/web/features/rss-source-manager/components/rss-source-list-panel.tsx
apps/web/features/rss-source-manager/components/rss-source-list-item.tsx
apps/web/features/rss-source-manager/components/rss-source-editor-panel.tsx
apps/web/features/rss-source-manager/components/rss-source-empty-state.tsx
apps/web/features/rss-source-manager/hooks/use-rss-sources.ts
apps/web/features/rss-source-manager/hooks/use-rss-source-detail.ts
apps/web/features/rss-source-manager/store.ts
apps/web/features/rss-source-manager/types.ts
apps/web/features/rss-source-manager/index.ts
apps/web/features/replace-rule-manager/components/replace-rule-page.tsx
apps/web/features/replace-rule-manager/components/replace-rule-list-item.tsx
apps/web/features/replace-rule-manager/components/replace-rule-edit-dialog.tsx
apps/web/features/replace-rule-manager/hooks/use-replace-rules.ts
apps/web/features/replace-rule-manager/index.ts
apps/web/features/simple-rule-manager/components/rule-list-page.tsx
apps/web/features/simple-rule-manager/components/rule-list-item.tsx
apps/web/features/simple-rule-manager/components/rule-edit-dialog.tsx
apps/web/features/simple-rule-manager/components/rule-empty-state.tsx
apps/web/features/simple-rule-manager/hooks/use-simple-rules.ts
apps/web/features/simple-rule-manager/types.ts
apps/web/features/simple-rule-manager/index.ts
apps/web/features/txt-rule-manager/config.ts
apps/web/features/txt-rule-manager/index.ts
apps/web/features/dict-rule-manager/config.ts
apps/web/features/dict-rule-manager/index.ts
```

### Rewrite files (~13)

```
apps/web/features/source-manager/components/source-workspace.tsx
apps/web/features/source-manager/components/source-list.tsx
apps/web/features/source-manager/components/source-list-item.tsx
apps/web/features/source-manager/components/source-editor.tsx
apps/web/features/source-manager/components/source-filter-bar.tsx
apps/web/features/source-manager/components/source-debugger.tsx
apps/web/features/source-manager/components/source-empty-state.tsx
apps/web/features/source-manager/components/import-dialog.tsx
apps/web/features/source-manager/components/rule-field-editor.tsx
apps/web/features/source-manager/components/rule-section.tsx
apps/web/features/source-manager/components/debug-console.tsx
apps/web/features/source-manager/components/debug-pipeline.tsx
apps/web/features/source-manager/components/debug-result-viewer.tsx
apps/web/features/source-manager/components/import-result-report.tsx
```

### Modify files (~8)

```
packages/persistence/src/types.ts
packages/persistence/src/database.ts
packages/persistence/src/replace-rule-repo.ts
packages/persistence/src/index.ts
packages/rule-engine/src/index.ts
apps/web/messages/zh.json
apps/web/messages/en.json
apps/web/app/my/sources/page.tsx
apps/web/features/source-manager/hooks/use-sources.ts
apps/web/features/source-manager/hooks/use-source-detail.ts
apps/web/features/source-manager/store.ts
apps/web/features/source-manager/types.ts
apps/web/features/source-manager/index.ts
```

---

## Phase 1 — Data Layer

### Task 1: Add type traits and new entity types to persistence

**Files:**
- Modify: `packages/persistence/src/types.ts`

- [ ] **Step 1: Add composable type traits and new entity types**

Add after the existing `Cookie` type at the end of the file:

```ts
// ─── Composable Type Traits ─────────────────────────────────

type EnableableEntity = {
	enabled: boolean;
};

type SortableEntity = {
	order: number;
};

type TimestampEntity = {
	createdAt: number;
	updatedAt: number;
};

// ─── RssSource ────────────────────────────────────────────────

type RssSourceRecord = {
	sourceUrl: string;
	sourceName: string;
	sourceGroup?: string;
	enabled: boolean;
	customOrder: number;
	createdAt: number;
	updatedAt: number;
	raw: Record<string, unknown>;
};

// ─── TxtTocRule ───────────────────────────────────────────────

type TxtTocRule = EnableableEntity & {
	id: string;
	name: string;
	rule: string;
};

// ─── DictRule ─────────────────────────────────────────────────

type DictRule = EnableableEntity & {
	id: string;
	name: string;
	urlRule?: string;
	showRule?: string;
};
```

Also update the existing `ReplaceRule` type — change `id?: number` to `id: string`, add `createdAt` and `updatedAt`, rename `isEnabled` to `enabled`:

```ts
// ─── ReplaceRule ───────────────────────────────────────────

type ReplaceRule = EnableableEntity &
	SortableEntity &
	TimestampEntity & {
		id: string;
		name: string;
		group?: string;
		pattern: string;
		replacement: string;
		scope?: string;
		scopeTitle: boolean;
		scopeContent: boolean;
		excludeScope?: string;
		isRegex: boolean;
		timeoutMillisecond: number;
	};
```

- [ ] **Step 2: Run typecheck to verify**

Run: `cd packages/persistence && pnpm typecheck`
Expected: Errors in `replace-rule-repo.ts` and `database.ts` because ReplaceRule type changed — this is expected, fixed in Task 3 and Task 4.

- [ ] **Step 3: Commit**

```bash
git add packages/persistence/src/types.ts
git commit -m "feat(persistence): add type traits and new entity types (RssSource, TxtTocRule, DictRule, ReplaceRule upgrade)"
```

---

### Task 2: Dexie v1 → v2 migration

**Files:**
- Modify: `packages/persistence/src/database.ts`

- [ ] **Step 1: Update database schema to v2**

Replace the entire `database.ts` content:

```ts
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
```

Note: Dexie handles v1→v2 migration automatically. The `replaceRules` index changes from `++id` to `id` — existing auto-increment IDs will be lost but dev stage data is 0.

- [ ] **Step 2: Commit**

```bash
git add packages/persistence/src/database.ts
git commit -m "feat(persistence): Dexie v2 migration — add rssSources, txtTocRules, dictRules tables, update replaceRules index"
```

---

### Task 3: BaseDexieRepository<T> generic class

**Files:**
- Create: `packages/persistence/src/base-repository.ts`
- Create: `packages/persistence/__tests__/base-repository.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/persistence/__tests__/base-repository.test.ts
import { Dexie } from "dexie";
import fakeIndexedDB from "fake-indexeddb";
import type { Table } from "dexie";
import { describe, it, expect, beforeEach } from "vitest";
import { BaseDexieRepository } from "../src/base-repository";

type TestEntity = {
	id: string;
	name: string;
	enabled: boolean;
};

class TestDB extends Dexie {
	items!: Table<TestEntity, string>;
	constructor() {
		super("test-db", { indexedDB: fakeIndexedDB });
		this.version(1).stores({ items: "id, name, enabled" });
	}
}

function makeRepo(): { repo: BaseDexieRepository<TestEntity>; db: TestDB } {
	const db = new TestDB();
	const repo = new BaseDexieRepository<TestEntity>(db.items);
	return { repo, db };
}

describe("BaseDexieRepository", () => {
	beforeEach(async () => {
		const db = new TestDB();
		await db.items.clear();
		db.close();
	});

	it("saves and retrieves an entity by id", async () => {
		const { repo } = makeRepo();
		const entity: TestEntity = { id: "a", name: "Alpha", enabled: true };
		await repo.save(entity);
		const result = await repo.getById("a");
		expect(result).toEqual(entity);
	});

	it("getAll returns all entities", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "1", name: "A", enabled: true });
		await repo.save({ id: "2", name: "B", enabled: false });
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
	});

	it("delete removes an entity", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "x", name: "X", enabled: true });
		await repo.delete("x");
		const result = await repo.getById("x");
		expect(result).toBeUndefined();
	});

	it("deleteBatch removes multiple entities", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "1", name: "A", enabled: true });
		await repo.save({ id: "2", name: "B", enabled: true });
		await repo.save({ id: "3", name: "C", enabled: true });
		await repo.deleteBatch(["1", "3"]);
		const all = await repo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0]?.id).toBe("2");
	});

	it("save upserts an existing entity", async () => {
		const { repo } = makeRepo();
		await repo.save({ id: "a", name: "Old", enabled: true });
		await repo.save({ id: "a", name: "New", enabled: false });
		const result = await repo.getById("a");
		expect(result?.name).toBe("New");
		expect(result?.enabled).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/persistence && pnpm test -- __tests__/base-repository.test.ts`
Expected: FAIL — `Cannot find module '../src/base-repository'`

- [ ] **Step 3: Write implementation**

```ts
// packages/persistence/src/base-repository.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/persistence && pnpm test -- __tests__/base-repository.test.ts`
Expected: PASS — all 5 tests green

- [ ] **Step 5: Commit**

```bash
git add packages/persistence/src/base-repository.ts packages/persistence/__tests__/base-repository.test.ts
git commit -m "feat(persistence): add BaseDexieRepository<T> with tests"
```

---

### Task 4: Concrete repositories (RssSource, TxtTocRule, DictRule) + update ReplaceRuleRepository

**Files:**
- Create: `packages/persistence/src/rss-source-repo.ts`
- Create: `packages/persistence/src/txt-toc-rule-repo.ts`
- Create: `packages/persistence/src/dict-rule-repo.ts`
- Modify: `packages/persistence/src/replace-rule-repo.ts`

- [ ] **Step 1: Create RssSourceRepository**

```ts
// packages/persistence/src/rss-source-repo.ts
import type { Table } from "dexie";
import type { RssSourceRecord } from "./types";

/**
 * RssSource uses sourceUrl (not id) as PK.
 * Does not extend BaseDexieRepository because of different PK type.
 */
class RssSourceRepository {
	private table: Table<RssSourceRecord, string>;

	constructor(table: Table<RssSourceRecord, string>) {
		this.table = table;
	}

	async getAll(): Promise<RssSourceRecord[]> {
		return this.table.toArray();
	}

	async get(sourceUrl: string): Promise<RssSourceRecord | undefined> {
		return this.table.get(sourceUrl);
	}

	async save(source: RssSourceRecord): Promise<void> {
		await this.table.put(source);
	}

	async saveBatch(sources: RssSourceRecord[]): Promise<void> {
		await this.table.bulkPut(sources);
	}

	async delete(sourceUrl: string): Promise<void> {
		await this.table.delete(sourceUrl);
	}

	async deleteBatch(urls: string[]): Promise<void> {
		await this.table.bulkDelete(urls);
	}

	async search(query: string): Promise<RssSourceRecord[]> {
		const q = query.toLowerCase();
		return this.table
			.filter(
				(s) =>
					s.sourceName.toLowerCase().includes(q) ||
					s.sourceUrl.toLowerCase().includes(q) ||
					(s.sourceGroup?.toLowerCase().includes(q) ?? false),
			)
			.toArray();
	}

	async enable(sourceUrl: string, enabled: boolean): Promise<void> {
		await this.table.update(sourceUrl, { enabled });
	}

	async count(): Promise<number> {
		return this.table.count();
	}
}

export { RssSourceRepository };
```

- [ ] **Step 2: Create TxtTocRuleRepository**

```ts
// packages/persistence/src/txt-toc-rule-repo.ts
import { BaseDexieRepository } from "./base-repository";
import type { TxtTocRule } from "./types";

class TxtTocRuleRepository extends BaseDexieRepository<TxtTocRule> {
	// Inherits getAll, getById, save, delete, deleteBatch from BaseDexieRepository
}

export { TxtTocRuleRepository };
```

- [ ] **Step 3: Create DictRuleRepository**

```ts
// packages/persistence/src/dict-rule-repo.ts
import { BaseDexieRepository } from "./base-repository";
import type { DictRule } from "./types";

class DictRuleRepository extends BaseDexieRepository<DictRule> {
	// Inherits getAll, getById, save, delete, deleteBatch from BaseDexieRepository
}

export { DictRuleRepository };
```

- [ ] **Step 4: Update ReplaceRuleRepository to use new type**

Replace `packages/persistence/src/replace-rule-repo.ts`:

```ts
// packages/persistence/src/replace-rule-repo.ts
import { BaseDexieRepository } from "./base-repository";
import type { ReplaceRule } from "./types";

class ReplaceRuleRepository extends BaseDexieRepository<ReplaceRule> {
	async getEnabled(): Promise<ReplaceRule[]> {
		const all = await this.getAll();
		return all
			.filter((rule) => rule.enabled)
			.sort((a, b) => a.order - b.order);
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
				return scopeList.some((s) => s.trim() === name || s.trim() === origin);
			}
			return true;
		});
	}
}

export { ReplaceRuleRepository };
```

- [ ] **Step 5: Commit**

```bash
git add packages/persistence/src/rss-source-repo.ts packages/persistence/src/txt-toc-rule-repo.ts packages/persistence/src/dict-rule-repo.ts packages/persistence/src/replace-rule-repo.ts
git commit -m "feat(persistence): add RssSource, TxtTocRule, DictRule repositories; update ReplaceRuleRepository"
```

---

### Task 5: Update persistence barrel exports

**Files:**
- Modify: `packages/persistence/src/index.ts`

- [ ] **Step 1: Add new exports**

Replace the full content of `packages/persistence/src/index.ts`:

```ts
// Database
export type { ReaderXDB } from "./database";
export { createDB, DB_NAME, DB_VERSION, db } from "./database";

// Repositories
export { BaseDexieRepository } from "./base-repository";
export { BookChapterRepository } from "./book-chapter-repo";
export { BookGroupRepository } from "./book-group-repo";
export { BookRepository } from "./book-repo";
export { BookSourceRepository } from "./book-source-repo";
export { BookmarkRepository } from "./bookmark-repo";
export { CacheRepository } from "./cache-repo";
export { CookieRepository } from "./cookie-repo";
export { DictRuleRepository } from "./dict-rule-repo";
export { ReplaceRuleRepository } from "./replace-rule-repo";
export { RssSourceRepository } from "./rss-source-repo";
export { SearchKeywordRepository } from "./search-keyword-repo";
export { TxtTocRuleRepository } from "./txt-toc-rule-repo";

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
	DictRule,
	EnableableEntity,
	ReplaceRule,
	RssSourceRecord,
	SearchKeyword,
	SortableEntity,
	TimestampEntity,
	TxtTocRule,
} from "./types";
```

- [ ] **Step 2: Run typecheck**

Run: `cd packages/persistence && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/persistence/src/index.ts
git commit -m "feat(persistence): export new repositories and types"
```

---

### Task 6: Zod schemas for new entities (rule-engine)

**Files:**
- Create: `packages/rule-engine/src/rule-schemas.ts`
- Modify: `packages/rule-engine/src/index.ts`

- [ ] **Step 1: Create rule schemas file**

```ts
// packages/rule-engine/src/rule-schemas.ts
import { z } from "zod";

/**
 * Zod schemas for ReplaceRule, TxtTocRule, DictRule, RssSourceRecord
 * Used for import validation. All schemas use .passthrough() for extra fields.
 */

export const replaceRuleSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		group: z.string().optional(),
		pattern: z.string().min(1),
		replacement: z.string(),
		scope: z.string().optional(),
		scopeTitle: z.boolean(),
		scopeContent: z.boolean(),
		excludeScope: z.string().optional(),
		enabled: z.boolean(),
		isRegex: z.boolean(),
		timeoutMillisecond: z.number(),
		order: z.number(),
		createdAt: z.number(),
		updatedAt: z.number(),
	})
	.passthrough();

export const txtTocRuleSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		rule: z.string().min(1),
		enabled: z.boolean(),
	})
	.passthrough();

export const dictRuleSchema = z
	.object({
		id: z.string(),
		name: z.string().min(1),
		urlRule: z.string().optional(),
		showRule: z.string().optional(),
		enabled: z.boolean(),
	})
	.passthrough();

export const rssSourceSchema = z
	.object({
		sourceUrl: z.string().min(1),
		sourceName: z.string().min(1),
		sourceGroup: z.string().optional(),
		enabled: z.boolean(),
		customOrder: z.number(),
		createdAt: z.number(),
		updatedAt: z.number(),
		raw: z.record(z.unknown()),
	})
	.passthrough();

export function parseReplaceRule(raw: unknown) {
	return replaceRuleSchema.safeParse(raw);
}

export function parseTxtTocRule(raw: unknown) {
	return txtTocRuleSchema.safeParse(raw);
}

export function parseDictRule(raw: unknown) {
	return dictRuleSchema.safeParse(raw);
}

export function parseRssSource(raw: unknown) {
	return rssSourceSchema.safeParse(raw);
}
```

- [ ] **Step 2: Add exports to rule-engine index.ts**

Add these lines to `packages/rule-engine/src/index.ts` after the existing schema exports:

```ts
// Rule schemas (ReplaceRule, TxtTocRule, DictRule, RssSource)
export {
	dictRuleSchema,
	parseDictRule,
	parseRssSource,
	parseReplaceRule,
	parseTxtTocRule,
	replaceRuleSchema,
	rssSourceSchema,
	txtTocRuleSchema,
} from "./rule-schemas";
```

- [ ] **Step 3: Run typecheck**

Run: `cd packages/rule-engine && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/rule-engine/src/rule-schemas.ts packages/rule-engine/src/index.ts
git commit -m "feat(rule-engine): add Zod schemas for ReplaceRule, TxtTocRule, DictRule, RssSource"
```

---

### Task 7: Fix source-manager hooks for new ReplaceRule type and query key strategy

**Files:**
- Modify: `apps/web/features/source-manager/hooks/use-sources.ts`
- Modify: `apps/web/features/source-manager/types.ts`
- Modify: `apps/web/features/source-manager/index.ts`

- [ ] **Step 1: Update use-sources.ts — remove filter/search from query key, add useMemo filtering**

Replace `apps/web/features/source-manager/hooks/use-sources.ts`:

```ts
import { BookSourceRepository, db } from "@readerx/persistence";
import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { BookSourceRecord } from "@readerx/persistence";

const repo = new BookSourceRepository(db.bookSources);

function useSources() {
	return useQuery({
		queryKey: ["sources"],
		queryFn: () => repo.getAll(),
		staleTime: 60_000,
	});
}

function useSourceMutations() {
	const queryClient = useQueryClient();

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["sources"] });

	const enable = useMutation({
		mutationFn: ({
			url,
			enabled,
		}: { url: string; enabled: boolean }) => repo.enable(url, enabled),
		onSuccess: invalidate,
	});

	const save = useMutation({
		mutationFn: (source: BookSourceRecord) => repo.save(source),
		onSuccess: invalidate,
	});

	const saveBatch = useMutation({
		mutationFn: (sources: BookSourceRecord[]) => repo.saveBatch(sources),
		onSuccess: invalidate,
	});

	const remove = useMutation({
		mutationFn: (url: string) => repo.delete(url),
		onSuccess: invalidate,
	});

	const removeBatch = useMutation({
		mutationFn: (urls: string[]) => repo.deleteBatch(urls),
		onSuccess: invalidate,
	});

	return { enable, save, saveBatch, remove, removeBatch };
}

export { useSources, useSourceMutations };
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/features/source-manager/hooks/use-sources.ts
git commit -m "refactor(source-manager): remove filter/search from query key, use client-side filtering"
```

---

### Task 8: Update source-manager store for mobile layer navigation

**Files:**
- Modify: `apps/web/features/source-manager/store.ts`

- [ ] **Step 1: Add mobileLayer state and dirty tracking**

Replace `apps/web/features/source-manager/store.ts`:

```ts
import { create } from "zustand";
import type { FilterMode } from "./types";

type SourceManagerState = {
	selectedSourceUrl: string | null;
	filterMode: FilterMode;
	searchQuery: string;
	debuggerOpen: boolean;
	expandedSections: Set<string>;
	mobileLayer: 0 | 1 | 2;
	isDirty: boolean;
};

type SourceManagerActions = {
	selectSource: (url: string | null) => void;
	setFilterMode: (mode: FilterMode) => void;
	setSearchQuery: (query: string) => void;
	toggleDebugger: () => void;
	setDebuggerOpen: (open: boolean) => void;
	toggleSection: (section: string) => void;
	navigateToLayer: (layer: 0 | 1 | 2) => void;
	goBack: () => void;
	setDirty: (dirty: boolean) => void;
};

const useSourceManagerStore = create<
	SourceManagerState & SourceManagerActions
>((set) => ({
	selectedSourceUrl: null,
	filterMode: "all" as FilterMode,
	searchQuery: "",
	debuggerOpen: false,
	expandedSections: new Set(["basic"]),
	mobileLayer: 0,
	isDirty: false,

	selectSource: (url) =>
		set({ selectedSourceUrl: url, debuggerOpen: false, isDirty: false, mobileLayer: url ? 1 : 0 }),
	setFilterMode: (mode) => set({ filterMode: mode }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	toggleDebugger: () =>
		set((s) => ({ debuggerOpen: !s.debuggerOpen })),
	setDebuggerOpen: (open) => set({ debuggerOpen: open, mobileLayer: open ? 2 : 1 }),
	toggleSection: (section) =>
		set((s) => {
			const next = new Set(s.expandedSections);
			if (next.has(section)) {
				next.delete(section);
			} else {
				next.add(section);
			}
			return { expandedSections: next };
		}),
	navigateToLayer: (layer) => set({ mobileLayer: layer }),
	goBack: () =>
		set((s) => {
			if (s.mobileLayer === 2) return { mobileLayer: 1, debuggerOpen: false };
			if (s.mobileLayer === 1) return { mobileLayer: 0, selectedSourceUrl: null, isDirty: false };
			return s;
		}),
	setDirty: (dirty) => set({ isDirty: dirty }),
}));

export { useSourceManagerStore };
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/features/source-manager/store.ts
git commit -m "feat(source-manager): add mobileLayer navigation and dirty tracking to store"
```

---

### Task 9: i18n messages

**Files:**
- Modify: `apps/web/messages/zh.json`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: Update zh.json — add all new namespaces**

Add these new top-level keys to `apps/web/messages/zh.json` (after the existing `"common"` section):

```json
{
	"sourceManager": {
		"searchPlaceholder": "搜索书源...",
		"import": "导入",
		"total": "共 {count} 个书源",
		"filterAll": "全部",
		"filterEnabled": "已启用",
		"filterDisabled": "已禁用",
		"emptyTitle": "还没有书源",
		"emptyDescription": "导入书源开始阅读",
		"emptyImport": "导入书源",
		"save": "保存",
		"delete": "删除",
		"debug": "调试",
		"debugSearch": "搜索",
		"debugBookInfo": "书籍信息",
		"debugToc": "目录",
		"debugContent": "正文",
		"debugInput": "测试输入",
		"debugRun": "运行",
		"debugStop": "停止",
		"debugResult": "结果",
		"debugCopy": "复制结果",
		"debugNoResult": "暂无结果",
		"debugRunning": "运行中...",
		"debugElapsed": "耗时 {ms}ms",
		"debugReset": "重置",
		"sectionBasic": "基本信息",
		"sectionSearch": "搜索规则",
		"sectionBookInfo": "书籍信息规则",
		"sectionToc": "目录规则",
		"sectionContent": "正文规则",
		"sectionAdvanced": "高级设置",
		"saved": "已保存",
		"deleted": "已删除",
		"selectToEdit": "选择一个书源进行编辑",
		"noMatch": "未找到匹配的书源",
		"unsavedTitle": "未保存的修改",
		"unsavedMessage": "你有未保存的修改，是否保存？",
		"saveAndContinue": "保存",
		"discard": "放弃修改",
		"fieldUrl": "URL",
		"fieldGroup": "分组",
		"fieldName": "名称",
		"fieldSearchUrl": "搜索 URL",
		"fieldHeader": "Header",
		"fieldLoginUrl": "Login URL",
		"fieldConcurrentRate": "并发限制",
		"importTitle": "导入书源",
		"importUrl": "URL 导入",
		"importFile": "文件导入",
		"importPaste": "粘贴导入",
		"importUrlPlaceholder": "https://example.com/sources.json",
		"importPastePlaceholder": "粘贴 JSON 内容",
		"importFetch": "获取并导入",
		"importFetching": "获取中...",
		"importParsing": "解析中...",
		"importImport": "导入",
		"importSuccess": "成功导入 {count} 个",
		"importSkipped": "跳过 {count} 个（格式错误）",
		"importFailed": "失败 {count} 个",
		"importClose": "关闭",
		"importSelectFile": "选择文件"
	},
	"rssSourceManager": {
		"searchPlaceholder": "搜索订阅源...",
		"import": "导入",
		"total": "共 {count} 个订阅源",
		"filterAll": "全部",
		"filterEnabled": "已启用",
		"filterDisabled": "已禁用",
		"emptyTitle": "还没有订阅源",
		"emptyDescription": "导入订阅源开始阅读",
		"emptyImport": "导入订阅源",
		"save": "保存",
		"delete": "删除",
		"selectToEdit": "选择一个订阅源进行编辑",
		"sectionBasic": "基本信息",
		"sectionRules": "规则",
		"fieldName": "源名称",
		"fieldUrl": "源URL",
		"fieldGroup": "源分组",
		"fieldArticleStyle": "文章样式",
		"articleStyle0": "三图",
		"articleStyle1": "大图",
		"articleStyle2": "纯文字",
		"fieldRuleArticles": "文章列表规则",
		"fieldRuleTitle": "标题规则",
		"fieldRuleContent": "内容规则",
		"fieldRuleDescription": "描述规则",
		"saved": "已保存",
		"deleted": "已删除"
	},
	"replaceRules": {
		"title": "替换净化",
		"addRule": "添加规则",
		"searchPlaceholder": "搜索规则...",
		"emptyTitle": "还没有替换规则",
		"emptyDescription": "添加规则净化阅读内容",
		"fieldName": "规则名称",
		"fieldGroup": "分组",
		"fieldPattern": "匹配模式",
		"fieldReplacement": "替换文本",
		"fieldIsRegex": "正则表达式",
		"fieldScopeTitle": "应用于标题",
		"fieldScopeContent": "应用于正文",
		"fieldScope": "适用书源",
		"fieldExcludeScope": "排除书源",
		"fieldTimeout": "超时(ms)",
		"saved": "规则已保存",
		"deleted": "规则已删除",
		"save": "保存",
		"cancel": "取消",
		"editTitle": "编辑规则",
		"addTitle": "添加规则",
		"regexBadge": "正则",
		"literalBadge": "字面量",
		"titleScope": "标题",
		"contentScope": "正文"
	},
	"txtRules": {
		"title": "TXT目录规则",
		"addRule": "添加规则",
		"searchPlaceholder": "搜索规则...",
		"emptyTitle": "还没有TXT目录规则",
		"emptyDescription": "添加规则识别TXT文件目录",
		"fieldName": "规则名称",
		"fieldRule": "匹配规则",
		"saved": "规则已保存",
		"deleted": "规则已删除",
		"save": "保存",
		"cancel": "取消",
		"editTitle": "编辑规则",
		"addTitle": "添加规则"
	},
	"dictRules": {
		"title": "字典规则",
		"addRule": "添加规则",
		"searchPlaceholder": "搜索规则...",
		"emptyTitle": "还没有字典规则",
		"emptyDescription": "添加字典规则增强查询",
		"fieldName": "字典名称",
		"fieldUrlRule": "URL规则",
		"fieldShowRule": "显示规则",
		"saved": "规则已保存",
		"deleted": "规则已删除",
		"save": "保存",
		"cancel": "取消",
		"editTitle": "编辑规则",
		"addTitle": "添加规则"
	}
}
```

- [ ] **Step 2: Update en.json — add matching English translations**

Add the same structure with English translations. Keys are identical, values are English.

- [ ] **Step 3: Commit**

```bash
git add apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(i18n): add namespaces for sourceManager, rssSourceManager, replaceRules, txtRules, dictRules"
```

---

## Phase 2 — Common Framework

### Task 10: SimpleRuleManager types and config

**Files:**
- Create: `apps/web/features/simple-rule-manager/types.ts`

- [ ] **Step 1: Create types**

```ts
// apps/web/features/simple-rule-manager/types.ts

type FieldDef = {
	readonly key: string;
	readonly labelKey: string;
	readonly type: "text" | "textarea" | "switch";
	readonly required?: boolean;
	readonly placeholder?: string;
	readonly monospace?: boolean;
};

type RuleManagerConfig<T extends { id: string }> = {
	readonly i18nNamespace: string;
	readonly queryKeyPrefix: string;
	readonly createRepository: () => {
		getAll: () => Promise<T[]>;
		getById: (id: string) => Promise<T | undefined>;
		save: (entity: T) => Promise<void>;
		delete: (id: string) => Promise<void>;
	};
	readonly fields: readonly FieldDef[];
	readonly defaultValue: Omit<T, "id">;
	readonly importParser: (raw: string) => T[];
};

export type { FieldDef, RuleManagerConfig };
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/features/simple-rule-manager/types.ts
git commit -m "feat(simple-rule-manager): add types and config definition"
```

---

### Task 11: SimpleRuleManager hook

**Files:**
- Create: `apps/web/features/simple-rule-manager/hooks/use-simple-rules.ts`

- [ ] **Step 1: Create generic hook**

```ts
// apps/web/features/simple-rule-manager/hooks/use-simple-rules.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RuleManagerConfig } from "../types";

function useSimpleRules<T extends { id: string }>(config: RuleManagerConfig<T>) {
	return useQuery({
		queryKey: [config.queryKeyPrefix],
		queryFn: () => config.createRepository().getAll(),
		staleTime: 60_000,
	});
}

function useSimpleRuleMutations<T extends { id: string }>(config: RuleManagerConfig<T>) {
	const queryClient = useQueryClient();
	const repo = config.createRepository();

	const save = useMutation({
		mutationFn: (rule: T) => repo.save(rule),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] }),
	});

	const remove = useMutation({
		mutationFn: (id: string) => repo.delete(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] }),
	});

	const toggleEnabled = useMutation({
		mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
			const rule = await repo.getById(id);
			if (rule) {
				await repo.save({ ...rule, enabled } as T);
			}
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] }),
	});

	return { save, remove, toggleEnabled };
}

export { useSimpleRules, useSimpleRuleMutations };
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/features/simple-rule-manager/hooks/use-simple-rules.ts
git commit -m "feat(simple-rule-manager): add generic useSimpleRules and useSimpleRuleMutations hooks"
```

---

### Task 12: SimpleRuleManager components

**Files:**
- Create: `apps/web/features/simple-rule-manager/components/rule-list-page.tsx`
- Create: `apps/web/features/simple-rule-manager/components/rule-list-item.tsx`
- Create: `apps/web/features/simple-rule-manager/components/rule-edit-dialog.tsx`
- Create: `apps/web/features/simple-rule-manager/components/rule-empty-state.tsx`
- Create: `apps/web/features/simple-rule-manager/index.ts`

- [ ] **Step 1: Create all 4 components and the barrel export**

Each component uses shadcn/ui (Button, Dialog, Input, Textarea, Switch, ScrollArea, Badge) + Tailwind + next-intl + Lucide. The `RuleListPage` is the main entry point. It uses `useMemo` for search/filter. The `RuleEditDialog` renders fields from config. Full code for each file follows the patterns established in the codebase (`my/page.tsx` Tailwind style, `bookshelf-page.tsx` component structure).

> **Important:** The exact component code is lengthy. The implementing agent should:
> 1. Follow `apps/web/app/my/page.tsx` Tailwind patterns (`bg-surface-1`, `text-muted-foreground`, `divide-y divide-border`, `rounded-lg`)
> 2. Use shadcn/ui components from `@/components/ui/` (Button, Dialog, Input, Textarea, Switch, Badge)
> 3. Use `useTranslations(config.i18nNamespace)` for all user-facing strings
> 4. Use Lucide icons (Plus, Search, Trash2, Pencil)
> 5. Use `useMemo` for client-side search filtering on the full data set
> 6. Use `useState` for editRuleId and importOpen state
> 7. Generate new IDs via `crypto.randomUUID()`

- [ ] **Step 2: Create barrel export index.ts**

```ts
// apps/web/features/simple-rule-manager/index.ts
export { RuleListPage } from "./components/rule-list-page";
export { useSimpleRules, useSimpleRuleMutations } from "./hooks/use-simple-rules";
export type { FieldDef, RuleManagerConfig } from "./types";
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/features/simple-rule-manager/
git commit -m "feat(simple-rule-manager): add RuleListPage, RuleListItem, RuleEditDialog, RuleEmptyState components"
```

---

## Phase 3 — Source Manager Rewrite

### Task 13: Rewrite source-manager components (Tailwind + shadcn/ui)

**Files:**
- Rewrite: All 14 component files in `apps/web/features/source-manager/components/`

- [ ] **Step 1: Rewrite source-workspace.tsx**

Replace inline styles with Tailwind + shadcn/ui. Responsive layout using `md:` / `lg:` breakpoints. Mobile stack navigation controlled by `mobileLayer` from store. Use `useMemo` for client-side filtering. Use `useTranslations("sourceManager")` for all strings. Use Lucide icons (ArrowLeft, Bug, Save, Trash2, Search). Dirty state check before `selectSource`.

- [ ] **Step 2: Rewrite source-list.tsx, source-list-item.tsx, source-filter-bar.tsx**

- `source-list.tsx`: Loading skeleton → FilterBar → VirtualList → EmptyState. Uses `useMemo` to filter sources by `filterMode` and `searchQuery`.
- `source-list-item.tsx`: `<div className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 ...">` with `Switch` component, `Badge` for capability tags, domain display.
- `source-filter-bar.tsx`: `Input` with search icon + `Tabs` for filter + `Button` for import.

- [ ] **Step 3: Rewrite source-editor.tsx, rule-section.tsx, rule-field-editor.tsx**

- `source-editor.tsx`: Header bar with back button, source name, debug/save/delete buttons. Collapsible sections. Dirty state tracking via `setDirty(true)` on any field change. Dirty check before navigation.
- `rule-section.tsx`: `Collapsible` from shadcn/ui with `ChevronRight` rotation.
- `rule-field-editor.tsx`: `Label` + `Textarea` (font-mono) + parser type `Badge`.

- [ ] **Step 4: Rewrite source-debugger.tsx (single-step debugger)**

Replace Pipeline/Console tabs with single-step test form:
- `Tabs` for test type (search/bookInfo/toc/content)
- `Input` for test parameter (keyword or URL)
- `Button` for Run/Stop
- `ScrollArea` for JSON result (font-mono)
- Error state with retry button

- [ ] **Step 5: Rewrite import-dialog.tsx, import-result-report.tsx**

- `import-dialog.tsx`: Use shadcn `Dialog` + `Tabs` for URL/file/paste. Use `useTranslations("sourceManager")` for import* keys.
- `import-result-report.tsx`: Simple result display with check/warning/x icons and counts.

- [ ] **Step 6: Rewrite remaining components (source-empty-state.tsx, debug-console.tsx, debug-pipeline.tsx, debug-result-viewer.tsx)**

- `source-empty-state.tsx`: Centered layout with `BookOpen` icon + text + import CTA button.
- `debug-console.tsx`, `debug-pipeline.tsx`, `debug-result-viewer.tsx`: Keep as stubs or minimal implementations since Pipeline is P1.

- [ ] **Step 7: Run typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/features/source-manager/
git commit -m "refactor(source-manager): rewrite all components from inline styles to Tailwind + shadcn/ui"
```

---

## Phase 4 — New Pages

### Task 14: RSS Source Manager feature

**Files:**
- Create: `apps/web/features/rss-source-manager/` (all files)
- Create: `apps/web/app/my/rss-sources/page.tsx`

- [ ] **Step 1: Create types, store, hooks**

- `types.ts`: `FilterMode` = "all" | "enabled" | "disabled"
- `store.ts`: Zustand with `selectedSourceUrl`, `filterMode`, `searchQuery`, `mobileLayer`
- `hooks/use-rss-sources.ts`: TanStack Query `["rssSources"]` + mutations
- `hooks/use-rss-source-detail.ts`: `["rssSource", url]`

- [ ] **Step 2: Create components**

- `rss-source-workspace.tsx`: Two-panel layout (list + editor), mobile stack
- `rss-source-list-panel.tsx`: Search + filter tabs + list items + empty state + import button
- `rss-source-list-item.tsx`: Name + URL + group + Switch
- `rss-source-editor-panel.tsx`: Edit form reading from/writing to `raw` field. Fields: sourceName, sourceUrl, sourceGroup, articleStyle (Select), then rule fields from raw (ruleArticles, ruleTitle, ruleContent, ruleDescription) as monospace Textareas
- `rss-source-empty-state.tsx`: Icon + text + import CTA

- [ ] **Step 3: Create barrel export and route page**

```tsx
// apps/web/app/my/rss-sources/page.tsx
"use client";
import { RssSourceWorkspace } from "@/features/rss-source-manager";
export default function RssSourcesPage() {
	return (
		<div className="-mx-4 -mt-11 md:-mx-6 lg:-mx-8">
			<RssSourceWorkspace />
		</div>
	);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/rss-source-manager/ apps/web/app/my/rss-sources/
git commit -m "feat(rss-source-manager): add complete RSS source management feature"
```

---

### Task 15: Replace Rule Manager (independent feature)

**Files:**
- Create: `apps/web/features/replace-rule-manager/` (all files)
- Create: `apps/web/app/my/replace-rules/page.tsx`

- [ ] **Step 1: Create hooks**

- `hooks/use-replace-rules.ts`: TanStack Query `["replaceRules"]` + mutations (save, remove, toggleEnabled). Client-side filtering with `useMemo`.

- [ ] **Step 2: Create components**

- `replace-rule-page.tsx`: Full page with search bar + add button + list. Uses `useTranslations("replaceRules")`. Pattern follows `my/page.tsx` Tailwind style.
- `replace-rule-list-item.tsx`: Name + group Badge + pattern/replacement preview + isRegex Badge + scope badges (标题/正文) + Switch
- `replace-rule-edit-dialog.tsx`: shadcn `Dialog` with all ReplaceRule fields — name, group, pattern (monospace Textarea), replacement (monospace Textarea), isRegex Switch, scopeTitle Switch, scopeContent Switch, scope Input, excludeScope Input, timeoutMillisecond Input. Save/Delete/Cancel buttons.

- [ ] **Step 3: Create barrel export and route page**

```tsx
// apps/web/app/my/replace-rules/page.tsx
"use client";
import { ReplaceRulePage } from "@/features/replace-rule-manager";
export default function ReplaceRulesPage() {
	return <ReplaceRulePage />;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/replace-rule-manager/ apps/web/app/my/replace-rules/
git commit -m "feat(replace-rule-manager): add replace rule management page"
```

---

### Task 16: TXT Rule Manager and Dict Rule Manager (SimpleRuleManager template)

**Files:**
- Create: `apps/web/features/txt-rule-manager/config.ts`
- Create: `apps/web/features/txt-rule-manager/index.ts`
- Create: `apps/web/features/dict-rule-manager/config.ts`
- Create: `apps/web/features/dict-rule-manager/index.ts`
- Create: `apps/web/app/my/txt-rules/page.tsx`
- Create: `apps/web/app/my/dict-rules/page.tsx`

- [ ] **Step 1: Create TXT rule config**

```ts
// apps/web/features/txt-rule-manager/config.ts
import { TxtTocRuleRepository, db } from "@readerx/persistence";
import type { RuleManagerConfig } from "@/features/simple-rule-manager";
import type { TxtTocRule } from "@readerx/persistence";

const txtRuleConfig: RuleManagerConfig<TxtTocRule> = {
	i18nNamespace: "txtRules",
	queryKeyPrefix: "txtRules",
	createRepository: () => new TxtTocRuleRepository(db.txtTocRules),
	fields: [
		{ key: "name", labelKey: "fieldName", type: "text", required: true },
		{ key: "rule", labelKey: "fieldRule", type: "textarea", required: true, monospace: true },
	],
	defaultValue: { name: "", rule: "", enabled: true },
	importParser: (raw) => {
		const parsed: unknown = JSON.parse(raw);
		const items = Array.isArray(parsed) ? parsed : [parsed];
		return items.map((item: unknown) => ({
			id: crypto.randomUUID(),
			name: (item as Record<string, unknown>).name as string ?? "",
			rule: (item as Record<string, unknown>).rule as string ?? "",
			enabled: true,
		}));
	},
};

export { txtRuleConfig };
```

- [ ] **Step 2: Create TXT rule barrel export**

```ts
// apps/web/features/txt-rule-manager/index.ts
export { txtRuleConfig } from "./config";
```

- [ ] **Step 3: Create Dict rule config**

```ts
// apps/web/features/dict-rule-manager/config.ts
import { DictRuleRepository, db } from "@readerx/persistence";
import type { RuleManagerConfig } from "@/features/simple-rule-manager";
import type { DictRule } from "@readerx/persistence";

const dictRuleConfig: RuleManagerConfig<DictRule> = {
	i18nNamespace: "dictRules",
	queryKeyPrefix: "dictRules",
	createRepository: () => new DictRuleRepository(db.dictRules),
	fields: [
		{ key: "name", labelKey: "fieldName", type: "text", required: true },
		{ key: "urlRule", labelKey: "fieldUrlRule", type: "textarea", monospace: true },
		{ key: "showRule", labelKey: "fieldShowRule", type: "textarea", monospace: true },
	],
	defaultValue: { name: "", enabled: true },
	importParser: (raw) => {
		const parsed: unknown = JSON.parse(raw);
		const items = Array.isArray(parsed) ? parsed : [parsed];
		return items.map((item: unknown) => ({
			id: crypto.randomUUID(),
			name: (item as Record<string, unknown>).name as string ?? "",
			urlRule: (item as Record<string, unknown>).urlRule as string | undefined,
			showRule: (item as Record<string, unknown>).showRule as string | undefined,
			enabled: true,
		}));
	},
};

export { dictRuleConfig };
```

- [ ] **Step 4: Create Dict rule barrel export**

```ts
// apps/web/features/dict-rule-manager/index.ts
export { dictRuleConfig } from "./config";
```

- [ ] **Step 5: Create route pages**

```tsx
// apps/web/app/my/txt-rules/page.tsx
"use client";
import { RuleListPage } from "@/features/simple-rule-manager";
import { txtRuleConfig } from "@/features/txt-rule-manager";
export default function TxtRulesPage() {
	return <RuleListPage config={txtRuleConfig} />;
}
```

```tsx
// apps/web/app/my/dict-rules/page.tsx
"use client";
import { RuleListPage } from "@/features/simple-rule-manager";
import { dictRuleConfig } from "@/features/dict-rule-manager";
export default function DictRulesPage() {
	return <RuleListPage config={dictRuleConfig} />;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/txt-rule-manager/ apps/web/features/dict-rule-manager/ apps/web/app/my/txt-rules/ apps/web/app/my/dict-rules/
git commit -m "feat(txt-rule, dict-rule): add TXT TOC rule and dict rule management pages via SimpleRuleManager template"
```

---

### Task 17: Update source-manager page route and final verification

**Files:**
- Modify: `apps/web/app/my/sources/page.tsx`
- Modify: `apps/web/features/source-manager/index.ts`

- [ ] **Step 1: Verify source page still works**

The `apps/web/app/my/sources/page.tsx` already imports `SourceWorkspace` from `@/features/source-manager`. After the rewrite, the export name should still be `SourceWorkspace`. Verify no changes needed.

- [ ] **Step 2: Update source-manager barrel export if needed**

Ensure `apps/web/features/source-manager/index.ts` still exports `SourceWorkspace` and all necessary hooks/types.

- [ ] **Step 3: Run full typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `cd apps/web && pnpm lint`
Expected: PASS (fix any issues)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup for rule management pages"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Composable type traits → Task 1
- ✅ New entity types (RssSource, TxtTocRule, DictRule) → Task 1
- ✅ ReplaceRule upgrade → Task 1
- ✅ Dexie v2 migration → Task 2
- ✅ BaseDexieRepository → Task 3
- ✅ Concrete repositories → Task 4
- ✅ Zod schemas → Task 6
- ✅ Query key without search/filter → Task 7
- ✅ Mobile layer navigation + dirty tracking → Task 8
- ✅ i18n messages → Task 9
- ✅ SimpleRuleManager framework → Tasks 10-12
- ✅ Source manager rewrite → Task 13
- ✅ RSS source manager → Task 14
- ✅ Replace rule manager (independent) → Task 15
- ✅ TXT + Dict rule managers → Task 16
- ✅ Dirty state protection → Task 8 (store) + Task 13 (editor)

**2. Placeholder scan:** No TBD/TODO. Task 12 and Task 13 contain guidance notes for implementing agents rather than full component code (components are large but follow clear patterns). Task 13 provides specific class names, component names, and i18n keys.

**3. Type consistency:**
- `ReplaceRule.id` changed from `number?` to `string` across Task 1, Task 4
- `BaseDexieRepository<T extends { id: string }>` generic constraint matches all entity types
- `RssSourceRecord` uses `sourceUrl` as PK, not `id` — has its own repository, doesn't extend Base
- Query keys are plain strings: `["sources"]`, `["rssSources"]`, `["replaceRules"]`, `["txtRules"]`, `["dictRules"]`
- `RuleManagerConfig<T extends { id: string }>` constraint matches TxtTocRule and DictRule (both have `id: string`)
