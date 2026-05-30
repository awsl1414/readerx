# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建完整的 ReaderX 主题系统——CSS 令牌落地、阅读器主题纯 CSS 化、`/my/theme` 设置页、SettingsStorage 抽象。

**Architecture:** 单一 CSS 变量体系（方案 A）。所有设计令牌通过 CSS 自定义属性定义，Tailwind `@theme inline` 映射。阅读器主题通过 `[data-reader-theme]` 属性选择器实现，零 JS 颜色对象。用户偏好通过 `SettingsStorage` 接口持久化，先实现 `LocalStorageSettingsStorage`。

**Tech Stack:** Tailwind CSS 4 · oklch · next-themes · shadcn/ui (radix-nova) · localStorage

---

## File Structure

| 操作 | 文件 | 职责 |
|------|------|------|
| Create | `apps/web/lib/settings-storage.ts` | SettingsStorage 接口 + LocalStorage 实现 |
| Create | `apps/web/features/reader/hooks/use-reader-settings.ts` | 阅读器偏好 Hook |
| Create | `apps/web/app/my/theme/page.tsx` | RSC 入口页 |
| Create | `apps/web/app/my/theme/theme-settings.tsx` | Client Component 设置界面 |
| Modify | `apps/web/app/globals.css` | Surface 层 + Primary 蓝紫 + 语义色 + reader CSS |
| Modify | `apps/web/features/reader/types.ts` | 新增 ReaderFontPreset |
| Modify | `apps/web/features/reader/atmosphere.ts` | 删除 JS 颜色对象，新增 FONT_PRESETS |
| Modify | `apps/web/features/reader/components/reader-view.tsx` | data-reader-theme + Tailwind |
| Modify | `apps/web/features/reader/components/atmosphere-picker.tsx` | 改用 Tailwind 类 |
| Modify | `apps/web/messages/zh.json` | 新增主题设置翻译 |
| Add | `apps/web/components/ui/slider.tsx` | shadcn Slider 组件 |

---

## Task 1: SettingsStorage 抽象层

**Files:**
- Create: `apps/web/lib/settings-storage.ts`
- Test: `apps/web/lib/__tests__/settings-storage.test.ts`

- [ ] **Step 1: 创建 SettingsStorage 接口 + LocalStorage 实现**

```ts
// apps/web/lib/settings-storage.ts
type SettingsStorage = {
	get<T>(key: string, fallback: T): T;
	set<T>(key: string, value: T): void;
	subscribe(key: string, callback: (value: unknown) => void): () => void;
};

class LocalStorageSettingsStorage implements SettingsStorage {
	get<T>(key: string, fallback: T): T {
		if (typeof window === "undefined") return fallback;
		try {
			const raw = localStorage.getItem(key);
			return raw !== null ? (JSON.parse(raw) as T) : fallback;
		} catch {
			return fallback;
		}
	}

	set<T>(key: string, value: T): void {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// localStorage 满或不可用时静默失败
		}
	}

	subscribe(key: string, callback: (value: unknown) => void): () => void {
		function handler(e: StorageEvent) {
			if (e.key === key) {
				callback(e.newValue !== null ? JSON.parse(e.newValue) : undefined);
			}
		}
		window.addEventListener("storage", handler);
		return () => window.removeEventListener("storage", handler);
	}
}

const settingsStorage: SettingsStorage = new LocalStorageSettingsStorage();

export type { SettingsStorage };
export { LocalStorageSettingsStorage, settingsStorage };
```

- [ ] **Step 2: 编写测试**

```ts
// apps/web/lib/__tests__/settings-storage.test.ts
import { describe, expect, it } from "vitest";
import { LocalStorageSettingsStorage } from "../settings-storage";

describe("LocalStorageSettingsStorage", () => {
	it("returns fallback when key does not exist", () => {
		const storage = new LocalStorageSettingsStorage();
		expect(storage.get("nonexistent", "default")).toBe("default");
	});

	it("stores and retrieves a value", () => {
		const storage = new LocalStorageSettingsStorage();
		storage.set("test-key", { name: "ReaderX" });
		expect(storage.get("test-key", null)).toEqual({ name: "ReaderX" });
	});

	it("overwrites existing value", () => {
		const storage = new LocalStorageSettingsStorage();
		storage.set("test-key", "old");
		storage.set("test-key", "new");
		expect(storage.get("test-key", "")).toBe("new");
	});

	it("handles number values", () => {
		const storage = new LocalStorageSettingsStorage();
		storage.set("font-size", 17);
		expect(storage.get("font-size", 0)).toBe(17);
	});
});
```

- [ ] **Step 3: 运行测试**

