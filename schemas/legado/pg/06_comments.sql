-- =============================================================================
-- Legado 数据库 - 表与列注释
-- 源码: io.legado.app.data.entities 各实体类注释
-- 目标: PostgreSQL 17+
-- =============================================================================

-- ===========================================================================
-- 表注释
-- ===========================================================================

COMMENT ON TABLE books              IS '书籍表 - 存储用户书架上的所有书籍信息';
COMMENT ON TABLE book_groups        IS '书籍分组表 - 书架分组管理';
COMMENT ON TABLE book_sources       IS '书源表 - 网络书源规则配置';
COMMENT ON TABLE chapters           IS '章节表 - 书籍目录章节信息';
COMMENT ON TABLE search_books       IS '搜索书籍表 - 搜索结果缓存';
COMMENT ON TABLE search_keywords    IS '搜索关键词表 - 搜索历史记录';
COMMENT ON TABLE bookmarks          IS '书签表 - 用户阅读书签';
COMMENT ON TABLE replace_rules      IS '替换规则表 - 正文内容净化替换';
COMMENT ON TABLE rss_sources        IS 'RSS源表 - RSS订阅源配置';
COMMENT ON TABLE rss_articles       IS 'RSS文章表 - RSS订阅文章';
COMMENT ON TABLE rss_read_records   IS 'RSS阅读记录表 - RSS文章已读标记';
COMMENT ON TABLE rss_stars          IS 'RSS收藏表 - RSS文章收藏';
COMMENT ON TABLE cookies            IS 'Cookie表 - 网站Cookie存储';
COMMENT ON TABLE txt_toc_rules      IS 'TXT目录规则表 - 本地TXT目录识别规则';
COMMENT ON TABLE read_record        IS '阅读记录表 - 多设备阅读时长统计';
COMMENT ON TABLE http_tts           IS 'HTTP TTS表 - 在线TTS语音引擎配置';
COMMENT ON TABLE caches             IS '缓存表 - 通用键值缓存';
COMMENT ON TABLE rule_subs          IS '规则订阅表 - 书源/RSS源在线订阅';
COMMENT ON TABLE dict_rules         IS '字典规则表 - 字典查找规则';
COMMENT ON TABLE keyboard_assists   IS '键盘辅助表 - 自定义键盘快捷输入';
COMMENT ON TABLE servers            IS '服务器表 - WebDAV等服务器配置';

-- ===========================================================================
-- books 表列注释
-- ===========================================================================

COMMENT ON COLUMN books.book_url             IS '详情页URL，本地书源存储完整文件路径（主键）';
COMMENT ON COLUMN books.toc_url              IS '目录页URL (toc = table of contents)';
COMMENT ON COLUMN books.origin               IS '书源URL，默认 BookType.localTag = loc_book';
COMMENT ON COLUMN books.origin_name          IS '书源名称或本地书籍文件名';
COMMENT ON COLUMN books.name                 IS '书籍名称（书源获取）';
COMMENT ON COLUMN books.author               IS '作者名称（书源获取）';
COMMENT ON COLUMN books.kind                 IS '分类信息（书源获取）';
COMMENT ON COLUMN books.custom_tag           IS '分类信息（用户修改）';
COMMENT ON COLUMN books.cover_url            IS '封面URL（书源获取）';
COMMENT ON COLUMN books.custom_cover_url     IS '封面URL（用户修改）';
COMMENT ON COLUMN books.intro                IS '简介内容（书源获取）';
COMMENT ON COLUMN books.custom_intro         IS '简介内容（用户修改）';
COMMENT ON COLUMN books.charset              IS '自定义字符集名称（仅本地书籍）';
COMMENT ON COLUMN books.type                 IS '书籍类型: 0=text, 1=audio, 2=image, 3=epub...';
COMMENT ON COLUMN books.group                IS '自定义分组位掩码';
COMMENT ON COLUMN books.latest_chapter_title IS '最新章节标题';
COMMENT ON COLUMN books.latest_chapter_time  IS '最新章节标题更新时间（epoch毫秒）';
COMMENT ON COLUMN books.last_check_time      IS '最近一次更新书籍信息的时间（epoch毫秒）';
COMMENT ON COLUMN books.last_check_count     IS '最近一次发现新章节的数量';
COMMENT ON COLUMN books.total_chapter_num    IS '书籍目录总数';
COMMENT ON COLUMN books.dur_chapter_title    IS '当前章节名称';
COMMENT ON COLUMN books.dur_chapter_index    IS '当前章节索引';
COMMENT ON COLUMN books.dur_chapter_pos      IS '当前阅读进度（首行字符索引位置）';
COMMENT ON COLUMN books.dur_chapter_time     IS '最近一次阅读时间（epoch毫秒）';
COMMENT ON COLUMN books.word_count           IS '字数';
COMMENT ON COLUMN books.can_update           IS '刷新书架时是否更新书籍信息';
COMMENT ON COLUMN books.order                IS '手动排序';
COMMENT ON COLUMN books.origin_order         IS '书源排序';
COMMENT ON COLUMN books.variable             IS '自定义书籍变量（JSON，用于书源规则检索）';
COMMENT ON COLUMN books.read_config          IS '阅读配置（JSONB: ReadConfig）';
COMMENT ON COLUMN books.sync_time            IS '同步时间（epoch毫秒）';

