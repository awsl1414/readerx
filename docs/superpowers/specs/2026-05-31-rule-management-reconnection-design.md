# 规则管理重新对接设计

> ReaderX 规则平台全栈重构：schemas 独立包 + 单表存储 + DAG IR + 手写编辑器

## 1. 背景与目标

规则引擎已按 `schemas/readerx` 重写完成（Zod 校验、类型定义、运行时）。现需重新对接四大规则的管理页面：

- replace-rule（替换净化规则）
- txt-toc-rule（TXT 目录检测规则）
- dict-rule（词典规则）
- book-source-rule（书源规则）

**当前问题：**

- persistence 层使用旧 Legado 字段格式（如 `DictRule` 用 `urlRule`/`showRule`）
- UI 表单对齐旧字段
- 四张独立表不利于未来扩展
- rule-engine 和 persistence 类型重复定义

**设计原则：**

- 不考虑向后兼容，不迁移旧数据
- 激进采用最佳设计，面向 5-10 年扩展
- 单一类型来源（schemas 包）
- 专业工具 UI，非后台管理系统

## 2. 包架构

```
packages/
  schemas/              # 新包：类型 + Zod schema 唯一来源
    src/
      types.ts          # BookSource, DictRule, ReplaceRule, TxtTocRule, RuleRecord
      schemas.ts        # Zod schemas（从 rule-engine 迁移）
    package.json        # exports: "." (types + zod)
  infrastructure/       # 不变
  rule-engine/          # 依赖 schemas + infrastructure
    src/
      compiler/         # RuleCompiler（schema → DAG IR）
      ir/               # ExecutionPlan / ExecutionNode 类型
      executor/         # Executor（内部隐藏 Extractor）
      transform/        # 字符串/DOM transform
      cache/            # 编译缓存
  persistence/          # 依赖 schemas + infrastructure
    src/
      rules-repo.ts     # 单表 rules Repository
      database.ts       # IndexedDB 单表定义
  reader-engine/        # 依赖 rule-engine + schemas + infrastructure
    src/
      source-service.ts # execute(sourceId, moduleId, ctx)
      module-service.ts # 业务封装（search/toc/content 等）
      runtime-context.ts# ExecutionContext
```

### 依赖方向（更新后）

| 包 | 依赖 |
|---|---|
| schemas | 零内部依赖（仅 zod） |
| infrastructure | 零内部依赖 |
| persistence | schemas, infrastructure |
| rule-engine | schemas, infrastructure |
| reader-engine | rule-engine, schemas, infrastructure |
| quickjs-runtime | peer dep → rule-engine（import type） |

### 架构约束更新

- persistence 依赖 schemas（非 rule-engine），schemas 为纯类型+校验包
- 新增 schemas 包登记为「类型层」：零内部依赖
- 原架构图中 persistence 的依赖从 `← infrastructure` 改为 `← schemas, infrastructure`

## 3. Schemas 包

### 3.1 RuleRecord（统一存储类型）

```typescript
type RuleType =
  | "book-source"
  | "dict"
  | "replace"
  | "txt-toc";
  // 未来: "rss" | "feed" | "ai" | "extract" | ...

type RuleRecord<T extends RuleType = RuleType> = {
  id: string;
  type: T;
  name: string;
  enabled: boolean;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  // 各类型特有数据
  data: RuleDataType<T>;
};

type RuleDataType<T extends RuleType> =
  T extends "book-source" ? BookSourceData :
  T extends "dict" ? DictRuleData :
  T extends "replace" ? ReplaceRuleData :
  T extends "txt-toc" ? TxtTocRuleData :
  never;
```

### 3.2 BookSource（modules 数组，非固定五模块）

