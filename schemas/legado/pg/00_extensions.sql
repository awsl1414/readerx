-- =============================================================================
-- Legado 数据库 - 扩展与自定义类型
-- 源码: io.legado.app.data.AppDatabase (version 75)
-- 目标: PostgreSQL 17+
-- =============================================================================

-- 如果需要 UUID 支持（可选）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 自定义枚举类型
-- ---------------------------------------------------------------------------

-- 服务器类型
-- 源码: io.legado.app.data.entities.Server.TYPE
CREATE TYPE server_type_enum AS ENUM (
    'WEBDAV'
);

-- 书源类型注释（不映射为枚举，保留 INTEGER）：
--   0 = 文本, 1 = 音频, 2 = 图片, 3 = 文件(下载类)
-- 源码: io.legado.app.constant.BookSourceType

-- 书籍类型注释（不映射为枚举，保留 INTEGER）：
--   0 = text, 1 = audio, 2 = image, 3 = epub, 4 = pdf, 5 = mobi, ...
-- 源码: io.legado.app.constant.BookType
