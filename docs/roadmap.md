# ReaderX 开发排期

本文档定义开发的执行顺序和每个步骤的详细内容。不绑定时间，只规定依赖关系和先后顺序。

## 模块状态

| 模块 | 已完成 | 状态 |
|---|---|---|
| infrastructure | HTTP 客户端、Logger、Config | ✅ 完成 |
| rule-engine | CSS/XPath/JSONPath 解析器、操作符拆分、正则替换、模式检测、URL 分析器管线、完整 Zod Schema、JS 规则支持（JsExecutor 依赖倒置）、281 测试通过 | ✅ Step 1+2+1.5 完成 |
| persistence | IndexedDB(Dexie) + OPFS + 9 Repositories、57 测试通过 | ✅ Step 3 完成 |
| quickjs-runtime | QuickJS WASM 沙箱、宿主函数注入（evalRule/ajaxWithOption）、async safe settlement、QuickJsExecutor、comlink Worker、31 测试通过 | ✅ Step 4 完成 |
| reader-engine | V3 完成（Document AST pipeline、ContentProcessor、layout engine、render model）、114 测试通过 | ✅ Step 5 完成 |
| services/api | 路由结构 | 🔴 脚手架 |
| apps/web | Layout、CSS 主题、shadcn button | 🔴 脚手架 |
| ai | — | ⬜ 待规划（独立包，可随时启动） |

## 依赖关系

```
Step 1: rule-engine（运算符 + 解析器）─────────────────────┐
                                                            │
Step 2: rule-engine（URL 分析器 + Schema）──────────────────┤
                                                            │
Step 3: persistence ──────┐                                 │
                          ├─→ Step 5: reader-engine ──┐     │
Step 4: quickjs-runtime ──┘                            │     │
                                                       ├─→ Step 6: apps/web ──→ Step 7: services/api
Step 3/4 可并行                                         │
                                                       │
Step 1.5: rule-engine JS 规则（依赖 Step 4）────────────┘

AI Step A-D 可在 Step 6 之后独立推进（不阻塞核心流程）
AI 包仅 peer dep 引用 rule-engine，无其他内部依赖
```

---

## Step 1: 规则引擎 — 运算符与解析器

规则引擎是所有功能的基础。没有它，搜索、书源管理、内容获取都无法工作。

### 1.1 组合运算符（rule-operators.ts）

所有解析器的前置依赖 — 拆分和组合规则字符串。

- 实现 `&&`（AND 拼接）、`||`（OR 首个非空）、`%%`（ZIP 交错合并）、`##`（正则替换链）
- 输入一条规则字符串，输出拆分后的子规则列表及其运算符
- 参考 `docs/book-source-rule-engine.md` 中的运算符优先级和嵌套规则
- **验证**: 单元测试覆盖所有运算符组合，包括嵌套场景（如 `class.a##regex1&&class.b##regex2`）

### 1.2 CSS 选择器解析器（css.ts）

Legado 书源最常用的解析模式。

- 实现 `getString(rule, content)` / `getStringList(rule, content)` / `getElements(rule, content)`
- 支持 `@attr` 属性提取（`a@href`、`img@src`）
- 支持 `tag.class` 简写、`!` 排除、`-1` 最后一个等 Legado 扩展语法
- DOM 解析：浏览器用 `DOMParser`，Node 用 `linkedom`
- 参考 `docs/book-source-rule-engine.md` CSS 规则段落
- **验证**: 用 Legado 社区实际书源规则作为测试用例

### 1.3 JSONPath 解析器（jsonpath.ts）

- 使用 `jsonpath-plus` 实现 JSONPath 查询
- `getString` / `getStringList` 接口与 CSS 解析器一致
- 处理 `$.data.list[*].name` 等标准 JSONPath 表达式

### 1.4 XPath 解析器（xpath.ts）

- 使用 `xpath` + `xmldom` 实现 XPath 查询（Node 环境）
- 浏览器环境使用原生 `document.evaluate`
- 处理 Legado 的 XPath 扩展

### 1.5 AnalyzeRule 主入口整合（analyzer.ts）

