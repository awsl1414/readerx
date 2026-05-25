/**
 * 数据模型类型 — 客户端持久层
 * 参考 docs/database-schema.md
 */

export interface Book {
	bookUrl: string;
	name: string;
	author: string;
	kind?: string;
	coverUrl?: string;
	intro?: string;
	type: number;
	group: number;
	origin: string;
	originName: string;
	durChapterIndex: number;
	durChapterPos: number;
	durChapterTime: number;
	totalChapterNum: number;
	latestChapterTitle?: string;
	canUpdate: boolean;
	order: number;
}

export interface BookChapter {
	url: string;
	bookUrl: string;
	title: string;
	index: number;
	isVolume: boolean;
	isVip: boolean;
	isPay: boolean;
	resourceUrl?: string;
	tag?: string;
}

export interface BookGroup {
	groupId: number;
	groupName: string;
	order: number;
	enableRefresh: boolean;
	show: boolean;
	bookSort: number;
}

export interface Bookmark {
	time: number;
	bookUrl: string;
	chapterIndex: number;
	chapterPos: number;
	content: string;
	bookName: string;
	chapterName: string;
}

export interface SearchKeyword {
	word: string;
	usage: number;
	lastUseTime: number;
}

export interface Cache {
	key: string;
	value?: string;
	deadline: number;
}
