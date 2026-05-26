# Step 3 分析：persistence 持久层

> 原项目参考：Legado Android (`/Users/logan/Desktop/workspaces/other/legado`)
> 分析日期：2026-05-26

## Legado 原版持久层架构

### 技术栈

- **ORM**: Android Room + KSP
- **数据库**: SQLite (`legado.db`)，版本 75
- **缓存**: 三层（内存 LRU 50MB + Room Cache 表 + ACache 文件缓存）
- **配置**: SharedPreferences（60+ 配置项，分布在 3 个文件）
- **文件**: Android externalFilesDir（章节内容、图片、字体、背景）
- **加密**: AES 加密存储登录信息

### 实体（21 个）

| 类别 | 实体 | 主键 | 说明 |
|------|------|------|------|
| 核心阅读 | Book | bookUrl | 书籍 |
| 核心阅读 | BookChapter | [url+bookUrl] | 章节 |
| 核心阅读 | BookSource | bookSourceUrl | 书源 |
| 核心阅读 | BookGroup | groupId | 分组 |
| 核心阅读 | Bookmark | time | 书签 |
| 搜索 | SearchBook | bookUrl | 搜索结果缓存 |
| 搜索 | SearchKeyword | word | 搜索历史 |
| RSS | RssSource | sourceUrl | RSS 源 |
| RSS | RssArticle | [origin+link] | RSS 文章 |
| RSS | RssReadRecord | record | RSS 阅读记录 |
| RSS | RssStar | [origin+link] | RSS 收藏 |
| 规则 | ReplaceRule | ++id | 净化规则 |
| 规则 | TxtTocRule | ++id | TXT 目录规则 |
| 规则 | DictRule | name | 字典规则 |
| 规则 | RuleSub | ++id | 规则订阅 |
| 配置 | Cookie | url | HTTP Cookie |
| 配置 | HttpTTS | ++id | HTTP TTS 引擎 |
| 配置 | KeyboardAssist | [type+key] | 键盘快捷键 |
| 配置 | Server | ++id | 服务器（WebDAV） |
| 统计 | ReadRecord | [deviceId+bookName] | 阅读时长统计 |
| 缓存 | Cache | key | 通用 KV 缓存 |

### 关键设计模式

1. **全局单例**: `val appDb by lazy { Room.databaseBuilder(...) }`
2. **DAO**: 19 个 `@Dao` 接口，Room 注解 SQL
3. **Bitmask 分组**: `Book.group` 用 `Long` 位掩码，最多 64 组
4. **TypeConverter**: 嵌套规则对象序列化为 JSON 字符串列
5. **DatabaseView**: `BookSourcePart` 轻量视图用于列表 UI
6. **三层缓存**: 内存 LRU 50MB → Room Cache → ACache 文件
7. **文件系统缓存**: 章节内容 `<index>-<titleMD5>.nb`，图片 `<srcMD5>.<suffix>`
8. **大变量文件存储**: `RuleBigDataHelp` 用 MD5 路径存储大型规则变量

---

## 改进决策

### 改进 1：存储引擎 — IndexedDB + OPFS（替代 SQLite + 文件系统）

| 维度 | Legado | ReaderX |
|------|--------|---------|
| 结构化存储 | Room + SQLite | Dexie + IndexedDB |
| 文件存储 | Android externalFilesDir | OPFS（Origin Private File System） |
| 查询语言 | SQL | Dexie fluent API |
| 异步模型 | Room 协程 | Promise/async |

**原因**: Web 平台没有 SQLite 和原生文件系统。IndexedDB 是浏览器结构化存储标准，OPFS 是高性能文件存储标准。

### 改进 2：BookSource 存储 — 对象直存 + 选择性索引（替代全列展开）

**Legado**: BookSource 24+ 字段全部作为独立列，6 个嵌套规则对象用 TypeConverter 序列化为 JSON 字符串列。

**ReaderX**: 完整 BookSource 对象通过 IndexedDB 结构化克隆直接存储。仅对查询关键字段建立索引：

```
索引字段: bookSourceUrl(PK), bookSourceName, *bookSourceGroup, enabled, enabledExplore, bookSourceType, customOrder, lastUpdateTime
```

**优势**:
- persistence 不需要依赖 rule-engine 的类型定义（解耦）
- Schema 变更只需调整索引，不需要迁移数据列
- 减少样板代码（无 TypeConverter）
- IndexedDB 结构化克隆比 JSON 序列化更高效

### 改进 3：分组策略 — 数组 + 多值索引（替代 Bitmask）

**Legado**: `Book.group: Long` 位掩码，`book.group and (1L shl groupId) != 0L` 判断归属。

**ReaderX**: `Book.groupIds: number[]` 数组，Dexie `*groupIds` 多值索引。

```typescript
// 存储
{ groupIds: [1, 3, 5] }

// 查询分组 3 下的所有书籍
db.books.where("groupIds").equals(3).toArray()
```

**优势**: 直观可读、无分组数量限制、调试友好、Dexie 原生支持。

### 改进 4：无全局单例 — 工厂模式

**Legado**: `val appDb by lazy { ... }` 全局可变单例。