- 将 4 个解析器整合到 `AnalyzeRule`
- 根据规则前缀自动选择解析模式
- 支持规则嵌套：一条规则混合多种模式（如 `class.name@js:result.trim()`）
- 集成组合运算符处理

---

## Step 2: 规则引擎 — URL 分析与 Schema

Step 1 完成后继续完善 rule-engine。

### 2.1 URL 分析器完善（url-analyzer.ts）

- 解析 URL 规则中的选项 JSON（method、charset、headers、body、webJs、retry）
- 支持 `<page>` 页码占位符
- 支持 POST 请求体构造
- `@js:` 动态 URL 生成推迟到 Step 1.5（依赖 quickjs-runtime）

### 2.2 Zod Schema 完善（schemas.ts）

- 为 SearchRule、BookInfoRule、TocRule、ContentRule 等嵌套规则添加完整校验
- 校验 URL 格式、正则表达式有效性
- 导出完整的 BookSource 校验函数，用于导入书源时的验证

---

## Step 3: 数据持久层（persistence）

与 Step 4 可并行。数据层是所有 feature 的基础。

### 3.1 IndexedDB 数据库（indexeddb.ts）

- 使用 Dexie 定义数据库表：Book、BookChapter、BookGroup、Bookmark、SearchKeyword、Cache
- 表结构和索引参考 `docs/database-schema.md`
- 实现 CRUD 操作：增删改查，按条件过滤和排序
- 实现书源导入/导出（JSON 格式）

### 3.2 OPFS 文件存储（opfs.ts）

- 实现 `OPFSStorage`：`writeFile`、`readFile`、`deleteFile`
- 存储书籍正文缓存、封面图片等二进制数据
- 使用 `navigator.storage.getDirectory()` API

### 3.3 缓存策略

- 缓存过期策略（Cache 表的 deadline 字段）
- 搜索关键词使用频率统计（SearchKeyword 表）
- 书籍阅读进度自动保存

---

## Step 4: QuickJS 沙箱运行时（quickjs-runtime）

与 Step 3 可并行。独立模块，无内部依赖。

### 4.1 QuickJS WASM 集成

- 集成 `quickjs-emscripten` 或类似库
- 实现 `QuickJSSandbox.eval(code, context)` — 在沙箱中执行 JS 代码
- 支持 `timeout`（执行超时）和 `memoryLimit`（内存限制）

### 4.2 Web Worker 通信

- 使用 `comlink` 实现 Worker 与主线程的 RPC 通信
- Worker 入口 `worker.ts` 实例化沙箱并暴露 API
- 主线程通过 comlink proxy 调用 Worker 中的沙箱方法

### 4.3 上下文注入

- 定义书源 JS 可用的上下文对象（`java.ajax`、`java.log`、`result` 等）
- 模拟 Legado 的 JS 接口（`java.getString`、`java.getStringList`、`java.ajax`）
- 限制沙箱可访问的全局对象（禁止 `fetch`、`XMLHttpRequest`）

---

## Step 1.5: 规则引擎 — JS 规则支持 ✅

依赖 Step 1 + Step 4。详细分析见 [`docs/analysis/step1-5-js-rules-analysis.md`](./analysis/step1-5-js-rules-analysis.md)。

**已完成：**
- `JsExecutor` 依赖倒置接口 — rule-engine 定义接口，quickjs-runtime 提供实现
- `AnalyzeRule` 异步化 — `getString()`/`getStringList()`/`getElements()` 支持 JS 规则
- `AnalyzeUrl` JS 支持 — URL 管线新增 `@js:` 和 `option.webJs` 评估
- `QuickJsExecutor` — 实现 `JsExecutor` 接口，桥接 rule-engine 和 quickjs-runtime
- 宿主函数扩展 — 新增 `evalRule`、`evalRuleList`、`ajaxWithOption`
- 16 个新测试（10 JS 规则 + 5 QuickJsExecutor + 3 宿主函数）

---

## Step 5: 阅读引擎（reader-engine）

依赖 Step 1 + Step 3 + Step 4。详细设计规格见 [`docs/analysis/step5-reader-engine-spec-v3.md`](./analysis/step5-reader-engine-spec-v3.md)。改进对照见 [`docs/analysis/step5-improvements-over-legado.md`](./analysis/step5-improvements-over-legado.md)。

