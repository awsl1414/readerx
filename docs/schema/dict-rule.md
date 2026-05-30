# ReaderX 字典规则 v1

> Web-first，不兼容 Legado

字典规则定义如何查询词典网站、提取并清洗释义内容用于展示。

## 与书源规则的关系

| | 书源 Rule | 字典 Step |
|---|---|---|
| 核心类型 | `string \| RuleObject \| RuleStep[]` | `ExtractStep \| TransformStep \| ScriptStep` |
| 风格 | 简写优先，灵活多样 | 显式管道，结构清晰 |
| 侧重 | 数据提取（含 template/js 提取器） | HTML 处理（含 DOM 级变换） |
| 共享 | 同一套提取引擎（css/xpath/jsonpath/regex）和变换操作 | |

## 文件级字段

| 字段 | 类型 | 必须 | 说明 |
|---|---|---|---|
| `$schema` | string | ✅ | `"readerx/dict-rule/v1"` |
| `authors` | string[] | — | 规则文件制作者 |
| `description` | string | — | 规则文件说明 |
| `updatedAt` | string | — | ISO 8601 最后更新时间 |
| `rules` | DictRule[] | ✅ | 字典规则列表 |

## 规则字段（DictRule）

### 身份标识

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | string | ✅ | — | 规则唯一标识 |
| `name` | string | ✅ | — | 显示名称 |
| `description` | string | — | `""` | 字典说明 |
| `tags` | string[] | — | `[]` | 标签，用于 UI 分组筛选 |

### 执行控制

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|---|---|---|---|---|
| `enabled` | boolean | — | `true` | 是否启用 |
| `weight` | integer | — | `50` | 智能权重 0-100，越大越优先 |

### 变量

| 字段 | 类型 | 说明 |
|---|---|---|
| `variables` | `Record<string, string>` | 可复用变量，在 request / fields 中通过 `{{varName}}` 引用。内置变量：`{{key}}` = 查询关键词 |

### 请求配置（request）

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|---|---|---|---|---|
| `url` | string | ✅ | — | URL 模板，支持 `{{key}}` 和自定义变量 |
| `method` | `"GET"` \| `"POST"` | — | `"GET"` | HTTP 方法 |
| `charset` | string | — | — | 非 UTF-8 时指定编码，如 `"gbk"` |
| `headers` | `Record<string, string>` | — | — | 自定义请求头 |
| `body` | object | — | — | POST 请求体（`{ type: "form"\|"json"\|"raw", data: {} }`） |

### 内容提取（fields）

预定义字段名（UI 按名称选择渲染模板）：

| 字段名 | 必须 | 推荐 schema | 说明 |
|---|---|---|---|
| `definition` | ✅ | `html` | 释义内容 |
| `phonetic` | — | `string` | 音标 / 拼音 |
| `audio` | — | `string` | 发音音频 URL |
| `examples` | — | `string[]` | 例句列表 |
| `synonyms` | — | `string[]` | 近义词 / 反义词 |
| `extra` | — | `html` | 其他补充信息 |

也支持自定义字段名，UI 回退到通用渲染。

每个字段由 `schema`（输出类型）和 `pipeline`（步骤数组）组成。

## Pipeline 步骤

### ExtractStep（从源提取内容）

| 字段 | 类型 | 必须 | 说明 |
|---|---|---|---|
| `type` | `"extract"` | ✅ | — |
| `engine` | `"css"` \| `"xpath"` \| `"jsonpath"` \| `"regex"` | ✅ | 解析引擎 |
| `selector` | string | ✅ | 选择器表达式 |
| `output` | 见下 | — | 提取输出，默认 `"html"` |
| `baseUrl` | string | — | 相对 URL 拼接前缀 |

`output` 可选值：

| 值 | 说明 |
|---|---|
| `"html"` | innerHTML（默认） |
| `"text"` | 纯文本 |
| `"outerHtml"` | outerHTML |
| `{ "type": "attr", "name": "src" }` | HTML 属性值 |

### TransformStep（变换已提取内容）

| 字段 | 类型 | 必须 | 说明 |
|---|---|---|---|
| `type` | `"transform"` | ✅ | — |
| `action` | `"remove"` \| `"unwrap"` \| `"strip"` \| `"replace"` | ✅ | 变换动作 |
| `selector` | string | — | CSS 选择器（remove/unwrap 时必须） |
| `attrs` | string[] | — | 要移除的属性名（strip 时必须） |
| `pattern` | string | — | 正则或字面量（replace 时必须） |
| `with` | string | — | 替换为（replace 时） |
| `flags` | string | — | 正则标志（replace 时） |

### ScriptStep（JS 脚本兜底）

| 字段 | 类型 | 必须 | 说明 |
|---|---|---|---|
| `type` | `"script"` | ✅ | — |
| `code` | string | ✅ | JS 函数体，接收 `html` 变量，返回字符串。运行于 QuickJS 沙箱 |

### schema 输出类型

| 值 | 说明 |
|---|---|
| `"html"` | HTML 片段（默认） |
| `"string"` | 纯文本 |
| `"html[]"` | HTML 片段数组 |
| `"string[]"` | 纯文本数组 |

schema 为数组类型时，extract 步骤自动提取所有匹配项。

## 数据流

```
request.url + {{key}} + {{variables}}
  → HTTP 请求（代理层）
  → 原始响应（HTML / JSON / 纯文本）
  → fields.*.pipeline 逐步骤执行
  → 按 schema 输出类型化结果
  → UI 渲染
```

## 示例

见 `schemas/readerx/examples/dict-rule-examples.json`。