Run: `pnpm --filter web vitest run apps/web/lib/__tests__/settings-storage.test.ts`
Expected: 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/settings-storage.ts apps/web/lib/__tests__/settings-storage.test.ts
git commit -m "feat: add SettingsStorage abstraction with LocalStorage implementation"
```

---

## Task 2: CSS 令牌体系重写

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: 重写 globals.css**

完整替换文件内容为：

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
	/* Surface 层级 */
	--color-surface-0: var(--surface-0);
	--color-surface-1: var(--surface-1);
	--color-surface-2: var(--surface-2);
	--color-surface-3: var(--surface-3);
	--color-surface-4: var(--surface-4);

	/* 语义色映射 */
	--color-background: var(--background);
	--color-foreground: var(--foreground);
	--color-card: var(--card);
	--color-card-foreground: var(--card-foreground);
	--color-popover: var(--popover);
	--color-popover-foreground: var(--popover-foreground);
	--color-primary: var(--primary);
	--color-primary-foreground: var(--primary-foreground);
	--color-secondary: var(--secondary);
	--color-secondary-foreground: var(--secondary-foreground);
	--color-muted: var(--muted);
	--color-muted-foreground: var(--muted-foreground);
	--color-accent: var(--accent);
	--color-accent-foreground: var(--accent-foreground);
	--color-destructive: var(--destructive);
	--color-success: var(--success);
	--color-success-foreground: var(--success-foreground);
	--color-warning: var(--warning);
	--color-warning-foreground: var(--warning-foreground);
	--color-border: var(--border);
	--color-input: var(--input);
	--color-ring: var(--ring);
	--color-chart-1: var(--chart-1);
	--color-chart-2: var(--chart-2);
	--color-chart-3: var(--chart-3);
	--color-chart-4: var(--chart-4);
	--color-chart-5: var(--chart-5);

	/* 圆角 */
	--radius-sm: calc(var(--radius) * 0.6);
	--radius-md: calc(var(--radius) * 0.8);
	--radius-lg: var(--radius);
	--radius-xl: calc(var(--radius) * 1.4);
	--radius-2xl: calc(var(--radius) * 1.8);
	--radius-3xl: calc(var(--radius) * 2.2);
	--radius-4xl: calc(var(--radius) * 2.6);

	/* Sidebar */
	--color-sidebar-ring: var(--sidebar-ring);
	--color-sidebar-border: var(--sidebar-border);
	--color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
	--color-sidebar-accent: var(--sidebar-accent);
	--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
	--color-sidebar-primary: var(--sidebar-primary);
	--color-sidebar-foreground: var(--sidebar-foreground);
	--color-sidebar: var(--sidebar);

	/* 字体 */
	--font-sans: var(--font-sans);
	--font-mono: var(--font-geist-mono);
	--font-heading: var(--font-sans);

	/* 阅读器 */
	--color-reader-bg: var(--reader-bg);
	--color-reader-text: var(--reader-text);
	--color-reader-text-secondary: var(--reader-text-secondary);
	--color-reader-divider: var(--reader-divider);
}

/* ─── 亮色主题 ─── */
:root {
	/* Surface 层级（中性灰，零色度） */
	--surface-0: oklch(0.98 0 0);
	--surface-1: oklch(0.995 0 0);
	--surface-2: oklch(0.96 0 0);
	--surface-3: oklch(0.93 0 0);
	--surface-4: oklch(0.90 0 0);

	/* 语义色映射到 Surface */
	--background: var(--surface-0);
	--foreground: oklch(0.15 0 0);
	--card: var(--surface-1);
	--card-foreground: oklch(0.15 0 0);
	--popover: var(--surface-2);
	--popover-foreground: oklch(0.15 0 0);

	/* Primary — hue 260 蓝紫 */
	--primary: oklch(0.55 0.15 260);
	--primary-foreground: oklch(0.98 0 0);

	--secondary: oklch(0.96 0 0);
	--secondary-foreground: oklch(0.20 0 0);
	--muted: oklch(0.96 0 0);
	--muted-foreground: oklch(0.50 0 0);
	--accent: oklch(0.96 0 0);
	--accent-foreground: oklch(0.20 0 0);
	--destructive: oklch(0.577 0.245 27.325);

	/* 语义色 */
	--success: oklch(0.50 0.12 155);
	--success-foreground: oklch(0.98 0 0);
	--warning: oklch(0.60 0.10 80);
	--warning-foreground: oklch(0.15 0 0);

	--border: oklch(0.90 0 0);
	--input: oklch(0.90 0 0);
	--ring: oklch(0.55 0.15 260);

	--chart-1: oklch(0.55 0.15 260);
	--chart-2: oklch(0.50 0.12 155);
	--chart-3: oklch(0.60 0.10 80);
	--chart-4: oklch(0.577 0.20 25);
	--chart-5: oklch(0.50 0 0);

	--radius: 0.625rem;

	--sidebar: var(--surface-0);
	--sidebar-foreground: oklch(0.15 0 0);
	--sidebar-primary: oklch(0.55 0.15 260);
	--sidebar-primary-foreground: oklch(0.98 0 0);
	--sidebar-accent: oklch(0.96 0 0);
	--sidebar-accent-foreground: oklch(0.20 0 0);
	--sidebar-border: oklch(0.90 0 0);
	--sidebar-ring: oklch(0.55 0.15 260);

	/* 阅读器默认值（warm-white） */
	--reader-bg: oklch(0.98 0.005 80);
	--reader-text: oklch(0.30 0.01 60);
	--reader-text-secondary: oklch(0.50 0.01 60);
	--reader-divider: oklch(0.90 0 0);
}

/* ─── 暗色主题 ─── */
.dark {
	--surface-0: oklch(0.13 0 0);
	--surface-1: oklch(0.18 0 0);
	--surface-2: oklch(0.22 0 0);
	--surface-3: oklch(0.25 0 0);
	--surface-4: oklch(0.28 0 0);

	--background: var(--surface-0);
	--foreground: oklch(0.95 0 0);
	--card: var(--surface-1);
	--card-foreground: oklch(0.95 0 0);
	--popover: var(--surface-2);
	--popover-foreground: oklch(0.95 0 0);

	--primary: oklch(0.72 0.16 260);
	--primary-foreground: oklch(0.15 0 0);

	--secondary: oklch(0.22 0 0);
	--secondary-foreground: oklch(0.95 0 0);
	--muted: oklch(0.22 0 0);
	--muted-foreground: oklch(0.65 0 0);
	--accent: oklch(0.22 0 0);
	--accent-foreground: oklch(0.95 0 0);
	--destructive: oklch(0.704 0.191 22.216);

	--success: oklch(0.65 0.17 155);
	--success-foreground: oklch(0.13 0 0);
	--warning: oklch(0.75 0.15 80);
	--warning-foreground: oklch(0.13 0 0);

	--border: oklch(1 0 0 / 10%);
	--input: oklch(1 0 0 / 15%);
	--ring: oklch(0.72 0.16 260);

	--chart-1: oklch(0.72 0.16 260);
	--chart-2: oklch(0.65 0.17 155);
	--chart-3: oklch(0.75 0.15 80);
	--chart-4: oklch(0.704 0.191 22.216);
	--chart-5: oklch(0.65 0 0);

	--sidebar: var(--surface-0);
	--sidebar-foreground: oklch(0.95 0 0);
	--sidebar-primary: oklch(0.72 0.16 260);
	--sidebar-primary-foreground: oklch(0.15 0 0);
	--sidebar-accent: oklch(0.22 0 0);
	--sidebar-accent-foreground: oklch(0.95 0 0);
	--sidebar-border: oklch(1 0 0 / 10%);
	--sidebar-ring: oklch(0.72 0.16 260);

	--reader-divider: oklch(0.25 0 0);
}

/* ─── 阅读器主题 ─── */
[data-reader-theme="warm-white"] {
	--reader-bg: oklch(0.98 0.005 80);
	--reader-text: oklch(0.30 0.01 60);
	--reader-text-secondary: oklch(0.50 0.01 60);
}

[data-reader-theme="beige"] {
	--reader-bg: oklch(0.93 0.02 80);
	--reader-text: oklch(0.28 0.02 60);
	--reader-text-secondary: oklch(0.50 0.02 60);
}

[data-reader-theme="green"] {
	--reader-bg: oklch(0.92 0.03 155);
	--reader-text: oklch(0.25 0.02 140);
	--reader-text-secondary: oklch(0.45 0.02 140);
}

[data-reader-theme="sepia"] {
	--reader-bg: oklch(0.25 0.03 60);
	--reader-text: oklch(0.75 0.03 70);
	--reader-text-secondary: oklch(0.55 0.03 70);
}

[data-reader-theme="black"] {
	--reader-bg: oklch(0.12 0 0);
	--reader-text: oklch(0.65 0 0);
	--reader-text-secondary: oklch(0.45 0 0);
}

@layer base {
	* {
		@apply border-border outline-ring/50;
	}
	body {
		@apply bg-background text-foreground;
	}
	html {
		@apply font-sans;
	}
}
```