**核心架构：Document AST Pipeline**

数据流：`bytes → string → structured AST → positioned layout → render model`，语义从不丢失。

```
BookSource.ruleContent
       ↓ fetchRaw (HttpFetcher) → body: Uint8Array
       ↓ decodeBody (charset 分离) → string
       ↓ extractContent (AnalyzeRule + JsExecutor) → extracted HTML/text
       ↓ parseHtmlToDocument / parseTextToDocument → Document AST
       ↓ ContentProcessor.process (immutable transform) → Document
       ↓ layoutDocument (TextLayouter + LayoutConfig) → LayoutResult
       ↓ toRenderModel → RenderResult
  apps/web (DOM / Canvas / SVG renderer)
```

**架构决策：**
- Document AST 替代 string pipeline — 结构化内容模型，支持富文本扩展
- `TextLayouter` 抽象替代直接依赖 pretext — 排版后端可替换
- `LayoutRun[]` 替代 plain text — 语义从 AST 一路保留到渲染
- Positioned layout — LayoutEngine 输出坐标，renderer 不重算
- Immutable AST — 全部 readonly，ContentProcessor 返回新 Document
- Node ID — 稳定引用，支持 selection / annotation / incremental layout
- Cursor 模型 — grapheme-level 定位，替代不稳定的 number offset

### 5.1 内容获取与解析（content/）

- `contracts/` — 依赖倒置接口：HttpFetcher（body bytes）、JsExecutor（re-export）、TextLayouter
- `content-fetcher.ts` — HTTP 获取原始 bytes
- `charset-decoder.ts` — Uint8Array → string（charset 解码分离）
- `content-extractor.ts` — AnalyzeRule 提取正文（处理 JSON transport format + 多页串联 + 50 页上限）
- `document-parser.ts` — DOMParser 语义解析 HTML → Document AST（不是正则清洗）
- `content-processor.ts` — 已实现，适配为 Document → Document immutable transform
- `content-pipeline.ts` — 编排 fetch → decode → extract → parse → process

### 5.2 排版引擎（layout/）

- `document/nodes.ts` — Document AST：BlockNode（Paragraph/Heading/Image/Blockquote/Separator）+ InlineNode（Text/Strong/Emphasis/Link）
- `inline-flatten.ts` — InlineNode[] → InlineSegment[]（保留 style + nodeId）
- `run-mapper.ts` — TextLayoutLine → LayoutRun[]（字符范围→段映射，语义保留）
- `pretext-layouter.ts` — TextLayouter 的 pretext 实现（封装 `prepareWithSegments` + `layoutNextLine`，不泄漏 pretext 类型）
- `layout-engine.ts` — 核心：Document → LayoutResult（positioned LayoutPage[]）
- `pagination.ts` — 分页状态机（累积行高 → 满页切割）
- 纯计算，零 DOM 依赖，pretext 仅在 pretext-layouter.ts 一处引用
- 输入：`Document` + `LayoutConfig`
- 输出：`LayoutResult { pages: LayoutPage[] }`（每页含 positioned LayoutLine[] + LayoutRun[]）

### 5.3 渲染模型（renderer/）

- `render-model.ts` — RenderResult / RenderPage / RenderLine / RenderRun 输出契约
- `toRenderModel(layout)` — LayoutResult → RenderResult 转换
- 实际渲染在 `apps/web/features/reader/` 中实现（DOM + CSS 翻页动画）
- 多端适配：DOM / Canvas / SVG / Native 均可消费 RenderResult

### 5.4 Cursor 模型（shared/）

- `DocumentCursor { blockId, inlineIndex, graphemeIndex }` — selection / annotation / TTS
- `PageCursor { pageIndex, lineIndex, runIndex, graphemeIndex }` — 翻页定位 / 进度恢复
- `LayoutCursor { segmentIndex, graphemeIndex }` — TextLayouter 内部游标

---

## Step 6: Web 前端（apps/web）