```typescript
type BookSourceData = {
  description?: string;
  author?: string;
  version?: string;
  baseUrl: string;
  urlPattern?: string;
  weight?: number;         // 0-100
  rateLimit?: number;
  headers?: Record<string, string>;
  loginUrl?: string;
  // 核心变更：modules 数组替代固定五字段
  modules: SourceModule[];
};

type SourceModuleType =
  | "search"
  | "explore"
  | "detail"
  | "toc"
  | "content";
  // 未来: "comments" | "ranking" | "author" | "recommendation" | "related" | "audiobook" | ...

type SourceModule = {
  type: SourceModuleType;
  /** 模块启用状态（独立于规则整体 enabled） */
  enabled?: boolean;
  /** 请求配置 */
  request?: RequestConfig;
  /** 该模块的提取规则（字段名 → Rule 表达式） */
  rules: Record<string, Rule>;
  /** 分页：下一页 URL 规则 */
  nextUrl?: Rule;
};

type Rule = string | RuleObject | RuleStep[];

type RuleObject = {
  css?: string;
  xpath?: string;
  jsonpath?: string;
  regex?: string;
  template?: string;
  js?: string;
  attr?: string;
  output?: "text" | "html" | "outerHtml" | "attr";
  reverse?: boolean;
  separator?: string;
  transform?: TransformStep[];
};

type RuleStep =
  | ExtractStep
  | TransformStep
  | ScriptStep;

type ExtractStep = {
  type: "extract";
  engine: "css" | "xpath" | "jsonpath" | "regex";
  selector: string;
  output?: "text" | "html" | "outerHtml" | "attr";
  attr?: string;
};

type TransformStep = {
  type: "transform";
  action: "replace" | "match" | "split" | "template" | "trim" | "remove" | "unwrap" | "strip";
  pattern?: string;
  with?: string;
  flags?: string;
  selector?: string;
  attrs?: string[];
};

type ScriptStep = {
  type: "script";
  code: string;
};
```

### 3.3 ReplaceRule

```typescript
type ReplaceRuleData = {
  description?: string;
  /** 正则或字面量模式 */
  pattern: string;
  flags?: string;          // default: "g"
  /** true 时 pattern 作为纯文本匹配 */
  literal?: boolean;
  /** 字符串替换，支持 $1/$2 捕获组 */
  replacement?: string;
  /** JS 函数体（QuickJS 沙箱），优先于 replacement */
  replacementJs?: string;
  /** 作用域控制 */
  scope?: ReplaceScope;
};

type ReplaceScope = {
  /** 包含的书源 ID/名称，空 = 全部 */
  include?: string[];
  /** 排除的书源 ID/名称 */
  exclude?: string[];
  /** 作用目标 */
  target?: "content" | "title" | "both";
};
```

### 3.4 TxtTocRule

```typescript
type TxtTocRuleData = {
  description?: string;
  /** 正则模式，空字符串 "" = 兜底规则 */
  pattern: string;
  flags?: string;          // default: "gm"
};
```

### 3.5 DictRule

```typescript
type DictRuleData = {
  description?: string;
  weight?: number;         // 0-100
  variables?: Record<string, string>;
  /** 请求配置 */
  request: RequestConfig;
  /** 内容字段映射（field name → pipeline） */
  fields: Record<string, DictField>;
};

type DictField = {
  /** 输出格式 */
  schema: "html" | "string" | "html[]" | "string[]";
  /** 提取+转换流水线 */
  pipeline: RuleStep[];
};
```

### 3.6 RequestConfig（完整版）

```typescript
type RequestConfig = {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: RequestBody;
  charset?: string;
  cookies?: Record<string, string>;
  timeout?: number;
  retry?: number;
  cache?: boolean | number;    // true = 默认缓存, number = TTL 秒
  proxy?: string;
  followRedirect?: boolean;
  userAgent?: string;
  rateLimit?: number;
  /** 模板变量默认值 */
  variables?: Record<string, string>;
};

type RequestBody = {
  type: "form" | "json" | "raw";
  data: string;
};
```

## 4. Persistence 层

### 4.1 单表设计

```
IndexedDB: readerx
  表: rules
  索引:
    id        (PK, string)
    type      (string)
    enabled   (boolean)
    name      (string)
    updatedAt (string)
  复合索引:
    [type+enabled]
```

### 4.2 Repository

