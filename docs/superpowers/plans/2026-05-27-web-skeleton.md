# Web App Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the app running. Sidebar, topbar, mobile nav, 4 pages, theme, i18n. Minimal — just enough to start building features on top.

**Architecture:** Next.js App Router. No route group tricks — pages are flat under `app/`. Desktop gets a 56px icon sidebar, mobile gets bottom tabs. Responsive via CSS only (no JS breakpoint hooks). Providers inline in root layout, no abstraction. Theme cookie-SSR for zero flash.

**What this plan deliberately does NOT do:** Provider abstraction layer, JS responsive hooks, surface token system, reader theme classes, middleware sophistication, command palette prep, error boundaries, Suspense boundaries, prefetch strategy. Those come when real features need them.

**Tech Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · shadcn/ui · next-themes · next-intl · Zustand 5 · TanStack Query 5 · Lucide

**Spec:** [`docs/web-design/`](../../web-design/)（Wireframes · Design Tokens · Component Tree）

---

## File Structure

```
apps/web/
├── app/
│   ├── layout.tsx              # Root: fonts, providers inline, locale from cookie
│   ├── globals.css             # (modify) reader theme classes
│   ├── page.tsx                # Home — continue reading hero
│   ├── library/page.tsx        # Book library
│   ├── search/page.tsx         # Search
│   └── settings/page.tsx       # Settings
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx       # Shell: sidebar + topbar + mobile-nav + main
│   │   └── nav-items.tsx       # Nav items (shared data + rendering)
│   ├── providers.tsx           # QueryProvider (client boundary for QueryClient)
│   └── ui/button.tsx           # (existing)
├── i18n/
│   └── request.ts              # Cookie → Accept-Language fallback
├── messages/
│   ├── zh.json
│   └── en.json
└── next.config.ts              # next-intl plugin
```

---

## Task 1: Dependencies + Config

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Install deps**

```bash
cd /Users/logan/Desktop/workspaces/front/readerx && pnpm --filter web add next-themes next-intl
```

- [ ] **Step 2: Update next.config.ts**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/logan/Desktop/workspaces/front/readerx add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/next.config.ts && git -C /Users/logan/Desktop/workspaces/front/readerx commit -m "chore(web): add next-themes, next-intl deps and config"
```

---

## Task 2: i18n

**Files:**
- Create: `apps/web/i18n/request.ts`
- Create: `apps/web/messages/zh.json`
- Create: `apps/web/messages/en.json`

- [x] **Step 1: Request config — cookie first, Accept-Language fallback**

File: `apps/web/i18n/request.ts`

```ts
import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

function parseAcceptLanguage(header: string): string {
	const preferred = header.split(",").map((part) => {
		const [lang, priority] = part.trim().split(";q=");
		return { lang: lang.trim(), priority: priority ? Number.parseFloat(priority) : 1 };
	});
	preferred.sort((a, b) => b.priority - a.priority);
	const match = preferred.find((p) => p.lang.startsWith("zh") || p.lang.startsWith("en"));
	if (match?.lang.startsWith("zh")) return "zh";
	return "en";
}