依赖所有 packages。Web 前端设计方针见 [`docs/web-design-philosophy.md`](./web-design-philosophy.md)。

### 6.1 基础 UI 框架

- 全局布局：侧边栏导航 + 主内容区
- 主题切换（亮/暗模式）
- providers 层：QueryClientProvider、ThemeProvider、全局 Toast
- shadcn/ui 组件：Sidebar、Dialog、Sheet、Toast、Tabs

### 6.2 书源管理（features/source-manager/）

- 书源列表：搜索、分组、启用/禁用
- 书源导入：URL 导入、文件导入、粘贴 JSON
- 书源编辑：表单编辑各规则字段，实时校验（Zod）
- 书源调试：输入规则 → 实时显示解析结果

### 6.3 搜索（features/search/）

- 搜索界面：输入关键词，多书源并发搜索
- 搜索结果：书籍列表（书名、作者、来源、简介、封面）
- 搜索结果缓存（TanStack Query + persistence）

### 6.4 书架（features/bookshelf/）

- 书架展示：网格/列表视图切换
- 添加书籍（从搜索结果）
- 阅读进度显示
- 书籍分组管理
- 本地数据持久化

### 6.5 阅读器（features/reader/）

- 全屏沉浸式阅读界面，点击/滑动翻页
- 阅读设置：字号、行距、主题
- 目录跳转
- 进度自动保存与恢复
- 上下章切换

---

## Step 7: 后端 API（services/api）

可与 Step 6 并行。提供云端同步和数据中转。

### 7.1 基础框架

- 初始化 Hono app，挂载路由
- CORS、日志中间件
- Drizzle ORM + PostgreSQL 连接

### 7.2 数据模型

- Drizzle schema：User、BookSource、Book、ReadingProgress
- 数据库迁移

### 7.3 路由实现

- 书源路由：CRUD、导入/导出、分享
- 书籍路由：书架同步、进度同步
- RSS 路由：RSS 源管理

---

## AI 增强规划

AI 功能作为可选增强层，不影响核心阅读流程。所有 AI 功能默认关闭，用户主动启用。

### 架构：新增 packages/ai

独立包，作为 AI 能力的统一抽象层。云端 AI 和本地部署 AI（如 Ollama）优先，暂不支持端侧推理。

```
packages/ai/
├── src/
│   ├── index.ts                  # 统一导出
│   ├── provider.ts               # AI Provider 抽象接口
│   ├── providers/
│   │   ├── cloud.ts              # 云端 API（OpenAI / Anthropic / 自定义 endpoint）
│   │   └── ollama.ts             # 本地部署（Ollama，兼容 OpenAI API 格式）
│   ├── capabilities/
│   │   ├── rule-generator.ts     # 书源规则生成
│   │   ├── content-extractor.ts  # 智能正文提取（规则兜底）
│   │   ├── text-enhancer.ts      # 摘要 / 翻译 / 释义
│   │   └── search-assistant.ts   # 自然语言搜索 + 结果去重
│   └── hooks/
│       ├── use-ai.ts             # React hook：AI 能力访问
│       └── use-ai-settings.ts    # AI 设置管理
```

**依赖方向**：

```
infrastructure  ←  packages/ai  ←  apps/web (features)
                       ↑
              rule-engine (peer dep, 可选)
```

- `packages/ai` 不依赖 `reader-engine`、`persistence` 等业务包
- 通过 peer dep 引用 `rule-engine` 类型，仅在规则生成能力中使用
- 具体功能由 apps/web 的 features 层组合调用

### AI Step A：书源规则智能生成

**依赖**：Step 1（rule-engine）| **对应**：Step 6.2（source-manager）

用户输入目标网站 URL → AI 分析页面 DOM 结构 → 自动生成搜索、书籍信息、目录、正文四组规则。

- A.1 **Provider 接口设计**（provider.ts）
  - 定义 `AIProvider` 接口：`generateText(prompt)`, `analyzeHTML(html, intent)`
  - 支持 `cloud`（云端 API，用户自带 key 或自定义 endpoint）和 `ollama`（本地部署）两种 provider
  - Ollama 兼容 OpenAI API 格式，可复用同一 HTTP 客户端实现