- [ ] **Step 2: 运行 build 验证**

Run: `turbo build --filter=web`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(css): redesign token system — surface layers, primary blue-purple, semantic colors, reader theme CSS"
```

---

## Task 3: 阅读器类型 + Atmosphere 迁移

**Files:**
- Modify: `apps/web/features/reader/types.ts`
- Modify: `apps/web/features/reader/atmosphere.ts`

- [ ] **Step 1: 更新 types.ts — 新增 ReaderFontPreset**

在 `types.ts` 中新增以下类型（在 `ReaderTheme` 之后）：

```ts
type ReaderFontPreset = "system" | "serif" | "sans";
```

并在 export 中新增 `ReaderFontPreset`：

```ts
export type {
	AtmospherePreset,
	CachedChapter,
	ChapterInfo,
	GestureMode,
	ReaderFontPreset,
	ReaderState,
	ReaderTheme,
	ReaderThemeColors,
	ReadingAtmosphere,
	SessionDeps,
};
```

- [ ] **Step 2: 重写 atmosphere.ts**

完整替换 `atmosphere.ts`：

```ts
import type { LayoutConfig } from "@readerx/reader-engine";
import type {
	AtmospherePreset,
	ReaderFontPreset,
	ReadingAtmosphere,
} from "./types";

const FONT_PRESETS = Object.freeze({
	system: "system-ui, -apple-system, sans-serif",
	serif: "ui-serif, Georgia, 'Noto Serif SC', serif",
	sans: "ui-sans-serif, 'Noto Sans SC', sans-serif",
} as const satisfies Record<ReaderFontPreset, string>);

