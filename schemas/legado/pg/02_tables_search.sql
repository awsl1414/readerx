-- =============================================================================
-- Legado 数据库 - 搜索相关表
-- 源码: io.legado.app.data.entities
-- 目标: PostgreSQL 17+
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. 搜索书籍表 search_books
-- 源码: io.legado.app.data.entities.SearchBook
-- 外键: origin → book_sources.book_source_url ON DELETE CASCADE
-- ---------------------------------------------------------------------------
CREATE TABLE search_books (
    book_url               TEXT          PRIMARY KEY DEFAULT '',
    origin                 TEXT          NOT NULL DEFAULT '',
    origin_name            TEXT          NOT NULL DEFAULT '',
    type                   INTEGER       NOT NULL DEFAULT 0,
    name                   TEXT          NOT NULL DEFAULT '',
    author                 TEXT          NOT NULL DEFAULT '',
    kind                   TEXT,
    cover_url              TEXT,
    intro                  TEXT,
    word_count             TEXT,
    latest_chapter_title   TEXT,
    toc_url                TEXT          NOT NULL DEFAULT '',
    time                   BIGINT        NOT NULL DEFAULT 0,
    variable               TEXT,
    origin_order           INTEGER       NOT NULL DEFAULT 0,
    chapter_word_count_text TEXT,
    chapter_word_count     INTEGER       NOT NULL DEFAULT -1,
    respond_time           INTEGER       NOT NULL DEFAULT -1,

    CONSTRAINT fk_search_books_source
        FOREIGN KEY (origin)
        REFERENCES book_sources (book_source_url)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_search_books_book_url ON search_books (book_url);
CREATE INDEX idx_search_books_origin ON search_books (origin);

-- ---------------------------------------------------------------------------
-- 2. 搜索关键词表 search_keywords
-- 源码: io.legado.app.data.entities.SearchKeyword
-- ---------------------------------------------------------------------------
CREATE TABLE search_keywords (
    word                   TEXT          PRIMARY KEY,
    usage                  INTEGER       NOT NULL DEFAULT 0,
    last_use_time          BIGINT        NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_search_keywords_word ON search_keywords (word);

-- ---------------------------------------------------------------------------
-- 3. 书签表 bookmarks
-- 源码: io.legado.app.data.entities.Bookmark
-- ---------------------------------------------------------------------------
CREATE TABLE bookmarks (
    time                   BIGINT        PRIMARY KEY,
    book_name              TEXT          NOT NULL DEFAULT '',
    book_author            TEXT          NOT NULL DEFAULT '',
    chapter_index          INTEGER       NOT NULL DEFAULT 0,
    chapter_pos            INTEGER       NOT NULL DEFAULT 0,
    chapter_name           TEXT          NOT NULL DEFAULT '',
    book_text              TEXT          NOT NULL DEFAULT '',
    content                TEXT          NOT NULL DEFAULT ''
);

CREATE INDEX idx_bookmarks_book ON bookmarks (book_name, book_author);
