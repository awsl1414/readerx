# Step 5 改进分析：ReaderX vs Legado 阅读引擎

> 逐组件对比分析，记录改进项、舍弃项及其理由。V3 更新：引入 Document AST pipeline。

---

## 一、架构层改进

### 1.1 Document AST Pipeline vs String Pipeline

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| 内容模型 | `List<String>` 纯文本列表 | Document AST（结构化、不可变、带 ID） |
| 管线类型 | HTML → text → page (string pipeline) | bytes → string → AST → positioned layout → render model |
| 语义传递 | 排版时丢失所有 HTML 语义 | 语义从 AST 一路保留到 LayoutRun（AST → layout → render） |
| 富内容扩展 | 需要重写整个排版层 | 新增节点类型即可（ImageNode / BlockquoteNode 等） |

**改进理由：** string pipeline 是大多数阅读器项目的技术债根源。Document AST pipeline 使 reader-engine 从"小说分页器"升级为"阅读文档引擎"，未来 2-3 年不会成为技术债。

### 1.2 纯函数管线 vs 可变类状态

| 维度 | Legado | ReaderX |
|------|--------|---------|
| 内容获取 | `class WebBook(bookSource)` 持有成员变量 | 纯函数 `fetchAndParse(deps, config)` |
| 内容处理 | `ContentProcessor` 单例缓存 WeakReference | immutable transform `Document → Document` |
| URL 分析 | `AnalyzeUrl` 有状态对象 | rule-engine 已实现纯函数版 `analyzeUrlAsync` |
| 状态管理 | `object ReadBook` 全局单例 | Zustand store（apps/web 层） |

### 1.3 依赖倒置（Contracts）

| IO 类型 | Legado | ReaderX V3 |
|---------|--------|------------|
| HTTP | 直接 OkHttpClient | `HttpFetcher` 接口（contracts/http-fetcher.ts） |
| JS 执行 | 直接 eval | `JsExecutor` 接口（re-export from rule-engine） |
| 排版后端 | 耦死在 ZhLayout | `TextLayouter` 接口（contracts/text-layouter.ts） |

**改进理由：**
- reader-engine 不依赖 infrastructure/quickjs-runtime 包，遵守依赖方向
- 所有 IO 可 mock，纯逻辑可测试
- TextLayouter 抽象使排版后端可替换（pretext → HarfBuzz → WASM）

### 1.4 节点 ID 与 Cursor 模型

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| 节点引用 | 无稳定 ID，靠 index 定位 | `BaseNode.id`（nanoid），稳定跨 mutation |
| 位置定位 | `number offset`（UTF-16 不稳定） | `DocumentCursor { blockId, inlineIndex, graphemeIndex }` |
| 页面定位 | `durChapterPos`（字符位置） | `PageCursor { pageIndex, lineIndex, runIndex, graphemeIndex }` |
| Selection | 手动 hitTest | `LayoutRun.sourceNodeId` 精确映射回 AST 节点 |

**改进理由：** grapheme-level cursor 解决 emoji / surrogate pair / BIDI / CJK variation selector 的定位问题。Node ID 支持 selection / annotation / diff / incremental layout / caching。

### 1.5 Immutable AST

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| AST 可变性 | 可变（直接修改字符串列表） | 全部 `readonly`，ContentProcessor 返回新 AST |
| 缓存 | 无（每次重排） | 支持 structural sharing / memoization |
| Worker 传输 | N/A | immutable 数据可安全跨 Worker |

---

## 二、内容获取改进

### 2.1 HTML 清洗：DOMParser 替代正则

| 维度 | Legado | ReaderX |
|------|--------|---------|
| 实现 | `HtmlFormatter` 用正则匹配标签 | `DocumentParser` 用 DOMParser 解析 DOM 树 → AST |
| 图片提取 | 正则 `imgPattern` 匹配 src/data-src | DOM `querySelectorAll('img')` → ImageNode |
| URL 解析 | 手动拼接 | `new URL(src, baseUrl).href` |
| 可靠性 | 正则无法处理嵌套/异常 HTML | 浏览器原生容错解析 |

### 2.2 Charset 解码分离

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| 解码位置 | 内嵌在 HTTP 响应处理中 | 独立 `charset-decoder.ts` |
| 输入 | `String`（假设 UTF-8） | `Uint8Array`（原始字节） |
| 编码支持 | 隐式（依赖 OkHttp） | 显式支持 GBK / GB18030 / Big5 / Shift-JIS / EUC-JP |

**改进理由：** `HttpFetcherResponse.body: Uint8Array` 替代 `text(): Promise<string>`。charset 不应在 HTTP 层耦合，而是由独立的解码层处理。

### 2.3 多页正文串联简化

Legado 有两种模式（单 URL 循环 + 多 URL 并发）。ReaderX 统一为循环 + 50 页上限防护。

