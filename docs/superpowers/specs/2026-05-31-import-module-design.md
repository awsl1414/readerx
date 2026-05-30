# Import Module Design Spec

> 核心原则：**不做第二套 Legado 运行时**。能直接映射的字段就映射，能简单转换的规则就转换，超出能力范围的立即退化为 ScriptStep。所有 Legado 代码集中在 `import/` 子目录，未来删除时整目录移除即可。

## 1. 文件结构

```
packages/rule-engine/src/import/
  index.ts              # 公开 API（ReaderX 原生导入 + Legado 导入 + tryDetectFormat）
  types.ts              # Legado 原始类型 + ImportResult + ImportReport + ImportOptions
  parser.ts             # Legado DSL 单级解析（直接输出 ConversionResult，不建 AST）
  converters/
    book-source.ts      # LegadoBookSource → BookSource
    dict-rule.ts        # LegadoDictRule → DictRuleFile
    replace-rule.ts     # LegadoReplaceRule → ReplaceRuleFile
    txt-toc.ts          # LegadoTxtTocRule → TxtTocRuleFile
  report.ts             # ConversionReport 构建与聚合

packages/rule-engine/__tests__/unit/import/
  parser.test.ts
  converters/
    book-source.test.ts
    dict-rule.test.ts
    replace-rule.test.ts
    txt-toc.test.ts
  import-api.test.ts
```

**废弃清理路径**：删除 `src/import/parser.ts`、`src/import/converters/`、`src/import/report.ts`、`__tests__/unit/import/` 中的 Legado 测试。保留 `index.ts`（ReaderX 原生导入）和 `types.ts`（ImportResult 等通用类型）。

## 2. 类型系统

### 2.1 Legado 原始类型（`types.ts`）

四种 Legado 数据的 TypeScript 类型，所有字段 optional（实际数据脏，不一定有全部字段）：

```typescript
interface LegadoBookSource {
  bookSourceUrl?: string;
  bookSourceName?: string;
  bookSourceType?: number;        // 0=text, 1=audio, 2=image, 3=file
  bookSourceGroup?: string;       // 逗号分隔
  bookSourceComment?: string;
  bookUrlPattern?: string;
  customOrder?: number;
  enabled?: boolean;
  enabledExplore?: boolean;
  exploreUrl?: string;            // 换行分隔 "title::url"
  header?: string;                // JSON 字符串
  lastUpdateTime?: number;        // epoch ms
  weight?: number;
  concurrentRate?: string;        // 如 "2000"
  loginUrl?: string;
  searchUrl?: string;
  enabledCookieJar?: boolean;
  loginUi?: string;
  loginCheckJs?: string;
  respondTime?: number;
  // 嵌套规则对象
  ruleSearch?: LegadoRuleFields;
  ruleExplore?: LegadoRuleFields;
  ruleBookInfo?: LegadoRuleBookInfo;
  ruleToc?: LegadoRuleToc;
  ruleContent?: LegadoRuleContent;
}

interface LegadoRuleFields {
  bookList?: string;
  name?: string;
  author?: string;
  bookUrl?: string;
  coverUrl?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  wordCount?: string;
  checkKeyWord?: string;
}

interface LegadoRuleBookInfo {
  init?: string;
  name?: string;
  author?: string;
  coverUrl?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  tocUrl?: string;
  wordCount?: string;
}

interface LegadoRuleToc {
  chapterList?: string;
  chapterName?: string;
  chapterUrl?: string;
  isVip?: string;
  isVolume?: string;
  updateTime?: string;
  nextTocUrl?: string;
}

interface LegadoRuleContent {
  content?: string;
  nextContentUrl?: string;
  replaceRegex?: string;
}

interface LegadoDictRule {
  name?: string;
  urlRule?: string;
  showRule?: string;
  enabled?: boolean;
  sortNumber?: number;
}

interface LegadoReplaceRule {
  id?: number;
  name?: string;
  group?: string;
  pattern?: string;
  replacement?: string;
  scope?: string;                 // 逗号分隔 URL
  scopeTitle?: boolean;
  scopeContent?: boolean;
  excludeScope?: string;          // 逗号分隔 URL
  isEnabled?: boolean;
  isRegex?: boolean;
  timeoutMillisecond?: number;
  sortOrder?: number;
}

interface LegadoTxtTocRule {
  id?: number;
  name?: string;
  rule?: string;
  example?: string;
  serialNumber?: number;
  enable?: boolean;
}
```

### 2.2 导入结果类型

