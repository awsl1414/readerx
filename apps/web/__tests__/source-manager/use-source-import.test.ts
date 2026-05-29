import { describe, expect, it } from "vitest";
import { importSources } from "@/features/source-manager/hooks/use-source-import";

const validSource = {
	bookSourceUrl: "https://a.com",
	bookSourceName: "Source A",
	bookSourceType: 0,
	enabled: true,
	enabledExplore: false,
	customOrder: 0,
	lastUpdateTime: 0,
	weight: 0,
	respondTime: 0,
};

const invalidSource = {
	bookSourceName: "No URL",
	bookSourceType: 0,
	enabled: true,
	enabledExplore: false,
	customOrder: 0,
	lastUpdateTime: 0,
	weight: 0,
	respondTime: 0,
};

const jsSource = {
	...validSource,
	bookSourceUrl: "https://js.com",
	bookSourceName: "JS Source",
	searchUrl: "@js:baseUrl + '/search'",
};

describe("importSources", () => {
	it("classifies valid sources as success", () => {
		const result = importSources([validSource]);
		expect(result.success).toHaveLength(1);
		expect(result.failures).toHaveLength(0);
	});

	it("classifies invalid sources as failure with reasons", () => {
		const result = importSources([invalidSource]);
		expect(result.success).toHaveLength(0);
		expect(result.failures).toHaveLength(1);
		expect(result.failures[0]?.reasons.length).toBeGreaterThan(0);
	});

	it("classifies JS sources as warnings with compatibility info", () => {
		const result = importSources([jsSource]);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]?.reasons).toContain("Uses JS runtime");
	});

	it("handles mixed batch", () => {
		const result = importSources([validSource, invalidSource, jsSource]);
		expect(result.success).toHaveLength(1);
		expect(result.warnings).toHaveLength(1);
		expect(result.failures).toHaveLength(1);
	});
});