const ATMOSPHERE_PRESETS = Object.freeze({
	novel: {
		preset: "novel",
		fontSize: 17,
		lineHeight: 1.9,
		maxWidth: 680,
		paragraphSpacing: 1.2,
		theme: "warm-white",
		font: FONT_PRESETS.serif,
	},
	focus: {
		preset: "focus",
		fontSize: 19,
		lineHeight: 2.0,
		maxWidth: 580,
		paragraphSpacing: 1.4,
		theme: "black",
		font: FONT_PRESETS.serif,
	},
	dense: {
		preset: "dense",
		fontSize: 15,
		lineHeight: 1.7,
		maxWidth: 760,
		paragraphSpacing: 0.6,
		theme: "green",
		font: FONT_PRESETS.serif,
	},
} as const satisfies Record<AtmospherePreset, ReadingAtmosphere>);

function toLayoutConfig(
	atm: ReadingAtmosphere,
	viewport: { width: number; height: number },
): LayoutConfig {
	const paddingH = viewport.width < 768 ? 20 : 40;
	return {
		pageWidth: Math.min(atm.maxWidth, viewport.width) - paddingH * 2,
		pageHeight: viewport.height - paddingH * 2,
		lineHeight: atm.fontSize * atm.lineHeight,
		font: atm.font,
		paddingTop: atm.fontSize * atm.paragraphSpacing,
		paddingBottom: atm.fontSize * atm.paragraphSpacing,
		paddingLeft: paddingH,
		paddingRight: paddingH,
	};
}

export { ATMOSPHERE_PRESETS, FONT_PRESETS, toLayoutConfig };
```

注意：`READER_THEME_COLORS` 和 `getThemeColors` 已删除。`ReaderThemeColors` 类型保留在 types.ts 中（可能被其他地方引用，编译时再确认）。

- [ ] **Step 3: 运行 typecheck 查看断裂引用**

Run: `turbo typecheck --filter=web`
Expected: 编译错误指向 `getThemeColors` 和 `READER_THEME_COLORS` 的消费方。这些将在 Task 4 修复。

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/reader/types.ts apps/web/features/reader/atmosphere.ts
git commit -m "refactor(reader): delete JS color objects, add FONT_PRESETS, prepare for CSS-driven theming"
```

---

## Task 4: Reader View 重构

**Files:**
- Modify: `apps/web/features/reader/components/reader-view.tsx`
- Modify: `apps/web/features/reader/components/atmosphere-picker.tsx`

- [ ] **Step 1: 重构 reader-view.tsx**

关键改动点（逐个 Edit）：

**1a.** 删除 `getThemeColors` 导入，新增 `FONT_PRESETS` 导入：

```
旧: import { getThemeColors } from "../atmosphere";
新: import { FONT_PRESETS } from "../atmosphere";
```

**1b.** Loading 态（line 145）改为使用 Tailwind 类：

```
旧: <div style={{ minHeight: "100vh", background: "oklch(0.12 0 0)" }} />
新: <div className="min-h-dvh bg-surface-0" />
```

**1c.** 删除 `const colors = getThemeColors(...)` 行（line 151）。

**1d.** 主容器（lines 162-169）从 inline style 改为 Tailwind + data 属性：

```
旧:
<div
	style={{
		position: "relative",
		minHeight: "100vh",
		background: colors.bg,
		color: colors.text,
		overflow: "hidden",
	}}
>

新:
<div
	data-reader-theme={state.atmosphere.theme}
	className="relative min-h-dvh bg-reader-bg text-reader-text overflow-hidden"
>
```

