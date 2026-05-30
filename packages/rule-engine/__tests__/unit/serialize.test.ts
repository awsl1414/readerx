import { describe, expect, it } from "vitest";
import { serializeValue, serializeResult, elementToText } from "../../src/serialize";

describe("serializeValue", () => {
	it("passes string through unchanged", () => {
		expect(serializeValue("hello")).toBe("hello");
	});

	it("returns empty string for null", () => {
		expect(serializeValue(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(serializeValue(undefined)).toBe("");
	});

	it("converts numbers via String()", () => {
		expect(serializeValue(42)).toBe("42");
	});
});

describe("serializeResult", () => {
	it("returns string array unchanged", () => {
		expect(serializeResult(["a", "b", "c"])).toEqual(["a", "b", "c"]);
	});

	it("filters non-string values to empty string", () => {
		const result = serializeResult(["hello", 42, true]);
		expect(result).toEqual(["hello", "", ""]);
	});

	it("handles null and undefined as empty string", () => {
		const result = serializeResult([null, undefined, "text"]);
		expect(result).toEqual(["", "", "text"]);
	});
});

describe("elementToText", () => {
	it("passes string through unchanged", () => {
		expect(elementToText("hello")).toBe("hello");
	});

	it("returns empty string for null", () => {
		expect(elementToText(null)).toBe("");
	});

	it("returns string representation for numbers", () => {
		expect(elementToText(123)).toBe("123");
	});
});
