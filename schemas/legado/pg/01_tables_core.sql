-- =============================================================================
-- Legado 数据库 - 核心表
-- 源码: io.legado.app.data.entities
-- 目标: PostgreSQL 17+
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. 书籍分组表 book_groups
-- 源码: io.legado.app.data.entities.BookGroup
-- ---------------------------------------------------------------------------
CREATE TABLE book_groups (
    group_id         BIGINT        PRIMARY KEY,
    group_name       TEXT          NOT NULL,
    cover            TEXT,
    "order"          INTEGER       NOT NULL DEFAULT 0,
    enable_refresh   BOOLEAN       NOT NULL DEFAULT TRUE,
    show             BOOLEAN       NOT NULL DEFAULT TRUE,
    book_sort        INTEGER       NOT NULL DEFAULT -1
);

-- ---------------------------------------------------------------------------
-- 2. 书源表 book_sources
-- 源码: io.legado.app.data.entities.BookSource
-- 类型转换: ruleExplore, ruleSearch, ruleBookInfo, ruleToc, ruleContent, ruleReview
--           通过 Room TypeConverter 以 GSON 序列化存储 → PostgreSQL JSONB
-- ---------------------------------------------------------------------------
CREATE TABLE book_sources (
    book_source_url        TEXT          PRIMARY KEY,
    book_source_name       TEXT          NOT NULL DEFAULT '',
    book_source_group      TEXT,
    book_source_type       INTEGER       NOT NULL DEFAULT 0,
        -- 0=文本, 1=音频, 2=图片, 3=文件(下载类)
    book_url_pattern       TEXT,
    custom_order           INTEGER       NOT NULL DEFAULT 0,
    enabled                BOOLEAN       NOT NULL DEFAULT TRUE,
    enabled_explore        BOOLEAN       NOT NULL DEFAULT TRUE,
    js_lib                 TEXT,
    enabled_cookie_jar     BOOLEAN       DEFAULT FALSE,
    concurrent_rate        TEXT,
    header                 TEXT,
    login_url              TEXT,
    login_ui               TEXT,
    login_check_js         TEXT,
    cover_decode_js        TEXT,
    book_source_comment    TEXT,
    variable_comment       TEXT,
    last_update_time       BIGINT        NOT NULL DEFAULT 0,
    respond_time           BIGINT        NOT NULL DEFAULT 180000,
    weight                 INTEGER       NOT NULL DEFAULT 0,
    explore_url            TEXT,
    explore_screen         TEXT,
    rule_explore           JSONB,        -- ExploreRule, GSON 序列化
    search_url             TEXT,
    rule_search            JSONB,        -- SearchRule, GSON 序列化
    rule_book_info         JSONB,        -- BookInfoRule, GSON 序列化
    rule_toc               JSONB,        -- TocRule, GSON 序列化
    rule_content           JSONB,        -- ContentRule, GSON 序列化
    rule_review            JSONB         -- ReviewRule, GSON 序列化
);

CREATE INDEX idx_book_sources_book_source_url ON book_sources (book_source_url);

-- ---------------------------------------------------------------------------
-- 3. 书籍表 books
-- 源码: io.legado.app.data.entities.Book
-- 类型转换: readConfig 通过 Room TypeConverter 以 GSON 序列化 → PostgreSQL JSONB
-- ---------------------------------------------------------------------------
CREATE TABLE books (
    book_url               TEXT          PRIMARY KEY DEFAULT '',
    toc_url                TEXT          NOT NULL DEFAULT '',
    origin                 TEXT          NOT NULL DEFAULT 'loc_book',
        -- 默认值 BookType.localTag = "loc_book"
    origin_name            TEXT          NOT NULL DEFAULT '',
    name                   TEXT          NOT NULL DEFAULT '',
    author                 TEXT          NOT NULL DEFAULT '',
    kind                   TEXT,
    custom_tag             TEXT,
    cover_url              TEXT,
    custom_cover_url       TEXT,
    intro                  TEXT,
    custom_intro           TEXT,
    charset                TEXT,
    type                   INTEGER       NOT NULL DEFAULT 0,
        -- BookType: 0=text, 1=audio, 2=image, 3=epub, ...
    "group"                BIGINT        NOT NULL DEFAULT 0,
        -- 位掩码，表示所属分组
    latest_chapter_title   TEXT,
    latest_chapter_time    BIGINT        NOT NULL DEFAULT 0,
    last_check_time        BIGINT        NOT NULL DEFAULT 0,
    last_check_count       INTEGER       NOT NULL DEFAULT 0,
    total_chapter_num      INTEGER       NOT NULL DEFAULT 0,
    dur_chapter_title      TEXT,
    dur_chapter_index      INTEGER       NOT NULL DEFAULT 0,
    dur_chapter_pos        INTEGER       NOT NULL DEFAULT 0,
    dur_chapter_time       BIGINT        NOT NULL DEFAULT 0,
    word_count             TEXT,
    can_update             BOOLEAN       NOT NULL DEFAULT TRUE,
    "order"                INTEGER       NOT NULL DEFAULT 0,
    origin_order           INTEGER       NOT NULL DEFAULT 0,
    variable               TEXT,
    read_config            JSONB,        -- Book.ReadConfig, GSON 序列化
    sync_time              BIGINT        NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_books_name_author ON books (name, author);

-- ---------------------------------------------------------------------------
-- 4. 章节表 chapters
-- 源码: io.legado.app.data.entities.BookChapter
-- 复合主键: (url, bookUrl)
-- 外键: bookUrl → books.bookUrl ON DELETE CASCADE
-- ---------------------------------------------------------------------------
CREATE TABLE chapters (
    url                    TEXT          NOT NULL,
    title                  TEXT          NOT NULL DEFAULT '',
    is_volume              BOOLEAN      NOT NULL DEFAULT FALSE,
    base_url               TEXT          NOT NULL DEFAULT '',
    book_url               TEXT          NOT NULL,
    index                  INTEGER       NOT NULL DEFAULT 0,
    is_vip                 BOOLEAN      NOT NULL DEFAULT FALSE,
    is_pay                 BOOLEAN      NOT NULL DEFAULT FALSE,
    resource_url           TEXT,
    tag                    TEXT,
    word_count             TEXT,
    start                  BIGINT,
    "end"                  BIGINT,
    start_fragment_id      TEXT,
    end_fragment_id        TEXT,
    variable               TEXT,

    PRIMARY KEY (url, book_url),

    CONSTRAINT fk_chapters_book
        FOREIGN KEY (book_url)
        REFERENCES books (book_url)
        ON DELETE CASCADE
);

CREATE INDEX idx_chapters_book_url ON chapters (book_url);
CREATE UNIQUE INDEX idx_chapters_book_url_index ON chapters (book_url, index);
