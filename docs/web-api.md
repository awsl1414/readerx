# Web API 接口文档

> 源码位置：`app/src/main/java/io/legado/app/api/` 和 `app/src/main/java/io/legado/app/web/`

Legado 提供三种外部接口：REST API（HTTP）、WebSocket 实时通信、ContentProvider。

## 服务配置

| 配置 | 值 |
|------|-----|
| HTTP 端口 | 默认 1234 |
| WebSocket 端口 | 默认 1235 |
| 认证 | 无（仅限本地访问） |
| CORS | 已启用 |

## 返回数据格式

```json
{
  "isSuccess": true,
  "errorMsg": "",
  "data": {}
}
```

## 书籍接口

### GET /getBookshelf

获取书架所有书籍。

**返回**：`List<Book>`

### GET /getChapterList

获取书籍章节列表。

**参数**：
- `url` — 书籍 URL

**返回**：`List<BookChapter>`

### GET /getBookContent

获取章节正文内容。

**参数**：
- `url` — 书籍 URL
- `index` — 章节索引

**返回**：正文内容字符串

### GET /refreshToc

刷新书籍目录。

**参数**：
- `url` — 书籍 URL

### GET /cover

获取书籍封面图片。

**参数**：
- `url` — 封面地址

**返回**：图片数据（Bitmap stream）

### GET /image

获取正文中的图片。

**参数**：
- `url` — 图片地址
- `origin` — 书源 URL（可选）

**返回**：图片数据

### GET /getReadConfig

获取 Web 阅读配置。

### POST /saveBook

保存书籍到书架。

**Body**：`Book` JSON

### POST /deleteBook

从书架删除书籍。

**Body**：`{"url": "bookUrl", "name": "bookName"}`

### POST /saveBookProgress

保存阅读进度。

**Body**：`BookProgress` JSON

### POST /addLocalBook

添加本地书籍。

### POST /saveReadConfig / POST /getReadConfig

保存/获取 Web 阅读配置。

---

## 书源接口

### GET /getBookSources

获取所有书源。

**返回**：`List<BookSource>`

### GET /getBookSource

获取单个书源。

**参数**：
- `url` — 书源 URL

**返回**：`BookSource`

### POST /saveBookSource

保存单个书源。

**Body**：`BookSource` JSON

### POST /saveBookSources

批量保存书源。

**Body**：`List<BookSource>` JSON

### POST /deleteBookSources

删除书源。

**Body**：`{"bookSourceUrls": ["url1", "url2"]}`

---

## RSS 源接口

### GET /getRssSources

获取所有 RSS 源。

### GET /getRssSource

获取单个 RSS 源。

**参数**：
- `url` — RSS 源 URL

### POST /saveRssSource

保存单个 RSS 源。

### POST /saveRssSources

批量保存 RSS 源。

### POST /deleteRssSources

删除 RSS 源。

---

## 净化规则接口

### GET /getReplaceRules

获取所有净化规则。

### POST /saveReplaceRule

保存净化规则。

### POST /deleteReplaceRule

删除净化规则。

### POST /testReplaceRule

测试净化规则效果。

---

## WebSocket 接口

### ws://host:port/bookSourceDebug

书源调试。实时发送规则并查看解析结果。

### ws://host:port/rssSourceDebug

RSS 源调试。

### ws://host:port/searchBook

在线搜索。实时推送搜索进度和结果。

---

## ContentProvider 接口

> 源码位置：`app/src/main/java/io/legado/app/api/ReaderProvider.kt`

**Authority**：`{applicationId}.readerProvider`
**权限**：`io.legado.READ_WRITE`

### URI 映射

| URI | 操作 | 说明 |
|-----|------|------|
| `bookSource/insert` | insert | 保存书源 |
| `bookSources/insert` | insert | 批量保存书源 |
| `bookSources/delete` | delete | 删除书源 |
| `bookSource/query` | query | 查询单个书源 |
| `bookSources/query` | query | 查询所有书源 |
| `rssSource/insert` | insert | 保存 RSS 源 |
| `rssSources/insert` | insert | 批量保存 RSS 源 |
| `rssSources/delete` | delete | 删除 RSS 源 |
| `rssSource/query` | query | 查询单个 RSS 源 |
| `rssSources/query` | query | 查询所有 RSS 源 |
| `book/insert` | insert | 保存书籍 |
| `books/query` | query | 查询书架 |
| `book/refreshToc/query` | query | 刷新目录 |
| `book/chapter/query` | query | 查询章节列表 |
| `book/content/query` | query | 查询章节内容 |
| `book/cover/query` | query | 获取封面 |

### 使用方式

```kotlin
val uri = Uri.parse("content://${applicationId}.readerProvider/books/query")
val cursor = contentResolver.query(uri, null, null, null, null)
// cursor 返回 MatrixCursor，数据以 JSON 格式存储
```

---

## Web 服务器实现

> 源码位置：`app/src/main/java/io/legado/app/web/HttpServer.kt`

基于 NanoHTTPD 实现，特点：

- 静态资源服务（Web 管理界面）
- CORS 跨域支持
- Bitmap 图片流式响应
- 大数据集分块响应
- 全局异常处理

### 请求处理流程

```
HTTP 请求
    │
    ├── OPTIONS → CORS 预检处理
    │
    ├── POST → 解析 JSON body → 路由到对应 Controller
    │
    ├── GET → 解析参数 → 路由到对应 Controller
    │
    └── 静态资源 → AssetsWeb 提供 Web UI 文件
```
