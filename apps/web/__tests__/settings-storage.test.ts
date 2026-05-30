// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { LocalStorageSettingsStorage } from "@/lib/settings-storage";

describe("LocalStorageSettingsStorage", () => {
	afterEach(() => {
		localStorage.clear();
	});

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
