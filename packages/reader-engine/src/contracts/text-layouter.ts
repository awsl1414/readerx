type LayoutCursor = {
	readonly segmentIndex: number;
	readonly graphemeIndex: number;
};

type TextLayoutOptions = {
	readonly font: string;
	readonly letterSpacing?: number;
	readonly wordBreak?: "normal" | "keep-all";
};

type TextLayoutHandle = {
	readonly _brand: unique symbol;
};

type TextLayoutLine = {
	readonly text: string;
	readonly width: number;
	readonly start: LayoutCursor;
	readonly end: LayoutCursor;
};

type TextLayouter = {
	prepare(text: string, options: TextLayoutOptions): TextLayoutHandle;
	layoutNextLine(
		handle: TextLayoutHandle,
		start: LayoutCursor | null,
		maxWidth: number,
	): TextLayoutLine | null;
};

export type {
	LayoutCursor,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayouter,
	TextLayoutOptions,
};
