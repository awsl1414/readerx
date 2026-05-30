import type { LayoutConfig } from "@readerx/reader-engine";
import type {
	AtmospherePreset,
	ReaderFontPreset,
	ReadingAtmosphere,
} from "./types";

const FONT_PRESETS = Object.freeze({
	system: "system-ui, -apple-system, sans-serif",
	serif: "ui-serif, Georgia, 'Noto Serif SC', serif",
	sans: "ui-sans-serif, 'Noto Sans SC', sans-serif",
} as const satisfies Record<ReaderFontPreset, string>);

const ATMOSPHERE_PRESETS = Object.freeze({
	novel: {
		preset: "novel",
		fontSize: 17,
		lineHeight: 1.9,
		maxWidth: 680,
		paragraphSpacing: 1.2,
		theme: "warm-white",
		font: FONT_PRESETS.serif,
	},
	focus: {
		preset: "focus",
		fontSize: 19,
		lineHeight: 2.0,
		maxWidth: 580,
		paragraphSpacing: 1.4,
		theme: "black",
		font: FONT_PRESETS.serif,
	},
	dense: {
		preset: "dense",
		fontSize: 15,
		lineHeight: 1.7,
		maxWidth: 760,
		paragraphSpacing: 0.6,
		theme: "green",
		font: FONT_PRESETS.serif,
	},
} as const satisfies Record<AtmospherePreset, ReadingAtmosphere>);

function toLayoutConfig(
	atm: ReadingAtmosphere,
	viewport: { width: number; height: number },
): LayoutConfig {
	const paddingH = viewport.width < 768 ? 20 : 40;
	return {
		pageWidth: Math.min(atm.maxWidth, viewport.width) - paddingH * 2,
		pageHeight: viewport.height - paddingH * 2,
		lineHeight: atm.fontSize * atm.lineHeight,
		font: atm.font,
		paddingTop: atm.fontSize * atm.paragraphSpacing,
		paddingBottom: atm.fontSize * atm.paragraphSpacing,
		paddingLeft: paddingH,
		paddingRight: paddingH,
	};
}

export { ATMOSPHERE_PRESETS, FONT_PRESETS, toLayoutConfig };