-- ===========================================================================
-- book_sources 表列注释
-- ===========================================================================

COMMENT ON COLUMN book_sources.book_source_url     IS '书源地址，含 http/https（主键）';
COMMENT ON COLUMN book_sources.book_source_name    IS '书源名称';
COMMENT ON COLUMN book_sources.book_source_group   IS '书源分组（逗号分隔）';
COMMENT ON COLUMN book_sources.book_source_type    IS '书源类型: 0=文本, 1=音频, 2=图片, 3=文件';
COMMENT ON COLUMN book_sources.book_url_pattern    IS '详情页URL正则';
COMMENT ON COLUMN book_sources.custom_order        IS '手动排序编号';
COMMENT ON COLUMN book_sources.enabled             IS '是否启用';
COMMENT ON COLUMN book_sources.enabled_explore     IS '启用发现';
COMMENT ON COLUMN book_sources.js_lib              IS 'JS库';
COMMENT ON COLUMN book_sources.enabled_cookie_jar  IS '启用 OkHttp CookieJar 自动保存';
COMMENT ON COLUMN book_sources.concurrent_rate     IS '并发率限制';
COMMENT ON COLUMN book_sources.header              IS '请求头（JSON）';
COMMENT ON COLUMN book_sources.login_url           IS '登录地址';
COMMENT ON COLUMN book_sources.login_ui            IS '登录UI配置（JSON）';
COMMENT ON COLUMN book_sources.login_check_js      IS '登录检测JS';
COMMENT ON COLUMN book_sources.cover_decode_js     IS '封面解密JS';
COMMENT ON COLUMN book_sources.book_source_comment IS '书源注释说明';
COMMENT ON COLUMN book_sources.variable_comment    IS '自定义变量说明';
COMMENT ON COLUMN book_sources.last_update_time    IS '最后更新时间（epoch毫秒）';
COMMENT ON COLUMN book_sources.respond_time        IS '响应时间（毫秒，用于排序）';
COMMENT ON COLUMN book_sources.weight              IS '智能排序权重';
COMMENT ON COLUMN book_sources.explore_url         IS '发现URL';
COMMENT ON COLUMN book_sources.explore_screen      IS '发现筛选规则';
COMMENT ON COLUMN book_sources.rule_explore        IS '发现规则（JSONB: ExploreRule）';
COMMENT ON COLUMN book_sources.search_url          IS '搜索URL';
COMMENT ON COLUMN book_sources.rule_search         IS '搜索规则（JSONB: SearchRule）';
COMMENT ON COLUMN book_sources.rule_book_info      IS '书籍信息页规则（JSONB: BookInfoRule）';
COMMENT ON COLUMN book_sources.rule_toc            IS '目录页规则（JSONB: TocRule）';
COMMENT ON COLUMN book_sources.rule_content        IS '正文页规则（JSONB: ContentRule）';
COMMENT ON COLUMN book_sources.rule_review         IS '段评规则（JSONB: ReviewRule）';