**1e.** 内容区 section（lines 171-185）保留 inline style 中的 `transition` 和 `transform`（这些是动态交互值，不适合用 Tailwind），删除 `minHeight`：

```
旧:
style={{
	display: "flex",
	transition: "transform 0.3s ease",
	transform: tocOpen ? "translateX(-24px)" : "none",
	minHeight: "100vh",
}}

新:
style={{
	transition: "transform 0.3s ease",
	transform: tocOpen ? "translateX(-24px)" : "none",
}}
className="flex min-h-dvh"
```

**1f.** TOC 分割线（line 213）从 inline style 改为 Tailwind：

```
旧: <div style={{ width: 1, background: "oklch(0.22 0 0)" }} />
新: <div className="w-px bg-reader-divider" />
```

- [ ] **Step 2: 重构 atmosphere-picker.tsx**

完整替换：

```tsx
import type { AtmospherePreset } from "../types";
import { cn } from "@/lib/cn";

type AtmospherePickerProps = {
	readonly current: AtmospherePreset;
	readonly onSelect: (preset: AtmospherePreset) => void;
};

const PRESETS: readonly {
	key: AtmospherePreset;
	icon: string;
	label: string;
}[] = [
	{ key: "novel", icon: "Aa", label: "小说" },
	{ key: "focus", icon: "T", label: "专注" },
	{ key: "dense", icon: "≡", label: "密集" },
];

function AtmospherePicker({ current, onSelect }: AtmospherePickerProps) {
	return (
		<div className="flex gap-3 justify-center text-base">
			{PRESETS.map((p) => (
				<button
					key={p.key}
					type="button"
					onClick={() => onSelect(p.key)}
					title={p.label}
					className={cn(
						"bg-transparent border-none cursor-pointer pb-0.5 text-inherit transition-opacity",
						current === p.key
							? "opacity-100 border-b border-current"
							: "opacity-30",
					)}
				>
					{p.icon}
				</button>
			))}
		</div>
	);
}

export type { AtmospherePickerProps };
export { AtmospherePicker };
```

- [ ] **Step 3: 运行 typecheck + build**

Run: `turbo typecheck --filter=web && turbo build --filter=web`
Expected: 所有类型错误已修复，BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/reader/components/reader-view.tsx apps/web/features/reader/components/atmosphere-picker.tsx
git commit -m "refactor(reader): migrate reader-view to CSS-driven theming with data-reader-theme"
```

---

## Task 5: useReaderSettings Hook

**Files:**
- Create: `apps/web/features/reader/hooks/use-reader-settings.ts`
- Test: `apps/web/features/reader/hooks/__tests__/use-reader-settings.test.ts`

- [ ] **Step 1: 创建 Hook**

```ts
// apps/web/features/reader/hooks/use-reader-settings.ts
"use client";

import { useCallback, useState } from "react";
import { settingsStorage } from "@/lib/settings-storage";
import { FONT_PRESETS } from "../atmosphere";
import type { ReaderFontPreset, ReaderTheme } from "../types";

type ReaderSettings = {
	readonly theme: ReaderTheme;
	readonly font: ReaderFontPreset;
	readonly fontSize: number;
	readonly lineHeight: number;
	readonly paragraphSpacing: number;
	readonly contentWidth: number;
	readonly textIndent: string;
	readonly textAlign: "left" | "justify";
};

const STORAGE_KEY = "readerx:reader-settings";

const DEFAULT_SETTINGS: ReaderSettings = {
	theme: "warm-white",
	font: "serif",
	fontSize: 17,
	lineHeight: 1.9,
	paragraphSpacing: 1.2,
	contentWidth: 680,
	textIndent: "2em",
	textAlign: "justify",
};

function loadSettings(): ReaderSettings {
	const stored = settingsStorage.get<Partial<ReaderSettings>>(STORAGE_KEY, {});
	return { ...DEFAULT_SETTINGS, ...stored };
}

function useReaderSettings() {
	const [settings, setSettings] = useState<ReaderSettings>(loadSettings);

	const updateSettings = useCallback(
		(partial: Partial<ReaderSettings>) => {
			setSettings((prev) => {
				const next = { ...prev, ...partial };
				settingsStorage.set(STORAGE_KEY, next);
				return next;
			});
		},
		[],
	);

	return { settings, updateSettings };
}

export type { ReaderFontPreset, ReaderSettings };
export { DEFAULT_SETTINGS, FONT_PRESETS, useReaderSettings };
```

- [ ] **Step 2: 编写测试**

```ts
// apps/web/features/reader/hooks/__tests__/use-reader-settings.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReaderSettings } from "../use-reader-settings";

