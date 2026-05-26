# Step 5: Reader Engine — V3 设计规格

> 经过三轮设计迭代，最终定稿。核心升级：string pipeline → Document AST pipeline。

## 设计演进

| 版本 | 核心模型 | 问题 |
|------|---------|------|
| V1 | HTML → text → page | string pipeline，富内容无法扩展 |
| V2 | 引入 Document AST + layout/render 分层 | LayoutLine 丢失语义，offset 不稳定，无节点 ID |
| V3 | 语义保留管线 + positioned layout + immutable AST | 定稿 |

---

## 一、核心数据流

```
BookSource.ruleContent
       ↓
   fetchRaw (HttpFetcher)
       ↓ body: Uint8Array
   decodeBody (charset 分离)
       ↓ string
   extractContent (AnalyzeRule + JsExecutor)
       ↓ string (extracted HTML or text)
   parseHtmlToDocument / parseTextToDocument
       ↓ Document (immutable AST with IDs)
   ContentProcessor.process (immutable transform)
       ↓ Document (cleaned)
   layoutDocument (TextLayouter + LayoutConfig)
       ↓ LayoutResult (positioned LayoutPage[], 语义保留到 LayoutRun)
   toRenderModel
       ↓ RenderResult
   apps/web (DOM / Canvas / SVG renderer)
```

每一层语义递进：`bytes → string → structured AST → positioned layout → render model`。语义从不丢失。

---

## 二、模块结构

```
packages/reader-engine/src/
├── index.ts                          # 统一导出
├── contracts/                        # 依赖倒置接口
│   ├── index.ts
│   ├── http-fetcher.ts              # HttpFetcher + response bytes
│   ├── js-executor.ts               # Re-export from rule-engine
│   └── text-layouter.ts             # TextLayouter 接口 + cursor/line 类型
├── document/                         # Document AST
│   ├── index.ts
│   └── nodes.ts                     # 全部节点类型（immutable, 带 ID）
├── content/                          # 获取 + 解析 + 净化
│   ├── index.ts
│   ├── types.ts                     # ReplaceRule, ContentFetcherConfig
│   ├── content-fetcher.ts           # HTTP 请求获取原始 bytes
│   ├── charset-decoder.ts           # Uint8Array → string（charset 分离）
│   ├── content-extractor.ts         # AnalyzeRule 提取正文（处理 JSON/HTML/text）
│   ├── document-parser.ts           # HTML/text → Document AST（语义解析）
│   ├── content-processor.ts         # Document → Document（immutable transform）
│   └── content-pipeline.ts          # 编排 fetch → decode → extract → parse → process
├── layout/                           # 排版 + 分页
│   ├── index.ts
│   ├── types.ts                     # LayoutConfig, LayoutPage, LayoutLine, LayoutRun
│   ├── inline-flatten.ts            # InlineNode[] → InlineSegment[]（保留语义）
│   ├── run-mapper.ts                # TextLayoutLine → LayoutRun[]（字符范围→段映射）
│   ├── pretext-layouter.ts          # TextLayouter 的 pretext 实现
│   ├── layout-engine.ts             # 核心：Document → LayoutResult
│   └── pagination.ts                # 分页切割状态机
├── renderer/                         # 渲染模型（engine 输出契约）
│   ├── index.ts
│   └── render-model.ts              # RenderPage, RenderLine, RenderRun, toRenderModel
└── shared/
    └── cursors.ts                    # DocumentCursor, PageCursor, LayoutCursor
```

---

## 三、Document AST

### 3.1 设计原则

- **不可变**：所有字段 `readonly`，ContentProcessor 返回新 AST
- **带 ID**：每个节点有唯一 ID，用于 selection / annotation / incremental layout
- **discriminated union**：BlockNode / InlineNode 用 `type` 字段区分
- **v1 只实现**：ParagraphNode + TextNode（纯文本小说足够）

### 3.2 节点定义