-- ===========================================================================
-- chapters 表列注释
-- ===========================================================================

COMMENT ON COLUMN chapters.url               IS '章节URL（复合主键之一）';
COMMENT ON COLUMN chapters.title             IS '章节标题';
COMMENT ON COLUMN chapters.is_volume         IS '是否为卷标';
COMMENT ON COLUMN chapters.base_url          IS '基础URL';
COMMENT ON COLUMN chapters.book_url          IS '所属书籍URL（复合主键之二，外键→books）';
COMMENT ON COLUMN chapters.index             IS '章节序号';
COMMENT ON COLUMN chapters.is_vip            IS '是否VIP章节';
COMMENT ON COLUMN chapters.is_pay            IS '是否已购买';
COMMENT ON COLUMN chapters.resource_url      IS '资源URL';
COMMENT ON COLUMN chapters.tag               IS '标签';
COMMENT ON COLUMN chapters.word_count        IS '字数';
COMMENT ON COLUMN chapters.start             IS '本地书籍文件起始偏移量';
COMMENT ON COLUMN chapters.end               IS '本地书籍文件结束偏移量';
COMMENT ON COLUMN chapters.start_fragment_id IS 'EPUB 起始 fragment ID';
COMMENT ON COLUMN chapters.end_fragment_id   IS 'EPUB 结束 fragment ID';
COMMENT ON COLUMN chapters.variable          IS '自定义章节变量（JSON）';

-- ===========================================================================
-- book_groups 表列注释
-- ===========================================================================

COMMENT ON COLUMN book_groups.group_id       IS '分组ID（主键）';
COMMENT ON COLUMN book_groups.group_name     IS '分组名称';
COMMENT ON COLUMN book_groups.cover          IS '分组封面URL';
COMMENT ON COLUMN book_groups.order          IS '排序';
COMMENT ON COLUMN book_groups.enable_refresh IS '是否启用刷新';
COMMENT ON COLUMN book_groups.show           IS '是否显示';
COMMENT ON COLUMN book_groups.book_sort      IS '书籍排序方式，-1=默认';

-- ===========================================================================
-- search_books 表列注释
-- ===========================================================================

COMMENT ON COLUMN search_books.book_url              IS '书籍URL（主键）';
COMMENT ON COLUMN search_books.origin                IS '书源URL（外键→book_sources）';
COMMENT ON COLUMN search_books.origin_name           IS '书源名称';
COMMENT ON COLUMN search_books.type                  IS '书籍类型';
COMMENT ON COLUMN search_books.name                  IS '书籍名称';
COMMENT ON COLUMN search_books.author                IS '作者';
COMMENT ON COLUMN search_books.kind                  IS '分类';
COMMENT ON COLUMN search_books.cover_url             IS '封面URL';
COMMENT ON COLUMN search_books.intro                 IS '简介';
COMMENT ON COLUMN search_books.word_count            IS '字数';
COMMENT ON COLUMN search_books.latest_chapter_title  IS '最新章节标题';
COMMENT ON COLUMN search_books.toc_url               IS '目录URL';
COMMENT ON COLUMN search_books.time                  IS '搜索时间（epoch毫秒）';
COMMENT ON COLUMN search_books.variable              IS '自定义变量（JSON）';
COMMENT ON COLUMN search_books.origin_order          IS '书源排序';
COMMENT ON COLUMN search_books.chapter_word_count_text IS '章节字数文本';
COMMENT ON COLUMN search_books.chapter_word_count    IS '章节字数';
COMMENT ON COLUMN search_books.respond_time          IS '响应时间（毫秒）';

-- ===========================================================================
-- search_keywords 表列注释
-- ===========================================================================

