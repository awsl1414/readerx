# 书源规则解析引擎

> 源码位置：`app/src/main/java/io/legado/app/model/analyzeRule/`

规则解析引擎是 Legado 的核心，负责将书源中定义的规则字符串解析并提取网页/JSON 内容。

## 引擎架构

```
┌─────────────────────────────────────────────────────────┐
│                    AnalyzeRule（主入口）                   │
│                                                         │
│  setContent(content) ─▶ 设置待解析内容                    │
│  getString(rule)    ─▶ 按规则提取字符串                    │
│  getStringList(rule) ─▶ 按规则提取字符串列表               │
│  getElements(rule)  ─▶ 提取元素列表                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  RuleAnalyzer │  │ splitSourceRule│ │  SourceRule   │  │
│  │  规则字符串拆分│  │  规则分段解析  │  │  单条规则执行  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ JSoup    │  │ XPath    │  │ JSONPath │  │ Regex  │  │
│  │ CSS选择器 │  │ 路径表达式│  │ JSON路径  │  │ 正则   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           JavaScript 引擎（Rhino）                 │   │
│  │     提供 JsExtensions 上下文对象                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 规则模式（Mode）

引擎支持 5 种解析模式，可通过前缀指定或自动检测：

| 模式 | 前缀标识 | 说明 | 适用内容 |
|------|---------|------|---------|
| Default | 无前缀 / `@CSS:` | JSoup CSS 选择器 | HTML |
| XPath | `/` 开头或 `@XPath:` | XPath 表达式 | HTML/XML |
| Json | `$.` 或 `$[` 开头 / `@Json:` | JSONPath 表达式 | JSON |
| Js | `@js:` 或 `<js></js>` | JavaScript 脚本 | 任意 |
| Regex | `##` 分隔后 | 正则表达式 | 任意 |

### 自动检测逻辑

- 内容以 `{` 或 `[` 开头 → 识别为 JSON
- 规则以 `//` 或 `/html` 或 `/` 开头 → 识别为 XPath
- 规则以 `$.` 或 `$[` 开头 → 识别为 JSONPath
- 其他 → 默认 JSoup CSS 选择器

## 规则语法

### 基本运算符

| 运算符 | 含义 | 说明 |
|--------|------|------|
| `&&` | AND | 依次执行所有规则，拼接结果 |
| `\|\|` | OR | 依次执行，返回首个非空结果 |
| `%%` | ZIP | 交错合并多个列表结果 |
| `##` | 正则替换 | 分隔规则与正则，格式：`规则##正则##替换` |
| `@` | 属性/前缀 | 提取元素属性，如 `@href`, `@src`, `@text` |

### JavaScript 嵌入

```
@js: JavaScript 代码
<js>JavaScript 代码</js>
{{JavaScript 表达式}}     ← 内联求值
```

### 变量操作

```
@put:{key: value}         ← 存储变量
@get:{key}                ← 读取变量
```

### 规则组合示例

```
// CSS 选择器 + 属性提取
div.book-info a@href

// 多规则 AND 拼接
class.name&&class.author

// 带正则替换
class.title##^【(.+)】$##$1

// 嵌入 JS
@js:result.getElementsByAttribute("href")

// JSONPath
$.data.books[*].title

// XPath
//div[@class="book"]/a/@href
```

## CSS 选择器详解（JSoup）

> 源码位置：`AnalyzeByJSoup.kt`

### 属性提取

| 语法 | 说明 |
|------|------|
| `@href` | 链接地址 |
| `@src` | 图片地址 |
| `@text` | 所有文本内容 |
| `@textNodes` | 仅文本节点 |
| `@ownText` | 直接子文本（不含嵌套） |
| `@html` | 内部 HTML |
| `@all` | 完整外部 HTML |
| `@attrName` | 任意属性值 |

### 索引选择

**旧语法**：`tag.div.-1:10:2` 或 `tag.div!0:3`

**新语法**：`tag.div[-1, 3:-2:-10, 2]`

- 正数从前往后，负数从后往前
- 格式：`[开始:结束:步长]`

### 常用选择器

```css
div.content                    /* 标签 */
.class-name                    /* 类名 */
#id-name                       /* ID */
div.book > a                   /* 子元素 */
div.book a                     /* 后代 */
[attr=value]                   /* 属性选择器 */
tag:contains(文本)             /* 包含文本 */
tag:eq(0)                      /* 索引选择 */
```

## JSONPath 详解

> 源码位置：`AnalyzeByJSonPath.kt`

```jsonpath
$.data.books[*]                /* 所有书籍 */
$.data.books[0].title          /* 第一本书标题 */
$.data.books[?(@.type==1)]     /* 条件过滤 */
$..title                       /* 递归查找 */
```

### 嵌套规则

在 JSONPath 中嵌入其他规则：`{$.field}` — 先执行 JSONPath，再用结果作为新内容。

## XPath 详解

> 源码位置：`AnalyzeByXPath.kt`

```xpath
//div[@class="content"]        /* 按类名 */
//a/@href                      /* 提取属性 */
//div/text()                   /* 提取文本 */
//div[contains(@class,"book")] /* 包含匹配 */
```

## 正则替换

> 源码位置：`AnalyzeByRegex.kt`

在规则末尾使用 `##` 分隔：

```
规则##正则表达式##替换文本
```

- `$1`, `$2`... 引用捕获组
- 可多次替换：`规则##正则1##替换1##正则2##替换2`

## URL 解析器（AnalyzeUrl）

> 源码位置：`AnalyzeUrl.kt`

URL 解析器处理书源中的 URL 规则字符串，支持变量替换、分页、请求配置。

### URL 规则语法

```
基础URL,@js:JS处理,{{变量}},<page>页码
```

### URL 选项（JSON 格式）

URL 可携带选项参数：

```json
{
  "method": "POST",           // 请求方法
  "charset": "gbk",           // 编码
  "headers": {"key": "val"},  // 请求头
  "body": "请求体",            // POST body
  "webView": true,            // 使用 WebView 加载
  "webJs": "JS代码",          // WebView 中执行的 JS
  "retry": 3,                 // 重试次数
  "type": "utf-8"             // 内容类型
}
```

### 处理流程

```
原始 URL 字符串
    │
    ├── 1. analyzeJs()          执行嵌入的 JavaScript
    ├── 2. replaceKeyPageJs()   替换 {{js}} 和 <page> 占位符
    ├── 3. analyzeUrl()         解析 URL 选项和参数
    │
    ▼
最终 URL + 请求配置
```

### 搜索 URL 示例

```
https://example.com/search?q={{key}}&page=<page>
```

- `{{key}}` → 搜索关键词
- `<page>` → 当前页码

## 书源处理流程（WebBook）

> 源码位置：`app/src/main/java/io/legado/app/model/webBook/`

### 搜索流程

```
WebBook.searchBookAwait(source, key, page)
    │
    ▼
BookList.analyzeBookList()
    │
    ├── 解析 searchUrl → AnalyzeUrl 获取实际 URL
    ├── 发送请求获取响应内容
    ├── 设置 AnalyzeRule 内容
    ├── 用 ruleSearch.bookList 提取书籍列表元素
    ├── 对每个元素用 ruleSearch.name/author/... 提取字段
    │
    ▼
List<SearchBook>
```

### 书籍详情流程

```
WebBook.getBookInfoAwait(source, book)
    │
    ▼
BookInfo.analyzeBookInfo()
    │
    ├── 用 ruleBookInfo.init 执行初始化规则
    ├── 提取 name/author/intro/coverUrl/tocUrl 等字段
    │
    ▼
Book 实体（更新详情）
```

### 目录获取流程

```
WebBook.getChapterListAwait(source, book)
    │
    ▼
BookChapterList.analyzeChapterList()
    │
    ├── 用 ruleToc.chapterList 提取章节列表元素
    ├── 对每个元素提取 chapterName/chapterUrl
    ├── 支持分页目录（nextTocUrl）
    ├── 执行 ruleToc.preUpdateJs 预处理
    │
    ▼
List<BookChapter>
```

### 正文获取流程

```
WebBook.getContentAwait(source, book, chapter)
    │
    ▼
BookContent.analyzeContent()
    │
    ├── 用 ruleContent.content 提取正文
    ├── 支持多页正文（nextContentUrl）
    ├── 执行 ruleContent.replaceRegex 净化替换
    ├── 执行 ruleContent.webJs WebView 处理
    ├── 执行 ruleContent.imageDecodeJs 图片解密
    │
    ▼
正文内容字符串
```

## 书源类型

| 类型值 | 含义 |
|--------|------|
| 0 | 文本小说 |
| 1 | 有声书（音频） |
| 2 | 图片（漫画） |
| 3 | 文件下载 |

## JavaScript 扩展（JsExtensions）

JS 规则执行时提供 `JsExtensions` 上下文对象，为脚本提供与 App 交互的能力（如网络请求、缓存操作、UI 操作等）。

## 规则调试

通过 WebSocket 端点进行实时调试：

- `ws://host:port/bookSourceDebug` — 书源调试
- `ws://host:port/rssSourceDebug` — RSS 源调试
- `ws://host:port/searchBook` — 搜索调试

Web 管理界面（`modules/web`）和 App 内置的书源编辑器都支持规则调试功能。