### 2.4 JSON transport format 分离

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| JSON 处理 | 混在 BookContent 中 | `ContentExtractor` 独立处理 |
| Document 输入 | 可能接收 JSON 内容 | `DocumentParser` 只接收 HTML 或纯文本 |

**改进理由：** JSON 是 transport format，不是 document format。提取步骤消化 JSON，解析步骤只处理 HTML/text。职责清晰。

---

## 三、内容处理改进

### 3.1 ContentProcessor 管线扩展

| 功能 | Legado | ReaderX V3 | 优先级 |
|------|--------|------------|--------|
| ReplaceRule 执行 | ✅ scope/excludeScope/timeout | ⚠️ 仅有 scopeTitle/scopeContent → 扩展为 Document transform | P0 |
| 去重复标题 | ✅ 正则匹配 | ❌ 待实现 | P0 |
| 段落缩进 | ✅ 两个全角空格 | ❌ 待实现 | P0 |
| 标题前置 | ✅ 可选 | ❌ 待实现 | P1 |
| 正则输入长度防护 | ❌ | ❌ 待实现（`MAX_REGEX_INPUT_LENGTH`） | P1 |
| 段落重排 | ✅ reSegment 630 行 | ❌ 舍弃 | P2 |
| 简繁转换 | ✅ 内建 | ❌ 舍弃 | P2 |

### 3.2 舍弃：段落重排（reSegment）

630 行中文段落自动断句引擎，复杂度极高。Document AST 天然结构化，不需要后置重排。如果源内容无换行，后期可用 AI 断句替代。

### 3.3 舍弃：简繁转换

增加 `opencc-js` 依赖（~50KB），非核心功能。可在 AI 增强层实现。

---

## 四、排版引擎改进

### 4.1 pretext 替代自建排版层

| Legado 组件 | 行数 | ReaderX V3 替代 |
|-------------|------|-----------------|
| ZhLayout.kt | ~600 | pretext 内建 CJK 支持 + `line-break: strict` |
| TextMeasure.kt | ~200 | pretext 内建 Canvas 测量 + 缓存 |
| TextChapterLayout.kt | ~800 | pretext `prepareWithSegments()` + `layoutNextLine()` |
| ChapterProvider.kt | ~900 | `LayoutConfig` + `PretextLayouter` |

**总计替代：~2050 行 Kotlin → ~200 行 TypeScript**（仅 layout-engine.ts + pretext-layouter.ts）

### 4.2 TextLayouter 抽象

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| 排版后端 | 耦死 ZhLayout + StaticLayout | `TextLayouter` 接口，`PretextLayouter` 实现 |
| 替换成本 | 重写整个排版层 | 新增一个 `TextLayouter` 实现 |
| pretext 泄漏 | N/A | 不泄漏，仅 `pretext-layouter.ts` 一处依赖 |

**改进理由：** 未来替换 pretext 为 HarfBuzz / WASM text shaping 只需新增一个实现，不影响 layout-engine。

### 4.3 Semantic-Preserving Layout（语义保留排版）

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| 排版输入 | `List<String>`（纯文本） | `Document` AST |
| 行内语义 | 排版时丢失 | `InlineSegment[]` → `LayoutRun[]`（保留 style + nodeId） |
| 富文本 | 图片/加粗/链接需特殊处理 | 节点类型自然支持 |

**核心管线：**
```
InlineNode[] → InlineSegment[] (保留 style + nodeId)
  → TextLayouter (纯文本排版)
  → mapLineToRuns (字符范围 → 段映射)
  → LayoutRun[] (语义完整保留)
```

### 4.4 Positioned Layout（定位输出）

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| 坐标计算 | 渲染器内计算 | LayoutEngine 输出 x/y 坐标 |
| 渲染器职责 | 计算位置 + 绘制 | 只消费 positioned data |
| 多端适配 | 绑定 Android Canvas | DOM / Canvas / SVG / Native 均可消费 |

### 4.5 舍弃：逐字符级渲染数据

Legado 的 `TextColumn` 逐字像素坐标。ReaderX 用 `LayoutRun` 行级语义替代。DOM 渲染不需要逐字定位。

### 4.6 舍弃：异步增量排版

pretext 的 layout 阶段是纯算术，整章排版 <10ms，无需 Channel 增量输出。

---

## 五、渲染层改进（在 apps/web 实现）

### 5.1 RenderModel 输出契约

| 维度 | Legado | ReaderX V3 |
|------|--------|------------|
| 引擎输出 | TextPage + TextColumn（Android Canvas 专属） | `RenderResult`（RenderPage + RenderLine + RenderRun） |
| 多端适配 | 绑定 Android | DOM / Canvas / SVG / Native 均可消费 |
| 渲染器 | 计算位置 + Canvas 绘制 | 只消费 positioned RenderResult |