```typescript
// document/nodes.ts

type BaseNode = {
  readonly id: string;
};

type Document = {
  readonly type: "document";
  readonly meta: DocumentMeta;
  readonly blocks: readonly BlockNode[];
};

type DocumentMeta = {
  readonly title?: string;
  readonly sourceUrl?: string;
  readonly charset?: string;
};

// ─── Block 级 ───

type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ImageNode
  | BlockquoteNode
  | SeparatorNode;

type ParagraphNode = BaseNode & {
  readonly type: "paragraph";
  readonly inlines: readonly InlineNode[];
};

type HeadingNode = BaseNode & {
  readonly type: "heading";
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly inlines: readonly InlineNode[];
};

type ImageNode = BaseNode & {
  readonly type: "image";
  readonly src: string;
  readonly alt?: string;
  readonly width?: number;
  readonly height?: number;
};

type BlockquoteNode = BaseNode & {
  readonly type: "blockquote";
  readonly blocks: readonly BlockNode[];
};

type SeparatorNode = BaseNode & {
  readonly type: "separator";
};

// ─── Inline 级 ───

type InlineNode =
  | TextNode
  | StrongNode
  | EmphasisNode
  | LinkNode
  | ImageInlineNode;

type TextNode = BaseNode & {
  readonly type: "text";
  readonly text: string;
};

type StrongNode = BaseNode & {
  readonly type: "strong";
  readonly inlines: readonly InlineNode[];
};

type EmphasisNode = BaseNode & {
  readonly type: "emphasis";
  readonly inlines: readonly InlineNode[];
};

type LinkNode = BaseNode & {
  readonly type: "link";
  readonly href: string;
  readonly inlines: readonly InlineNode[];
};

type ImageInlineNode = BaseNode & {
  readonly type: "image-inline";
  readonly src: string;
  readonly alt?: string;
};
```

---

## 四、Cursor 模型

三层 cursor，各层精确引用：

```typescript
// shared/cursors.ts

/** Document 层定位 — 用于 selection / annotation / TTS */
type DocumentCursor = {
  blockId: string;
  inlineIndex: number;
  graphemeIndex: number;
};

/** Page 层定位 — 用于翻页 / 滚动定位 / 进度恢复 */
type PageCursor = {
  pageIndex: number;
  lineIndex: number;
  runIndex: number;
  graphemeIndex: number;
};

/** TextLayouter 内部游标 — 由实现定义，opaque */
type LayoutCursor = {
  segmentIndex: number;
  graphemeIndex: number;
};
```

**设计决策：**
- `DocumentCursor` 用 `blockId`（稳定）而非 `blockIndex`（节点增删后失效）
- `PageCursor` 用于存储/恢复阅读位置
- `LayoutCursor` 是 TextLayouter 实现细节，不暴露给消费方

---

## 五、Contracts（依赖倒置）

### 5.1 HttpFetcher

```typescript
// contracts/http-fetcher.ts

type HttpFetcher = {
  fetch(url: string, options: HttpFetcherOptions): Promise<HttpFetcherResponse>;
};

type HttpFetcherOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
};

type HttpFetcherResponse = {
  ok: boolean;
  status: number;
  body: Uint8Array;    // 原始字节，charset 解码在外部处理
  headers: Record<string, string>;
};
```

**vs fetch API 的区别：** `body: Uint8Array` 替代 `text(): Promise<string>`。charset 解码由独立的 `charset-decoder.ts` 处理，不在 HttpFetcher 中耦合。

### 5.2 JsExecutor

```typescript
// contracts/js-executor.ts
// 直接从 rule-engine re-export，避免类型不同步
export type { JsExecutor, JsEvalContext, JsEvalResult } from "@readerx/rule-engine";
```

### 5.3 TextLayouter

