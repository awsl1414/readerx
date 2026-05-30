# @readerx/rule-engine

规则引擎核心包，负责解析、编译和执行书源规则、字典规则、净化规则、TXT 目录规则。

## 概述

ReaderX 规则引擎采用 **编译-执行** 分离架构：

1. **编译阶段**：将规则文本（JSON Schema 格式）解析为强类型内部表示，预编译正则表达式
2. **执行阶段**：在管道（pipeline）中顺序执行 `Extract → Transform → Script` 步骤

## 支持的规则类型

| 规则 | Schema ID | 说明 |
|------|-----------|------|
| Book Source | `readerx/book-source-rule/v1` | 书源规则：搜索、发现、详情、目录、正文 |
| Dict Rule | `readerx/dict-rule/v1` | 字典查询规则：网页词典内容提取 |
| Replace Rule | `readerx/replace-rule/v1` | 净化规则：正文/标题文本替换 |
| TXT TOC Rule | `readerx/txt-toc-rule/v1` | TXT 目录规则：章节标题识别 |

## 公开接口

### 编译 & 执行

- `compileRule(rule)` — 编译规则为可执行格式
- `evaluateRule(rule, content, ctx)` — 编译 + 执行一步到位
- `evaluateCompiled(compiled, content, ctx)` — 执行预编译规则

### 规则标准化

- `normalizeRule(obj)` — RuleObject 简写 → RuleStep[] 管道
- `toRule(rule)` — 自动识别 RuleObject | RuleStep[] 并标准化

### 校验（Zod）

- `validateBookSource(data)` / `parseBookSource(data)` — 书源校验/解析
- `validateDictRuleFile(data)` / `parseDictRuleFile(data)` — 字典规则校验/解析
- `validateReplaceRuleFile(data)` / `parseReplaceRuleFile(data)` — 净化规则校验/解析
- `validateTxtTocRuleFile(data)` / `parseTxtTocRuleFile(data)` — TXT 目录规则校验/解析

### 独立操作

- `applyReplaceRules(text, rules)` — 应用净化规则
- `findChapterBoundaries(lines, rules)` — TXT 章节分界检测
- `compileSteps(steps)` — 编译单个步骤数组

## 管道架构

```
Rule = RuleStep[]
RuleStep = ExtractStep | TransformStep | ScriptStep

ExtractStep:  engine(css|xpath|jsonpath|regex) → selector → [output]
TransformStep: category(string|dom) → action(replace|match|split|trim|remove|unwrap|strip)
ScriptStep:   code → QuickJS 沙箱执行
```

## 依赖

- `infrastructure` — 基础设施工具
- `happy-dom` — 浏览器环境 DOM 解析（测试 + 非 Worker 场景）
- `zod` — 运行时校验
