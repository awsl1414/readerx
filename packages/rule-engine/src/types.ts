/**
 * BookSource 类型：0=文本, 1=音频, 2=图片, 3=文件
 */
export type BookSourceType = 0 | 1 | 2 | 3;

/**
 * 书源配置 — 定义如何从网站搜索、获取、解析书籍内容
 * 参考 docs/book-source-fields.md
 */
export interface BookSource {
	/** 书源唯一标识 URL */
	bookSourceUrl: string;
	/** 书源名称 */
	bookSourceName: string;
	/** 书源分组（逗号分隔） */
	bookSourceGroup?: string;
	/** 类型 */
	bookSourceType: BookSourceType;
	/** 详情页 URL 匹配正则 */
	bookUrlPattern?: string;
	/** 书源注释 */
	bookSourceComment?: string;
	/** 变量说明 */
	variableComment?: string;

	/** 是否启用 */
	enabled: boolean;
	/** 是否启用发现页 */
	enabledExplore: boolean;
	/** 手动排序序号 */
	customOrder: number;
	/** 智能排序权重 */
	weight: number;
	/** 最后更新时间 */
	lastUpdateTime: number;
	/** 响应时间（毫秒） */
	respondTime: number;

	/** 自定义 HTTP 请求头（JSON） */
	header?: string;
	/** 登录 URL */
	loginUrl?: string;
	/** 登录界面定义（JSON） */
	loginUi?: string;
	/** 登录验证 JS */
	loginCheckJs?: string;
	/** 启用自动 Cookie 管理 */
	enabledCookieJar?: boolean;
	/** 并发请求频率限制 */
	concurrentRate?: string;

	/** 搜索 URL 规则 */
	searchUrl?: string;
	/** 发现页 URL 规则 */
	exploreUrl?: string;

	/** 搜索结果解析规则 */
	ruleSearch?: SearchRule;
	/** 发现页解析规则 */
	ruleExplore?: ExploreRule;
	/** 书籍详情解析规则 */
	ruleBookInfo?: BookInfoRule;
	/** 目录解析规则 */
	ruleToc?: TocRule;
	/** 正文解析规则 */
	ruleContent?: ContentRule;
}

/** 搜索结果规则 */
export interface SearchRule {
	/** 关键词校验规则 */
	checkKeyWord?: string;
	/** 书籍列表提取规则 */
	bookList: string;
	/** 书名提取规则 */
	name: string;
	/** 作者提取规则 */
	author: string;
	/** 简介提取规则 */
	intro?: string;
	/** 分类提取规则 */
	kind?: string;
	/** 最新章节提取规则 */
	lastChapter?: string;
	/** 更新时间提取规则 */
	updateTime?: string;
	/** 书籍详情 URL 提取规则 */
	bookUrl: string;
	/** 封面 URL 提取规则 */
	coverUrl?: string;
	/** 字数提取规则 */
	wordCount?: string;
}

/** 发现页规则 */
export type ExploreRule = Omit<SearchRule, "checkKeyWord">;

/** 书籍详情规则 */
export interface BookInfoRule {
	init?: string;
	name?: string;
	author?: string;
	intro?: string;
	kind?: string;
	lastChapter?: string;
	updateTime?: string;
	coverUrl?: string;
	tocUrl?: string;
	wordCount?: string;
	canReName?: string;
	downloadUrls?: string;
}

/** 目录规则 */
export interface TocRule {
	preUpdateJs?: string;
	chapterList: string;
	chapterName: string;
	chapterUrl: string;
	formatJs?: string;
	isVolume?: string;
	isVip?: string;
	isPay?: string;
	updateTime?: string;
	nextTocUrl?: string;
}

/** 正文规则 */
export interface ContentRule {
	content: string;
	title?: string;
	nextContentUrl?: string;
	webJs?: string;
	sourceRegex?: string;
	replaceRegex?: string;
	imageStyle?: string;
	imageDecode?: string;
	payAction?: string;
}

/** 评论规则 */
export interface ReviewRule {
	reviewUrl?: string;
	avatarRule?: string;
	contentRule?: string;
	postTimeRule?: string;
	reviewQuoteUrl?: string;
	voteUpUrl?: string;
	voteDownUrl?: string;
	postReviewUrl?: string;
	postQuoteUrl?: string;
	deleteUrl?: string;
}

/** 规则解析模式 */
export type AnalyzeRuleMode =
	| "default" // CSS 选择器
	| "xpath"
	| "json"
	| "js"
	| "regex";

/** 规则组合运算符（拆分用：&& || %%，正则用：##） */
export type RuleOperator = "&&" | "||" | "%%" | "##";

/** 仅用于操作符拆分的运算符（不含 ##） */
export type CombineOperator = "&&" | "||" | "%%";

/** 运算符拆分后的规则片段 */
export interface RuleSegment {
	/** 子规则字符串（可能包含 ## 正则替换） */
	rule: string;
	/** 前置运算符（第一段为 undefined） */
	operator: CombineOperator | undefined;
}

/** 解析成功 */
export interface ParseSuccess {
	ok: true;
	/** 单字符串结果（多值用 \n 连接） */
	value: string;
	/** 所有匹配结果 */
	values: string[];
}

/** 解析失败 */
export interface ParseFailure {
	ok: false;
	/** 错误描述 */
	error: string;
}

/** 统一解析结果 — discriminated union */
export type ParseResult = ParseSuccess | ParseFailure;

/** 内容类型 */
export type ContentType = "html" | "json" | "xml" | "text";

/** URL 选项 JSON 结构 — 书源 URL 规则中逗号后的 JSON 配置 */
export interface UrlOption {
	method?: string;
	charset?: string;
	headers?: Record<string, string>;
	body?: string;
	retry?: number;
	webJs?: string;
	type?: string;
	webView?: boolean;
}

/** URL 分析器输入上下文 */
export interface AnalyzeUrlContext {
	variables?: Record<string, string>;
	page?: number;
	baseUrl?: string;
	headers?: Record<string, string>;
}