```typescript
// contracts/text-layouter.ts

type TextLayoutOptions = {
  font: string;           // e.g. "16px Noto Serif SC"
  letterSpacing?: number;
  wordBreak?: "normal" | "keep-all";
};

/** 排版后端抽象 — pretext / HarfBuzz / WASM 均可实现 */
interface TextLayouter {
  prepare(text: string, options: TextLayoutOptions): TextLayoutHandle;
  layoutNextLine(
    handle: TextLayoutHandle,
    start: LayoutCursor | null,
    maxWidth: number,
  ): TextLayoutLine | null;
}

/** opaque handle — 由具体实现定义内部结构 */
type TextLayoutHandle = {
  readonly _brand: unique symbol;
};

type TextLayoutLine = {
  text: string;
  width: number;
  start: LayoutCursor;
  end: LayoutCursor;
};
```

**设计决策：**
- `TextLayoutHandle` 是 opaque 类型，pretext 的 `PreparedTextWithSegments` 不泄漏到 engine
- `layoutNextLine` 逐行迭代是分页引擎的核心原语（累积行高 → 满页切割）
- 未来替换 pretext 只需新增一个 `TextLayouter` 实现

---

## 六、Content Pipeline

### 6.1 职责划分

| 模块 | 输入 | 输出 | IO |
|------|------|------|-----|
| content-fetcher | URL + options | `Uint8Array` | ✅ HTTP |
| charset-decoder | `Uint8Array` + charset | `string` | ❌ |
| content-extractor | raw string + ContentRule | extracted string | ❌（但 AnalyzeRule 可能调 JS） |
| document-parser | HTML or text string | `Document` | ❌ |
| content-processor | `Document` | `Document` | ❌ |
| content-pipeline | 编排以上所有 | `Document` | 取决于子步骤 |

### 6.2 ContentFetcher

```typescript
// content/content-fetcher.ts

type FetchResult = {
  body: Uint8Array;
  detectedCharset?: string;  // 从 headers 或 meta 检测
};

async function fetchRaw(
  httpFetcher: HttpFetcher,
  url: string,
  options?: HttpFetcherOptions,
): Promise<FetchResult>;
```

### 6.3 CharsetDecoder

```typescript
// content/charset-decoder.ts

const SUPPORTED_CHARSETS = ["utf-8", "gbk", "gb18030", "big5", "shift-jis", "euc-jp"] as const;

function decodeBody(body: Uint8Array, charset?: string): string;
function detectCharset(body: Uint8Array, headers: Record<string, string>): string | undefined;
```

底层用 `TextDecoder` API。`charset` 为空时尝试从 response headers（`Content-Type`）或 HTML meta 标签检测。

### 6.4 ContentExtractor

```typescript
// content/content-extractor.ts

type ExtractResult = {
  content: string;    // 提取后的正文（HTML 或纯文本）
  isHtml: boolean;
};

async function extractContent(
  analyzer: AnalyzeRule,
  contentRule: ContentRule,
  jsExecutor?: JsExecutor,
): Promise<ExtractResult>;
```

职责：
- 内部 `analyzer.setContent(raw)` 自动检测 JSON/HTML/text
- 用 `AnalyzeRule.getString(contentRule.content)` 提取正文
- 处理多页正文：`nextContentUrl` 串联循环，50 页上限防护
- 输出是已提取的正文内容，JSON transport format 在此阶段处理完毕

**vs Legado 改进：**
- Legado 区分单链接/多链接两套逻辑 → ReaderX 统一循环 + 上限
- JSON 是 transport format，在此步骤消化，不传递给 document-parser

### 6.5 DocumentParser

```typescript
// content/document-parser.ts

/** HTML → Document AST（DOMParser 语义解析） */
function parseHtmlToDocument(html: string, title?: string): Document;

/** 纯文本 → Document AST（按 \n 分段） */
function parseTextToDocument(text: string, title?: string): Document;
```

HTML 解析映射：

