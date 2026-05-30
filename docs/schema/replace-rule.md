# ReaderX 净化规则 v1

> Web-first，不兼容 Legado

净化规则用于阅读时对正文/标题进行文本替换和过滤：去除广告、修正排版、修正错别字、替换屏蔽词。

## 与书源内置 content.replaceRegex 的区别

| | content.replaceRegex | 全局净化规则 |
|---|---|---|
| 归属 | 某个书源专属 | 全局，可按 scope 匹配多个书源 |
| 格式 | 简单 pattern/with 对 | 支持 scope、literal、JS 替换 |
| 用途 | 单一书源的特殊净化 | 跨书源的通用文本处理 |

## 字段一览

### 身份标识

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|---|---|---|---|---|
| `name` | string | ✅ | — | 规则名称，用于 UI 展示 |
| `description` | string | — | `""` | 规则说明 |
| `tags` | string[] | — | `[]` | 分组标签，用于 UI 筛选 |

### 执行控制

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|---|---|---|---|---|
| `enabled` | boolean | — | `true` | 是否启用 |
| `order` | integer | — | `0` | 执行顺序，越小越先执行 |

### 作用域

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `scope.include` | string[] | `[]` | 适用的书源 URL 或书名。空数组 = 全部 |
| `scope.exclude` | string[] | `[]` | 排除的书源（优先级高于 include） |
| `scope.target` | enum | `"content"` | `content` 仅正文 / `title` 仅标题 / `both` 都生效 |

`include` 支持通配符，如 `["example.com", "起点*", "https://www.qidian.com"]`。

### 匹配模式

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|---|---|---|---|---|
| `pattern` | string | ✅ | — | 匹配模式。默认正则；`literal: true` 时为纯文本 |
| `flags` | string | — | `"g"` | 正则标志 |
| `literal` | boolean | — | `false` | 纯文本匹配，不解析为正则 |

### 替换方式（二选一）

| 字段 | 类型 | 说明 |
|---|---|---|
| `replacement` | string | 替换文本，支持 `$1`/`$2` 捕获组引用。默认 `""`（删除） |
| `replacementJs` | string | JS 函数体，返回替换字符串。与 `replacement` 互斥，同时存在时优先 |

两者互斥，同时存在时 `replacementJs` 优先。

## replacementJs 详情

运行在 QuickJS 沙箱（Web Worker），无 DOM / fetch / localStorage。

可用变量：
- `match` — 正则匹配数组（`match[0]` = 完整匹配，`match[1...]` = 捕获组）
- `result` — `match[0]` 的简写

仅在简单字符串替换无法满足时使用。JS 规则执行成本远高于字符串替换。

## flags 常用值

| 值 | 含义 |
|---|---|
| `"g"` | 全局匹配（替换所有，默认） |
| `"gi"` | 全局 + 忽略大小写 |
| `"gm"` | 全局 + 多行（`^$` 匹配行首行尾） |
| `"gmi"` | 全局 + 多行 + 忽略大小写 |

`literal: true` 时 `flags` 无效。

## 与其他规则的关系

- **书源 content.replaceRegex**：某个书源专属的净化规则（简单 pattern/with 对）
- **本文件**：全局净化规则，可按 scope 匹配多个书源
- **TXT 目录规则**：本地 TXT 文件的章节识别，不涉及文本替换

## 示例

见 `schemas/readerx/examples/replace-rule-examples.json`。
