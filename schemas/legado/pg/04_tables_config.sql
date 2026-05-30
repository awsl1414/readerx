-- =============================================================================
-- Legado 数据库 - 配置与辅助表
-- 源码: io.legado.app.data.entities
-- 目标: PostgreSQL 17+
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. 替换规则表 replace_rules
-- 源码: io.legado.app.data.entities.ReplaceRule
-- 注意: Room 中列名 sortOrder，字段名 order
-- ---------------------------------------------------------------------------
CREATE TABLE replace_rules (
    id                     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                   TEXT          NOT NULL DEFAULT '',
    "group"                TEXT,
    pattern                TEXT          NOT NULL DEFAULT '',
    replacement            TEXT          NOT NULL DEFAULT '',
    scope                  TEXT,
    scope_title            BOOLEAN       NOT NULL DEFAULT FALSE,
    scope_content          BOOLEAN       NOT NULL DEFAULT TRUE,
    exclude_scope          TEXT,
    is_enabled             BOOLEAN       NOT NULL DEFAULT TRUE,
    is_regex               BOOLEAN       NOT NULL DEFAULT TRUE,
    timeout_millisecond    BIGINT        NOT NULL DEFAULT 3000,
    sort_order             INTEGER       NOT NULL DEFAULT 0
        -- Room @ColumnInfo(name = "sortOrder")
);

CREATE INDEX idx_replace_rules_id ON replace_rules (id);

-- ---------------------------------------------------------------------------
-- 2. Cookie 表 cookies
-- 源码: io.legado.app.data.entities.Cookie
-- ---------------------------------------------------------------------------
CREATE TABLE cookies (
    url                    TEXT          PRIMARY KEY DEFAULT '',
    cookie                 TEXT          NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX idx_cookies_url ON cookies (url);

-- ---------------------------------------------------------------------------
-- 3. TXT 目录规则表 txt_toc_rules
-- 源码: io.legado.app.data.entities.TxtTocRule
-- ---------------------------------------------------------------------------
CREATE TABLE txt_toc_rules (
    id                     BIGINT        PRIMARY KEY,
    name                   TEXT          NOT NULL DEFAULT '',
    rule                   TEXT          NOT NULL DEFAULT '',
    example                TEXT,
    serial_number          INTEGER       NOT NULL DEFAULT 0,
    enable                 BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------------
-- 4. 阅读记录表 read_record
-- 源码: io.legado.app.data.entities.ReadRecord
-- 复合主键: (deviceId, bookName)
-- ---------------------------------------------------------------------------
CREATE TABLE read_record (
    device_id              TEXT          NOT NULL DEFAULT '',
    book_name              TEXT          NOT NULL DEFAULT '',
    read_time              BIGINT        NOT NULL DEFAULT 0,
    last_read              BIGINT        NOT NULL DEFAULT 0,

    PRIMARY KEY (device_id, book_name)
);

-- ---------------------------------------------------------------------------
-- 5. HTTP TTS 语音表 http_tts
-- 源码: io.legado.app.data.entities.HttpTTS
-- ---------------------------------------------------------------------------
CREATE TABLE http_tts (
    id                     BIGINT        PRIMARY KEY,
    name                   TEXT          NOT NULL DEFAULT '',
    url                    TEXT          NOT NULL DEFAULT '',
    content_type           TEXT,
    concurrent_rate        TEXT          DEFAULT '0',
    login_url              TEXT,
    login_ui               TEXT,
    header                 TEXT,
    js_lib                 TEXT,
    enabled_cookie_jar     BOOLEAN       DEFAULT FALSE,
    login_check_js         TEXT,
    last_update_time       BIGINT        NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 6. 缓存表 caches
-- 源码: io.legado.app.data.entities.Cache
-- ---------------------------------------------------------------------------
CREATE TABLE caches (
    key                    TEXT          PRIMARY KEY DEFAULT '',
    value                  TEXT,
    deadline               BIGINT        NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_caches_key ON caches (key);

-- ---------------------------------------------------------------------------
-- 7. 规则订阅表 rule_subs
-- 源码: io.legado.app.data.entities.RuleSub
-- ---------------------------------------------------------------------------
CREATE TABLE rule_subs (
    id                     BIGINT        PRIMARY KEY,
    name                   TEXT          NOT NULL DEFAULT '',
    url                    TEXT          NOT NULL DEFAULT '',
    type                   INTEGER       NOT NULL DEFAULT 0,
    custom_order           INTEGER       NOT NULL DEFAULT 0,
    auto_update            BOOLEAN       NOT NULL DEFAULT FALSE,
    update                 BIGINT        NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 8. 字典规则表 dict_rules
-- 源码: io.legado.app.data.entities.DictRule
-- ---------------------------------------------------------------------------
CREATE TABLE dict_rules (
    name                   TEXT          PRIMARY KEY DEFAULT '',
    url_rule               TEXT          NOT NULL DEFAULT '',
    show_rule              TEXT          NOT NULL DEFAULT '',
    enabled                BOOLEAN       NOT NULL DEFAULT TRUE,
    sort_number            INTEGER       NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 9. 键盘辅助表 keyboard_assists
-- 源码: io.legado.app.data.entities.KeyboardAssist
-- 复合主键: (type, key)
-- ---------------------------------------------------------------------------
CREATE TABLE keyboard_assists (
    type                   INTEGER       NOT NULL DEFAULT 0,
    key                    TEXT          NOT NULL DEFAULT '',
    value                  TEXT          NOT NULL DEFAULT '',
    serial_no              INTEGER       NOT NULL DEFAULT 0,

    PRIMARY KEY (type, key)
);

-- ---------------------------------------------------------------------------
-- 10. 服务器表 servers
-- 源码: io.legado.app.data.entities.Server
-- 类型: config 字段为 JSON 字符串（WebDavConfig 等） → JSONB
-- ---------------------------------------------------------------------------
CREATE TABLE servers (
    id                     BIGINT        PRIMARY KEY,
    name                   TEXT          NOT NULL DEFAULT '',
    type                   server_type_enum NOT NULL DEFAULT 'WEBDAV',
    config                 JSONB,        -- Server.WebDavConfig 等, GSON/JSON 序列化
    sort_number            INTEGER       NOT NULL DEFAULT 0
);