```typescript
// packages/persistence/src/rules-repo.ts
class RulesRepository {
  /** 按类型查询所有规则 */
  getByType(type: RuleType): Promise<RuleRecord[]>;

  /** 按类型查询启用的规则 */
  getEnabledByType(type: RuleType): Promise<RuleRecord[]>;

  /** 单条查询 */
  getById(id: string): Promise<RuleRecord | undefined>;

  /** 单条保存（upsert）。调用方需先通过 schemas 包的 Zod parseXxx 校验 data 字段 */
  save<T extends RuleType>(record: RuleRecord<T>): Promise<void>;

  /** 批量保存。调用方需确保 data 已通过 Zod 校验 */
  saveBatch(records: RuleRecord[]): Promise<void>;

  /** 读取时按类型窄化 data 字段（Zod parse 保证类型安全） */
  getByType<T extends RuleType>(type: T): Promise<RuleRecord<T>[]>;

  /** 删除 */
  delete(id: string): Promise<void>;

  /** 批量删除 */
  deleteBatch(ids: string[]): Promise<void>;

  /** 按名称搜索 */
  search(type: RuleType, query: string): Promise<RuleRecord[]>;

  /** 切换启用状态 */
  toggleEnabled(id: string, enabled: boolean): Promise<void>;

  /** 统计 */
  count(type?: RuleType): Promise<number>;
}
```

### 4.3 DB Version 升级

从 version 2 升级到 version 3：
- 删除旧表 `replaceRules`、`txtTocRules`、`dictRules`（不迁移数据）
- 创建新表 `rules`（单表，带索引）
- 保留 `bookSources` 等非规则表的迁移策略待定

## 5. 运行时接口

### 5.1 DAG ExecutionPlan（IR）

```typescript
/** 编译后的执行计划——DAG 中间表示 */
type ExecutionPlan = {
  /** 所有节点 */
  nodes: Record<string, ExecutionNode>;
  /** 入口节点 ID */
  entry: string;
  /** 源 schema 哈希，用于缓存 */
  sourceHash: string;
  /** 创建时间 */
  createdAt: number;
};

type ExecutionNode =
  | RequestNode
  | ExtractNode
  | TransformNode
  | ScriptNode
  | BranchNode
  | MergeNode;

type RequestNode = {
  type: "request";
  id: string;
  /** 依赖的上游节点 ID */
  depends: string[];
  config: RequestConfig;
};

type ExtractNode = {
  type: "extract";
  id: string;
  depends: string[];
  engine: "css" | "xpath" | "jsonpath" | "regex";
  selector: string;
  output?: "text" | "html" | "outerHtml" | "attr";
  attr?: string;
};

type TransformNode = {
  type: "transform";
  id: string;
  depends: string[];
  action: TransformAction;
  params: TransformParams;
};

type ScriptNode = {
  type: "script";
  id: string;
  depends: string[];
  code: string;
};

type BranchNode = {
  type: "branch";
  id: string;
  depends: string[];
  /** 条件：变量表达式 */
  condition: string;
  /** 条件为真时的节点 ID */
  then: string;
  /** 条件为假时的节点 ID */
  else: string;
};

type MergeNode = {
  type: "merge";
  id: string;
  depends: string[];
  /** 合并策略 */
  strategy: "concat" | "first" | "zip";
};
```

### 5.2 Compiler

```typescript
interface RuleCompiler {
  /** 编译书源的某个模块规则 → ExecutionPlan */
  compileModule(source: BookSourceData, moduleType: SourceModuleType): ExecutionPlan;

  /** 编译替换规则组 → ExecutionPlan */
  compileReplaceRules(rules: ReplaceRuleData[]): ExecutionPlan;

  /** 编译目录检测规则组 → ExecutionPlan */
  compileTocRules(rules: TxtTocRuleData[]): ExecutionPlan;

  /** 编译词典规则 → ExecutionPlan */
  compileDictRule(rule: DictRuleData): ExecutionPlan;
}
```

### 5.3 Executor

