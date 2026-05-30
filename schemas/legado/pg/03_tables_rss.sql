-- =============================================================================
-- Legado 数据库 - RSS 相关表
-- 源码: io.legado.app.data.entities
-- 目标: PostgreSQL 17+
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RSS 源表 rss_sources
-- 源码: io.legado.app.data.entities.RssSource
-- ---------------------------------------------------------------------------
CREATE TABLE rss_sources (
    source_url             TEXT          PRIMARY KEY DEFAULT '',
    source_name            TEXT          NOT NULL DEFAULT '',
    source_icon            TEXT          NOT NULL DEFAULT '',
    source_group           TEXT,
    source_comment         TEXT,
    enabled                BOOLEAN       NOT NULL DEFAULT TRUE,
    variable_comment       TEXT,
    js_lib                 TEXT,
    enabled_cookie_jar     BOOLEAN       DEFAULT FALSE,
    concurrent_rate        TEXT,
    header                 TEXT,
    login_url              TEXT,
    login_ui               TEXT,
    login_check_js         TEXT,
    cover_decode_js        TEXT,
    sort_url               TEXT,
    single_url             BOOLEAN       NOT NULL DEFAULT FALSE,
    article_style          INTEGER       NOT NULL DEFAULT 0,
    rule_articles          TEXT,
    rule_next_page         TEXT,
    rule_title             TEXT,
    rule_pub_date          TEXT,
    rule_description       TEXT,
    rule_image             TEXT,
    rule_link              TEXT,
    rule_content           TEXT,
    content_whitelist      TEXT,
    content_blacklist      TEXT,
    should_override_url_loading TEXT,
    style                  TEXT,
    enable_js              BOOLEAN       NOT NULL DEFAULT TRUE,
    load_with_base_url     BOOLEAN       NOT NULL DEFAULT TRUE,
    inject_js              TEXT,
    last_update_time       BIGINT        NOT NULL DEFAULT 0,
    custom_order           INTEGER       NOT NULL DEFAULT 0
);

CREATE INDEX idx_rss_sources_source_url ON rss_sources (source_url);

-- ---------------------------------------------------------------------------
-- 2. RSS 文章表 rss_articles
-- 源码: io.legado.app.data.entities.RssArticle
-- 复合主键: (origin, link)
-- ---------------------------------------------------------------------------
CREATE TABLE rss_articles (
    origin                 TEXT          NOT NULL DEFAULT '',
    sort                   TEXT          NOT NULL DEFAULT '',
    title                  TEXT          NOT NULL DEFAULT '',
    "order"                BIGINT        NOT NULL DEFAULT 0,
    link                   TEXT          NOT NULL DEFAULT '',
    pub_date               TEXT,
    description            TEXT,
    content                TEXT,
    image                  TEXT,
    "group"                TEXT          NOT NULL DEFAULT '默认分组',
    read                   BOOLEAN       NOT NULL DEFAULT FALSE,
    variable               TEXT,

    PRIMARY KEY (origin, link)
);

-- ---------------------------------------------------------------------------
-- 3. RSS 阅读记录表 rss_read_records
-- 源码: io.legado.app.data.entities.RssReadRecord
-- ---------------------------------------------------------------------------
CREATE TABLE rss_read_records (
    record                 TEXT          PRIMARY KEY DEFAULT '',
    title                  TEXT,
    read_time              BIGINT,
    read                   BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- 4. RSS 收藏表 rss_stars
-- 源码: io.legado.app.data.entities.RssStar
-- 复合主键: (origin, link)
-- ---------------------------------------------------------------------------
CREATE TABLE rss_stars (
    origin                 TEXT          NOT NULL DEFAULT '',
    sort                   TEXT          NOT NULL DEFAULT '',
    title                  TEXT          NOT NULL DEFAULT '',
    star_time              BIGINT        NOT NULL DEFAULT 0,
    link                   TEXT          NOT NULL DEFAULT '',
    pub_date               TEXT,
    description            TEXT,
    content                TEXT,
    image                  TEXT,
    "group"                TEXT          NOT NULL DEFAULT '默认分组',
    variable               TEXT,

    PRIMARY KEY (origin, link)
);