```typescript
import type { Result } from "../result.js";

// 导入错误
type ImportError = {
  kind: "parse_error" | "convert_error" | "unsupported_feature";
  message: string;
  path?: string;
  original?: unknown;
};

// 导入选项
type ImportOptions = {
  collectWarnings?: boolean;
};

// 规则单条转换的中间结果（parser 直接输出）
type ConversionResult = {
  steps?: readonly RuleStep[];     // 能结构化转换的部分
  legacyScript?: string;           // 退化时包装为 ScriptStep 的代码
  unsupported: readonly string[];  // 无法转换的特性名列表
};

// 导入报告（不写入规则对象，放结果元数据中）
type ConversionReport = {
  totalRules: number;
  convertedRules: number;         // 完全结构化转换
  partialConvertedRules: number;  // 部分转换 + 部分 ScriptStep
  scriptFallbackRules: number;    // 整体退化 ScriptStep
  unsupportedFeatures: readonly string[];
};

// 带报告的导入结果
type ImportedResult<T> = {
  data: T;
  report: ConversionReport;
  warnings: readonly ImportError[];
};
```

**关键设计决策**：
- **不污染 ReaderX Schema**：`isLegacy` 等信息放在 `ImportedResult.report` 中，不写入规则对象本身
- **没有 strict 模式**：Legado 数据极脏，严格模式几乎必定失败。统一收集 warnings
- **ConversionResult 不建 AST**：parser 直接输出「能转的步骤 + 不能转的退化脚本」，不构建中间 DSL 模型

## 3. DSL 解析器（`parser.ts`）

### 3.1 设计原则

**单级转换，不建 AST**。输入一个 Legado 规则字符串，输出 `ConversionResult`，直接面向 ReaderX 格式。

### 3.2 不支持的特性（直接退化为 ScriptStep）

| 特性 | 原因 | 处理 |
|------|------|------|
| `@put:{...}` / `@get:{...}` | Legado 变量系统是有状态的，ReaderX 无对应概念 | `unsupported.push("variable-system")`, 整体 ScriptStep |
| `&&` | 不同上下文含义完全不同（chain / fallback / merge / join） | `unsupported.push("merge-operator")`, 整体 ScriptStep |
| `@js:` 复合表达式 | 含 JS 的复合规则无法静态拆分 | `unsupported.push("js-expression")`, 整体 ScriptStep |

### 3.3 引擎推断（仅一级）

```typescript
function inferEngine(selector: string): { engine: ExtractEngine; selector: string } | null {
  // 显式前缀
  if (selector.startsWith("@css:"))  return { engine: "css",      selector: selector.slice(5) };
  if (selector.startsWith("@xpath:")) return { engine: "xpath",   selector: selector.slice(7) };
  if (selector.startsWith("@json:"))  return { engine: "jsonpath", selector: selector.slice(6) };

  // 模式推断
  if (selector.startsWith("//") || selector.startsWith("./")) return { engine: "xpath", selector };
  if (selector.startsWith("$."))                               return { engine: "jsonpath", selector };

  // JSoup 简写（仅支持一级）
  const jsoup = parseSimpleJsoup(selector);
  if (jsoup) return { engine: "css", selector: jsoup };

  // 兜底
  return null;
}
```

### 3.4 JSoup 简写转换（仅一级）

只处理最基础的几种模式：

| Legado JSoup | 转换为 | 说明 |
|---|---|---|
| `class.xxx` | `.xxx` | 类选择器 |
| `class.xxx@text` | `.xxx` (output: text) | 类 + 文本输出 |
| `class.xxx@html` | `.xxx` (output: html) | 类 + HTML 输出 |
| `class.xxx@href` | `.xxx` (output: attr, attr: href) | 类 + 属性 |
| `id.xxx` | `#xxx` | ID 选择器 |
| `tag.div` | `div` | 标签选择器 |
| `tag.div@text` | `div` (output: text) | 标签 + 文本 |

**不处理的模式**（索引 `.N`、`!N`、`:-1`、链式 `tag.a.0@tag.b.1`）：直接返回 null，上层退化为 ScriptStep。

### 3.5 `##` 替换处理

当规则字符串包含 `##` 时：

```
"selector##pattern1##pattern2" → ExtractStep + [ReplaceTransform, ReplaceTransform]
```

`##` 后面的内容作为 regex pattern，replacement 默认为 `""`（删除匹配内容）。

### 3.6 `convertLegadoRule` 主函数