| HTML 元素 | AST 节点 |
|-----------|---------|
| `<p>`, `<div>` | ParagraphNode |
| `<h1>`-`<h6>` | HeadingNode |
| `<img>` | ImageNode |
| `<blockquote>` | BlockquoteNode |
| `<strong>`, `<b>` | StrongNode |
| `<em>`, `<i>` | EmphasisNode |
| `<a>` | LinkNode |
| `<hr>` | SeparatorNode |
| 其他 | 递归提取文本 → TextNode |

每个节点自动生成 nanoid。

**vs Legado 改进：** Legado 用正则清洗 HTML → ReaderX 用 DOMParser 语义解析 → 结构化 AST。

### 6.6 ContentProcessor（immutable transform）

```typescript
// content/content-processor.ts

class ContentProcessor {
  setRules(rules: ReplaceRule[]): void;
  process(doc: Document): Document;  // 返回新 Document，不修改原 AST
}
```

内部逻辑：深度遍历 AST，对每个 `TextNode.text` 执行 ReplaceRule 管线。返回新节点（spread 替换 text 字段）。结构不变，只改文本内容。

**扩展计划（v1 之后）：**
- 去重复标题：检测正文开头的章节名并去除
- 段落缩进：中文首行缩进两个全角空格
- scope 扩展：支持 `scope`（书名匹配）和 `excludeScope`
- 正则输入长度防护：`MAX_REGEX_INPUT_LENGTH = 1_000_000`

### 6.7 ContentPipeline 编排

```typescript
// content/content-pipeline.ts

type PipelineDeps = {
  httpFetcher: HttpFetcher;
  jsExecutor?: JsExecutor;
};

type PipelineConfig = {
  contentRule: ContentRule;
  url: string;
  urlOptions?: HttpFetcherOptions;
  replaceRules?: ReplaceRule[];
};

async function fetchAndParse(deps: PipelineDeps, config: PipelineConfig): Promise<Document>;
```

编排流程：
```
fetchRaw → decodeBody → extractContent → parseToDocument → ContentProcessor.process
```

---

## 七、Layout Engine

### 7.1 核心思路

```
ParagraphNode.inlines: InlineNode[]
       ↓ flattenInlines
InlineSegment[] (保留 style + nodeId)
       ↓ 拼接全文 → TextLayouter.prepare
TextLayoutHandle
       ↓ layoutNextLine 逐行迭代
TextLayoutLine[]
       ↓ mapLineToRuns（字符范围 → 段映射）
LayoutLine { runs: LayoutRun[] }  ← 语义完整保留
       ↓ 累积行高，满页切割（pagination 状态机）
LayoutPage[] (含定位坐标 x/y)
```

语义传递链：`AST semantic → layout semantic → render semantic`，从不丢失。

### 7.2 Layout Types

```typescript
// layout/types.ts

type InlineStyle = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly href?: string;
};

type LayoutRun = {
  readonly text: string;
  readonly x: number;            // 行内 x 偏移
  readonly width: number;
  readonly style?: InlineStyle;
  readonly sourceNodeId: string; // 回溯到 AST 节点
};

type LayoutLine = {
  readonly runs: readonly LayoutRun[];
  readonly width: number;
  readonly height: number;
  readonly x: number;            // 页内 x
  readonly y: number;            // 页内 y
};

type LayoutPage = {
  readonly index: number;
  readonly lines: readonly LayoutLine[];
  readonly dimensions: PageDimensions;
};

type PageDimensions = {
  readonly width: number;
  readonly height: number;
  readonly contentHeight: number;
  readonly paddingTop: number;
  readonly paddingBottom: number;
  readonly paddingLeft: number;
  readonly paddingRight: number;
};

type LayoutResult = {
  readonly pages: readonly LayoutPage[];
  readonly totalPages: number;
};

type LayoutConfig = {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly lineHeight: number;
  readonly font: string;
  readonly letterSpacing?: number;
  readonly paddingTop: number;
  readonly paddingBottom: number;
  readonly paddingLeft: number;
  readonly paddingRight: number;
};
```

### 7.3 Inline 扁平化（保留语义）

