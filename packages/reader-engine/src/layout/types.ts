type InlineStyle = {
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly href?: string;
};

type LayoutRun = {
	readonly text: string;
	readonly x: number;
	readonly width: number;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

type LayoutLine = {
	readonly runs: readonly LayoutRun[];
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
};

type PageDimensions = {
	readonly width: number;
	readonly height: number;
	readonly contentHeight: number;
	readonly paddingTop: number;
	readonly paddingBottom: number;
	readonly paddingLeft: number;
	readonly paddingRight: number;
};

type LayoutPage = {
	readonly index: number;
	readonly lines: readonly LayoutLine[];
	readonly dimensions: PageDimensions;
};

type LayoutResult = {
	readonly pages: readonly LayoutPage[];
	readonly totalPages: number;
};

type LayoutConfig = {
	readonly pageWidth: number;
	readonly pageHeight: number;
	readonly lineHeight: number;
	readonly font: string;
	readonly letterSpacing?: number;
	readonly paddingTop: number;
	readonly paddingBottom: number;
	readonly paddingLeft: number;
	readonly paddingRight: number;
};

export type {
	InlineStyle,
	LayoutConfig,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
};
