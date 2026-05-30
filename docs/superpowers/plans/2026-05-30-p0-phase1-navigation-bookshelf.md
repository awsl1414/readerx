# P0 MVP Phase 1: Navigation Shell + Bookshelf

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure navigation from old 4-tab (首页/书库/搜索/设置) to Legado mode (书架/发现/订阅/我的), implement bookshelf as the new home page with continue-reading hero, group chips, and book grid.

**Architecture:** Next.js App Router with flat routes. Desktop gets 56px icon sidebar, mobile gets bottom tabs with smart show/hide for 发现/订阅. Bookshelf uses TanStack Query for book data from persistence layer, Zustand for UI state (view mode, sort, selected group).

**Tech Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · shadcn/ui · Lucide icons · next-intl · Zustand 5 · TanStack Query 5

**Spec:** [`docs/web-design/`](../../web-design/) (PRD · IA · Wireframes · Design Tokens · Component Tree)

**Existing state:**
- Navigation: old 4-tab (首页/书库/搜索/设置) in `nav-items.tsx`
- Bookshelf feature: empty shell (store/index/actions files with comments only)
- Reader: fully implemented, no changes needed
- Source manager: fully implemented, no changes needed
- Persistence package: `@readerx/persistence` has `BookRepository`, `BookGroupRepository` with full CRUD

---

## File Structure

```
apps/web/
├── app/
│   ├── layout.tsx                    # Modify: no changes needed (already uses AppShell)
│   ├── page.tsx                      # Modify: bookshelf home page content
│   ├── globals.css                   # No changes
│   ├── search/page.tsx               # Keep: search accessible from toolbar
│   ├── reader/[bookId]/...           # No changes
│   ├── my/
│   │   ├── page.tsx                  # Create: "我的" settings list
│   │   └── sources/page.tsx          # Move: from settings/sources
│   └── (removed: library/, settings/)
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx             # Modify: update header, add smart tab logic
│   │   └── nav-items.tsx             # Modify: Legado mode items + smart show/hide
│   └── ui/                           # No changes
├── features/
│   └── bookshelf/
│       ├── store.ts                  # Rewrite: Zustand store for UI state
│       ├── hooks/
│       │   ├── use-books.ts          # Create: TanStack Query hook for book list
│       │   └── use-book-groups.ts    # Create: TanStack Query hook for groups
│       ├── components/
│       │   ├── bookshelf-page.tsx    # Create: main bookshelf page
│       │   ├── continue-reading-hero.tsx  # Create: hero card
│       │   ├── group-chips.tsx       # Create: horizontal group filter
│       │   ├── book-grid.tsx         # Create: grid/list view
│       │   ├── book-card.tsx         # Create: single book card
│       │   ├── book-context-menu.tsx # Create: long-press menu
│       │   ├── sort-control.tsx      # Create: sort selector
│       │   └── empty-bookshelf.tsx   # Create: empty state
│       └── index.ts                  # Rewrite: public API
├── messages/
│   ├── zh.json                       # Modify: new nav keys + bookshelf keys
│   └── en.json                       # Modify: new nav keys + bookshelf keys
└── __tests__/
    └── bookshelf/                    # Create: bookshelf tests
        ├── bookshelf-store.test.ts
        └── book-card.test.tsx
```

---

## Task 1: Update i18n Messages

**Files:**
- Modify: `apps/web/messages/zh.json`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: Update Chinese translations**

Replace entire content of `apps/web/messages/zh.json`:

```json
{
	"nav": {
		"bookshelf": "书架",
		"explore": "发现",
		"subscriptions": "订阅",
		"my": "我的"
	},
	"bookshelf": {
		"continueReading": "继续阅读",
		"recentBooks": "最近在读",
		"noBooks": "还没有书籍",
		"noBooksHint": "搜索添加你的第一本书",
		"allBooks": "全部",
		"sortRecentRead": "最近阅读",
		"sortAddedTime": "添加时间",
		"sortTitle": "书名",
		"sortManual": "手动排序",
		"viewGrid": "网格",
		"viewList": "列表",
		"deleteConfirm": "确定删除这本书吗？",
		"moveToGroup": "移入分组",
		"bookDetail": "查看详情",
		"changeSource": "换源",
		"progress": "{percent}%",
		"noBookSources": "还没有书源",
		"noBookSourcesHint": "导入书源后开始阅读"
	},
	"search": {
		"title": "搜索",
		"placeholder": "搜索书名或作者...",
		"history": "搜索历史",
		"noResults": "没有找到结果",
		"sourceStatus": "{success} 个书源已返回 · {failed} 个无响应",
		"searching": "搜索中..."
	},
	"my": {
		"title": "我的",
		"sources": "书源管理",
		"rssSources": "订阅源管理",
		"replaceRules": "替换净化",
		"txtRules": "TXT目录规则",
		"dictRules": "字典规则",
		"theme": "主题",
		"reading": "阅读设置",
		"backup": "备份恢复",
		"import": "Legado 数据导入",
		"downloads": "下载管理",
		"bookmarks": "全部书签",
		"readRecord": "阅读记录",
		"about": "关于",
		"sectionRules": "规则管理",
		"sectionPersonal": "个性化",
		"sectionData": "数据",
		"sectionStats": "统计",
		"sectionOther": "其他"
	},
	"common": {
		"loading": "加载中...",
		"error": "出错了",
		"retry": "重试",
		"cancel": "取消",
		"confirm": "确定"
	}
}
```

- [ ] **Step 2: Update English translations**

Replace entire content of `apps/web/messages/en.json`:

```json
{
	"nav": {
		"bookshelf": "Bookshelf",
		"explore": "Explore",
		"subscriptions": "Subscriptions",
		"my": "My"
	},
	"bookshelf": {
		"continueReading": "Continue Reading",
		"recentBooks": "Recently Read",
		"noBooks": "No books yet",
		"noBooksHint": "Search to add your first book",
		"allBooks": "All",
		"sortRecentRead": "Recent Read",
		"sortAddedTime": "Added Time",
		"sortTitle": "Title",
		"sortManual": "Manual",
		"viewGrid": "Grid",
		"viewList": "List",
		"deleteConfirm": "Delete this book?",
		"moveToGroup": "Move to Group",
		"bookDetail": "Book Detail",
		"changeSource": "Change Source",
		"progress": "{percent}%",
		"noBookSources": "No book sources",
		"noBookSourcesHint": "Import book sources to start reading"
	},
	"search": {
		"title": "Search",
		"placeholder": "Search by title or author...",
		"history": "Search History",
		"noResults": "No results found",
		"sourceStatus": "{success} sources returned · {failed} unavailable",
		"searching": "Searching..."
	},
	"my": {
		"title": "My",
		"sources": "Book Sources",
		"rssSources": "RSS Sources",
		"replaceRules": "Replace Rules",
		"txtRules": "TXT TOC Rules",
		"dictRules": "Dict Rules",
		"theme": "Theme",
		"reading": "Reading Settings",
		"backup": "Backup & Restore",
		"import": "Import from Legado",
		"downloads": "Downloads",
		"bookmarks": "All Bookmarks",
		"readRecord": "Reading Record",
		"about": "About",
		"sectionRules": "Rules",
		"sectionPersonal": "Personalize",
		"sectionData": "Data",
		"sectionStats": "Statistics",
		"sectionOther": "Other"
	},
	"common": {
		"loading": "Loading...",
		"error": "Something went wrong",
		"retry": "Retry",
		"cancel": "Cancel",
		"confirm": "Confirm"
	}
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(web): update i18n messages for Legado-mode navigation"
```

---

## Task 2: Update Navigation — nav-items.tsx

**Files:**
- Modify: `apps/web/components/layout/nav-items.tsx`

- [ ] **Step 1: Rewrite nav-items.tsx with Legado-mode navigation**

Replace entire content of `apps/web/components/layout/nav-items.tsx`:

```tsx
"use client";

import { BookOpen, Compass, Rss, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type NavItem = {
	readonly href: string;
	readonly label: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly alwaysVisible: boolean;
};

const navItems: readonly NavItem[] = [
	{ href: "/", label: "bookshelf", icon: BookOpen, alwaysVisible: true },
	{ href: "/explore", label: "explore", icon: Compass, alwaysVisible: false },
	{ href: "/subscriptions", label: "subscriptions", icon: Rss, alwaysVisible: false },
	{ href: "/my", label: "my", icon: User, alwaysVisible: true },
] as const;

/**
 * Hook to determine which nav items should be visible.
 * "发现" shows when at least one book source has exploreUrl.
 * "订阅" shows when at least one RSS source exists.
 * For now: always show all items until persistence hooks are wired.
 * TODO: implement smart show/hide based on data availability.
 */
function useVisibleNavItems(): readonly NavItem[] {
	// MVP: show all 4 tabs always. Smart show/hide comes in P2.
	return navItems;
}

export function DesktopNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	const items = useVisibleNavItems();

	return (
		<aside className="hidden w-14 shrink-0 flex-col py-4 md:flex">
			<Link href="/" className="flex items-center justify-center py-3">
				<BookOpen className="size-5 text-foreground" />
			</Link>
			<nav className="mt-2 flex flex-col items-center gap-1 px-2">
				{items.map((item) => {
					const active =
						item.href === "/"
							? pathname === "/"
							: pathname.startsWith(item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							title={t(item.label)}
							className={cn(
								"flex size-10 items-center justify-center rounded-lg transition-colors",
								active
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<item.icon className="size-5" />
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}

export function MobileNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	const items = useVisibleNavItems();

	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/40 bg-background/80 md:hidden"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			{items.map((item) => {
				const active =
					item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
							active ? "text-foreground" : "text-muted-foreground",
						)}
					>
						<item.icon className="size-5" />
						<span>{t(item.label)}</span>
					</Link>
				);
			})}
		</nav>
	);
}
```

- [ ] **Step 2: Verify navigation compiles**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors related to nav-items.tsx

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/layout/nav-items.tsx
git commit -m "feat(web): restructure navigation to Legado mode (书架/发现/订阅/我的)"
```

---

## Task 3: Restructure Routes

**Files:**
- Delete: `apps/web/app/library/page.tsx`
- Delete: `apps/web/app/settings/page.tsx`
- Create: `apps/web/app/my/page.tsx`
- Move: `apps/web/app/settings/sources/page.tsx` → `apps/web/app/my/sources/page.tsx`
- Keep: `apps/web/app/search/page.tsx` (toolbar entry, not tab)

- [ ] **Step 1: Remove old routes**

```bash
rm apps/web/app/library/page.tsx
rm apps/web/app/settings/page.tsx
rmdir apps/web/app/library
rmdir apps/web/app/settings/sources
rmdir apps/web/app/settings
```

- [ ] **Step 2: Create "我的" page**

Create `apps/web/app/my/page.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
	BookOpen,
	Rss,
	Regex,
	FileText,
	BookA,
	Palette,
	BookMarked,
	Database,
	Download,
	Bookmark,
	BarChart3,
	Info,
} from "lucide-react";
import { cn } from "@/lib/cn";

type SettingSection = {
	readonly titleKey: string;
	readonly items: readonly SettingItem[];
};

type SettingItem = {
	readonly href: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly labelKey: string;
};

const sections: readonly SettingSection[] = [
	{
		titleKey: "sectionRules",
		items: [
			{ href: "/my/sources", icon: BookOpen, labelKey: "sources" },
			{ href: "/my/rss-sources", icon: Rss, labelKey: "rssSources" },
			{ href: "/my/replace-rules", icon: Regex, labelKey: "replaceRules" },
			{ href: "/my/txt-rules", icon: FileText, labelKey: "txtRules" },
			{ href: "/my/dict-rules", icon: BookA, labelKey: "dictRules" },
		],
	},
	{
		titleKey: "sectionPersonal",
		items: [
			{ href: "/my/theme", icon: Palette, labelKey: "theme" },
			{ href: "/my/reading", icon: BookMarked, labelKey: "reading" },
		],
	},
	{
		titleKey: "sectionData",
		items: [
			{ href: "/my/backup", icon: Database, labelKey: "backup" },
			{ href: "/my/import", icon: Database, labelKey: "import" },
			{ href: "/my/downloads", icon: Download, labelKey: "downloads" },
		],
	},
	{
		titleKey: "sectionStats",
		items: [
			{ href: "/my/bookmarks", icon: Bookmark, labelKey: "bookmarks" },
			{ href: "/my/read-record", icon: BarChart3, labelKey: "readRecord" },
		],
	},
	{
		titleKey: "sectionOther",
		items: [
			{ href: "/my/about", icon: Info, labelKey: "about" },
		],
	},
];