### 5.2 DOM 渲染替代 Canvas

| 渲染需求 | Legado | ReaderX |
|----------|--------|---------|
| 文字显示 | Canvas drawText | DOM `<span>` + CSS font |
| 翻页动画 | 自建贝塞尔曲线 Canvas | CSS View Transitions / Web Animations |
| 文字选中 | 手动 hitTest | 浏览器原生 getSelection() |
| 无障碍 | 无 | DOM 天然支持 ARIA |

### 5.3 舍弃的 Canvas 组件

ContentTextView / CanvasRecorder / SimulationPageDelegate / ScrollPageDelegate — 全部由 DOM + CSS 替代。

---

## 六、数据模型改进

### 6.1 Document AST 替代纯字符串

Legado 的 `textList: List<String>` 无法区分文本段落和图片段落。ReaderX 引入完整的 Document AST：

```
Document
  └── blocks: BlockNode[]
        ├── ParagraphNode { inlines: InlineNode[] }
        ├── HeadingNode { level, inlines }
        ├── ImageNode { src, alt }
        ├── BlockquoteNode { blocks }
        └── SeparatorNode

InlineNode = TextNode | StrongNode | EmphasisNode | LinkNode | ImageInlineNode
```

- 所有节点继承 `BaseNode { readonly id: string }`
- 全部 `readonly`，immutable transform
- v1 只实现 ParagraphNode + TextNode，其他节点预留扩展

### 6.2 LayoutRun 替代纯文本

```typescript
// Legado: TextPage { text: "全文..." }
// ReaderX V3: LayoutLine { runs: LayoutRun[] }
type LayoutRun = {
  text: string;
  x: number;
  width: number;
  style?: { bold?: boolean; italic?: boolean; href?: string };
  sourceNodeId: string; // 回溯到 AST 节点
};
```

---

## 七、新增能力（Legado 没有）

| 能力 | 说明 | 优先级 |
|------|------|--------|
| Document AST Pipeline | 结构化内容模型，语义一路保留 | P0 |
| Immutable AST | readonly + immutable transform | P0 |
| Node ID | 稳定引用，支持 selection / annotation / diff | P0 |
| Cursor 模型 | grapheme-level 定位 | P0 |
| TextLayouter 抽象 | 可替换排版后端 | P0 |
| Positioned Layout | Layout Engine 输出坐标 | P0 |
| Semantic-Preserving Layout | LayoutRun 保留 style + nodeId | P0 |
| Contracts 依赖倒置 | IO 全部注入 | P0 |
| Charset 分离 | body bytes + 独立解码 | P0 |
| RenderModel | 多端适配渲染输出契约 | P0 |
| 多页内容上限 | 50 页防护 | P1 |
| 正则输入长度防护 | `MAX_REGEX_INPUT_LENGTH` | P1 |
| 类型安全管线 | Zod 校验输入 | P1 |
| 管线可观测性 | 每步可选输出中间结果 | P2 |

---

## 八、依赖使用对照

| 依赖 | 用途 | 引用方式 |
|------|------|---------|
| `@readerx/rule-engine` | AnalyzeRule + AnalyzeUrl + ContentRule 类型 | 直接依赖（workspace） |
| `@chenglou/pretext` | 文本测量与行分割 | 直接依赖（仅 pretext-layouter.ts） |
| `nanoid` | 节点 ID 生成 | 直接依赖 |
| `@readerx/infrastructure` | HTTP 请求 | **不直接依赖**，通过 HttpFetcher 注入 |
| `@readerx/quickjs-runtime` | JS 规则执行 | **不直接依赖**，通过 JsExecutor 注入 |

---

## 九、总结

| 类别 | 数量 | 关键项 |
|------|------|--------|
| 🔧 改进 | 14 | Document AST、immutable transform、semantic-preserving layout、positioned layout、TextLayouter 抽象、Cursor 模型、Node ID、DOMParser、charset 分离、JSON transport 分离、pretext 排版、纯函数管线、多端 RenderModel、依赖倒置 |
| 🗑️ 舍弃 | 10 | ZhLayout、TextMeasure、逐字渲染、Canvas 全套、仿真翻页 Canvas、滚动模式 Canvas、CanvasRecorder、reSegment、简繁转换、图片预下载 |
| ✨ 新增 | 14 | Document AST Pipeline、Immutable AST、Node ID、Cursor、TextLayouter 抽象、Positioned Layout、Semantic Layout、Contracts、Charset 分离、RenderModel、多页上限、正则防护、类型安全管线、管线可观测性 |

**净效果：** Legado ~5000 行 Kotlin 排版+渲染代码 → ReaderX ~600 行 TypeScript 纯逻辑代码（含 AST + layout + pipeline），功能更强大，可维护性大幅提升，架构为未来 2-3 年演进做好准备。
