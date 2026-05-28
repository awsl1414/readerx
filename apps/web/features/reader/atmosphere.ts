import type { LayoutConfig } from "@readerx/reader-engine";
import type {
	AtmospherePreset,
	ReaderTheme,
	ReaderThemeColors,
	ReadingAtmosphere,
} from "./types";

const ATMOSPHERE_PRESETS: Record<AtmospherePreset, ReadingAtmosphere> = {
	novel: {
		preset: "novel",
		fontSize: 17,
		lineHeight: 1.9,
		maxWidth: 680,
		paragraphSpacing: 1.2,
		theme: "warm-white",
		font: "Georgia, 'Noto Serif SC', 'Songti SC', serif",
	},
	focus: {
		preset: "focus",
		fontSize: 19,
		lineHeight: 2.0,
		maxWidth: 580,
		paragraphSpacing: 1.4,
		theme: "black",
		font: "Georgia, 'Noto Serif SC', 'Songti SC', serif",
	},
	dense: {
		preset: "dense",
		fontSize: 15,
		lineHeight: 1.7,
		maxWidth: 760,
		paragraphSpacing: 0.6,
		theme: "green",
		font: "Georgia, 'Noto Serif SC', 'Songti SC', serif",
	},
};

const READER_THEME_COLORS: Record<ReaderTheme, ReaderThemeColors> = {
	"warm-white": {
		bg: "oklch(0.98 0.005 80)",
		text: "oklch(0.30 0.01 60)",
		textSecondary: "oklch(0.55 0.01 60)",
	},
	black: {
		bg: "oklch(0.08 0 0)",
		text: "oklch(0.60 0 0)",
		textSecondary: "oklch(0.40 0 0)",
	},
	green: {
		bg: "oklch(0.92 0.03 155)",
		text: "oklch(0.25 0.02 140)",
		textSecondary: "oklch(0.45 0.02 140)",
	},
	sepia: {
		bg: "oklch(0.25 0.03 60)",
		text: "oklch(0.75 0.03 70)",
		textSecondary: "oklch(0.55 0.03 70)",
	},
	beige: {
		bg: "oklch(0.93 0.02 80)",
		text: "oklch(0.28 0.02 60)",
		textSecondary: "oklch(0.50 0.02 60)",
	},
};

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

function getThemeColors(theme: ReaderTheme): ReaderThemeColors {
	return READER_THEME_COLORS[theme];
}

export {
	ATMOSPHERE_PRESETS,
	getThemeColors,
	READER_THEME_COLORS,
	toLayoutConfig,
};
