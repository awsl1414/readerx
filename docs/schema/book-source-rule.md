# ReaderX 书源 v1

> Web-first，不兼容 Legado

书源描述了一个网站的内容结构——如何搜索书籍、浏览分类、获取详情、提取目录、读取正文。一个文件 = 一个书源。

## 与其他规则的关系

| 规则 | 职责 | 关系 |
|---|---|---|
| 书源（本文件） | 描述网站内容结构 | 核心规则 |
| 净化规则（replace-rule） | 跨书源全局文本替换 | 按 `scope` 匹配书源 |
| 字典规则（dict-rule） | 词典查询 | 独立于书源体系 |
| TXT 目录规则 | 本地 TXT 章节识别 | 不依赖书源 |

## 顶层字段

### 基础信息

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|---|---|---|---|---|
| `$schema` | string | ✅ | — | `"readerx/book-source-rule/v1"` |
| `id` | string | ✅ | — | 唯一标识，推荐使用源站 origin |
| `name` | string | ✅ | — | 显示名称 |
| `description` | string | — | `""` | 书源说明 / 使用提示 |
| `type` | `"novel"` \| `"audio"` \| `"comic"` \| `"file"` | ✅ | `"novel"` | 内容类型 |
| `tags` | string[] | — | `[]` | 标签，用于 UI 筛选 |
| `author` | string | — | `""` | 书源制作者 |
| `version` | integer | — | `1` | 书源版本号 |

### 网络

| 字段 | 类型 | 必须 | 说明 |
|---|---|---|---|
| `baseUrl` | string | ✅ | 基础 URL，所有相对路径以此为 origin |
| `urlPattern` | string | — | 书籍详情页 URL 匹配正则，用于粘贴 URL 时自动匹配书源 |
| `headers` | `Record<string, string>` | — | 自定义请求头 |
| `loginUrl` | string | — | 登录入口地址 |

### 开关 / 排序

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | 是否启用 |
| `weight` | integer | `50` | 智能权重 0-100，越大越优先 |
| `order` | integer | `0` | 手动排序序号 |
| `rateLimit` | integer | `0` | 请求限速（毫秒），0 = 不限速 |

## 五大规则模块

每个模块包含：
- **请求配置**：`method` / `body` / `charset` / `headers` / `responseType`
- **分页控制**：`nextUrl`（仅 toc / content）
- **提取规则**：`rules`（内部只包含 Rule 类型的字段）

### 请求配置（各模块共享）

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `method` | `"GET"` \| `"POST"` | `"GET"` | HTTP 方法 |
| `body` | string | — | POST body 模板 |
| `charset` | string | — | 非 UTF-8 时指定编码，如 `"gbk"` |
| `headers` | `Record<string, string>` | — | 覆盖书源级 headers |
| `responseType` | `"html"` \| `"json"` \| `"xml"` \| `"text"` | — | 不填时引擎自动推断 |

### search — 搜索模块

额外字段：
| 字段 | 类型 | 必须 | 说明 |
|---|---|---|---|
| `url` | string | ✅ | URL 模板。`{{key}}` = 搜索关键词, `{{page}}` = 页码 |
| `checkKeyWord` | string | — | 校验关键词（健康度检测用） |

提取规则字段：`list` ✅ `name` ✅ `url` ✅ `author` `cover` `intro` `kind` `lastChapter` `wordCount`

### explore — 发现模块

额外字段：
| 字段 | 类型 | 必须 | 说明 |
|---|---|---|---|
| `categories` | `{ title, url? }[]` | ✅ | 分类列表。无 url = UI 分组标题 |

提取规则同 search。

### bookInfo — 书籍详情模块

URL 由上游 search 传入，无需声明 `url`。

额外字段：
| 字段 | 类型 | 说明 |
|---|---|---|
| `init` | Rule | 预处理规则（反爬、解密等） |

提取规则字段：`name` `author` `cover` `intro` `kind` `lastChapter` `wordCount` `tocUrl`

### toc — 目录模块

URL 由 `bookInfo.tocUrl` 或详情页 URL 传入。

额外字段：
| 字段 | 类型 | 说明 |
|---|---|---|
| `nextUrl` | Rule | 下一页目录 URL（分页目录用） |

提取规则字段：`list` ✅（支持 `reverse: true`）`name` ✅ `url` ✅ `isVip` `isVolume` `updateTime`

### content — 正文模块

URL 由 toc 章节链接传入。