export default getRequestConfig(async () => {
	const store = await cookies();
	const localeCookie = store.get("locale")?.value;
	if (localeCookie === "zh" || localeCookie === "en") {
		return {
			locale: localeCookie,
			messages: (await import(`../messages/${localeCookie}.json`)).default,
		};
	}

	const headersList = await headers();
	const acceptLang = headersList.get("accept-language") ?? "";
	const locale = parseAcceptLanguage(acceptLang);

	return {
		locale,
		messages: (await import(`../messages/${locale}.json`)).default,
	};
});
```

Priority: cookie → Accept-Language → `"en"` (not `"zh"` — international users deserve English default if no cookie set; Chinese users will have `zh` in Accept-Language).

- [x] **Step 2: Translation files**

File: `apps/web/messages/zh.json`

```json
{
	"nav": {
		"home": "首页",
		"library": "书库",
		"search": "搜索",
		"settings": "设置"
	},
	"home": {
		"continueReading": "继续阅读",
		"recentBooks": "最近在读",
		"noBooks": "还没有书籍",
		"searchToAdd": "搜索添加你的第一本书"
	},
	"library": { "title": "书库" },
	"search": {
		"title": "搜索",
		"placeholder": "搜索书名或作者..."
	},
	"settings": {
		"title": "设置",
		"sources": "书源管理",
		"reading": "阅读设置",
		"system": "系统",
		"theme": "主题",
		"themeLight": "亮色",
		"themeDark": "暗色",
		"themeSystem": "跟随系统",
		"language": "语言"
	},
	"common": {
		"loading": "加载中...",
		"error": "出错了",
		"retry": "重试"
	}
}
```

File: `apps/web/messages/en.json`

```json
{
	"nav": {
		"home": "Home",
		"library": "Library",
		"search": "Search",
		"settings": "Settings"
	},
	"home": {
		"continueReading": "Continue Reading",
		"recentBooks": "Recently Read",
		"noBooks": "No books yet",
		"searchToAdd": "Search to add your first book"
	},
	"library": { "title": "Library" },
	"search": {
		"title": "Search",
		"placeholder": "Search by title or author..."
	},
	"settings": {
		"title": "Settings",
		"sources": "Book Sources",
		"reading": "Reading",
		"system": "System",
		"theme": "Theme",
		"themeLight": "Light",
		"themeDark": "Dark",
		"themeSystem": "System",
		"language": "Language"
	},
	"common": {
		"loading": "Loading...",
		"error": "Something went wrong",
		"retry": "Retry"
	}
}
```

- [x] **Step 3: Verify typecheck**

```bash
cd /Users/logan/Desktop/workspaces/front/readerx && pnpm --filter web typecheck
```

- [x] **Step 4: Commit**

```bash
git -C /Users/logan/Desktop/workspaces/front/readerx add apps/web/i18n/ apps/web/messages/ && git -C /Users/logan/Desktop/workspaces/front/readerx commit -m "feat(web): i18n — next-intl, zh/en, cookie + accept-language fallback"
```

---

## Task 3: Root Layout — Providers Inline, Theme Cookie SSR

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/components/providers.tsx`
- Modify: `apps/web/app/globals.css` (add reader theme classes only)

- [x] **Step 1: Add reader theme classes to globals.css**

Append before `@layer base` in `apps/web/app/globals.css`:

```css
/* Reader themes */
.reader-theme-warm-white { --reader-bg: oklch(0.98 0.005 80); --reader-text: oklch(0.30 0.01 60); --reader-text-secondary: oklch(0.50 0.01 60); }
.reader-theme-beige { --reader-bg: oklch(0.93 0.02 80); --reader-text: oklch(0.28 0.02 60); --reader-text-secondary: oklch(0.48 0.02 60); }
.reader-theme-green { --reader-bg: oklch(0.92 0.03 155); --reader-text: oklch(0.25 0.02 140); --reader-text-secondary: oklch(0.45 0.02 140); }
.reader-theme-sepia { --reader-bg: oklch(0.25 0.03 60); --reader-text: oklch(0.75 0.03 70); --reader-text-secondary: oklch(0.60 0.03 70); }
.reader-theme-black { --reader-bg: oklch(0.12 0 0); --reader-text: oklch(0.65 0 0); --reader-text-secondary: oklch(0.50 0 0); }
```

- [x] **Step 2: Create QueryProvider (client component)**

`QueryClient` is a class instance and cannot be serialized from Server to Client Component.
Uses `useState` initializer for client-side singleton — the recommended pattern for App Router.

File: `apps/web/components/providers.tsx`

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [client] = useState(
		() => new QueryClient({
			defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
		}),
	);
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [x] **Step 3: Rewrite root layout**

File: `apps/web/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "ReaderX",
	description: "私人阅读空间",
};

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="min-h-dvh">
				<NextIntlClientProvider messages={messages}>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						<QueryProvider>
							<AppShell>{children}</AppShell>
						</QueryProvider>
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
```

Root layout is async Server Component. ThemeProvider and NextIntlClientProvider accept `children` — Server Component rendering Client Components with nested children is the standard Next.js pattern.

