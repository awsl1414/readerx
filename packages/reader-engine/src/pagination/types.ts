export interface Page {
	index: number;
	startOffset: number;
	endOffset: number;
	text: string;
}

export interface PaginationResult {
	pages: Page[];
	totalPages: number;
}