```typescript
/** 执行器：接收 ExecutionPlan + Context，执行并返回结果 */
interface Executor {
  execute(plan: ExecutionPlan, context: ExecutionContext): Promise<ExecutionResult>;
}

/** Extractor 作为 Executor 的内部实现，不对外暴露 */
// CssExtractor, XpathExtractor, JsonPathExtractor, RegexExtractor 均为内部模块

type ExecutionContext = {
  /** 模板变量（{{key}} 等） */
  variables: Record<string, unknown>;
  /** 上一步的输出结果 */
  previousResult?: unknown;
  /** 来源规则 */
  source: RuleRecord;
  /** 运行时 API（日志、缓存等） */
  runtime: RuntimeAPI;
};

type RuntimeAPI = {
  log: (message: string) => void;
  cache: {
    get: (key: string) => Promise<unknown | undefined>;
    set: (key: string, value: unknown, ttl?: number) => Promise<void>;
  };
};

type ExecutionResult = {
  success: boolean;
  data: unknown;
  /** 各节点的中间结果（调试用） */
  nodeResults?: Record<string, unknown>;
  error?: string;
};
```

### 5.4 SourceService

```typescript
interface SourceService {
  /** 统一执行入口 */
  execute(
    sourceId: string,
    moduleType: SourceModuleType,
    context: Partial<ExecutionContext>
  ): Promise<ExecutionResult>;
}
```

UI 层封装业务方法（不放在接口里）：

```typescript
// apps/web/features/book-source/hooks/use-source-actions.ts
function useSourceActions() {
  const service = useSourceService();

  return {
    search: (sourceId: string, keyword: string) =>
      service.execute(sourceId, "search", { variables: { keyword } }),

    toc: (sourceId: string, tocUrl: string) =>
      service.execute(sourceId, "toc", { variables: { tocUrl } }),

    content: (sourceId: string, chapterUrl: string) =>
      service.execute(sourceId, "content", { variables: { chapterUrl } }),
  };
}
```

### 5.5 编译缓存

```typescript
type CompiledRule = {
  sourceHash: string;
  plan: ExecutionPlan;
  createdAt: number;
};

interface CompileCache {
  get(sourceHash: string): CompiledRule | undefined;
  set(sourceHash: string, plan: ExecutionPlan): void;
  invalidate(sourceId: string): void;
}
```

缓存在 persistence 层的 `compiledPlans` 存储区域持久化。

### 5.6 当前阶段交付物

| 交付物 | 位置 | 交付状态 |
|---|---|---|
| schemas 包类型定义 | `packages/schemas/src/types.ts` | 完整实现 |
| schemas 包 Zod 校验 | `packages/schemas/src/schemas.ts` | 完整实现 |
| RuleRecord + 单表 | `packages/persistence/` | 完整实现 |
| ExecutionPlan DAG IR 类型 | `packages/rule-engine/src/ir/` | 完整实现 |
| RuleCompiler 接口 + 基础实现 | `packages/rule-engine/src/compiler/` | 接口 + 现有 compileRule 适配 |
| Executor 接口 | `packages/rule-engine/src/executor/` | 接口定义 + 空实现 |
| ExecutionContext 类型 | `packages/rule-engine/src/ir/` | 完整实现 |
| CompileCache 接口 | `packages/rule-engine/src/cache/` | 接口 + 内存实现 |
| SourceService 接口 | `packages/reader-engine/src/source-service.ts` | 仅接口定义 |
| Fetcher 接口 | `packages/infrastructure/src/fetcher.ts` | 仅接口定义 |
| 四个规则管理 UI | `apps/web/features/` | 完整实现 |

## 6. UI 架构

### 6.1 独立 Feature + 共享原语组件