```typescript
// layout/inline-flatten.ts

type InlineSegment = {
  readonly text: string;
  readonly style?: InlineStyle;
  readonly sourceNodeId: string;
};

function flattenInlines(inlines: readonly InlineNode[]): readonly InlineSegment[];
```

示例：
```
[TextNode("Hello "), StrongNode([TextNode("world")])]
  → [{ text: "Hello ", nodeId: "a1" }, { text: "world", style: { bold: true }, nodeId: "b2" }]
```

### 7.4 行到段映射

```typescript
// layout/run-mapper.ts

function mapLineToRuns(
  line: TextLayoutLine,
  segments: readonly InlineSegment[],
): LayoutRun[];
```

将 TextLayoutLine 的字符范围（start.graphemeIndex → end.graphemeIndex）映射回 InlineSegment，生成 LayoutRun[]。保留 style 和 sourceNodeId。

### 7.5 Layout Engine

```typescript
// layout/layout-engine.ts

function layoutDocument(
  doc: Document,
  config: LayoutConfig,
  layouter: TextLayouter,
): LayoutResult;
```

**核心算法：**

```
for each block in doc.blocks:
  if paragraph:
    segments = flattenInlines(block.inlines)
    fullText = segments.map(s => s.text).join("")
    handle = layouter.prepare(fullText, { font })
    cursor = null
    yOffset = current page yOffset

    while (line = layouter.layoutNextLine(handle, cursor, maxWidth)):
      runs = mapLineToRuns(line, segments)
      positionedLine = { runs, x: paddingLeft, y: yOffset, width: line.width, height: lineHeight }

      if yOffset + lineHeight > maxContentHeight:
        flush current page → pages[]
        start new page
        yOffset = paddingTop

      currentPageLines.push(positionedLine)
      yOffset += lineHeight
      cursor = line.end

  if heading:
    // 同 paragraph，可用不同字号
  if separator:
    // 插入间距
  if image:
    // v1: 插入占位信息行
  if blockquote:
    // 递归处理子 blocks

flush final page (如果有剩余行)
```

### 7.6 Pagination 状态机

```typescript
// layout/pagination.ts

type PaginationState = {
  readonly currentPageLines: readonly LayoutLine[];
  readonly currentHeight: number;
  readonly pages: readonly LayoutPage[];
  readonly pageIndex: number;
};

function createPaginationState(): PaginationState;
function addLine(state: PaginationState, line: LayoutLine, config: LayoutConfig): PaginationState;
function flushPage(state: PaginationState, config: LayoutConfig): PaginationState;
```

### 7.7 PretextLayouter

```typescript
// layout/pretext-layouter.ts

class PretextLayouter implements TextLayouter {
  prepare(text: string, options: TextLayoutOptions): TextLayoutHandle;
  layoutNextLine(
    handle: TextLayoutHandle,
    start: LayoutCursor | null,
    maxWidth: number,
  ): TextLayoutLine | null;
}
```

封装 `@chenglou/pretext` 的 `prepareWithSegments` + `layoutNextLine`。转换内部类型为 `LayoutCursor`。不泄漏 pretext 类型。

---

## 八、Renderer（输出契约）

```typescript
// renderer/render-model.ts

type RenderPage = {
  readonly index: number;
  readonly lines: readonly RenderLine[];
  readonly dimensions: PageDimensions;
};

type RenderLine = {
  readonly runs: readonly RenderRun[];
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type RenderRun = {
  readonly text: string;
  readonly x: number;
  readonly width: number;
  readonly style?: InlineStyle;
  readonly sourceNodeId: string;
};

type RenderResult = {
  readonly pages: readonly RenderPage[];
  readonly totalPages: number;
};

function toRenderModel(layout: LayoutResult): RenderResult;
```

**设计决策：**
- renderer 不计算 x/y — 坐标由 LayoutEngine 输出
- `toRenderModel` 当前 1:1 映射，未来可添加 theme-specific 元数据
- 消费方（apps/web）直接用 RenderResult 渲染 DOM/Canvas/SVG
- `sourceNodeId` 贯穿 Layout → Render，支持 selection / highlight 精确映射

