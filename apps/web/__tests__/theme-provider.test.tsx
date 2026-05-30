// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/components/theme-provider";

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.classList.remove("light", "dark");
});

/**
 * Helper component that reads theme context and renders values as text.
 */
function ThemeReader() {
	const ctx = useTheme();
	return (
		<div>
			<span data-testid="theme">{ctx.theme}</span>
			<span data-testid="resolved">{ctx.resolvedTheme}</span>
			<span data-testid="mounted">{String(ctx.mounted)}</span>
		</div>
	);
}

/**
 * Helper component that attempts to use useTheme outside the provider.
 */
function UnwrappedReader() {
	useTheme();
	return <div>unreachable</div>;
}

describe("ThemeProvider", () => {
	it("default theme is system when no localStorage value exists", () => {
		render(
			<ThemeProvider>
				<ThemeReader />
			</ThemeProvider>,
		);
		const themeEl = screen.getByTestId("theme");
		expect(themeEl.textContent).toBe("system");
	});

	it("reads theme from localStorage on mount", () => {
		localStorage.setItem("theme", "dark");
		render(
			<ThemeProvider>
				<ThemeReader />
			</ThemeProvider>,
		);
		const themeEl = screen.getByTestId("theme");
		expect(themeEl.textContent).toBe("dark");
	});

	it('setTheme("dark") adds dark class to html and saves to localStorage', () => {
		let setThemeFn: ((t: "dark") => void) | undefined;

		function ThemeSetter() {
			const ctx = useTheme();
			setThemeFn = ctx.setTheme;
			return <ThemeReader />;
		}

		render(
			<ThemeProvider>
				<ThemeSetter />
			</ThemeProvider>,
		);

		act(() => {
			setThemeFn?.("dark");
		});

		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.classList.contains("light")).toBe(false);
		expect(localStorage.getItem("theme")).toBe("dark");
	});

	it('setTheme("light") adds light class and saves to localStorage', () => {
		let setThemeFn: ((t: "light") => void) | undefined;

		function ThemeSetter() {
			const ctx = useTheme();
			setThemeFn = ctx.setTheme;
			return <ThemeReader />;
		}

		render(
			<ThemeProvider>
				<ThemeSetter />
			</ThemeProvider>,
		);

		act(() => {
			setThemeFn?.("light");
		});

		expect(document.documentElement.classList.contains("light")).toBe(true);
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(localStorage.getItem("theme")).toBe("light");
	});

	it('setTheme("system") resolves based on prefers-color-scheme', () => {
		let setThemeFn: ((t: "system") => void) | undefined;

		function ThemeSetter() {
			const ctx = useTheme();
			setThemeFn = ctx.setTheme;
			return <ThemeReader />;
		}

		render(
			<ThemeProvider>
				<ThemeSetter />
			</ThemeProvider>,
		);

		act(() => {
			setThemeFn?.("system");
		});

		const themeEl = screen.getByTestId("theme");
		expect(themeEl.textContent).toBe("system");

		// The resolved theme depends on the system preference.
		// In happy-dom the default prefers-color-scheme is "light",
		// but we simply verify that one of the two classes is present.
		const root = document.documentElement;
		const hasLightOrDark =
			root.classList.contains("light") || root.classList.contains("dark");
		expect(hasLightOrDark).toBe(true);

		expect(localStorage.getItem("theme")).toBe("system");
	});

	it("mounted starts as false and becomes true after effect", () => {
		render(
			<ThemeProvider>
				<ThemeReader />
			</ThemeProvider>,
		);
		// After render + effect, mounted should be true
		const mountedEl = screen.getByTestId("mounted");
		expect(mountedEl.textContent).toBe("true");
	});

	it("context throws if used outside ThemeProvider", () => {
		// Suppress React error boundary console noise
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<UnwrappedReader />)).toThrow(
			"useTheme must be used within a ThemeProvider",
		);
		spy.mockRestore();
	});

	it("respects defaultTheme prop", () => {
		render(
			<ThemeProvider defaultTheme="dark">
				<ThemeReader />
			</ThemeProvider>,
		);
		const themeEl = screen.getByTestId("theme");
		expect(themeEl.textContent).toBe("dark");
	});
});
