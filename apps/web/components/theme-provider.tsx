"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
	mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
	if (theme === "system") return getSystemTheme();
	return theme;
}

function applyTheme(resolved: ResolvedTheme) {
	const root = document.documentElement;
	root.classList.remove("light", "dark");
	root.classList.add(resolved);
}

function ThemeProvider({
	children,
	defaultTheme = "system",
}: {
	readonly children: React.ReactNode;
	readonly defaultTheme?: Theme;
}) {
	const [theme, setThemeState] = useState<Theme>(defaultTheme);
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
	const [mounted, setMounted] = useState(false);

	// Initialize from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		const initial = stored ?? defaultTheme;
		const resolved = resolveTheme(initial);
		setThemeState(initial);
		setResolvedTheme(resolved);
		setMounted(true);
		// Blocking script already applied the class, but ensure consistency
		applyTheme(resolved);
	}, [defaultTheme]);

	// Listen for system theme changes
	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => {
			setThemeState((current) => {
				if (current === "system") {
					const resolved = getSystemTheme();
					setResolvedTheme(resolved);
					applyTheme(resolved);
				}
				return current;
			});
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	const setTheme = useCallback((next: Theme) => {
		const resolved = resolveTheme(next);
		setThemeState(next);
		setResolvedTheme(resolved);
		applyTheme(resolved);
		localStorage.setItem(STORAGE_KEY, next);
	}, []);

	return (
		<ThemeContext value={{ theme, resolvedTheme, setTheme, mounted }}>
			{children}
		</ThemeContext>
	);
}

function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return ctx;
}

export { ThemeProvider, useTheme };
export type { ResolvedTheme, Theme };