额外字段：
| 字段 | 类型 | 说明 |
|---|---|---|
| `nextUrl` | Rule | 下一页 URL（多页章节用） |
| `replaceRegex` | `{ pattern, with }[]` | 正文净化（模块级，独立于 Rule） |

提取规则字段：`text` ✅

## Rule 类型

一条规则 = **提取 → 变换**的管道。三种写法：

### ① 简写（string）

根据内容自动推断类型：

| 模式 | 推断为 |
|---|---|
| `"$..."` | jsonpath（`$` 开头） |
| `"//..."` | xpath（`//` 开头） |
| `".foo"` / `"#bar"` | css（`.` 或 `#` 开头） |
| `"@js:..."` | js（`@js:` 开头） |
| `"...{{...}}..."` | template（包含 `{{`） |

### ② 结构化（RuleObject）

```json
{
  "css": ".book-name",
  "attr": "text",
  "separator": ",",
  "reverse": false,
  "transform": [
    { "replace": { "pattern": "旧", "with": "新" } },
    { "trim": true }
  ]
}
```

### ③ 管道（RuleStep[]）

```json
[
  { "jsonpath": "$.data" },
  { "replace": { "pattern": "旧", "with": "" } },
  { "trim": true }
]
```

### 提取方式（六选一）

| 字段 | 数据来源 | 说明 |
|---|---|---|
| `jsonpath` | HTTP 响应 | JSONPath 查询表达式 |
| `css` | HTTP 响应 | CSS 选择器 |
| `xpath` | HTTP 响应 | XPath 查询表达式 |
| `regex` | HTTP 响应 | 正则表达式匹配 |
| `template` | 上下文 | 模板字符串（不读响应，纯构造） |
| `js` | 响应 + 上下文 | JavaScript 函数体（沙箱执行） |

> **关键区分**：`jsonpath`/`css`/`xpath`/`regex` 从响应提取；`template` 从上下文构造；`js` 万能但最后手段。

### attr 属性

从 DOM 元素取值（仅 css/xpath 有效，默认 `"text"`）：

| 值 | 说明 |
|---|---|
| `"text"` | 内联文本 |
| `"html"` | innerHTML |
| `"href"` | 链接地址 |
| `"src"` | 图片/资源地址 |
| `"content"` | meta 标签 content |
| `"value"` | 表单值 |
| 其他 | 取对应 HTML 属性 |

### 多选择器合并

提取器值支持 `string[]`，结果用 `separator` 连接（默认 `","`）：

```json
{
  "xpath": [
    "//meta[@property='og:novel:tags']/@content",
    "//meta[@property='og:novel:status']/@content"
  ],
  "separator": ","
}
```

### transform 变换链

#### 文本级变换

| 操作 | 格式 | 说明 |
|---|---|---|
| replace | `{ "replace": { "pattern", "with", "flags?" } }` | 正则/字面替换 |
| match | `{ "match": { "pattern", "flags?" } }` | 仅保留匹配部分 |
| split | `{ "split": { "by", "index?" } }` | 按分隔符切分 |
| template | `{ "template": "{{result}}万字" }` | 模板插值 |
| trim | `{ "trim": true }` | 去首尾空白 |
| js | `{ "js": "result.toUpperCase()" }` | JS 函数体（沙箱） |

#### DOM 级变换（仅 HTML 结果有效）

| 操作 | 格式 | 说明 |
|---|---|---|
| remove | `{ "remove": "script,.ad" }` | 移除匹配元素（含子元素） |
| unwrap | `{ "unwrap": "span.tooltip" }` | 去标签保留内容 |
| strip | `{ "strip": { "attrs": ["onclick", "style"] } }` | 移除 HTML 属性 |

### 占位符

| 占位符 | 说明 | 可用位置 |
|---|---|---|
| `{{key}}` | 搜索关键词 | `search.url` |
| `{{page}}` | 页码（从 1 开始） | `search.url`, `explore.category.url` |
| `{{$.field}}` | 从上下文取值 | 所有位置 |
| `{{result}}` | 上一步结果 | template 变换中 |

支持 JS 表达式：`{{$.field.slice(0,3)}}` `{{result.replace("a","b")}}`

## 上下文传递

模块间上下文自动传递：`search → bookInfo → toc → content`

上游模块提取的所有字段可在下游 URL / template 中通过 `{{$.field}}` 引用。

## 示例

见 `schemas/readerx/examples/book-source-rule-examples.json`。
