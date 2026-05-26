/**
 * 客户端持久层 — 存储类型定义
 * 参考 docs/database-schema.md、docs/analysis/step3-persistence-analysis.md
 */

// ─── BookSource ────────────────────────────────────────────

/**
 * 书源存储记录。
 * 仅定义索引字段，其余 BookSource 字段通过 passthrough 存储。
 * 完整 BookSource 类型定义在 @readerx/rule-engine 中，校验由 app 层负责。
 */
export type BookSourceRecord = {
	bookSourceUrl: string;
	bookSourceName: string;
	bookSourceGroup?: string;
	bookSourceType: number;
	enabled: boolean;
	enabledExplore: boolean;
	customOrder: number;
	lastUpdateTime: number;
	weight: number;
	respondTime: number;
} & { [key: string]: unknown };

// ─── Book ──────────────────────────────────────────────────

export type Book = {
	bookUrl: string;
	tocUrl: string;
	name: string;
	author: string;
	kind?: string;
	coverUrl?: string;
	intro?: string;
	type: number;
	groupIds: number[];
	origin: string;
	originName: string;
	durChapterIndex: number;
	durChapterPos: number;
	durChapterTime: number;
	durChapterTitle?: string;
	totalChapterNum: number;
	latestChapterTitle?: string;
	latestChapterTime?: number;
	canUpdate: boolean;
	order: number;
	variable?: string;
};

// ─── BookChapter ───────────────────────────────────────────

export type BookChapter = {
	url: string;
	bookUrl: string;
	title: string;
	index: number;
	isVolume: boolean;
	isVip: boolean;
	isPay: boolean;
	resourceUrl?: string;
	tag?: string;
	baseUrl?: string;
	variable?: string;
};

// ─── BookGroup ─────────────────────────────────────────────

export type BookGroup = {
	groupId: number;
	groupName: string;
	order: number;
	enableRefresh: boolean;
	show: boolean;
	bookSort: number;
};

// ─── Bookmark ──────────────────────────────────────────────

export type Bookmark = {
	time: number;
	bookUrl: string;
	bookName: string;
	bookAuthor: string;
	chapterIndex: number;
	chapterPos: number;
	chapterName: string;
	bookText: string;
	content: string;
};

// ─── SearchKeyword ─────────────────────────────────────────

export type SearchKeyword = {
	word: string;
	usage: number;
	lastUseTime: number;
};

// ─── Cache ─────────────────────────────────────────────────

export type Cache = {
	key: string;
	value?: string;
	deadline: number;
};

// ─── ReplaceRule ───────────────────────────────────────────

export type ReplaceRule = {
	id: number;
	name: string;
	group?: string;
	pattern: string;
	replacement: string;
	scope?: string;
	scopeTitle: boolean;
	scopeContent: boolean;
	excludeScope?: string;
	isEnabled: boolean;
	isRegex: boolean;
	timeoutMillisecond: number;
	order: number;
};

// ─── Cookie ────────────────────────────────────────────────

export type Cookie = {
	url: string;
	cookie: string;
};
