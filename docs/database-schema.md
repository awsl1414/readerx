# 数据库 Schema

> 源码位置：`app/src/main/java/io/legado/app/data/AppDatabase.kt`
> Schema 文件：`app/schemas/io.legado.app.data.AppDatabase/`

- **数据库名**：`legado.db`
- **当前版本**：75
- **ORM**：Room + KSP
- **自动迁移**：版本 43 → 75 自动迁移
- **降级迁移**：版本 1-9 降级时破坏性重建

## 实体总览

| 实体 | 主键 | 说明 |
|------|------|------|
| Book | bookUrl | 书籍 |
| BookGroup | groupId | 书籍分组 |
| BookSource | bookSourceUrl | 书源 |
| BookChapter | url + bookUrl | 章节目录 |
| ReplaceRule | id | 净化规则 |
| SearchBook | bookUrl | 搜索结果缓存 |
| SearchKeyword | word | 搜索历史 |
| Cookie | url | HTTP Cookie |
| RssSource | sourceUrl | RSS 源 |
| Bookmark | time | 书签 |
| RssArticle | origin + link | RSS 文章 |
| RssReadRecord | record | RSS 阅读记录 |
| RssStar | origin + link | RSS 收藏 |
| TxtTocRule | id | TXT 目录规则 |
| ReadRecord | deviceId + bookName | 阅读统计 |
| HttpTTS | id | HTTP TTS 引擎 |
| Cache | key | 通用缓存 |
| RuleSub | id | 规则订阅 |
| DictRule | name | 字典规则 |
| KeyboardAssist | type + key | 键盘快捷键 |
| Server | id | 服务器配置 |

## 数据库视图

| 视图 | 说明 |
|------|------|
| BookSourcePart | 书源简化视图（bookSourceUrl, bookSourceName, enabled, enabledExplore, hasLoginUrl, hasExploreUrl） |

## 核心实体详细字段

### Book（书籍）

| 字段 | 类型 | 说明 |
|------|------|------|
| bookUrl | String (PK) | 书籍 URL（唯一标识） |
| name | String | 书名 |
| author | String | 作者 |
| kind | String? | 分类 |
| coverUrl | String? | 封面 URL |
| intro | String? | 简介 |
| type | Int | 类型：0=文本, 1=音频, 2=图片, 3=文件 |
| group | Long | 分组 bitmask |
| origin | String | 书源 URL |
| originName | String | 书源名称 |
| durChapterIndex | Int | 当前章节索引 |
| durChapterPos | Int | 当前章节位置 |
| durChapterTime | Long | 当前阅读时间 |
| totalChapterNum | Int | 总章节数 |
| latestChapterTitle | String? | 最新章节标题 |
| canUpdate | Boolean | 是否可更新 |
| order | Int | 排序 |
| readConfig | ReadConfig? | 阅读配置（嵌套对象） |
| syncTime | Long | 同步时间 |

**ReadConfig 嵌套类**：存储单本书籍的阅读配置覆盖（字体大小、行距、背景等）。

### BookSource（书源）

详见 [书源配置字段文档](./book-source-fields.md)。

### BookChapter（章节）

| 字段 | 类型 | 说明 |
|------|------|------|
| url | String (PK) | 章节 URL |
| bookUrl | String (PK, FK) | 所属书籍 URL（CASCADE 删除） |
| title | String | 章节标题 |
| index | Int | 章节序号 |
| isVolume | Boolean | 是否为卷 |
| isVip | Boolean | 是否 VIP 章节 |
| isPay | Boolean | 是否已付费 |
| resourceUrl | String? | 资源 URL |
| tag | String? | 标签 |
| wordCount | String? | 字数 |

### BookGroup（书籍分组）

| 字段 | 类型 | 说明 |
|------|------|------|
| groupId | Long (PK) | 分组 ID |
| groupName | String | 分组名称 |
| order | Int | 排序 |
| enableRefresh | Boolean | 刷新时是否包含此分组 |
| show | Boolean | 是否在书架显示 |
| bookSort | Int | 分组内排序方式 |

**特殊分组 ID**：
- `-1` 全部
- `-2` 本地
- `-3` 有声书
- `-4` 无书源
- `-5` 本地无分组
- `-11` 出错

### RssSource（RSS 源）

| 字段 | 类型 | 说明 |
|------|------|------|
| sourceUrl | String (PK) | 源 URL |
| sourceName | String | 源名称 |
| sourceIcon | String? | 图标 URL |
| sourceGroup | String? | 分组 |
| enabled | Boolean | 是否启用 |
| sortUrl | String? | 分类 URL |
| singleUrl | Boolean | 是否单链接 |
| articleStyle | Int | 文章样式 |
| ruleArticles | String? | 文章列表规则 |
| ruleTitle | String? | 标题规则 |
| ruleContent | String? | 内容规则 |
| ruleDescription | String? | 描述规则 |

### HttpTTS（HTTP TTS）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (PK) | 标识 |
| name | String | TTS 名称 |
| url | String | TTS URL |
| contentType | String? | 内容类型 |
| concurrentRate | String? | 并发限制 |
| header | String? | 请求头 |
| loginUrl | String? | 登录 URL |
| loginUi | String? | 登录界面 |
| loginCheckJs | String? | 登录验证 JS |

### ReplaceRule（净化规则）

详见 [净化规则文档](./replace-rules.md)。

### Cache（缓存）

| 字段 | 类型 | 说明 |
|------|------|------|
| key | String (PK) | 缓存键 |
| value | String? | 缓存值 |
| deadline | Long | 过期时间（时间戳） |

支持自动清理过期缓存。

### Server（服务器配置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long (PK) | 标识 |
| name | String | 服务器名称 |
| type | Int | 类型 |
| config | String? | 配置（JSON，支持 WebDAV） |
| sortNumber | Int | 排序 |

## DAO 概览

| DAO | 关键操作 |
|-----|---------|
| BookDao | 按分组查询、搜索、CRUD |
| BookChapterDao | 按书籍查询章节列表、搜索章节 |
| BookGroupDao | 分组管理、获取未使用 ID |
| BookSourceDao | 搜索书源、启用/禁用、分组管理 |
| RssSourceDao | RSS 源搜索和管理 |
| BookmarkDao | 书签搜索和管理 |
| RssArticleDao | 按 RSS 源查询文章 |
| RssStarDao | RSS 收藏管理 |
| SearchBookDao | 搜索结果缓存、换源查询 |
| SearchKeywordDao | 搜索历史（按使用频率/时间排序） |
| ReplaceRuleDao | 按作用域查询启用规则 |
| ReadRecordDao | 阅读时长统计 |
| CacheDao | 缓存读写（带过期检查） |
| CookieDao | Cookie 存储、转换为 OkHttp Cookie |
| HttpTTSDao | TTS 引擎管理 |
| TxtTocRuleDao | TXT 目录规则管理 |
| DictRuleDao | 字典规则管理 |
| RuleSubDao | 规则订阅管理 |
| ServerDao | 服务器配置管理 |

## 数据关系图

```
BookSource (1) ──→ (N) Book
    │                    │
    │                    ├──→ (N) BookChapter
    │                    ├──→ (N) Bookmark
    │                    └──→ (1) ReadRecord
    │
    └──→ (N) SearchBook

BookGroup (1) ──→ (N) Book (通过 group bitmask)

RssSource (1) ──→ (N) RssArticle
    │                    │
    └──→ (N) RssReadRecord
    └──→ (N) RssStar

ReplaceRule ──→ 按作用域应用于 Book 的内容

Server ──→ WebDAV 同步配置
```