```
apps/web/features/
  replace-rule/
    replace-rule-list-page.tsx
    replace-rule-editor.tsx           # 手写，很小
    hooks/
      use-replace-rules.ts
      use-replace-rule-mutations.ts
    config.ts                         # i18n key 映射
  txt-toc-rule/
    toc-rule-list-page.tsx
    toc-rule-editor.tsx               # 手写，很小
    hooks/
      use-toc-rules.ts
      use-toc-rule-mutations.ts
    config.ts
  dict-rule/
    dict-rule-list-page.tsx
    dict-rule-editor.tsx              # 手写，中等复杂度
    hooks/
      use-dict-rules.ts
      use-dict-rule-mutations.ts
    config.ts
  book-source/
    workspace/
      source-workspace.tsx            # 主布局（三栏/双栏）
      source-list-panel.tsx           # 左侧源列表
      source-editor-panel.tsx         # 右侧编辑区
      module-navigator.tsx            # 模块选项卡（Search/Explore/...）
      module-editor.tsx               # 单模块编辑器
      preview/
        request-preview.tsx           # 请求预览面板
        result-preview.tsx            # 结果预览面板
      test/
        rule-tester.tsx               # 规则测试面板
    hooks/
      use-source-rules.ts
      use-source-mutations.ts
      use-source-actions.ts           # 业务方法封装
    config.ts

  # 共享原语组件（跨 feature 复用）
  shared-rule-ui/
    components/
      form-field.tsx                  # input/textarea/switch/select
      regex-editor.tsx                # pattern + flags + 实时测试
      pipeline-editor.tsx             # extract/transform/script 步骤编辑
      scope-editor.tsx                # include/exclude/target
      rule-import-dialog.tsx          # 通用规则导入（ReaderX JSON + Legado）
      rule-list.tsx                   # 通用列表（搜索/排序/批量操作）
      request-config-editor.tsx       # URL/method/headers/charset/body
      tag-input.tsx                   # 标签输入组件
```

### 6.2 路由

```
/my                 → 我的（导航入口，不变）
/my/sources         → BookSource Workspace（重写）
/my/dict-rules      → Dict Rule 列表 + 编辑（重写）
/my/replace-rules   → Replace Rule 列表 + 编辑（重写）
/my/txt-rules       → Txt TOC Rule 列表 + 编辑（重写）
```

### 6.3 各规则编辑器概要

#### Replace Rule Editor（最小）

```
┌─────────────────────────────┐
│ 规则名称  [_______________] │
│ 描述      [_______________] │
│ ─────────────────────────── │
│ 匹配模式  [regex-editor   ] │
│ 替换文本  [_______________] │
│ 替换脚本  [_______________] │
│ ─────────────────────────── │
│ 作用域    [scope-editor   ] │
│ 启用      [switch]          │
│ 排序      [___]             │
│ 标签      [tag-input]       │
└─────────────────────────────┘
```

#### Txt TOC Rule Editor（最小）

```
┌─────────────────────────────┐
│ 规则名称  [_______________] │
│ 描述      [_______________] │
│ ─────────────────────────── │
│ 匹配模式  [regex-editor   ] │
│ 启用      [switch]          │
│ 排序      [___]             │
│ 标签      [tag-input]       │
└─────────────────────────────┘
```

#### Dict Rule Editor（中等）

```
┌─────────────────────────────────┐
│ 规则名称  [___________________] │
│ 描述      [___________________] │
│ ─────────────────────────────── │
│ 请求配置  [request-config     ] │
│ URL: https://dict.cn/search?{{key}}
│ Method: GET                     │
│ ─────────────────────────────── │
│ 内容字段  [+] 添加字段         │
│ ┌─ definition ─────────────┐    │
│ │  schema: string          │    │
│ │  pipeline: [editor     ] │    │
│ └──────────────────────────┘    │
│ ┌─ phonetic ───────────────┐    │
│ │  schema: string          │    │
│ │  pipeline: [editor     ] │    │
│ └──────────────────────────┘    │
│ ─────────────────────────────── │
│ 变量      [key-value pairs   ] │
│ 启用      [switch]              │
│ 权重      [___]                 │
│ 标签      [tag-input]           │
└─────────────────────────────────┘
```

#### BookSource Workspace（最复杂）

