import { describe, expect, it } from "vitest";
import { extractJsonPath } from "../../src/jsonpath.js";

describe("extractJsonPath", () => {
	it("extracts array of values with wildcard selector", () => {
		const data = { books: [{ title: "Book A" }, { title: "Book B" }] };
		const result = extractJsonPath("$.books[*].title", data);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["Book A", "Book B"]);
		}
	});

	it("extracts single value", () => {
		const result = extractJsonPath("$.total", { total: 2 });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual([2]);
		}
	});

	it("returns empty array for no matches", () => {
		const result = extractJsonPath("$.missing", { foo: "bar" });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual([]);
		}
	});

	it("returns error for invalid path", () => {
		const result = extractJsonPath("not a valid path", { foo: "bar" });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("JSONPATH_ERROR");
			expect(result.error.rule).toBe("not a valid path");
		}
	});

	it("parses JSON string input", () => {
		const result = extractJsonPath(
			"$.books[*].title",
			'{"books":[{"title":"Book A"},{"title":"Book B"}]}',
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(["Book A", "Book B"]);
		}
	});
});
