// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
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

describe("LocalStorageSettingsStorage: Zod schema validation", () => {
	afterEach(() => {
		localStorage.clear();
	});

	const simpleSchema = z.object({ name: z.string() });

	it("get with valid schema and valid data returns parsed data", () => {
		const storage = new LocalStorageSettingsStorage();
		storage.set("user", { name: "Alice" });
		const result = storage.get("user", { name: "Fallback" }, simpleSchema);
		expect(result).toEqual({ name: "Alice" });
	});

	it("get with valid schema and corrupted data returns fallback", () => {
		const storage = new LocalStorageSettingsStorage();
		localStorage.setItem("user", JSON.stringify({ name: 123 })); // number, not string
		const fallback = { name: "Fallback" };
		const result = storage.get("user", fallback, simpleSchema);
		expect(result).toEqual(fallback);
	});

	it("get with valid schema and missing key returns fallback", () => {
		const storage = new LocalStorageSettingsStorage();
		const fallback = { name: "Fallback" };
		const result = storage.get("nonexistent", fallback, simpleSchema);
		expect(result).toEqual(fallback);
	});

	it("get with valid schema and non-JSON data returns fallback", () => {
		const storage = new LocalStorageSettingsStorage();
		localStorage.setItem("user", "not-json{");
		const fallback = { name: "Fallback" };
		const result = storage.get("user", fallback, simpleSchema);
		expect(result).toEqual(fallback);
	});

	it("get without schema works as before (backwards compatible)", () => {
		const storage = new LocalStorageSettingsStorage();
		storage.set("data", { anything: true, nested: { x: 1 } });
		// Without schema, it returns the raw parsed JSON
		const result = storage.get("data", null);
		expect(result).toEqual({ anything: true, nested: { x: 1 } });
	});

	it("get without schema on missing key returns fallback", () => {
		const storage = new LocalStorageSettingsStorage();
		const result = storage.get("missing", "default-value");
		expect(result).toBe("default-value");
	});

	it("get with schema rejects extra fields if schema is strict", () => {
		const strictSchema = z.object({ name: z.string() }).strict();
		const storage = new LocalStorageSettingsStorage();
		storage.set("user", { name: "Alice", extra: "field" });
		const fallback = { name: "Fallback" };
		const result = storage.get("user", fallback, strictSchema);
		expect(result).toEqual(fallback);
	});

	it("get with schema accepts partial data when schema uses partial", () => {
		const partialSchema = z.object({ name: z.string() }).partial();
		const storage = new LocalStorageSettingsStorage();
		storage.set("user", {});
		const fallback = { name: "Fallback" };
		const result = storage.get("user", fallback, partialSchema);
		expect(result).toEqual({});
	});

	it("get with array schema validates correctly", () => {
		const arraySchema = z.array(z.string());
		const storage = new LocalStorageSettingsStorage();
		storage.set("tags", ["a", "b", "c"]);
		const result = storage.get("tags", [], arraySchema);
		expect(result).toEqual(["a", "b", "c"]);
	});

	it("get with array schema rejects invalid element types", () => {
		const arraySchema = z.array(z.string());
		const storage = new LocalStorageSettingsStorage();
		storage.set("tags", ["a", 123, "c"]);
		const result = storage.get("tags", [], arraySchema);
		expect(result).toEqual([]); // falls back
	});
});
