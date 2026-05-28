import { describe, expect, it } from "vitest";
import {
	ATMOSPHERE_PRESETS,
	toLayoutConfig,
} from "@/features/reader/atmosphere";
import type { ReadingAtmosphere } from "@/features/reader/types";

describe("atmosphere", () => {
	describe("ATMOSPHERE_PRESETS", () => {
		it("has novel, focus, dense presets", () => {
			const keys = Object.keys(ATMOSPHERE_PRESETS);
			expect(keys).toContain("novel");
			expect(keys).toContain("focus");
			expect(keys).toContain("dense");
		});

		it("each preset has all required fields", () => {
			for (const preset of Object.values(ATMOSPHERE_PRESETS)) {
				expect(preset.preset).toBeDefined();
				expect(preset.fontSize).toBeGreaterThan(0);
				expect(preset.lineHeight).toBeGreaterThan(0);
				expect(preset.maxWidth).toBeGreaterThan(0);
				expect(preset.paragraphSpacing).toBeGreaterThan(0);
				expect(preset.theme).toBeDefined();
				expect(preset.font.length).toBeGreaterThan(0);
			}
		});

		it("novel preset has expected values", () => {
			const novel = ATMOSPHERE_PRESETS.novel as ReadingAtmosphere;
			expect(novel.fontSize).toBe(17);
			expect(novel.lineHeight).toBe(1.9);
			expect(novel.maxWidth).toBe(680);
			expect(novel.theme).toBe("warm-white");
		});
	});

	describe("toLayoutConfig", () => {
		it("converts atmosphere + viewport to LayoutConfig", () => {
			const atm = ATMOSPHERE_PRESETS.novel as ReadingAtmosphere;
			const config = toLayoutConfig(atm, { width: 1024, height: 768 });
			expect(config.pageWidth).toBe(680 - 80); // maxWidth - paddingH*2
			expect(config.pageHeight).toBe(768 - 80);
			expect(config.lineHeight).toBe(17 * 1.9);
			expect(config.paddingLeft).toBe(40);
			expect(config.paddingRight).toBe(40);
		});

		it("uses smaller padding on mobile viewport", () => {
			const atm = ATMOSPHERE_PRESETS.novel as ReadingAtmosphere;
			const config = toLayoutConfig(atm, { width: 375, height: 667 });
			expect(config.paddingLeft).toBe(20);
			expect(config.pageWidth).toBe(375 - 40); // viewport - paddingH*2
		});

		it("uses paragraphSpacing for vertical padding", () => {
			const atm = ATMOSPHERE_PRESETS.focus as ReadingAtmosphere;
			const config = toLayoutConfig(atm, { width: 1024, height: 768 });
			expect(config.paddingTop).toBe(atm.fontSize * atm.paragraphSpacing);
			expect(config.paddingBottom).toBe(atm.fontSize * atm.paragraphSpacing);
		});
	});
});