- A.2 **规则生成器**（rule-generator.ts）
  - 输入：目标 URL + 页面 HTML 样本
  - 输出：BookSource 规则对象（CSS/XPath/JSONPath）
  - 利用 rule-engine 类型定义确保生成结果符合 Schema
- A.3 **书源调试 AI 助手**（集成到 source-manager）
  - 规则执行失败时，AI 解释原因并建议修复
  - 自然语言 → 规则的交互模式
- **验证**：对 5 个真实小说网站自动生成规则，至少 3 个可用

### AI Step B：智能正文提取

**依赖**：Step 1 + AI Step A | **对应**：Step 5.1（内容获取与解析）

当 rule-engine 解析结果为空或质量低时的兜底方案。

- B.1 **质量评估**：对规则引擎提取结果评分（文本密度、噪声比例、段落结构）
- B.2 **AI 正文提取**：评分低于阈值时，调用 AI 模型从原始 HTML 中提取正文
- B.3 **广告清洗**：AI 识别并移除广告、导航等非正文内容
- **验证**：对规则失败的 10 个页面，AI 提取成功率 > 70%

### AI Step C：阅读体验增强

**依赖**：Step 5 + AI Step A | **对应**：Step 6.5（reader）

阅读过程中的 AI 辅助功能。

- C.1 **章节摘要**：每章结束自动生成内容概要，方便跳读和回顾
- C.2 **文本翻译**：对外文书籍提供段落级翻译（原文/译文对照）
- C.3 **生词标注**：识别古文典故、生僻词汇，悬浮显示解释
- C.4 **上下文问答**：基于当前章节内容回答读者问题
- **验证**：摘要准确度主观评估，翻译可用性人工校验

### AI Step D：智能搜索与推荐

**依赖**：AI Step A + Step 6.3/6.4 | **对应**：Step 6.3（search）+ Step 6.4（bookshelf）

- D.1 **自然语言搜索**：用户描述需求（如"男主穿越到三国的军事小说"）→ AI 转化为多书源搜索关键词
- D.2 **结果去重合并**：AI 判断不同书源的相同书籍，合并为一本书的多来源
- D.3 **阅读推荐**：基于书架和阅读历史，推荐相似书籍
- **验证**：自然语言搜索返回相关结果，去重准确率 > 90%

### AI 功能里程碑

| 里程碑 | 标准 | 依赖 |
|---|---|---|
| **MA1: Provider 可用** | 本地或云端模型能响应基本请求 | AI Step A.1 |
| **MA2: 规则生成可用** | 输入 URL → 自动生成可用书源规则 | AI Step A |
| **MA3: 正文兜底可用** | 规则失败页面能通过 AI 提取正文 | AI Step B |
| **MA4: 阅读增强可用** | 摘要 + 翻译 + 问答功能可用 | AI Step C |
| **MA5: 智能搜索可用** | 自然语言搜索 + 结果去重可用 | AI Step D |

---

## 验证里程碑

| 里程碑 | 标准 | 涉及步骤 |
|---|---|---|
| **M1: 规则引擎可用** | 输入 HTML + CSS 规则 → 正确提取文本 | Step 1 |
| **M2: 书源导入** | 导入 Legado 书源 JSON → 校验通过 → 存入 IndexedDB | Step 1-3 |
| **M3: JS 规则可用** | 含 `@js:` 规则的书源能正确执行 | Step 1 + 4 + 1.5 |
| **M4: 搜索跑通** | 输入关键词 → 调用书源搜索 URL → 解析结果 → 展示列表 | Step 1-4 + 6.3 |
| **M5: 阅读跑通** | 点击搜索结果 → 获取目录 → 获取正文 → 分页渲染 → 翻页阅读 | Step 1-6 |
| **M6: 完整体验** | 书源管理 + 搜索 + 书架 + 阅读器全链路可用 | Step 1-6 |
| **M7: 云端同步** | 阅读进度和书架可跨设备同步 | Step 1-7 |
| **M8: AI 增强可用** | 书源规则自动生成 + 正文兜底提取 + 阅读辅助 | Step 1-6 + AI A-D |