describe("useReaderSettings", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns default settings when nothing stored", () => {
		const { result } = renderHook(() => useReaderSettings());
		expect(result.current.settings.theme).toBe("warm-white");
		expect(result.current.settings.fontSize).toBe(17);
	});

	it("updates a single setting", () => {
		const { result } = renderHook(() => useReaderSettings());
		act(() => {
			result.current.updateSettings({ fontSize: 20 });
		});
		expect(result.current.settings.fontSize).toBe(20);
		expect(result.current.settings.theme).toBe("warm-white");
	});

	it("persists to localStorage", () => {
		const { result } = renderHook(() => useReaderSettings());
		act(() => {
			result.current.updateSettings({ theme: "black" });
		});
		const stored = JSON.parse(
			localStorage.getItem("readerx:reader-settings") ?? "{}",
		);
		expect(stored.theme).toBe("black");
	});

	it("loads from localStorage on init", () => {
		localStorage.setItem(
			"readerx:reader-settings",
			JSON.stringify({ fontSize: 22, theme: "green" }),
		);
		const { result } = renderHook(() => useReaderSettings());
		expect(result.current.settings.fontSize).toBe(22);
		expect(result.current.settings.theme).toBe("green");
	});
});
```

- [ ] **Step 3: 运行测试**

Run: `pnpm --filter web vitest run apps/web/features/reader/hooks/__tests__/use-reader-settings.test.ts`
Expected: 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/reader/hooks/use-reader-settings.ts apps/web/features/reader/hooks/__tests__/use-reader-settings.test.ts
git commit -m "feat(reader): add useReaderSettings hook with localStorage persistence"
```

---

## Task 6: 添加 shadcn Slider 组件

**Files:**
- Create: `apps/web/components/ui/slider.tsx`

- [ ] **Step 1: 安装 Slider 组件**

Run: `cd apps/web && pnpm dlx shadcn@latest add slider`
Expected: 组件生成到 `components/ui/slider.tsx`

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/ui/slider.tsx
git commit -m "feat(ui): add shadcn Slider component"
```

---

## Task 7: 国际化翻译

**Files:**
- Modify: `apps/web/messages/zh.json`

- [ ] **Step 1: 在 `my` 命名空间中新增主题相关翻译 key**

在 `zh.json` 的 `"my"` 对象中追加以下 key（在 `"sectionOther"` 之后）：

```json
"appearance": "外观",
"light": "浅色",
"dark": "深色",
"system": "跟随系统",
"readerTheme": "阅读器主题",
"typography": "字体排印",
"font": "字体",
"fontSize": "字号",
"lineHeight": "行高",
"paragraphSpacing": "段间距",
"contentWidth": "内容宽度",
"textIndent": "段首缩进",
"textAlign": "文字对齐",
"noIndent": "无缩进",
"indent2em": "2 字符",
"alignLeft": "左对齐",
"alignJustify": "两端对齐",
"preview": "预览",
"fontSystem": "系统",
"fontSerif": "衬线",
"fontSans": "无衬线",
"warmWhite": "暖白",
"beige": "米黄",
"green": "绿色",
"sepia": "羊皮纸",
"black": "纯黑"
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/messages/zh.json
git commit -m "feat(i18n): add theme settings translation keys"
```

---

## Task 8: /my/theme 设置页

**Files:**
- Create: `apps/web/app/my/theme/page.tsx`
- Create: `apps/web/app/my/theme/theme-settings.tsx`

- [ ] **Step 1: 创建 RSC 入口页**

```tsx
// apps/web/app/my/theme/page.tsx
import { getTranslations } from "next-intl/server";
import { ThemeSettings } from "./theme-settings";

export default async function ThemePage() {
	const t = await getTranslations("my");
	return (
		<div className="mx-auto max-w-lg space-y-6">
			<h1 className="text-2xl font-semibold">{t("theme")}</h1>
			<ThemeSettings />
		</div>
	);
}
```

- [ ] **Step 2: 创建设置主组件**

```tsx
// apps/web/app/my/theme/theme-settings.tsx
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import type { ReaderFontPreset, ReaderTheme } from "@/features/reader/hooks/use-reader-settings";
import {
	DEFAULT_SETTINGS,
	FONT_PRESETS,
	useReaderSettings,
} from "@/features/reader/hooks/use-reader-settings";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

/* ─── 阅读器主题预览色块数据 ─── */
const READER_THEMES: {
	key: ReaderTheme;
	bgClass: string;
	textClass: string;
	labelKey: string;
}[] = [
	{
		key: "warm-white",
		bgClass: "bg-[oklch(0.98_0.005_80)]",
		textClass: "text-[oklch(0.30_0.01_60)]",
		labelKey: "warmWhite",
	},
	{
		key: "beige",
		bgClass: "bg-[oklch(0.93_0.02_80)]",
		textClass: "text-[oklch(0.28_0.02_60)]",
		labelKey: "beige",
	},
	{
		key: "green",
		bgClass: "bg-[oklch(0.92_0.03_155)]",
		textClass: "text-[oklch(0.25_0.02_140)]",
		labelKey: "green",
	},
	{
		key: "sepia",
		bgClass: "bg-[oklch(0.25_0.03_60)]",
		textClass: "text-[oklch(0.75_0.03_70)]",
		labelKey: "sepia",
	},
	{
		key: "black",
		bgClass: "bg-[oklch(0.12_0_0)]",
		textClass: "text-[oklch(0.65_0_0)]",
		labelKey: "black",
	},
];

