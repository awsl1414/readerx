export interface ReadingState {
	bookUrl: string;
	chapterIndex: number;
	chapterPos: number;
	isLoading: boolean;
}

export interface ChapterContent {
	title: string;
	content: string;
	isVip: boolean;
	isPay: boolean;
}

export interface PaginationConfig {
	fontSize: number;
	lineHeight: number;
	pageWidth: number;
	pageHeight: number;
	margin: number;
}
