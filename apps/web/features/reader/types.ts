import type { Document, RenderResult } from "@readerx/reader-engine";

type AtmospherePreset = "novel" | "focus" | "dense";

type ReaderTheme = "warm-white" | "black" | "green" | "sepia" | "beige";

type ReadingAtmosphere = {
	readonly preset: AtmospherePreset;
	readonly fontSize: number;
	readonly lineHeight: number;
	readonly maxWidth: number;
	readonly paragraphSpacing: number;
	readonly theme: ReaderTheme;
	readonly font: string;
};

type ReaderThemeColors = {
	readonly bg: string;
	readonly text: string;
	readonly textSecondary: string;
};

type ChapterInfo = {
	readonly index: number;
	readonly title: string;
	readonly isVolume: boolean;
};

type CachedChapter = {
	readonly document: Document;
	readonly renderResult: RenderResult;
};

type ReaderState = {
	readonly currentPage: number;
	readonly pageCount: number;
	readonly currentChapter: number;
	readonly chapters: readonly ChapterInfo[];
	readonly atmosphere: ReadingAtmosphere;
	readonly isLoading: boolean;
};

type GestureMode = "horizontal" | "vertical" | "scroll";

export type {
	AtmospherePreset,
	CachedChapter,
	ChapterInfo,
	GestureMode,
	ReaderState,
	ReaderTheme,
	ReaderThemeColors,
	ReadingAtmosphere,
};