COMMENT ON COLUMN search_keywords.word          IS '搜索关键词（主键）';
COMMENT ON COLUMN search_keywords.usage         IS '使用次数';
COMMENT ON COLUMN search_keywords.last_use_time IS '最后使用时间（epoch毫秒）';

-- ===========================================================================
-- bookmarks 表列注释
-- ===========================================================================

COMMENT ON COLUMN bookmarks.book_name     IS '书名';
COMMENT ON COLUMN bookmarks.book_author   IS '作者';
COMMENT ON COLUMN bookmarks.chapter_index IS '章节索引';
COMMENT ON COLUMN bookmarks.chapter_pos   IS '章节内位置';
COMMENT ON COLUMN bookmarks.chapter_name  IS '章节名称';
COMMENT ON COLUMN bookmarks.book_text     IS '书签选中文本';
COMMENT ON COLUMN bookmarks.content       IS '书签备注内容';
COMMENT ON COLUMN bookmarks.time          IS '书签创建时间（epoch毫秒，主键）';

-- ===========================================================================
-- replace_rules 表列注释
-- ===========================================================================

COMMENT ON COLUMN replace_rules.name                IS '规则名称';
COMMENT ON COLUMN replace_rules.group               IS '规则分组';
COMMENT ON COLUMN replace_rules.pattern             IS '匹配模式（正则或纯文本）';
COMMENT ON COLUMN replace_rules.replacement         IS '替换内容';
COMMENT ON COLUMN replace_rules.scope               IS '作用范围（书源URL，逗号分隔）';
COMMENT ON COLUMN replace_rules.scope_title         IS '是否作用于标题';
COMMENT ON COLUMN replace_rules.scope_content       IS '是否作用于正文';
COMMENT ON COLUMN replace_rules.exclude_scope       IS '排除范围';
COMMENT ON COLUMN replace_rules.is_enabled          IS '是否启用';
COMMENT ON COLUMN replace_rules.is_regex            IS '是否为正则匹配';
COMMENT ON COLUMN replace_rules.timeout_millisecond IS '超时时间（毫秒）';
COMMENT ON COLUMN replace_rules.sort_order          IS '排序序号';

-- ===========================================================================
-- rss_sources 表列注释
-- ===========================================================================

COMMENT ON COLUMN rss_sources.source_url                  IS 'RSS源URL（主键）';
COMMENT ON COLUMN rss_sources.source_name                 IS 'RSS源名称';
COMMENT ON COLUMN rss_sources.source_icon                 IS 'RSS源图标URL';
COMMENT ON COLUMN rss_sources.source_group                IS 'RSS源分组';
COMMENT ON COLUMN rss_sources.source_comment              IS 'RSS源注释';
COMMENT ON COLUMN rss_sources.enabled                     IS '是否启用';
COMMENT ON COLUMN rss_sources.article_style               IS '文章样式: 0=默认';
COMMENT ON COLUMN rss_sources.rule_articles               IS '文章列表规则';
COMMENT ON COLUMN rss_sources.rule_next_page              IS '下一页规则';
COMMENT ON COLUMN rss_sources.rule_title                  IS '标题规则';
COMMENT ON COLUMN rss_sources.rule_pub_date               IS '发布日期规则';
COMMENT ON COLUMN rss_sources.rule_description            IS '描述规则';
COMMENT ON COLUMN rss_sources.rule_image                  IS '图片规则';
COMMENT ON COLUMN rss_sources.rule_link                   IS '链接规则';
COMMENT ON COLUMN rss_sources.rule_content                IS '内容规则';
COMMENT ON COLUMN rss_sources.content_whitelist           IS '内容白名单';
COMMENT ON COLUMN rss_sources.content_blacklist           IS '内容黑名单';
COMMENT ON COLUMN rss_sources.should_override_url_loading IS 'URL拦截规则';
COMMENT ON COLUMN rss_sources.style                       IS '自定义样式';
COMMENT ON COLUMN rss_sources.enable_js                   IS '启用JS';
COMMENT ON COLUMN rss_sources.load_with_base_url          IS '使用BaseURL加载';
COMMENT ON COLUMN rss_sources.inject_js                   IS '注入JS';
COMMENT ON COLUMN rss_sources.sort_url                    IS '分类URL';
COMMENT ON COLUMN rss_sources.single_url                  IS '是否单链接模式';
COMMENT ON COLUMN rss_sources.custom_order                IS '手动排序';

