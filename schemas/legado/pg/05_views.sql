-- =============================================================================
-- Legado 数据库 - 视图
-- 源码: io.legado.app.data.entities.BookSourcePart
-- 目标: PostgreSQL 17+
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. 书源精简视图 book_sources_part
-- 源码: @DatabaseView 注解
-- 用途: 列表展示场景，仅包含书源的关键字段和计算字段
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW book_sources_part AS
SELECT
    book_source_url,
    book_source_name,
    book_source_group,
    custom_order,
    enabled,
    enabled_explore,
    (login_url IS NOT NULL AND TRIM(login_url) <> '') AS has_login_url,
    last_update_time,
    respond_time,
    weight,
    (explore_url IS NOT NULL AND TRIM(explore_url) <> '') AS has_explore_url
FROM book_sources;
