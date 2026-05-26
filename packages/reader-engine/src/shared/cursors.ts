type DocumentCursor = {
	readonly blockId: string;
	readonly inlineIndex: number;
	readonly graphemeIndex: number;
};

type PageCursor = {
	readonly pageIndex: number;
	readonly lineIndex: number;
	readonly runIndex: number;
	readonly graphemeIndex: number;
};

export type { DocumentCursor, PageCursor };