-- ===========================================================================
-- rss_articles 表列注释
-- ===========================================================================

COMMENT ON COLUMN rss_articles.origin      IS 'RSS源URL（复合主键之一）';
COMMENT ON COLUMN rss_articles.link        IS '文章链接（复合主键之二）';
COMMENT ON COLUMN rss_articles.sort        IS '分类';
COMMENT ON COLUMN rss_articles.title       IS '文章标题';
COMMENT ON COLUMN rss_articles.order       IS '排序';
COMMENT ON COLUMN rss_articles.pub_date    IS '发布日期';
COMMENT ON COLUMN rss_articles.description IS '描述';
COMMENT ON COLUMN rss_articles.content     IS '文章内容';
COMMENT ON COLUMN rss_articles.image       IS '文章图片';
COMMENT ON COLUMN rss_articles.group       IS '分组，默认"默认分组"';
COMMENT ON COLUMN rss_articles.read        IS '是否已读';
COMMENT ON COLUMN rss_articles.variable    IS '自定义变量（JSON）';

-- ===========================================================================
-- rss_read_records 表列注释
-- ===========================================================================

COMMENT ON COLUMN rss_read_records.record   IS '记录标识（主键，通常为 origin+link）';
COMMENT ON COLUMN rss_read_records.title    IS '文章标题';
COMMENT ON COLUMN rss_read_records.read_time IS '阅读时间（epoch毫秒）';
COMMENT ON COLUMN rss_read_records.read     IS '是否已读';

-- ===========================================================================
-- rss_stars 表列注释
-- ===========================================================================

COMMENT ON COLUMN rss_stars.origin      IS 'RSS源URL（复合主键之一）';
COMMENT ON COLUMN rss_stars.link        IS '文章链接（复合主键之二）';
COMMENT ON COLUMN rss_stars.sort        IS '分类';
COMMENT ON COLUMN rss_stars.title       IS '文章标题';
COMMENT ON COLUMN rss_stars.star_time   IS '收藏时间（epoch毫秒）';
COMMENT ON COLUMN rss_stars.pub_date    IS '发布日期';
COMMENT ON COLUMN rss_stars.description IS '描述';
COMMENT ON COLUMN rss_stars.content     IS '文章内容';
COMMENT ON COLUMN rss_stars.image       IS '文章图片';
COMMENT ON COLUMN rss_stars.group       IS '分组，默认"默认分组"';
COMMENT ON COLUMN rss_stars.variable    IS '自定义变量（JSON）';

-- ===========================================================================
-- cookies 表列注释
-- ===========================================================================

COMMENT ON COLUMN cookies.url    IS '网站URL（主键）';
COMMENT ON COLUMN cookies.cookie IS 'Cookie字符串';

-- ===========================================================================
-- txt_toc_rules 表列注释
-- ===========================================================================

COMMENT ON COLUMN txt_toc_rules.id            IS '规则ID（主键）';
COMMENT ON COLUMN txt_toc_rules.name          IS '规则名称';
COMMENT ON COLUMN txt_toc_rules.rule          IS '目录正则规则';
COMMENT ON COLUMN txt_toc_rules.example       IS '规则示例';
COMMENT ON COLUMN txt_toc_rules.serial_number IS '排序序号';
COMMENT ON COLUMN txt_toc_rules.enable        IS '是否启用';

-- ===========================================================================
-- read_record 表列注释
-- ===========================================================================