```typescript
function convertLegadoRule(expression: string): ConversionResult {
  if (!expression) return { steps: [], unsupported: [] };

  // 1. 检测不支持的特性 → 整体 ScriptStep
  if (containsUnsupported(expression)) {
    return {
      legacyScript: wrapAsLegacyScript(expression),
      unsupported: detectUnsupportedFeatures(expression),
    };
  }

  // 2. 提取引擎 + 选择器
  const parts = expression.split("##");
  const mainRule = parts[0];
  const inferred = inferEngine(mainRule);

  if (!inferred) {
    return {
      legacyScript: wrapAsLegacyScript(expression),
      unsupported: ["unknown-engine"],
    };
  }

  // 3. 构建 steps
  const steps: RuleStep[] = [
    { type: "extract", engine: inferred.engine, selector: inferred.selector, ...outputOptions },
  ];

  // 4. ## 替换 → TransformStep[]
  for (const replacePattern of parts.slice(1)) {
    steps.push({ category: "string", action: "replace", pattern: replacePattern, with: "" });
  }

  return { steps, unsupported: [] };
}
```

## 4. 转换器

### 4.1 TXT TOC 转换（`converters/txt-toc.ts`）

最简单的 1:1 映射：

| Legado | ReaderX |
|---|---|
| `name` | `name` |
| `rule` | `pattern` |
| `example` | `description` |
| `serialNumber` | `order` |
| `enable` | `enabled` |
| 内联 flags `(?mi)` | 提取到 `flags` 字段 |

无 DSL 转换，无 ScriptStep 退化。唯一注意点：提取 pattern 中的内联 regex flags。

### 4.2 Replace Rule 转换（`converters/replace-rule.ts`）

| Legado | ReaderX | 备注 |
|---|---|---|
| `name` | `name` | |
| `group` | `tags: [group]` | 单字符串 → 数组 |
| `pattern` | `pattern` | |
| `isRegex: false` | `literal: true` | |
| `replacement`（纯文本） | `replacement` | |
| `replacement`（`@js:` 前缀） | `replacementJs`（去掉前缀） | |
| `scope`（逗号分隔） | `scope.include` | `split(",")` |
| `excludeScope`（逗号分隔） | `scope.exclude` | `split(",")` |
| `scopeTitle + scopeContent` | `scope.target` | 组合推断 |
| `isEnabled` | `enabled` | |
| `sortOrder` | `order` | |
| `timeoutMillisecond` | *(忽略)* | unsupported |

### 4.3 Dict Rule 转换（`converters/dict-rule.ts`）

| Legado | ReaderX |
|---|---|
| `name` | `id` + `name` |
| `urlRule` | `request.url` |
| `showRule` | `fields.definition.pipeline`（通过 `convertLegadoRule`） |
| `enabled` | `enabled` |
| `sortNumber` | `weight` |

`showRule` 通过 `convertLegadoRule()` 转换，简单 CSS 选择器走结构化路径，复杂表达式退化 ScriptStep。

### 4.4 Book Source 转换（`converters/book-source.ts`）

最复杂，拆为子函数：

**顶层字段映射**：

| Legado | ReaderX | 备注 |
|---|---|---|
| `bookSourceUrl` | `id` + `baseUrl` | |
| `bookSourceName` | `name` | |
| `bookSourceType` | `type` | 0→novel, 1→audio, 2→comic, 3→file |
| `bookSourceGroup` | `tags` | `split(",")` |
| `bookSourceComment` | `description` | |
| `bookUrlPattern` | `urlPattern` | |
| `enabled` | `enabled` | |
| `customOrder` | `order` | |
| `weight` | `weight` | |
| `concurrentRate` | `rateLimit` | 字符串 → 整数 ms |
| `header` | `headers` | JSON 字符串 → 对象 |
| `loginUrl` | `loginUrl` | |
| `lastUpdateTime` | `updatedAt` | epoch ms → ISO 8601 |
| `enabledCookieJar` | *(忽略)* | unsupported |
| `loginUi / loginCheckJs` | *(忽略)* | unsupported |
| `respondTime` | *(忽略)* | 运行时指标 |

**searchUrl 解析**：提取 URL 模板到 `search.url`，POST body 到 `search.body`，charset 到 `search.charset`。含 `@js:` 的整个 searchUrl 标记 unsupported。

**exploreUrl 解析**：按换行分割，`"title::url"` 格式解析为 `explore.categories: [{title, url}]`。

