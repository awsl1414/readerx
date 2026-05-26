import { describe, expect, it } from "vitest";
import { getElements, getString, getStringList } from "../src/jsonpath";

const JSON_CONTENT = JSON.stringify({
	store: {
		book: [
			{
				title: "三体",
				author: "刘慈欣",
				price: 29.9,
				tags: ["科幻", "硬科幻"],
			},
			{
				title: "流浪地球",
				author: "刘慈欣",
				price: 25.0,
				tags: ["科幻", "灾难"],
			},
			{
				title: "活着",
				author: "余华",
				price: 20.0,
				tags: ["文学", "现实主义"],
			},
		],
		total: 3,
	},
});

const SIMPLE_JSON = JSON.stringify({
	name: "测试",
	value: 42,
	items: ["a", "b", "c"],
});

describe("JSONPath getString", () => {
	it("extracts single string field", () => {
		const result = getString("$.store.total", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("3");
		}
	});

	it("extracts and joins multiple string results", () => {
		const result = getString("$.store.book[*].title", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("三体\n流浪地球\n活着");
			expect(result.values).toEqual(["三体", "流浪地球", "活着"]);
		}
	});

	it("extracts nested array values", () => {
		const result = getString("$.items[*]", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("a\nb\nc");
		}
	});

	it("extracts numeric values as strings", () => {
		const result = getString("$.value", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("42");
		}
	});

	it("returns empty string for no matches", () => {
		const result = getString("$.nonexistent", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("");
		}
	});

	it("handles filtered expressions by author", () => {
		const result = getString(
			"$.store.book[?(@.author=='刘慈欣')].title",
			JSON_CONTENT,
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toContain("三体");
			expect(result.values).toContain("流浪地球");
			expect(result.values).not.toContain("活着");
		}
	});
});

describe("JSONPath getStringList", () => {
	it("returns list of all matching values", () => {
		const result = getStringList("$.store.book[*].title", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["三体", "流浪地球", "活着"]);
		}
	});

	it("returns list of authors", () => {
		const result = getStringList("$.store.book[*].author", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["刘慈欣", "刘慈欣", "余华"]);
		}
	});

	it("returns empty list for no matches", () => {
		const result = getStringList("$.nonexistent", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([]);
		}
	});

	it("returns list of array elements", () => {
		const result = getStringList("$.items[*]", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["a", "b", "c"]);
		}
	});

	it("handles recursive descent", () => {
		const result = getStringList("$..title", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["三体", "流浪地球", "活着"]);
		}
	});

	it("extracts prices as strings", () => {
		const result = getStringList("$.store.book[*].price", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(["29.9", "25", "20"]);
		}
	});
});

describe("JSONPath getElements", () => {
	it("returns serialized JSON objects", () => {
		const result = getElements("$.store.book[0]", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(1);
			const parsed = JSON.parse(result.values[0] ?? "{}");
			expect(parsed.title).toBe("三体");
			expect(parsed.author).toBe("刘慈欣");
		}
	});

	it("returns all book objects", () => {
		const result = getElements("$.store.book[*]", JSON_CONTENT);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(3);
			const titles = result.values.map((v) => JSON.parse(v).title);
			expect(titles).toEqual(["三体", "流浪地球", "活着"]);
		}
	});

	it("returns serialized arrays", () => {
		const result = getElements("$.items", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toHaveLength(1);
			expect(JSON.parse(result.values[0] ?? "[]")).toEqual(["a", "b", "c"]);
		}
	});

	it("returns empty list for no matches", () => {
		const result = getElements("$.nonexistent", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([]);
		}
	});

	it("returns serialized primitives", () => {
		const result = getElements("$.name", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual(['"测试"']);
		}
	});
});

describe("JSONPath error handling", () => {
	it("returns error for invalid JSON content", () => {
		const result = getString("$.name", "not valid json");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe("Invalid JSON content");
		}
	});

	it("returns error for invalid JSON in getStringList", () => {
		const result = getStringList("$.name", "{broken");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe("Invalid JSON content");
		}
	});

	it("returns error for invalid JSON in getElements", () => {
		const result = getElements("$.name", "");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe("Invalid JSON content");
		}
	});

	it("handles invalid JSONPath expression gracefully", () => {
		const result = getString("invalid[path", SIMPLE_JSON);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.values).toEqual([""]);
		}
	});
});

describe("JSONPath module structure", () => {
	it("exports jsonpathParser with RuleParser interface", async () => {
		const { jsonpathParser } = await import("../src/jsonpath");
		expect(jsonpathParser).toBeDefined();
		expect(typeof jsonpathParser.getString).toBe("function");
		expect(typeof jsonpathParser.getStringList).toBe("function");
		expect(typeof jsonpathParser.getElements).toBe("function");
	});
});
