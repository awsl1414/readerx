# 净化规则（ReplaceRule）

> 源码位置：`app/src/main/java/io/legado/app/data/entities/ReplaceRule.kt`
> 处理逻辑：`app/src/main/java/io/legado/app/help/book/ContentProcessor.kt`

净化规则用于在阅读时对正文内容进行文本替换和过滤，去除广告、修正格式等。

## 实体字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Long (PK, autoGenerate) | 唯一标识 |
| `name` | String | 规则名称 |
| `group` | String? | 规则分组（逗号分隔） |
| `pattern` | String | ★ 匹配模式（正则或字面量） |
| `replacement` | String | ★ 替换文本 |
| `scope` | String? | 适用书源范围 |
| `scopeTitle` | Boolean | 是否应用于标题 |
| `scopeContent` | Boolean | 是否应用于正文 |
| `excludeScope` | String? | 排除的书源范围 |
| `isEnabled` | Boolean | 是否启用 |
| `isRegex` | Boolean | ★ 是否为正则表达式 |
| `timeoutMillisecond` | Long | 执行超时（毫秒） |
| `order` | Int | 执行顺序 |

## 核心概念

### 匹配模式（pattern）

- **字面量模式**（`isRegex = false`）：直接匹配文本
- **正则模式**（`isRegex = true`）：使用正则表达式匹配

### 替换文本（replacement）

- 普通文本直接替换
- 正则模式下支持捕获组引用：`$1`, `$2` ...

### 作用域控制

净化规则通过作用域精确控制对哪些书籍生效：

| 字段 | 说明 |
|------|------|
| `scope` | 适用的书源 URL（逗号分隔，支持通配符） |
| `excludeScope` | 排除的书源 URL |
| `scopeTitle` | 是否对章节标题生效 |
| `scopeContent` | 是否对正文内容生效 |

## 规则查询逻辑

> 源码位置：`app/src/main/java/io/legado/app/data/dao/ReplaceRuleDao.kt`

系统根据当前书籍的名称和来源，查询匹配的净化规则：

- `findEnabledByContentScope(name, origin)` → 获取应用于正文且匹配当前书籍的规则
- `findEnabledByTitleScope(name, origin)` → 获取应用于标题且匹配当前书籍的规则

匹配逻辑：
1. 规则 `scope` 为空 → 适用于所有书籍
2. 规则 `scope` 包含书名或书源 URL → 匹配
3. 规则 `excludeScope` 包含书名或书源 URL → 排除

## 内容处理流程

```
原始正文内容
    │
    ▼
ContentProcessor（内容处理器）
    │
    ├── 1. 查询匹配的净化规则
    │       ├── 标题规则（scopeTitle = true）
    │       └── 正文规则（scopeContent = true）
    │
    ├── 2. 按 order 排序规则
    │
    ├── 3. 依次执行每条规则
    │       ├── isRegex = true  → Regex(pattern).replace(content, replacement)
    │       └── isRegex = false → content.replace(pattern, replacement)
    │
    ├── 4. 超时保护（timeoutMillisecond）
    │
    ▼
净化后的内容
```

## ContentProcessor

> 源码位置：`app/src/main/java/io/legado/app/help/book/ContentProcessor.kt`

内容处理器协调净化规则的执行，是 ContentHelp 的核心。

### 关键功能

- 根据书名和书源匹配净化规则
- 按 order 顺序执行
- 超时保护防止正则回溯导致卡顿
- 分开处理标题和正文

### 配合 ContentHelp

> 源码位置：`app/src/main/java/io/legado/app/help/book/ContentHelp.kt`

ContentHelp 负责更高层的内容处理：
- 净化规则处理（通过 ContentProcessor）
- 内容格式化
- 段落处理

## 使用场景示例

### 去除广告文字

```
name: 去广告
pattern: 本章未完.*?点击下一页继续
replacement: （空）
isRegex: true
scopeContent: true
```

### 修正排版

```
name: 去除多余空行
pattern: \n{3,}
replacement: \n\n
isRegex: true
scopeContent: true
```

### 去除特定网站的广告

```
name: XX网站去广告
pattern: 请关注微信公众号.*
replacement: （空）
isRegex: true
scope: example.com
scopeContent: true
```

### 替换错别字

```
name: 常见错别字修正
pattern: 的的地得  （字面量）
replacement: 的地得
isRegex: false
```

## 数据管理

- 净化规则支持分组管理
- 支持通过 Web API 导入/导出
- 支持批量启用/禁用
- 规则按中文拼音排序显示