**规则模块字段映射**（ruleSearch / ruleExplore / ruleBookInfo / ruleToc / ruleContent）：

每个字段值（字符串）通过 `convertLegadoRule()` 转换。字段名映射：

```
ruleSearch.bookList    → search.rules.list
ruleSearch.name        → search.rules.name
ruleSearch.bookUrl     → search.rules.url
ruleSearch.coverUrl    → search.rules.cover
ruleSearch.intro       → search.rules.intro
ruleSearch.kind        → search.rules.kind
ruleSearch.lastChapter → search.rules.lastChapter
ruleSearch.wordCount   → search.rules.wordCount
ruleSearch.checkKeyWord → search.checkKeyWord

ruleExplore → explore.rules（同 ruleSearch 字段映射）

ruleBookInfo.init      → bookInfo.init
ruleBookInfo.name      → bookInfo.rules.name
ruleBookInfo.coverUrl  → bookInfo.rules.cover
ruleBookInfo.tocUrl    → bookInfo.rules.tocUrl

ruleToc.chapterList    → toc.rules.list
ruleToc.chapterName    → toc.rules.name
ruleToc.chapterUrl     → toc.rules.url
ruleToc.isVip          → toc.rules.isVip
ruleToc.isVolume       → toc.rules.isVolume
ruleToc.updateTime     → toc.rules.updateTime
ruleToc.nextTocUrl     → toc.nextUrl

ruleContent.content    → content.rules.text
ruleContent.nextContentUrl → content.nextUrl
ruleContent.replaceRegex   → content.replaceRegex
```

## 5. 公开 API（`import/index.ts`）

```typescript
// ===== ReaderX 原生导入（委托现有 Zod 解析）=====
function importBookSource(data: unknown, options?: ImportOptions): Result<BookSource, ImportError>;
function importDictRuleFile(data: unknown, options?: ImportOptions): Result<DictRuleFile, ImportError>;
function importReplaceRuleFile(data: unknown, options?: ImportOptions): Result<ReplaceRuleFile, ImportError>;
function importTxtTocRuleFile(data: unknown, options?: ImportOptions): Result<TxtTocRuleFile, ImportError>;

// ===== Legado 遗留导入（@deprecated）=====
/** @deprecated Legado 导入将在未来版本移除 */
function importLegadoBookSources(data: unknown, options?: ImportOptions): ImportedResult<BookSource[]>;
/** @deprecated */
function importLegadoDictRules(data: unknown, options?: ImportOptions): ImportedResult<DictRuleFile>;
/** @deprecated */
function importLegadoReplaceRules(data: unknown, options?: ImportOptions): ImportedResult<ReplaceRuleFile>;
/** @deprecated */
function importLegadoTxtTocRules(data: unknown, options?: ImportOptions): ImportedResult<TxtTocRuleFile>;

// ===== 格式辅助检测（非主流程）=====
type RuleFormatKind = "readerx-book-source" | "readerx-dict" | "readerx-replace" | "readerx-txt-toc"
                    | "legado-book-source" | "legado-dict" | "legado-replace" | "legado-txt-toc"
                    | "unknown";
function tryDetectFormat(data: unknown): RuleFormatKind;
```

**`tryDetectFormat`** 仅供 UI 辅助提示用，不作为主流程。调用方（UI）应明确知道用户导入的是什么类型。

## 6. ConversionReport（`report.ts`）

```typescript
function createReport(results: readonly ConversionResult[]): ConversionReport;

// 聚合多个转换的报告
function mergeReports(reports: readonly ConversionReport[]): ConversionReport;
```

Report 存活于 `ImportedResult.report` 中，**绝不写入规则对象**。

UI 可据此展示：
- "导入完成：128 条书源"
- "完全转换：91 条"
- "部分转换（含脚本兼容）：25 条"
- "脚本兼容模式：12 条"
- "不支持的特性：variable-system (12), merge-operator (8)"

## 7. 不做什么

| 不做 | 原因 |
|---|---|
| 完整 Legado DSL AST | 防止变成第二套 Legado 运行时 |
| `@put/@get` 变量系统 | 有状态，ReaderX 无对应概念 |
| `&&` 合并语义 | 上下文歧义太大 |
| 完整 JSoup → CSS | 各种魔法语法，投入产出不成比例 |
| 污染 ReaderX Schema | 规则对象保持纯净 |
| `strict` 模式 | Legado 数据脏，严格模式几乎必定失败 |
| `detectRuleFormat` 主流程 | UI 已知类型，无需猜测 |