const PREVIEW_TEXT =
	"天地有大美而不言，四时有明法而不议，万物有成理而不说。圣人者，原天地之美而达万物之理。";

function ThemeSettings() {
	const t = useTranslations("my");
	const { setTheme, resolvedTheme } = useTheme();
	const { settings, updateSettings } = useReaderSettings();

	const appearanceModes = [
		{ value: "light", icon: Sun, label: t("light") },
		{ value: "dark", icon: Moon, label: t("dark") },
		{ value: "system", icon: Monitor, label: t("system") },
	] as const;

	const fontOptions: { value: ReaderFontPreset; label: string }[] = [
		{ value: "system", label: t("fontSystem") },
		{ value: "serif", label: t("fontSerif") },
		{ value: "sans", label: t("fontSans") },
	];

	const indentOptions = [
		{ value: "0", label: t("noIndent") },
		{ value: "2em", label: t("indent2em") },
	];

	const alignOptions = [
		{ value: "left", label: t("alignLeft") },
		{ value: "justify", label: t("alignJustify") },
	];

	return (
		<>
			{/* ─── 外观模式 ─── */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("appearance")}
				</h2>
				<div className="flex gap-2">
					{appearanceModes.map((mode) => (
						<button
							key={mode.value}
							type="button"
							onClick={() => setTheme(mode.value)}
							className={cn(
								"flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm transition-colors",
								resolvedTheme === mode.value || (mode.value === "system" && resolvedTheme !== "light" && resolvedTheme !== "dark")
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-surface-1 hover:bg-surface-2",
							)}
						>
							<mode.icon className="size-4" />
							{mode.label}
						</button>
					))}
				</div>
			</section>

			{/* ─── 阅读器主题 ─── */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("readerTheme")}
				</h2>
				<div className="flex gap-3">
					{READER_THEMES.map((theme) => (
						<button
							key={theme.key}
							type="button"
							onClick={() => updateSettings({ theme: theme.key })}
							className={cn(
								"flex flex-1 flex-col items-center gap-1.5 rounded-lg p-2 transition-all",
								settings.theme === theme.key
									? "ring-2 ring-primary ring-offset-2 ring-offset-background"
									: "ring-1 ring-border hover:ring-primary/50",
							)}
						>
							<div
								className={cn(
									"flex h-12 w-full items-center justify-center rounded-md text-[10px] leading-tight",
									theme.bgClass,
									theme.textClass,
								)}
							>
								<span className="line-clamp-2 px-1">Aa 文学</span>
							</div>
							<span className="text-xs text-muted-foreground">
								{t(theme.labelKey)}
							</span>
						</button>
					))}
				</div>
			</section>

			{/* ─── 字体排印 ─── */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("typography")}
				</h2>
				<div className="space-y-4 rounded-lg border border-border bg-surface-1 p-4">
					{/* 字体 */}
					<div className="flex items-center justify-between">
						<Label className="text-sm">{t("font")}</Label>
						<Select
							value={settings.font}
							onValueChange={(v) =>
								updateSettings({ font: v as ReaderFontPreset })
							}
						>
							<SelectTrigger className="w-28">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{fontOptions.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* 字号 */}
					<SliderField
						label={t("fontSize")}
						value={settings.fontSize}
						min={14}
						max={24}
						step={1}
						unit="px"
						onChange={(v) => updateSettings({ fontSize: v })}
					/>

					{/* 行高 */}
					<SliderField
						label={t("lineHeight")}
						value={settings.lineHeight}
						min={1.5}
						max={2.5}
						step={0.1}
						onChange={(v) => updateSettings({ lineHeight: v })}
					/>

					{/* 段间距 */}
					<SliderField
						label={t("paragraphSpacing")}
						value={settings.paragraphSpacing}
						min={0.5}
						max={2.0}
						step={0.1}
						onChange={(v) => updateSettings({ paragraphSpacing: v })}
					/>

					{/* 内容宽度 */}
					<SliderField
						label={t("contentWidth")}
						value={settings.contentWidth}
						min={480}
						max={900}
						step={20}
						unit="px"
						onChange={(v) => updateSettings({ contentWidth: v })}
					/>

					{/* 段首缩进 */}
					<div className="flex items-center justify-between">
						<Label className="text-sm">{t("textIndent")}</Label>
						<Select
							value={settings.textIndent}
							onValueChange={(v) => updateSettings({ textIndent: v })}
						>
							<SelectTrigger className="w-28">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{indentOptions.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* 文字对齐 */}
					<div className="flex items-center justify-between">
						<Label className="text-sm">{t("textAlign")}</Label>
						<Select
							value={settings.textAlign}
							onValueChange={(v) =>
								updateSettings({ textAlign: v as "left" | "justify" })
							}
						>
							<SelectTrigger className="w-28">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{alignOptions.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>

			{/* ─── 实时预览 ─── */}
			<section>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("preview")}
				</h2>
				<div
					data-reader-theme={settings.theme}
					className="h-48 overflow-hidden rounded-lg border border-border"
				>
					<div
						className="bg-reader-bg text-reader-text h-full p-4"
						style={{
							fontFamily: FONT_PRESETS[settings.font],
							fontSize: `${settings.fontSize}px`,
							lineHeight: settings.lineHeight,
							textIndent: settings.textIndent,
							textAlign: settings.textAlign,
							maxWidth: `${settings.contentWidth}px`,
							margin: "0 auto",
						}}
					>
						{PREVIEW_TEXT}
					</div>
				</div>
			</section>
		</>
	);
}