```
┌────────────────────────────────────────────────────────┐
│ 🔍 搜索书源...          [+ 导入] [▾ 筛选] [📊 统计]   │
├───────────────┬────────────────────────────────────────┤
│ 书源列表       │ 编辑区                                │
│               │                                       │
│ ▸ 起点中文网  │ ┌─ 基本信息 ───────────────────────┐  │
│   启用 ★85   │ │ name / type / baseUrl / urlPattern │  │
│ ▸ 69书吧     │ │ headers / loginUrl / weight        │  │
│   启用 ★70   │ └───────────────────────────────────┘  │
│ ▸ 熊猫       │                                       │
│   停用 ★60   │ ┌─ 模块 ───────────────────────────┐  │
│               │ │ [+ Search] [+ Explore]            │  │
│               │ │ [+ Detail] [+ TOC]                │  │
│               │ │ [+ Content]                       │  │
│               │ │                                   │  │
│               │ │ ▸ Search 模块                     │  │
│               │ │   Request: [request-config]       │  │
│               │ │   Rules:                          │  │
│               │ │     list:  [.result-list > .item] │  │
│               │ │     name:  [.book-name          ] │  │
│               │ │     url:   [.book-link@href     ] │  │
│               │ └───────────────────────────────────┘  │
│               │                                       │
│               │ ┌─ 测试 ───────────────────────────┐  │
│               │ │ [▶ 测试搜索]  关键词: [_______]   │  │
│               │ │ 结果预览:                         │  │
│               │ │   1. 凡人修仙传                    │  │
│               │ │   2. 凡人修仙之仙界篇              │  │
│               │ └───────────────────────────────────┘  │
│               │                                       │
│               │                        [💾 保存]       │
├───────────────┴────────────────────────────────────────┤
│ 5 条规则 · 4 已启用 · 最后编辑 2 分钟前                 │
└────────────────────────────────────────────────────────┘
```

移动端：列表和编辑分屏（点击列表项 → 全屏编辑页，返回 → 列表）。

## 7. 数据流

### 7.1 规则管理 CRUD

```
UI 编辑器表单提交
    ↓
validateXxxData()（schemas 包 Zod 校验）
    ↓
构造 RuleRecord（type + data）
    ↓
RulesRepository.save(record)
    ↓
IndexedDB rules 表
    ↓
React Query invalidation → UI 刷新
```

### 7.2 规则导入

```
用户粘贴 JSON / 上传文件
    ↓
tryDetectFormat()（rule-engine）
    ↓ ReaderX 格式
importXxx(data)（rule-engine，Zod parse）
    ↓ Legado 格式
importLegadoXxx(data)（rule-engine，converter）
    ↓
得到规则数组 → 批量构造 RuleRecord
    ↓
RulesRepository.saveBatch(records)
```

### 7.3 规则执行（未来）

```
用户搜索「凡人修仙传」
    ↓
UI 层: sourceActions.search(sourceId, "凡人修仙传")
    ↓
SourceService.execute(sourceId, "search", { variables: { keyword: "凡人修仙传" } })
    ↓
从 persistence 加载 RuleRecord
    ↓
RuleCompiler.compileModule(data, "search")
    ↓ (检查 CompileCache)
ExecutionPlan (DAG IR)
    ↓
Executor.execute(plan, context)
    ↓
按 DAG 拓扑序执行节点
  RequestNode → Fetcher.fetch()
  ExtractNode → 内部 CssExtractor/XpathExtractor/...
  TransformNode → applyStringTransform/applyDomTransform
  ScriptNode → QuickJS sandbox
    ↓
ExecutionResult
    ↓
UI 渲染结果
```

## 8. 测试策略

| 层 | 测试类型 | 内容 |
|---|---|---|
| schemas | 单元测试 | Zod schema 校验（合法/非法输入），类型推断 |
| persistence | 单元测试 | RulesRepository CRUD、索引查询、批量操作 |
| rule-engine compiler | 单元测试 | 各规则类型编译为 DAG IR 的正确性 |
| rule-engine executor | 单元测试 | DAG 节点执行、依赖解析、ExecutionContext |
| UI 编辑器 | 组件测试 | 表单提交/校验/字段渲染 |
| 导入功能 | E2E 测试 | ReaderX JSON + Legado 格式导入 |
| 集成 | E2E 测试 | 从导入到列表显示到编辑保存的完整流程 |

## 9. 实施优先级

四个规则类型并行开发，按复杂度排列工作量：

1. **replace-rule**（最简单：纯 regex + scope）
2. **txt-toc-rule**（最简单：纯 regex）
3. **dict-rule**（中等：request + pipeline）
4. **book-source-rule**（最复杂：modules + workspace）

共享基础设施先行：
1. `packages/schemas/` 包创建
2. `packages/persistence/` 单表重构
3. `shared-rule-ui/` 原语组件
4. 各规则 editor feature
