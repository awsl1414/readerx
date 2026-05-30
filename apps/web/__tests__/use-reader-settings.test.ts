// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReaderSettings } from "@/features/reader/hooks/use-reader-settings";

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