COMMENT ON COLUMN read_record.device_id  IS '设备ID（复合主键之一）';
COMMENT ON COLUMN read_record.book_name  IS '书名（复合主键之二）';
COMMENT ON COLUMN read_record.read_time  IS '阅读时长（毫秒）';
COMMENT ON COLUMN read_record.last_read  IS '最后阅读时间（epoch毫秒）';

-- ===========================================================================
-- http_tts 表列注释
-- ===========================================================================

COMMENT ON COLUMN http_tts.id                IS 'TTS引擎ID（主键）';
COMMENT ON COLUMN http_tts.name              IS 'TTS引擎名称';
COMMENT ON COLUMN http_tts.url               IS 'TTS请求URL';
COMMENT ON COLUMN http_tts.content_type      IS '内容类型';
COMMENT ON COLUMN http_tts.concurrent_rate   IS '并发率限制';
COMMENT ON COLUMN http_tts.login_url         IS '登录地址';
COMMENT ON COLUMN http_tts.login_ui          IS '登录UI配置（JSON）';
COMMENT ON COLUMN http_tts.header            IS '请求头（JSON）';
COMMENT ON COLUMN http_tts.js_lib            IS 'JS库';
COMMENT ON COLUMN http_tts.enabled_cookie_jar IS '启用CookieJar';
COMMENT ON COLUMN http_tts.login_check_js    IS '登录检测JS';
COMMENT ON COLUMN http_tts.last_update_time  IS '最后更新时间（epoch毫秒）';

-- ===========================================================================
-- caches 表列注释
-- ===========================================================================

COMMENT ON COLUMN caches.key      IS '缓存键（主键）';
COMMENT ON COLUMN caches.value    IS '缓存值';
COMMENT ON COLUMN caches.deadline IS '过期时间（epoch毫秒）';

-- ===========================================================================
-- rule_subs 表列注释
-- ===========================================================================

COMMENT ON COLUMN rule_subs.id           IS '订阅ID（主键）';
COMMENT ON COLUMN rule_subs.name         IS '订阅名称';
COMMENT ON COLUMN rule_subs.url          IS '订阅URL';
COMMENT ON COLUMN rule_subs.type         IS '订阅类型';
COMMENT ON COLUMN rule_subs.custom_order IS '排序';
COMMENT ON COLUMN rule_subs.auto_update  IS '自动更新';
COMMENT ON COLUMN rule_subs.update       IS '最后更新时间（epoch毫秒）';

-- ===========================================================================
-- dict_rules 表列注释
-- ===========================================================================

COMMENT ON COLUMN dict_rules.name        IS '字典名称（主键）';
COMMENT ON COLUMN dict_rules.url_rule    IS 'URL规则';
COMMENT ON COLUMN dict_rules.show_rule   IS '显示规则';
COMMENT ON COLUMN dict_rules.enabled     IS '是否启用';
COMMENT ON COLUMN dict_rules.sort_number IS '排序序号';

-- ===========================================================================
-- keyboard_assists 表列注释
-- ===========================================================================

COMMENT ON COLUMN keyboard_assists.type      IS '辅助类型（复合主键之一）';
COMMENT ON COLUMN keyboard_assists.key       IS '按键（复合主键之二）';
COMMENT ON COLUMN keyboard_assists.value     IS '输入值';
COMMENT ON COLUMN keyboard_assists.serial_no IS '排序序号';

-- ===========================================================================
-- servers 表列注释
-- ===========================================================================

COMMENT ON COLUMN servers.id         IS '服务器ID（主键，默认为时间戳）';
COMMENT ON COLUMN servers.name       IS '服务器名称';
COMMENT ON COLUMN servers.type       IS '服务器类型枚举: WEBDAV';
COMMENT ON COLUMN servers.config     IS '服务器配置（JSONB: WebDavConfig等）';
COMMENT ON COLUMN servers.sort_number IS '排序序号';

-- ===========================================================================
-- 视图注释
-- ===========================================================================

COMMENT ON VIEW book_sources_part IS '书源精简视图 - 列表展示场景的关键字段与计算字段';