---

## 九、改进与舍弃对照

### 9.1 架构级改进

| 维度 | Legado | ReaderX |
|------|--------|---------|
| 内容模型 | `List<String>` 纯文本列表 | Document AST（结构化、不可变、带 ID） |
| 管线类型 | string pipeline | document AST pipeline（语义一路保留） |
| HTML 解析 | 正则清洗 | DOMParser 语义解析 → AST |
| 内容处理 | 作用在字符串 | 作用在 AST 节点（immutable transform） |
| 排版引擎 | 自建 ~2050 行 ZhLayout + TextMeasure | pretext ~200 行 + TextLayouter 抽象 |
| 排版输出 | TextColumn 逐字像素坐标 | positioned LayoutLine + LayoutRun（语义保留） |
| 渲染模型 | Android Canvas 绑定 | RenderModel（多端适配：DOM/Canvas/SVG） |
| 状态管理 | 全局单例 ReadBook | 纯函数管线 + 依赖倒置 |
| HTTP 依赖 | 直接 OkHttpClient | HttpFetcher 依赖倒置，body bytes + charset 分离 |
| JS 规则 | 直接 eval | JsExecutor 依赖倒置 |
| Cursor 模型 | number offset | DocumentCursor / PageCursor / LayoutCursor（grapheme-level） |
| 节点引用 | 无稳定 ID | BaseNode.id（支持 selection / diff / incremental layout） |

### 9.2 舍弃项

| Legado 组件 | 行数 | 舍弃原因 |
|-------------|------|---------|
| ZhLayout 中文断行 | ~600 | pretext 处理，或未来 CSS `text-spacing` |
| TextMeasure 文字测量 | ~200 | pretext 内建 |
| TextColumn 逐字坐标 | ~150 | LayoutRun 行级语义替代 |
| CanvasRecorder 渲染缓存 | ~300 | DOM 增量更新 |
| SimulationPageDelegate 仿真翻页 | ~800 | CSS View Transitions |
| ScrollPageDelegate 滚动模式 | ~200 | CSS scroll-snap |
| reSegment 段落重切 | ~630 | Document AST 天然结构化 |
| 简繁转换 | ~400 | `Intl.Locale` API 或独立包 |
| Canvas 绘制全部 | ~1500 | DOM + CSS 渲染 |

### 9.3 新增能力

| 能力 | 说明 |
|------|------|
| Document AST | 结构化内容模型，支持富文本扩展 |
| Immutable AST | readonly + immutable transform，支持 structural sharing |
| Node ID | 稳定引用，支持 selection / annotation / diff |
| Cursor 模型 | grapheme-level 定位，稳定跨 UTF-16 / BIDI / emoji |
| TextLayouter 抽象 | 可替换排版后端（pretext → HarfBuzz → WASM） |
| Positioned Layout | Layout Engine 输出坐标，renderer 不重算 |
| Semantic-preserving Layout | InlineSegment → LayoutRun，语义从不丢失 |
| Contracts 依赖倒置 | 所有 IO 通过接口注入，纯逻辑可测试 |
| Charset 分离 | body bytes + 独立解码，不耦合 HTTP 层 |
| 分页上限防护 | 50 页上限防止书源规则错误导致无限循环 |

---

## 十、依赖方向

```
@readerx/infrastructure
        ↑ (不直接依赖，通过 HttpFetcher 注入)
@readerx/rule-engine ← @readerx/reader-engine
        ↑                      ↑
  (类型引用)          (JsExecutor re-export)

@chenglou/pretext ← reader-engine/layout/pretext-layouter.ts (仅此一处)
```

reader-engine 的 package.json 依赖：
- `@readerx/rule-engine` — workspace 引用（类型 + AnalyzeRule）
- `@chenglou/pretext` — 文本排版
- `nanoid` — 节点 ID 生成