export default function MyPage() {
	const t = useTranslations("my");

	return (
		<div className="mx-auto max-w-lg space-y-6">
			<h1 className="text-2xl font-semibold">{t("title")}</h1>
			{sections.map((section) => (
				<div key={section.titleKey}>
					<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t(section.titleKey)}
					</h2>
					<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
						{section.items.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-3 px-4 py-3 text-sm transition-colors",
									"hover:bg-surface-2 first:rounded-t-lg last:rounded-b-lg",
								)}
							>
								<item.icon className="size-4 text-muted-foreground" />
								<span className="flex-1">{t(item.labelKey)}</span>
								<span className="text-muted-foreground">›</span>
							</Link>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 3: Move source management route**

Create `apps/web/app/my/sources/page.tsx`:

```tsx
"use client";

import { SourceWorkspace } from "@/features/source-manager";

export default function SourcesPage() {
	return (
		<div className="-mx-4 -mt-11 md:-mx-6 lg:-mx-8">
			<SourceWorkspace />
		</div>
	);
}
```

- [ ] **Step 4: Verify routes compile**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/my/ apps/web/app/library/ apps/web/app/settings/
git commit -m "feat(web): restructure routes to Legado mode (/my replaces /settings)"
```

---

## Task 4: Implement Bookshelf Store

**Files:**
- Rewrite: `apps/web/features/bookshelf/store.ts`

- [ ] **Step 1: Write bookshelf store tests**

Create `apps/web/__tests__/bookshelf/bookshelf-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useBookshelfStore } from "@/features/bookshelf/store";

describe("bookshelfStore", () => {
	beforeEach(() => {
		useBookshelfStore.setState({
			viewMode: "grid",
			sortBy: "recentRead",
			selectedGroupId: null,
			managementMode: false,
			selectedBookUrls: new Set(),
		});
	});

	it("should toggle view mode", () => {
		const store = useBookshelfStore.getState();
		expect(store.viewMode).toBe("grid");

		useBookshelfStore.getState().setViewMode("list");
		expect(useBookshelfStore.getState().viewMode).toBe("list");
	});

	it("should change sort mode", () => {
		useBookshelfStore.getState().setSortBy("title");
		expect(useBookshelfStore.getState().sortBy).toBe("title");
	});

	it("should select a group", () => {
		useBookshelfStore.getState().setSelectedGroupId("group-1");
		expect(useBookshelfStore.getState().selectedGroupId).toBe("group-1");
	});

	it("should toggle management mode", () => {
		useBookshelfStore.getState().toggleManagementMode();
		expect(useBookshelfStore.getState().managementMode).toBe(true);
		useBookshelfStore.getState().toggleManagementMode();
		expect(useBookshelfStore.getState().managementMode).toBe(false);
	});

	it("should toggle book selection", () => {
		useBookshelfStore.getState().toggleBookSelection("book-1");
		expect(useBookshelfStore.getState().selectedBookUrls.has("book-1")).toBe(true);
		useBookshelfStore.getState().toggleBookSelection("book-1");
		expect(useBookshelfStore.getState().selectedBookUrls.has("book-1")).toBe(false);
	});

	it("should clear selection", () => {
		useBookshelfStore.getState().toggleBookSelection("book-1");
		useBookshelfStore.getState().toggleBookSelection("book-2");
		useBookshelfStore.getState().clearSelection();
		expect(useBookshelfStore.getState().selectedBookUrls.size).toBe(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web exec vitest run __tests__/bookshelf/bookshelf-store.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write bookshelf store**

Replace entire content of `apps/web/features/bookshelf/store.ts`:

```ts
import { create } from "zustand";

type ViewMode = "grid" | "list";
type SortBy = "recentRead" | "addedTime" | "title" | "manual";

type BookshelfState = {
	readonly viewMode: ViewMode;
	readonly sortBy: SortBy;
	readonly selectedGroupId: string | null;
	readonly managementMode: boolean;
	readonly selectedBookUrls: Set<string>;
};

type BookshelfActions = {
	readonly setViewMode: (mode: ViewMode) => void;
	readonly setSortBy: (sort: SortBy) => void;
	readonly setSelectedGroupId: (groupId: string | null) => void;
	readonly toggleManagementMode: () => void;
	readonly toggleBookSelection: (bookUrl: string) => void;
	readonly clearSelection: () => void;
};

export type BookshelfStore = BookshelfState & BookshelfActions;

export const useBookshelfStore = create<BookshelfStore>()((set) => ({
	viewMode: "grid",
	sortBy: "recentRead",
	selectedGroupId: null,
	managementMode: false,
	selectedBookUrls: new Set<string>(),

	setViewMode: (mode) => set({ viewMode: mode }),
	setSortBy: (sort) => set({ sortBy: sort }),
	setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),
	toggleManagementMode: () =>
		set((state) => ({
			managementMode: !state.managementMode,
			selectedBookUrls: new Set<string>(),
		})),
	toggleBookSelection: (bookUrl) =>
		set((state) => {
			const next = new Set(state.selectedBookUrls);
			if (next.has(bookUrl)) {
				next.delete(bookUrl);
			} else {
				next.add(bookUrl);
			}
			return { selectedBookUrls: next };
		}),
	clearSelection: () => set({ selectedBookUrls: new Set<string>() }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web exec vitest run __tests__/bookshelf/bookshelf-store.test.ts`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/bookshelf/store.ts apps/web/__tests__/bookshelf/
git commit -m "feat(web): implement bookshelf Zustand store with view/sort/selection"
```

---

## Task 5: Implement Bookshelf Hooks (Data Layer)

**Files:**
- Create: `apps/web/features/bookshelf/hooks/use-books.ts`
- Create: `apps/web/features/bookshelf/hooks/use-book-groups.ts`

- [ ] **Step 1: Write use-books hook**

Create `apps/web/features/bookshelf/hooks/use-books.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { createDexie } from "@readerx/persistence";

type BookForList = {
	readonly bookUrl: string;
	readonly name: string;
	readonly author: string;
	readonly coverUrl: string | null;
	readonly lastReadTime: number;
	readonly lastChapterTitle: string | null;
	readonly durChapterIndex: number;
	readonly totalChapterNum: number;
	readonly durChapterPos: number;
	readonly group: number;
};

async function fetchBooks(
	groupId: number | null,
	sortBy: string,
): Promise<readonly BookForList[]> {
	const db = createDexie();
	const books = await db.books.toArray();

	const filtered =
		groupId !== null ? books.filter((b) => b.group === groupId) : books;

	const sorted = [...filtered].sort((a, b) => {
		switch (sortBy) {
			case "recentRead":
				return (b.lastReadTime ?? 0) - (a.lastReadTime ?? 0);
			case "addedTime":
				return (b.durChapterTime ?? 0) - (a.durChapterTime ?? 0);
			case "title":
				return (a.name ?? "").localeCompare(b.name ?? "", "zh");
			default:
				return 0;
		}
	});

	return sorted.map((b) => ({
		bookUrl: b.bookUrl,
		name: b.name,
		author: b.author,
		coverUrl: b.coverUrl,
		lastReadTime: b.lastReadTime ?? 0,
		lastChapterTitle: b.durChapterTitle ?? null,
		durChapterIndex: b.durChapterIndex ?? 0,
		totalChapterNum: b.totalChapterNum ?? 0,
		durChapterPos: b.durChapterPos ?? 0,
		group: b.group,
	}));
}

export function useBooks(
	groupId: number | null,
	sortBy: string,
) {
	return useQuery({
		queryKey: ["books", groupId, sortBy],
		queryFn: () => fetchBooks(groupId, sortBy),
		staleTime: 30_000,
	});
}
```

- [ ] **Step 2: Write use-book-groups hook**

Create `apps/web/features/bookshelf/hooks/use-book-groups.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { createDexie } from "@readerx/persistence";

type BookGroupForList = {
	readonly groupId: number;
	readonly groupName: string;
	readonly coverUrl: string | null;
};

async function fetchBookGroups(): Promise<readonly BookGroupForList[]> {
	const db = createDexie();
	const groups = await db.bookGroups.toArray();
	return groups.map((g) => ({
		groupId: g.groupId,
		groupName: g.groupName,
		coverUrl: null,
	}));
}

export function useBookGroups() {
	return useQuery({
		queryKey: ["bookGroups"],
		queryFn: fetchBookGroups,
		staleTime: 60_000,
	});
}
```

- [ ] **Step 3: Verify hooks compile**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors (note: may need to check persistence package exports)

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/bookshelf/hooks/
git commit -m "feat(web): add bookshelf data hooks (use-books, use-book-groups)"
```

---

## Task 6: Implement Bookshelf Components

**Files:**
- Create: `apps/web/features/bookshelf/components/book-card.tsx`
- Create: `apps/web/features/bookshelf/components/empty-bookshelf.tsx`
- Create: `apps/web/features/bookshelf/components/group-chips.tsx`
- Create: `apps/web/features/bookshelf/components/continue-reading-hero.tsx`
- Create: `apps/web/features/bookshelf/components/book-grid.tsx`
- Create: `apps/web/features/bookshelf/components/bookshelf-page.tsx`
- Rewrite: `apps/web/features/bookshelf/index.ts`

- [ ] **Step 1: Write book-card test**

Create `apps/web/__tests__/bookshelf/book-card.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookCard } from "@/features/bookshelf/components/book-card";

describe("BookCard", () => {
	it("renders book name and author", () => {
		render(
			<BookCard
				bookUrl="test://book"
				name="测试书籍"
				author="测试作者"
				coverUrl={null}
				progress={65}
			/>,
		);
		expect(screen.getByText("测试书籍")).toBeDefined();
		expect(screen.getByText("测试作者")).toBeDefined();
	});

	it("renders progress when > 0", () => {
		render(
			<BookCard
				bookUrl="test://book"
				name="书"
				author="作者"
				coverUrl={null}
				progress={65}
			/>,
		);
		expect(screen.getByText("65%")).toBeDefined();
	});

	it("hides progress when 0", () => {
		render(
			<BookCard
				bookUrl="test://book"
				name="书"
				author="作者"
				coverUrl={null}
				progress={0}
			/>,
		);
		expect(screen.queryByText("0%")).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run __tests__/bookshelf/book-card.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write book-card component**

Create `apps/web/features/bookshelf/components/book-card.tsx`:

```tsx
"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";

type BookCardProps = {
	readonly bookUrl: string;
	readonly name: string;
	readonly author: string;
	readonly coverUrl: string | null;
	readonly progress: number;
};

export function BookCard({
	bookUrl,
	name,
	author,
	coverUrl,
	progress,
}: BookCardProps) {
	return (
		<Link
			href={`/reader/${encodeURIComponent(bookUrl)}`}
			className="group flex flex-col gap-1.5"
		>
			<div
				className={cn(
					"relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2",
					"transition-transform group-hover:scale-[1.02]",
				)}
			>
				{coverUrl ? (
					<img
						src={coverUrl}
						alt={name}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full items-center justify-center">
						<BookOpen className="size-8 text-muted-foreground/50" />
					</div>
				)}
				{progress > 0 && (
					<div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-center text-xs text-white">
						{progress}%
					</div>
				)}
			</div>
			<div className="min-w-0">
				<p className="truncate text-sm font-medium leading-tight">{name}</p>
				<p className="truncate text-xs text-muted-foreground">{author}</p>
			</div>
		</Link>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run __tests__/bookshelf/book-card.test.tsx`
Expected: all 3 tests PASS

- [ ] **Step 5: Write remaining components**

Create `apps/web/features/bookshelf/components/empty-bookshelf.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyBookshelf() {
	const t = useTranslations("bookshelf");

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-surface-2">
				<BookOpen className="size-8 text-muted-foreground" />
			</div>
			<h2 className="text-lg font-medium">{t("noBooks")}</h2>
			<p className="text-sm text-muted-foreground">{t("noBooksHint")}</p>
			<Link href="/search">
				<Button variant="outline" size="sm">
					<Search className="size-4" />
					{t("noBooksHint")}
				</Button>
			</Link>
		</div>
	);
}
```

Create `apps/web/features/bookshelf/components/group-chips.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useBookshelfStore } from "../store";
import { useBookGroups } from "../hooks/use-book-groups";

export function GroupChips() {
	const t = useTranslations("bookshelf");
	const selectedGroupId = useBookshelfStore((s) => s.selectedGroupId);
	const setSelectedGroupId = useBookshelfStore((s) => s.setSelectedGroupId);
	const { data: groups } = useBookGroups();

	if (!groups || groups.length === 0) return null;

	return (
		<div className="flex gap-2 overflow-x-auto pb-1">
			<button
				type="button"
				onClick={() => setSelectedGroupId(null)}
				className={cn(
					"shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
					selectedGroupId === null
						? "bg-primary text-primary-foreground"
						: "bg-surface-2 text-muted-foreground hover:text-foreground",
				)}
			>
				{t("allBooks")}
			</button>
			{groups.map((group) => (
				<button
					key={group.groupId}
					type="button"
					onClick={() => setSelectedGroupId(String(group.groupId))}
					className={cn(
						"shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
						selectedGroupId === String(group.groupId)
							? "bg-primary text-primary-foreground"
							: "bg-surface-2 text-muted-foreground hover:text-foreground",
					)}
				>
					{group.groupName}
				</button>
			))}
		</div>
	);
}
```

Create `apps/web/features/bookshelf/components/continue-reading-hero.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import type { BookForList } from "../hooks/use-books";

type ContinueReadingHeroProps = {
	readonly book: BookForList;
};

export function ContinueReadingHero({ book }: ContinueReadingHeroProps) {
	const t = useTranslations("bookshelf");
	const progress =
		book.totalChapterNum > 0
			? Math.round((book.durChapterIndex / book.totalChapterNum) * 100)
			: 0;

	return (
		<Link
			href={`/reader/${encodeURIComponent(book.bookUrl)}`}
			className="group flex gap-4 rounded-xl bg-surface-2 p-4 transition-colors hover:bg-surface-3"
		>
			<div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3">
				{book.coverUrl ? (
					<img
						src={book.coverUrl}
						alt={book.name}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<BookOpen className="size-8 text-muted-foreground/50" />
				)}
			</div>
			<div className="flex min-w-0 flex-1 flex-col justify-center">
				<h2 className="truncate text-base font-semibold">{book.name}</h2>
				<p className="truncate text-sm text-muted-foreground">{book.author}</p>
				{book.lastChapterTitle && (
					<p className="mt-1 truncate text-xs text-muted-foreground">
						{book.lastChapterTitle}
					</p>
				)}
				<div className="mt-2 flex items-center gap-2">
					<div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
						<div
							className="h-full rounded-full bg-primary transition-all"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<span className="text-xs text-muted-foreground">{progress}%</span>
				</div>
			</div>
		</Link>
	);
}
```

Create `apps/web/features/bookshelf/components/book-grid.tsx`:

```tsx
"use client";

import { BookCard } from "./book-card";
import { EmptyBookshelf } from "./empty-bookshelf";
import type { BookForList } from "../hooks/use-books";

type BookGridProps = {
	readonly books: readonly BookForList[];
};

export function BookGrid({ books }: BookGridProps) {
	if (books.length === 0) {
		return <EmptyBookshelf />;
	}

	return (
		<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
			{books.map((book) => (
				<BookCard
					key={book.bookUrl}
					bookUrl={book.bookUrl}
					name={book.name}
					author={book.author}
					coverUrl={book.coverUrl}
					progress={
						book.totalChapterNum > 0
							? Math.round((book.durChapterIndex / book.totalChapterNum) * 100)
							: 0
					}
				/>
			))}
		</div>
	);
}
```

Create `apps/web/features/bookshelf/components/bookshelf-page.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useBookshelfStore } from "../store";
import { useBooks } from "../hooks/use-books";
import { ContinueReadingHero } from "./continue-reading-hero";
import { GroupChips } from "./group-chips";
import { BookGrid } from "./book-grid";

export function BookshelfPage() {
	const t = useTranslations("bookshelf");
	const sortBy = useBookshelfStore((s) => s.sortBy);
	const selectedGroupId = useBookshelfStore((s) => s.selectedGroupId);

	const groupIdNum =
		selectedGroupId !== null ? Number(selectedGroupId) : null;
	const { data: books, isLoading } = useBooks(groupIdNum, sortBy);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-muted-foreground">{t("loading")}</div>
			</div>
		);
	}

	const allBooks = books ?? [];
	const lastReadBook =
		allBooks.length > 0 && sortBy === "recentRead"
			? allBooks[0]
			: undefined;

	return (
		<div className="space-y-6">
			{lastReadBook && (
				<section>
					<h2 className="mb-3 text-sm font-medium text-muted-foreground">
						{t("continueReading")}
					</h2>
					<ContinueReadingHero book={lastReadBook} />
				</section>
			)}

			<section>
				<GroupChips />
			</section>

			<section>
				<BookGrid books={allBooks} />
			</section>
		</div>
	);
}
```

- [ ] **Step 6: Update bookshelf index.ts**

Replace entire content of `apps/web/features/bookshelf/index.ts`:

```ts
export { BookshelfPage } from "./components/bookshelf-page";
export { useBookshelfStore } from "./store";
export { useBooks } from "./hooks/use-books";
export { useBookGroups } from "./hooks/use-book-groups";
```

- [ ] **Step 7: Verify all compile**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Run all tests**

Run: `pnpm --filter web exec vitest run`
Expected: all tests PASS (existing + new bookshelf tests)

- [ ] **Step 9: Commit**

```bash
git add apps/web/features/bookshelf/
git commit -m "feat(web): implement bookshelf page with hero, groups, grid"
```

---

## Task 7: Wire Bookshelf into Home Page

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Update home page to use BookshelfPage**

Replace entire content of `apps/web/app/page.tsx`:

```tsx
"use client";

import { BookshelfPage } from "@/features/bookshelf";

export default function HomePage() {
	return <BookshelfPage />;
}
```

- [ ] **Step 2: Update app-shell header for bookshelf context**

Replace entire content of `apps/web/components/layout/app-shell.tsx`:

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesktopNav, MobileNav } from "./nav-items";

export function AppShell({ children }: { children: React.ReactNode }) {
	const { setTheme, resolvedTheme } = useTheme();

	return (
		<div className="flex min-h-dvh">
			<DesktopNav />
			<div className="flex flex-1 flex-col">
				<header className="sticky top-0 z-20 flex h-11 items-center justify-between px-4 backdrop-blur-xl bg-background/80">
					<div className="w-14" />
					<div className="flex items-center gap-1">
						<Link href="/search">
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground"
							>
								<Search className="size-4" />
							</Button>
						</Link>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() =>
								setTheme(resolvedTheme === "dark" ? "light" : "dark")
							}
							className="text-muted-foreground"
						>
							<Sun className="size-4 scale-100 rotate-0 dark:scale-0 dark:-rotate-90 transition-transform" />
							<Moon className="size-4 scale-0 rotate-90 dark:scale-100 dark:rotate-0 transition-transform" />
						</Button>
					</div>
				</header>
				<main className="flex-1 px-4 pb-20 md:px-6 md:pb-6 lg:px-8">
					{children}
				</main>
			</div>
			<MobileNav />
		</div>
	);
}
```

- [ ] **Step 3: Verify app compiles and renders**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/layout/app-shell.tsx
git commit -m "feat(web): wire bookshelf as home page with search in header"
```

---

## Task 8: Final Integration Test

**Files:**
- No new files — verification only

- [ ] **Step 1: Run full type check**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run all tests**

Run: `pnpm --filter web exec vitest run`
Expected: all tests PASS

- [ ] **Step 3: Run lint**

Run: `pnpm --filter web exec biome check apps/web/`
Expected: no errors (or only pre-existing ones)

- [ ] **Step 4: Verify dev server starts**

Run: `pnpm --filter web dev` (start, verify no crash, stop)

- [ ] **Step 5: Final commit with all cleanups**

```bash
git add -A
git commit -m "feat(web): complete P0 phase 1 — Legado navigation + bookshelf MVP"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|---|---|---|---|
| 1 | Update i18n | 0 | 2 |
| 2 | Update navigation | 0 | 1 |
| 3 | Restructure routes | 2 | 0 (delete 3) |
| 4 | Bookshelf store | 1 | 1 |
| 5 | Bookshelf hooks | 2 | 0 |
| 6 | Bookshelf components | 6 | 1 |
| 7 | Wire into home page | 0 | 2 |
| 8 | Integration test | 0 | 0 |

**Total: 11 new files, 7 modified files, 3 deleted files**

---

## Subsequent Plans

This plan produces a working bookshelf MVP. Subsequent plans (to be written separately):

| Plan | Scope | Depends On |
|---|---|---|
| **Phase 2** | Search page + Book detail + Source change | Phase 1 |
| **Phase 3** | Bookmarks + Reading progress + Reading statistics | Phase 1 |
| **Phase 4** | My/Profile sub-pages (theme, backup, import, etc.) | Phase 1 |
| **Phase 5** | Explore page (发现) + RSS subscriptions | Phase 2 |
| **Phase 6** | Offline cache + Service Worker + Download management | Phase 1 |
