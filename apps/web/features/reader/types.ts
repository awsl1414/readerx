import type {
	Document,
	HttpFetcher,
	JsExecutor,
	RenderResult,
} from "@readerx/reader-engine";

type AtmospherePreset = "novel" | "focus" | "dense";

type ReaderTheme = "warm-white" | "black" | "green" | "sepia" | "beige";

type ReaderFontPreset = "system" | "serif" | "sans";

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

type SessionDeps = {
	readonly httpFetcher: HttpFetcher;
	readonly jsExecutor?: JsExecutor;
	readonly bookRepo: {
		get(bookUrl: string): Promise<
			| {
					bookUrl: string;
					name: string;
					durChapterIndex: number;
					durChapterPos: number;
					totalChapterNum: number;
					origin: string;
			  }
			| undefined
		>;
		updateProgress(
			bookUrl: string,
			durChapterIndex: number,
			durChapterPos: number,
		): Promise<void>;
	};
	readonly chapterRepo: {
		getByBook(bookUrl: string): Promise<readonly ChapterInfo[]>;
		getByIndex(
			bookUrl: string,
			index: number,
		): Promise<{ resourceUrl: string; title: string } | undefined>;
	};
	readonly sourceRepo: {
		get(
			sourceUrl: string,
		): Promise<{ bookSourceUrl: string; ruleContent?: string } | undefined>;
	};
	readonly isMobile: boolean;
};

export type {
	AtmospherePreset,
	CachedChapter,
	ChapterInfo,
	GestureMode,
	ReaderFontPreset,
	ReaderState,
	ReaderTheme,
	ReaderThemeColors,
	ReadingAtmosphere,
	SessionDeps,
};
