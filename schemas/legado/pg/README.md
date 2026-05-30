# Legado 数据库 PostgreSQL 17+ Schema

从 Legado（阅读）Android 应用的 Room 数据库（版本 75）完整转换为 PostgreSQL 17+ DDL。

## 源数据库信息

| 属性 | 值 |
|---|---|
| 数据库名 | `legado.db` |
| Room 版本 | 75 |
| 实体数 | 21 张表 |
| 视图数 | 1 个 |
| DAO 数 | 21 个 |
| 源码包 | `io.legado.app.data` |

## 文件结构

```
legado/
├── 00_extensions.sql    # 扩展与自定义类型（枚举）
├── 01_tables_core.sql   # 核心表（books, book_groups, book_sources, chapters）
├── 02_tables_search.sql # 搜索相关（search_books, search_keywords, bookmarks）
├── 03_tables_rss.sql    # RSS 相关（rss_sources, rss_articles, rss_read_records, rss_stars）
├── 04_tables_config.sql # 配置与辅助表（10 张）
├── 05_views.sql         # 视图（book_sources_part）
└── 06_comments.sql      # 表和列注释
```

**执行顺序**：按文件编号 `00` → `06` 依次执行。

## 类型映射规则

| Room (Kotlin/SQLite) | PostgreSQL 17+ | 说明 |
|---|---|---|
| `String` | `TEXT` | 非空字符串 |
| `String?` | `TEXT` (nullable) | 可空字符串 |
| `Int` | `INTEGER` | 32位整数 |
| `Long` | `BIGINT` | 64位整数 |
| `Boolean` | `BOOLEAN` | 布尔值 |
| `@TypeConverters` (GSON → String) | `JSONB` | JSON 序列化对象 |
| `enum class` | `CREATE TYPE ... AS ENUM` | 枚举类型 |
| `@PrimaryKey(autoGenerate = true)` | `GENERATED ALWAYS AS IDENTITY` | 自增主键 |

## 数据库表总览

### 核心表

| 表名 | 实体类 | 主键 | 说明 |
|---|---|---|---|
| `books` | `Book` | `book_url` (TEXT) | 书籍 |
| `book_groups` | `BookGroup` | `group_id` (BIGINT) | 书籍分组 |
| `book_sources` | `BookSource` | `book_source_url` (TEXT) | 书源 |
| `chapters` | `BookChapter` | `(url, book_url)` 复合 | 章节（FK → books） |

### 搜索相关

| 表名 | 实体类 | 主键 | 说明 |
|---|---|---|---|
| `search_books` | `SearchBook` | `book_url` (TEXT) | 搜索结果（FK → book_sources） |
| `search_keywords` | `SearchKeyword` | `word` (TEXT) | 搜索关键词 |
| `bookmarks` | `Bookmark` | `time` (BIGINT) | 书签 |

### RSS 相关

| 表名 | 实体类 | 主键 | 说明 |
|---|---|---|---|
| `rss_sources` | `RssSource` | `source_url` (TEXT) | RSS源 |
| `rss_articles` | `RssArticle` | `(origin, link)` 复合 | RSS文章 |
| `rss_read_records` | `RssReadRecord` | `record` (TEXT) | RSS阅读记录 |
| `rss_stars` | `RssStar` | `(origin, link)` 复合 | RSS收藏 |

### 配置与辅助

| 表名 | 实体类 | 主键 | 说明 |
|---|---|---|---|
| `replace_rules` | `ReplaceRule` | `id` (IDENTITY) | 替换规则 |
| `cookies` | `Cookie` | `url` (TEXT) | Cookie |
| `txt_toc_rules` | `TxtTocRule` | `id` (BIGINT) | TXT目录规则 |
| `read_record` | `ReadRecord` | `(device_id, book_name)` 复合 | 阅读记录 |
| `http_tts` | `HttpTTS` | `id` (BIGINT) | HTTP TTS |
| `caches` | `Cache` | `key` (TEXT) | 缓存 |
| `rule_subs` | `RuleSub` | `id` (BIGINT) | 规则订阅 |
| `dict_rules` | `DictRule` | `name` (TEXT) | 字典规则 |
| `keyboard_assists` | `KeyboardAssist` | `(type, key)` 复合 | 键盘辅助 |
| `servers` | `Server` | `id` (BIGINT) | 服务器 |

### 视图

| 视图名 | 源表 | 说明 |
|---|---|---|
| `book_sources_part` | `book_sources` | 书源精简视图，含 `has_login_url`、`has_explore_url` 计算字段 |

## 外键关系

```
books.book_url ←──── chapters.book_url (ON DELETE CASCADE)
book_sources.book_source_url ←──── search_books.origin (ON DELETE CASCADE)
```

## JSONB 列详情

以下列在 Room 中通过 `@TypeConverters` + GSON 序列化为文本，在 PG 中映射为 `JSONB`：

| 表 | 列 | 对应 Kotlin 类 |
|---|---|---|
| `books` | `read_config` | `Book.ReadConfig` |
| `book_sources` | `rule_explore` | `ExploreRule` |
| `book_sources` | `rule_search` | `SearchRule` |
| `book_sources` | `rule_book_info` | `BookInfoRule` |
| `book_sources` | `rule_toc` | `TocRule` |
| `book_sources` | `rule_content` | `ContentRule` |
| `book_sources` | `rule_review` | `ReviewRule` |
| `servers` | `config` | `Server.WebDavConfig` 等 |

## 快速执行

```bash
# 创建数据库
createdb legado

# 按序执行
for f in 00_extensions.sql 01_tables_core.sql 02_tables_search.sql \
         03_tables_rss.sql 04_tables_config.sql 05_views.sql 06_comments.sql; do
    psql -d legado -f "$f"
done
```

## 注意事项

1. **保留字冲突**：`order`、`group`、`end`、`index` 等是 SQL 保留字，已用双引号包裹
2. **复合主键**：5 张表使用复合主键（`chapters`, `read_record`, `rss_articles`, `rss_stars`, `keyboard_assists`）
3. **自增主键**：仅 `replace_rules.id` 使用 `GENERATED ALWAYS AS IDENTITY`（Room 中 `@PrimaryKey(autoGenerate = true)`）；其余 `id` 列由应用层生成（通常为时间戳）
4. **默认值**：所有 Room `@ColumnInfo(defaultValue)` 已转换为 PG `DEFAULT`
5. **时间戳**：Room 中时间戳为 `Long`（epoch 毫秒），PG 中保持 `BIGINT`，可通过 `to_timestamp(col/1000)` 转换