**ReaderX**: `createDB()` 工厂函数 + 默认导出 `db` 实例。

**原因**: CLAUDE.md 禁止全局可变单例。测试时 `createDB("test")` 创建隔离实例。

### 改进 5：简化缓存 — 双层（替代三层）

**Legado**: 内存 LRU 50MB + Room Cache 表 + ACache 文件缓存。

**ReaderX**: IndexedDB Cache 表（结构化缓存）+ OPFS（二进制缓存）。

**原因**: 浏览器内存管理不同，不需要手动 LRU。IndexedDB 自带缓存策略。

### 改进 6：Repository 模式（替代 DAO）

**Legado**: 19 个 `@Dao` 接口 + 原始 SQL。

**ReaderX**: Repository 类封装 Dexie 操作，返回 Discriminated Union 结果。

**原因**: Dexie 提供流畅查询 API（不需要 SQL），Repository 封装业务逻辑（缓存过期、频率排序），返回 `{ ok: true; data } | { ok: false; error: string }` 符合 CLAUDE.md 约定。

### 改进 7：无 DatabaseView — 查询方法

**Legado**: `@DatabaseView("SELECT bookSourceUrl, bookSourceName, ...")` 创建视图。

**ReaderX**: Repository 查询方法，Dexie 的 `.keys()` 或选择返回字段实现轻量查询。

**原因**: IndexedDB 不支持视图，但 Dexie 可以只返回需要的字段。

---

## 舍弃项（不在 MVP 实现）

| 实体/功能 | 舍弃原因 | 何时需要 |
|-----------|----------|----------|
| RssSource, RssArticle, RssReadRecord, RssStar | RSS 不是 MVP 功能 | Step 8+ RSS 需求 |
| SearchBook | 搜索结果用 TanStack Query 缓存 | 如需持久化搜索结果 |
| HttpTTS | TTS 不是 MVP 功能 | TTS 需求 |
| TxtTocRule | TXT 文件支持不是 MVP | 本地书籍支持 |
| DictRule | 字典不是 MVP | 字典功能 |
| KeyboardAssist | Android 专用，Web 不适用 | 不实现 |
| Server | WebDAV 同步是 Step 7 | Step 7 |
| ReadRecord | 阅读统计不是 MVP | 阅读统计需求 |
| RuleSub | 规则订阅不是 MVP | 规则订阅功能 |
| SharedPreferences 60+ 配置 | Web 不适用 | Zustand persist / localStorage |
| 内存 LRU 缓存 | 浏览器内存管理不同 | 不实现 |
| AES 加密登录信息 | MVP 不处理敏感数据 | 安全增强阶段 |
| 18+ URL 过滤 | MVP 不实现内容过滤 | 内容安全需求 |
| 文件系统缓存 | 用 OPFS 替代 | 已在改进方案中 |
| RuleBigDataHelp 大变量文件 | MVP 规则变量存 Cache 表 | 变量过大时按需 |

---

## ReaderX MVP 实体设计（9 个）

| 实体 | 主键 | 索引 | 说明 |
|------|------|------|------|
| BookSourceRecord | bookSourceUrl | bookSourceName, \*bookSourceGroup, enabled, enabledExplore, bookSourceType, customOrder, lastUpdateTime | 书源 |
| Book | bookUrl | name, author, \*groupIds, origin, durChapterTime, order | 书架 |
| BookChapter | [url+bookUrl] | bookUrl, [bookUrl+index] | 章节 |
| BookGroup | groupId | groupName, order | 分组 |
| Bookmark | time | [bookName+bookAuthor], bookUrl | 书签 |
| SearchKeyword | word | usage, lastUseTime | 搜索历史 |
| Cache | key | deadline | 通用缓存 |
| ReplaceRule | ++id | name, group, order, isEnabled | 净化规则 |
| Cookie | url | — | HTTP Cookie |

---

## 文件结构

```
packages/persistence/src/
├── types.ts                      # 全部存储类型定义
├── database.ts                   # Dexie 数据库类（替换 indexeddb.ts）
├── book-source-repo.ts           # BookSource CRUD + 导入导出
├── book-repo.ts                  # Book CRUD + 分组查询 + 进度
├── book-chapter-repo.ts          # BookChapter CRUD
├── book-group-repo.ts            # BookGroup CRUD + 默认种子
├── bookmark-repo.ts              # Bookmark CRUD
├── search-keyword-repo.ts        # SearchKeyword CRUD + 频率
├── cache-repo.ts                 # Cache CRUD + 过期清理
├── replace-rule-repo.ts          # ReplaceRule CRUD + 作用域
├── cookie-repo.ts                # Cookie CRUD
├── opfs.ts                       # OPFS 文件存储
└── index.ts                      # 统一导出

packages/persistence/__tests__/
├── database.test.ts
├── book-source-repo.test.ts
├── book-repo.test.ts
├── book-chapter-repo.test.ts
├── book-group-repo.test.ts
├── bookmark-repo.test.ts
├── search-keyword-repo.test.ts
├── cache-repo.test.ts
├── replace-rule-repo.test.ts
├── cookie-repo.test.ts
└── opfs.test.ts
```