不依赖：
- `@readerx/infrastructure` — 通过 HttpFetcher 注入
- `@readerx/quickjs-runtime` — 通过 JsExecutor 注入
- `@readerx/persistence` — 消费方（apps/web）负责

---

## 十一、v1 实现范围

### 必须实现

- [ ] Document AST（nodes.ts）— ParagraphNode + TextNode + Document + BaseNode
- [ ] Cursor 模型（cursors.ts）— DocumentCursor + PageCursor + LayoutCursor
- [ ] Contracts（contracts/）— HttpFetcher + JsExecutor re-export + TextLayouter
- [ ] ContentFetcher（content-fetcher.ts）— HTTP 获取原始 bytes
- [ ] CharsetDecoder（charset-decoder.ts）— Uint8Array → string
- [ ] ContentExtractor（content-extractor.ts）— AnalyzeRule 提取正文 + 多页串联
- [ ] DocumentParser（document-parser.ts）— HTML/text → Document AST
- [ ] ContentProcessor（content-processor.ts）— 适配为 Document → Document immutable
- [ ] ContentPipeline（content-pipeline.ts）— 编排完整管线
- [ ] Inline flatten（inline-flatten.ts）— InlineNode[] → InlineSegment[]
- [ ] Run mapper（run-mapper.ts）— TextLayoutLine → LayoutRun[]
- [ ] PretextLayouter（pretext-layouter.ts）— TextLayouter 实现
- [ ] Layout Engine（layout-engine.ts）— Document → LayoutResult
- [ ] Pagination（pagination.ts）— 分页状态机
- [ ] RenderModel（render-model.ts）— toRenderModel 输出契约

### v1 之后扩展

- HeadingNode / ImageNode / BlockquoteNode 渲染支持
- 去重复标题
- 段落缩进
- ReplaceRule scope 扩展（scope / excludeScope）
- 正则输入长度防护
- 图片混排分页
- Incremental layout（基于 node ID diff）

---

## 十二、测试策略

每个模块独立可测，所有 IO 通过依赖倒置 mock：

| 模块 | 测试方式 | mock 需求 |
|------|---------|-----------|
| ContentFetcher | mock HttpFetcher | 返回固定 Uint8Array |
| CharsetDecoder | 直接测试 | 各种编码的 bytes |
| ContentExtractor | mock AnalyzeRule | 返回固定 ParseResult |
| DocumentParser | 直接测试 | 各种 HTML / text 输入 |
| ContentProcessor | 直接测试（现有 13 测试需适配） | Document 输入 |
| Inline flatten | 直接测试 | InlineNode[] |
| Run mapper | 直接测试 | TextLayoutLine + segments |
| PretextLayouter | 集成测试（需要浏览器/Worker 环境） | 无 |
| Layout Engine | mock TextLayouter | 返回固定行 |
| Pagination | 直接测试 | 纯状态机 |
| toRenderModel | 直接测试 | LayoutResult |

---

## 十三、与 CLAUDE.md 一致性

| 约束 | 合规 | 说明 |
|------|------|------|
| Feature 和 Engine 分离 | ✅ | 渲染器在 apps/web，engine 输出 RenderResult |
| Runtime 独立 | ✅ | 不依赖 quickjs-runtime，通过 JsExecutor 注入 |
| 按边界分包 | ✅ | reader-engine 是完整文档引擎领域 |
| Edge-compatible | ✅ | 纯逻辑代码；pretext 在 Worker 中运行 |
| ESM-only | ✅ | 所有代码 ESM |
| 禁止 any | ✅ | 全部严格类型 |
| 禁止 enum | ✅ | 用 discriminated union |
| 禁止 non-null assertion | ✅ | 可选链 + 空值合并 |
| import type | ✅ | 类型导入标记 |
| 优先 type 而非 interface | ✅ | 全部 type |
| 包依赖方向 | ✅ | reader-engine → rule-engine，不依赖 infrastructure/quickjs-runtime |