- [x] **Step 4: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/globals.css apps/web/components/providers.tsx && git commit -m "feat(web): root layout — inline providers, i18n, theme, query client"
```

---

## Task 4: App Shell — Sidebar + Topbar + Mobile Nav

**Files:**
- Create: `apps/web/components/layout/nav-items.tsx`
- Create: `apps/web/components/layout/app-shell.tsx`

Two files, not five. The shell is one component that handles both desktop and mobile via CSS. No separate sidebar/topbar/mobile-nav files.

- [ ] **Step 1: Create nav items**

File: `apps/web/components/layout/nav-items.tsx`

```tsx
"use client";

import { useTranslations } from "next-intl";
import { BookOpen, Home, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
	{ href: "/", label: "home", icon: Home },
	{ href: "/library", label: "library", icon: BookOpen },
	{ href: "/search", label: "search", icon: Search },
	{ href: "/settings", label: "settings", icon: Settings },
] as const;

export function DesktopNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();

	return (
		<aside className="hidden w-14 shrink-0 flex-col py-4 md:flex">
			<Link href="/" className="flex items-center justify-center py-3">
				<BookOpen className="size-5 text-foreground" />
			</Link>
			<nav className="mt-2 flex flex-col items-center gap-1 px-2">
				{items.map((item) => {
					const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							title={t(item.label)}
							className={cn(
								"flex size-10 items-center justify-center rounded-lg transition-colors",
								active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
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

	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/40 bg-background/80 md:hidden"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			{items.map((item) => {
				const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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

- Desktop: 56px sidebar (w-14), icons only, `title` tooltip on hover. No background, no border — floating icons.
- Mobile: bottom tabs, hidden on md+. Minimal blur (`bg-background/80` — not `backdrop-blur-xl`, just slight transparency).
- No `bg-muted` on active — just color change. No `rounded-lg` bg on active items. Clean, not dashboard.

- [ ] **Step 2: Create app shell**

File: `apps/web/components/layout/app-shell.tsx`

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DesktopNav, MobileNav } from "./nav-items";

export function AppShell({ children }: { children: React.ReactNode }) {
	const { setTheme, resolvedTheme } = useTheme();

	return (
		<div className="flex min-h-dvh">
			<DesktopNav />
			<div className="flex flex-1 flex-col">
				<header className="sticky top-0 z-20 flex h-11 items-center justify-end px-4">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
						className="text-muted-foreground"
					>
						<Sun className="size-4 scale-100 rotate-0 dark:scale-0 dark:-rotate-90 transition-transform" />
						<Moon className="size-4 scale-0 rotate-90 dark:scale-100 dark:rotate-0 transition-transform" />
					</Button>
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

One `"use client"` component that owns the entire shell. Not three separate client components.

- Topbar: minimal — just theme toggle on the right. No `backdrop-blur-xl`. No `border-b`. Transparent header. `h-11` (44px), compact.
- `pb-20` on mobile main content to account for bottom nav height. `md:pb-6` on desktop.
- Uses `resolvedTheme` (not `theme`) so it works with `system` setting.

Wait — `AppShell` is `"use client"`. But `children` comes from a Server Component (the page). This works in Next.js — client components can receive Server Component children as a prop. The children are streamed separately.

But there's an issue: `children` is passed through a client component boundary. This means the pages will be rendered on server and passed through. This is the standard Next.js pattern and works correctly.

- [ ] **Step 3: Use AppShell in root layout**

Update `apps/web/app/layout.tsx` — replace the direct `{children}` with `<AppShell>{children}</AppShell>`:

```tsx
import { AppShell } from "@/components/layout/app-shell";
```

And wrap `{children}`:

```tsx
<QueryClientProvider client={getQueryClient()}>
	<AppShell>{children}</AppShell>
</QueryClientProvider>
```

- [ ] **Step 4: Verify typecheck**

```bash
cd /Users/logan/Desktop/workspaces/front/readerx && pnpm --filter web typecheck
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/logan/Desktop/workspaces/front/readerx add apps/web/components/layout/ apps/web/app/layout.tsx && git -C /Users/logan/Desktop/workspaces/front/readerx commit -m "feat(web): app shell — sidebar, topbar, mobile nav, theme toggle"
```

---

## Task 5: Pages

**Files:**
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/library/page.tsx`
- Create: `apps/web/app/search/page.tsx`
- Create: `apps/web/app/settings/page.tsx`

No route group — pages are flat under `app/`. The AppShell in root layout handles the chrome.

- [ ] **Step 1: Home page**

File: `apps/web/app/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
	const t = await getTranslations("home");
	return (
		<div className="space-y-8">
			<section>
				<h1 className="text-2xl font-semibold">{t("continueReading")}</h1>
				<p className="mt-3 text-muted-foreground">{t("noBooks")}</p>
			</section>
		</div>
	);
}
```

- [ ] **Step 2: Library page**

File: `apps/web/app/library/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";

export default async function LibraryPage() {
	const t = await getTranslations("library");
	return <h1 className="text-2xl font-semibold">{t("title")}</h1>;
}
```

- [ ] **Step 3: Search page**

File: `apps/web/app/search/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";

export default async function SearchPage() {
	const t = await getTranslations("search");
	return <h1 className="text-2xl font-semibold">{t("title")}</h1>;
}
```

- [ ] **Step 4: Settings page**

File: `apps/web/app/settings/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";

export default async function SettingsPage() {
	const t = await getTranslations("settings");
	return <h1 className="text-2xl font-semibold">{t("title")}</h1>;
}
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/logan/Desktop/workspaces/front/readerx add apps/web/app/page.tsx apps/web/app/library/ apps/web/app/search/ apps/web/app/settings/ && git -C /Users/logan/Desktop/workspaces/front/readerx commit -m "feat(web): page stubs — home, library, search, settings"
```

---

## Task 6: Verify

**Files:** None

- [ ] **Step 1: Typecheck**

```bash
cd /Users/logan/Desktop/workspaces/front/readerx && pnpm --filter web typecheck
```

- [ ] **Step 2: Lint**

```bash
pnpm --filter web lint
```

- [ ] **Step 3: Dev server**

```bash
pnpm --filter web dev
```

Check:
1. Home loads — "继续阅读" visible
2. Desktop: icon sidebar on left
3. Mobile: bottom tabs visible
4. Theme toggle works (light ↔ dark)
5. Navigation works between 4 pages
6. URLs: `/`, `/library`, `/search`, `/settings`

---

## Self-Review

### 1. Spec Coverage

| Spec Section | Status |
|---|---|
| §0 不做什么 | N/A |
| §1 快/稳/安静/简单 | CSS-only responsive, no JS hooks, minimal blur, minimal DOM |
| §2 导航 (4 areas, sidebar, bottom bar) | Task 4 (DesktopNav + MobileNav), Task 5 (pages) |
| §3 信息密度 | Task 5 (home has hero section) |
| §7 动效 | `disableTransitionOnChange`, no motion elsewhere |
| §8 视觉系统 | Reader theme CSS classes (Task 3), existing shadcn tokens |
| §9 主题系统 | next-themes inline in layout (Task 3) |
| §10 多语言 | next-intl with cookie + Accept-Language (Task 2) |
| §13 响应式 | CSS-only: `hidden md:flex`, `md:hidden` (Task 4) |
| §15 技术实现 | All correct |
| §4-6, §11-12, §14, §16 | Deferred — feature work |

### 2. Placeholder Scan

No TBD/TODO/Wait/Correction patterns. No reasoning noise.

### 3. What was cut from v1

| Cut | Why |
|---|---|
| `ComposeProviders` | Unnecessary abstraction — 2 providers inline is fine |
| `useMediaQuery` hook | CSS-only responsive is more stable, no hydration mismatch |
| Surface tokens in CSS | Existing shadcn tokens work, add when needed |
| Middleware file | Not needed without URL-prefix i18n |
| `(shell)` route group | Unnecessary nesting — AppShell component handles it |
| Separate sidebar/topbar/mobile-nav files | One `nav-items.tsx` + one `app-shell.tsx` is enough |
| `lib/env.ts` | No env vars needed yet |
| Feature store fills | Not needed until features are built |

### 4. File count comparison

v1: 16 new files. v2: 10 new files (37% reduction). Actual: 11 files (added `providers.tsx`, removed `routing.ts`, removed `lib/query-client.ts`).