/* ─── Slider 字段组件 ─── */
function SliderField({
	label,
	value,
	min,
	max,
	step,
	unit,
	onChange,
}: {
	readonly label: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly unit?: string;
	readonly onChange: (value: number) => void;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-sm">{label}</Label>
				<span className="text-sm tabular-nums text-muted-foreground">
					{Number.isInteger(step) ? value : value.toFixed(1)}
					{unit ?? ""}
				</span>
			</div>
			<Slider
				value={[value]}
				min={min}
				max={max}
				step={step}
				onValueChange={([v]) => onChange(v)}
			/>
		</div>
	);
}

export { ThemeSettings };
```

- [ ] **Step 3: 运行 typecheck + build**

Run: `turbo typecheck --filter=web && turbo build --filter=web`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/my/theme/page.tsx apps/web/app/my/theme/theme-settings.tsx
git commit -m "feat(theme): add /my/theme settings page with appearance, reader theme, typography, and preview"
```

---

## Task 9: Surface 层级校验 + 清理

**Files:**
- 可能修改: 13 个使用 `bg-surface-*` 的组件文件

- [ ] **Step 1: 启动 dev server 并在浏览器中检查每个页面**

Run: `pnpm --filter web dev`

在浏览器中逐一检查以下页面，确认 surface 层级视觉效果正确：

1. `/my` — 设置列表（`bg-surface-1` 列表容器，`hover:bg-surface-2` 项）
2. `/my/about` — 关于页（`bg-surface-1` 区块）
3. 书架页 — book-card（`bg-surface-2`）、hero（`bg-surface-2` / `bg-surface-3`）
4. 书源管理 — 列表项和空状态

**预期视觉**：暗色模式下，surface-0（最深）→ surface-4（最浅）形成清晰的层次感。亮色模式下 surface-0（略灰）→ surface-1（近白）→ surface-2+（渐深）。

- [ ] **Step 2: 修正发现的问题**

如果发现层级不正确的元素，逐个修正。常见模式：
- 卡片/容器直接放在页面背景上 → 应为 `bg-surface-1`
- 列表项 hover → 应为 `hover:bg-surface-2`
- 浮层/hover 态 → 应为 `bg-surface-2`

- [ ] **Step 3: Commit（如有改动）**

```bash
git add -u
git commit -m "fix: adjust surface level semantics across components"
```

---

## Task 10: 最终验证

- [ ] **Step 1: 完整 build**

Run: `turbo build`
Expected: BUILD SUCCESS

- [ ] **Step 2: 完整 typecheck**

Run: `turbo typecheck`
Expected: 0 errors

- [ ] **Step 3: 完整 lint**

Run: `turbo lint`
Expected: 0 errors

- [ ] **Step 4: 运行所有测试**

Run: `turbo test` 或 `pnpm --filter web vitest run`
Expected: 所有测试 PASS

- [ ] **Step 5: 浏览器端到端验证**

1. 打开 `/my/theme` 页面
2. 切换浅色/深色/系统 → 确认即时生效
3. 切换 5 个阅读器主题 → 确认预览区颜色变化
4. 调节字号/行高/段间距/内容宽度 → 确认预览区实时反映
5. 切换字体 → 确认预览区字体变化
6. 刷新页面 → 确认设置从 localStorage 恢复
7. 打开阅读器 → 确认 `data-reader-theme` 正确设置、背景色和文字色正确
