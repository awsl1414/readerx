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

/** 规则组合运算符 */
export type RuleOperator = "&&" | "||" | "%%" | "##";
