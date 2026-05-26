# Step 5: Reader Engine — 完成状态检查与架构分析

> 对照 Legado 原项目，逐组件分析适用性，结合现代前端技术重设计。

## 一、当前完成状态

| 模块 | 文件 | 状态 | 说明 |
|------|------|------|------|
| content/ | `content-processor.ts` | ✅ 已实现 | ReplaceRule 执行引擎，13 测试通过 |
| content/ | `types.ts` | ✅ 已实现 | ReplaceRule 类型 |
| pagination/ | `types.ts` | ⚠️ 仅类型 | Page、PaginationResult 接口，无实现 |
| renderer/ | `types.ts` | ⚠️ 仅类型 | RenderOptions 接口，无实现 |
| src/ | `types.ts` | ⚠️ 仅类型 | ReadingState、ChapterContent、PaginationConfig |
| 依赖 | `@chenglou/pretext` | 🔴 已安装未使用 | 文本测量与布局库 |
| 依赖 | `@readerx/rule-engine` | 🔴 已声明未使用 | 应用于内容获取阶段 |

**结论：Step 5 约 15% 完成。** ContentProcessor 可用，但内容获取、分页引擎、渲染器三个核心模块均为空壳。

---

## 二、Legado 组件分析：适用性逐项评估

### 2.1 内容获取与解析（WebBook → BookContent）

**Legado 实现：**
- `WebBook.kt` — 门面类，协调搜索/详情/目录/正文四个阶段
- `BookContent.kt` — 用 `AnalyzeRule` 执行 `ContentRule`，提取正文
- 支持多页正文（`nextContentUrl` 串联）
- `HtmlFormatter.formatKeepImg()` 清洗 HTML，保留 `<img>`

**ReaderX 适用性：✅ 全部适用，但需重设计为纯函数管线**

Legado 的 WebBook 是 Kotlin class 层级（`class WebBook` 持有 `val bookSource`），方法之间通过成员变量传递状态。现代前端应改为：

```
// Legado: class + mutable state
class WebBook(val bookSource: BookSource) {
    suspend fun getContentAwait(book, chapter, body): BookContent
}

// ReaderX: 纯函数管线，数据流显式
function fetchContent(
    bookSource: BookSource,
    book: Book,
    chapter: BookChapter,
    httpClient: HttpClient,
): Promise<ChapterContent>
```

**改进项：**
- Legado 的 `HtmlFormatter` 是 Android 专有实现 → ReaderX 用 DOMParser（浏览器原生）
- Legado 多页串联用 `suspend fun` 递归 → ReaderX 用 `async iterable` 或 `while` 循环
- Legado 内容缓存写磁盘 → ReaderX 写 OPFS（已有 persistence 层）
- Legado `ContentRule.replaceRegex` 在获取阶段执行 → ReaderX 应放在 ContentProcessor（已实现），保持职责分离

### 2.2 内容处理（ContentProcessor）

**Legado 实现（远比 ReaderX 复杂）：**
1. 去重复标题（正则匹配章节名，可按章禁用）
2. 段落重排（`ContentHelp.reSegment()`）
3. 简繁转换（T2S / S2T）
4. ReplaceRule 执行（含 `scope`、`excludeScope`、`timeoutMillisecond`）
5. 标题前置（title 可选包含在正文头部）
6. 段落分割 + 缩进

**ReaderX 适用性：部分适用**

| 功能 | 适用？ | 理由 |
|------|--------|------|
| 去重复标题 | ✅ 适用 | 网文正文常以章节名开头，需去除 |
| 段落重排 | ⚠️ 可选 | 部分源内容无换行，需按句号断句 |
| 简繁转换 | ❌ 暂不需要 | 增加依赖，可延后。需要时用 `opencc-js` |
| ReplaceRule scope/excludeScope | ✅ 适用 | 当前只有 `scopeTitle`/`scopeContent`，缺少 `scope`（书名匹配）和 `excludeScope` |
| ReplaceRule timeout | ✅ 适用 | 正则灾难性回溯防护。JS 原生无 regex timeout，需用 `@aspect-build/regex-timeout` 或 Worker 方案 |
| 标题前置 | ✅ 适用 | 用户可选在正文开头显示章节标题 |
| 段落缩进 | ✅ 适用 | 中文阅读习惯，首行缩进两个全角空格 |

**改进项：**
- ReaderX 的 `ReplaceRule` 类型与 persistence 层的 `ReplaceRule` 重复定义 → 应统一为 `@readerx/rule-engine` 或 `@readerx/reader-engine` 中的单一类型源
- ContentProcessor 应扩展为管线模式：`ContentPipeline` 包含多个可插拔步骤

### 2.3 分页引擎（ChapterProvider / TextChapterLayout）

**Legado 实现（~2000 行核心代码）：**
- `ChapterProvider.kt` — Android `StaticLayout` 封装，逐段落测量高度，按页切割
- `ZhLayout.kt` — 自定义中文排版引擎，处理避首尾规则（逗号不能在行首，引号不能在行尾）
- `TextMeasure.kt` — 字符宽度缓存，加速测量
- `TextChapterLayout.kt` — 异步增量排版，通过 Channel 逐页输出

**ReaderX 适用性：❌ 不适用，完全重设计**

这是最大的架构差异点。Legado 需要自建排版引擎是因为 Android `StaticLayout` 的 CJK 支持有限。Web 平台完全不同：

| 能力 | Legado（Android） | ReaderX（Web） |
|------|-------------------|----------------|
| 文本测量 | 自建 TextMeasure + Canvas 缓存 | `@chenglou/pretext` 的 `prepare()` + `layout()` |
| CJK 避首尾 | 自建 ZhLayout（200+ 行） | 浏览器原生 `line-break: strict` + pretext |
| 字素分割 | 手动实现 | `Intl.Segmenter`（pretext 内部使用） |
| 行分割 | 自建 StaticLayout 封装 | pretext 的 `layoutWithLines()` / `layoutNextLineRange()` |
| 页分割 | 手动 Y 轴累加 + 页切割 | pretext 测量高度 + 简单除法/累加 |
| 异步排版 | Kotlin Channel | Web Worker + OffscreenCanvas（可选） |

**核心改进：用 `@chenglou/pretext` 替代 Legado 的整个排版层**

```typescript
// Legado 的方式（手动测量每个字符）
for (each character) {
    charWidth = textMeasure.measureChar(char)
    if (currentX + charWidth > visibleWidth) {
        // 手动处理行中断、避首尾
    }
}

// ReaderX 的方式（pretext 一行搞定）
const prepared = prepareWithSegments(paragraph, font)
const { lines } = layoutWithLines(prepared, pageWidth, lineHeight)
// lines[i].text / .width / .start / .end 全部可用
```

**避首尾规则（ZhLayout 替代方案）：**

Legado 自建 ZhLayout 处理中文排版禁则。现代浏览器的 CSS `line-break: strict` 已经内置了这些规则。pretext 基于浏览器 Canvas 测量，天然继承了浏览器的行分割行为。

如果需要更精细的控制（如自定义禁则表），可以在 pretext 的 `layoutNextLineRange()` 基础上添加后处理——但这应该是优化阶段的事，不是 MVP 需要。

### 2.4 渲染器（ReadView / PageDelegate / TextPage）

**Legado 实现：**
- `ReadView.kt` — Android FrameLayout，持有三个 PageView（前页/当前页/后页）
- `PageDelegate` — 翻页动画策略：CoverPageDelegate（覆盖）、SlidePageDelegate（滑动）、SimulationPageDelegate（仿真翻页）、ScrollPageDelegate（滚动）
- `TextPage.draw()` — Canvas 绘制：逐行 → 逐字 → drawText
- `TextColumn.draw()` — 单字级别渲染，支持选中高亮

**ReaderX 适用性：❌ 不适用，完全不同的渲染模型**

这是第二大差异。Legado 全程使用 Canvas 绘制（因为 Android Canvas 是高性能渲染的唯一选择）。Web 有更好的选择：

**推荐方案：DOM 渲染 + CSS 动画**

```
Legado: Canvas drawText() 逐字渲染
  ↕ 完全不同
ReaderX: DOM <div> + CSS + 少量 Canvas（仅翻页特效）
```

| 渲染需求 | Legado 方案 | ReaderX 现代方案 |
|----------|-------------|-----------------|
| 文字显示 | Canvas drawText | DOM `<span>` + CSS font |
| 翻页动画 | 自建 SimulationPageDelegate（贝塞尔曲线 Canvas 动画） | CSS View Transitions API 或 Web Animations API |
| 覆盖翻页 | Canvas 位图滑动 | CSS `transform: translateX()` + GPU 加速 |
| 滑动翻页 | Canvas touch 手动追踪 | CSS Scroll Snap + `scroll-behavior: smooth` |
| 文字选中 | 手动 hitTest + 高亮绘制 | 浏览器原生 `window.getSelection()` |
| 无障碍 | 无（Canvas 不支持） | DOM 天然支持 ARIA / 屏幕阅读器 |
| 响应式 | 手动计算尺寸 | CSS Container Queries + `clamp()` |

**改进理念：**
1. **文本渲染交给 DOM** — 不需要 Canvas 画文字。CSS 的 font rendering、subpixel antialiasing、系统字体回退都比手动 Canvas 渲染好
2. **翻页动画交给 CSS** — View Transitions API + Web Animations API 可以实现 60fps 翻页，无需手写 Canvas 动画
3. **只有「仿真翻页」需要 Canvas** — 贝塞尔曲线翻页效果是唯一的 Canvas 使用场景，且应作为可选增强
4. **pretext 只负责"计算页"** — 分页引擎输出 Page[]，渲染器决定如何展示（DOM / Canvas / 未来 SVG）

### 2.5 阅读状态机（ReadBook）

**Legado 实现：**
- `ReadBook.kt` — 全局单例 object，持有 `book`、`bookSource`、`prev/cur/nextTextChapter` 三章窗口
- `ReadBookViewModel.kt` — Activity 级 ViewModel，管理生命周期
- `TextPageFactory.kt` — 页导航逻辑：下一页 / 上一页 / 跨章跳转

**ReaderX 适用性：⚠️ 概念适用，实现完全不同**

Legado 的 `ReadBook` 是 Kotlin `object` 全局单例 + `Channel` 异步管道。ReaderX 应：

```
Legado: object ReadBook { ... }  // 全局可变状态
ReaderX: Zustand store (per CLAUDE.md) + TanStack Query (内容缓存)
```

| 概念 | Legado | ReaderX |
|------|--------|---------|
| 当前阅读状态 | ReadBook object 成员变量 | Zustand store（UI state） |
| 三章窗口 | prevTextChapter / curTextChapter / nextTextChapter | store 中持有三章 Page[] |
| 内容获取 | suspend fun + OkHttp | TanStack Query 或直接 fetch（server state） |
| 进度保存 | BookHelp.saveContent() | persistence 层的 reading-progress repo |
| 章节预加载 | 手动触发 next/prev 加载 | TanStack Query prefetchNextPage |

**三章窗口的概念应保留**（前一章 + 当前章 + 下一章），这是阅读器流畅翻页的基础。但实现用 Zustand + TanStack Query。

---

## 三、现代前端架构重设计

### 3.1 模块职责重新划分

```
packages/reader-engine/src/
├── content/
│   ├── content-fetcher.ts      # 新增：用 rule-engine 从网页提取正文
│   ├── content-processor.ts    # 已有：扩展 ReplaceRule 管线
│   ├── content-pipeline.ts     # 新增：组合 fetcher → processor → 输出
│   ├── html-formatter.ts       # 新增：HTML 清洗（DOMParser）
│   └── types.ts                # 已有：扩展
├── pagination/
│   ├── paginator.ts            # 新增：基于 pretext 的分页引擎
│   ├── text-measurer.ts        # 新增：pretext 封装 + 字体/尺寸管理
│   └── types.ts                # 已有：扩展
├── renderer/                    # 注意：渲染器移到 apps/web/features/reader/
│   └── types.ts                # 仅保留纯类型定义
└── types.ts                    # 已有：扩展
```

**关键架构决策：renderer（渲染器）不属于 packages/reader-engine**

渲染器是 UI 层职责。`packages/reader-engine` 应该只输出纯数据：
- `ChapterContent`（清洗后的正文文本）
- `Page[]`（分页结果，每页包含文本和偏移量）

具体怎么画在屏幕上（DOM / Canvas / CSS 动画）是 `apps/web/features/reader/` 的事。这符合 CLAUDE.md 的 "Feature 和 Engine 分离" 原则。

### 3.2 数据流设计

```
┌─────────────────────────────────────────────────────────────────────┐
│ packages/reader-engine（纯逻辑，零 DOM 依赖）                        │
│                                                                     │
│  BookSource.ruleContent                                             │
│       ↓                                                             │
│  content-fetcher.ts                                                 │
│    ├─ HTTP 请求（通过 infrastructure 的 fetch）                      │
│    ├─ AnalyzeRule 执行 ContentRule.content                          │
│    ├─ 多页串联（nextContentUrl）                                     │
│    └─ html-formatter.ts（DOMParser 清洗，保留 <img>）                │
│       ↓                                                             │
│  content-processor.ts                                               │
│    ├─ 去重复标题                                                     │
│    ├─ 段落重排（可选）                                               │
│    ├─ ReplaceRule 执行（scope / excludeScope / timeout）            │
│    ├─ 标题前置（可选）                                               │
│    └─ 段落缩进                                                      │
│       ↓                                                             │
│  ChapterContent { title, paragraphs: string[] }                     │
│       ↓                                                             │
│  paginator.ts（基于 @chenglou/pretext）                              │
│    ├─ prepareWithSegments() 每段文字                                 │
│    ├─ layoutWithLines() 获取行数据                                   │
│    ├─ 按 pageHeight 累加切割页面                                     │
│    └─ 图片混排（layoutNextLineRange 变宽）                           │
│       ↓                                                             │
│  Page[] { index, startOffset, endOffset, text, lines[] }            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
       ↓ （纯数据传递，无 DOM 耦合）
┌─────────────────────────────────────────────────────────────────────┐
│ apps/web/features/reader/（UI 层）                                   │
│                                                                     │
│  store.ts — Zustand 持有 ReadingState                               │
│  use-chapter.ts — TanStack Query 获取章节                            │
│  reader-view.tsx — DOM 渲染 + CSS 翻页动画                          │
│  page-turn/ — View Transitions / CSS Scroll Snap / 可选 Canvas     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 关键技术选型

| 需求 | Legado 方案 | ReaderX 方案 | 理由 |
|------|-------------|-------------|------|
| 文本测量 | 自建 TextMeasure | `@chenglou/pretext` prepare() | 无 DOM reflow，Canvas 测量，支持 CJK/BIDI |
| 行分割 | 自建 ZhLayout | pretext layoutWithLines() | 浏览器原生 CJK 断行，无需自建禁则表 |
| 页分割 | 手动 Y 累加 | pretext height + 累加切割 | 同样的数学原理，pretext 提供精确行高 |
| 图片混排 | 手动计算 | pretext layoutNextLineRange() 变宽 | pretext 原生支持变宽行布局 |
| HTML 清洗 | 自建 HtmlFormatter | DOMParser + 保留 img | 浏览器原生 DOM 解析，零依赖 |
| 简繁转换 | 自建 | 暂不实现 | 非核心，需要时引入 `opencc-js` |
| 正则超时 | 无 | Worker 方案 或 截断 | JS 无原生 regex timeout，可用 Worker 中断 |
| 翻页动画 | Canvas 贝塞尔 | CSS View Transitions / Web Animations | GPU 加速，声明式，无需手写 Canvas |

### 3.4 pretext 在分页引擎中的角色

pretext 不是"替代品"，而是**分页引擎的核心依赖**。分页引擎的工作流：

```typescript
// 1. 准备阶段：为每段文字创建测量句柄（一次性工作）
const preparedParagraphs = paragraphs.map(p =>
    prepareWithSegments(p, font)
)

// 2. 布局阶段：逐段排版，按页高切割
let currentPage: Page = { lines: [], yOffset: 0 }
const pages: Page[] = []

for (const prepared of preparedParagraphs) {
    const { lines } = layoutWithLines(prepared, pageWidth, lineHeight)

    for (const line of lines) {
        if (currentPage.yOffset + lineHeight > pageHeight) {
            pages.push(currentPage)
            currentPage = { lines: [], yOffset: 0 }
        }
        currentPage.lines.push(line)
        currentPage.yOffset += lineHeight
    }
}
if (currentPage.lines.length > 0) pages.push(currentPage)
```

图片混排场景用 `layoutNextLineRange()` 变宽模式：

```typescript
// 图片占位 → 右侧文字区域变窄
while (/* 还有文字 */) {
    const width = yOffset < imageHeight ? pageWidth - imageWidth : pageWidth
    const range = layoutNextLineRange(prepared, cursor, width)
    // ...
}
```

---

## 四、不适用 / 应舍弃的 Legado 组件

| 组件 | 原因 | 替代方案 |
|------|------|---------|
| `ZhLayout`（CJK 避首尾） | 浏览器原生 `line-break: strict` + pretext | 无需自建 |
| `TextMeasure`（字符宽度缓存） | pretext 内部已有 Canvas 测量 + 缓存 | 无需自建 |
| `TextColumn`（单字级渲染） | DOM 渲染不需要逐字定位 | CSS 处理文字渲染 |
| `SimulationPageDelegate`（仿真翻页 Canvas） | MVP 不需要，可作为后续增强 | CSS View Transitions |
| `ScrollPageDelegate`（滚动模式） | CSS `overflow-y: scroll` + `scroll-snap` | 原生 CSS |
| `AutoPager`（自动翻页） | Web Animations API / `setInterval` | 简单实现 |
| `CanvasRecorder`（渲染优化） | DOM 渲染天然支持增量更新 | 不需要 |
| `OkHttpClient` 配置 | 已有 infrastructure 包 | `@readerx/infrastructure` |
| `BookHelp` 磁盘缓存 | 已有 OPFS | `@readerx/persistence` |
| ChineseConverter（简繁转换） | 非核心功能，增加包体积 | 需要时引入 `opencc-js` |

---

## 五、与现有依赖的整合检查

### 5.1 `@readerx/rule-engine` 的使用方式

reader-engine 需要用 rule-engine 的 `AnalyzeRule` 来执行 `ContentRule`：

```typescript
import { AnalyzeRule } from "@readerx/rule-engine"

// content-fetcher.ts 核心逻辑
function extractContent(
    html: string,
    contentRule: ContentRule,
): string {
    const analyzer = new AnalyzeRule()
    analyzer.setContent(html)

    const result = analyzer.getString(contentRule.content)
    if (!result.ok) throw new Error(result.error)
    return result.value
}
```

### 5.2 `@readerx/infrastructure` 的使用方式

内容获取需要 HTTP 请求：

```typescript
import { createHttpClient } from "@readerx/infrastructure"

// content-fetcher.ts
const http = createHttpClient()
const response = await http.fetch(url, { method, headers, body })
```

### 5.3 `@readerx/persistence` 的使用方式

进度保存和内容缓存：

```typescript
// apps/web 层调用，不在 reader-engine 包内
import { readingProgressRepo, cacheRepo } from "@readerx/persistence"
```

### 5.4 `@chenglou/pretext` 的使用方式

分页引擎核心依赖，用于纯数学文本排版：

```typescript
import {
    prepareWithSegments,
    layoutWithLines,
    layoutNextLineRange,
} from "@chenglou/pretext"
```

**注意：** pretext 依赖 `Intl.Segmenter` 和 Canvas 2D 测量。在 Web Worker 中可用（Worker 有 Canvas OffscreenCanvas）。在 Node 测试环境需要 polyfill。

---

## 六、实现优先级建议

按 roadmap.md 的定义，Step 5 有三个子步骤。根据前端特性重排优先级：

### 5.1 内容获取与解析（优先级最高）
- `content-fetcher.ts` — 整合 rule-engine + infrastructure 提取正文
- `html-formatter.ts` — DOMParser 清洗 HTML
- 多页正文串联
- **不依赖** pretext，可立即开始

### 5.2 分页引擎（依赖 pretext）
- `paginator.ts` — 基于 pretext 的纯数学分页
- `text-measurer.ts` — 字体/尺寸配置管理
- 图片混排支持
- **依赖** pretext 已安装（已安装）

### 5.3 渲染器（移至 apps/web）
- 渲染器不属于 engine 包，应放在 `apps/web/features/reader/`
- `packages/reader-engine/src/renderer/` 只保留类型定义
- CSS View Transitions 翻页
- 可选 Canvas 仿真翻页

---

## 七、与 CLAUDE.md 的一致性检查

| 约束 | 合规？ | 说明 |
|------|--------|------|
| Feature 和 Engine 分离 | ✅ | 渲染器移到 apps/web，engine 只输出纯数据 |
| Runtime 独立 | ✅ | reader-engine 不依赖 quickjs-runtime |
| 按边界分包 | ✅ | reader-engine 是完整领域 |
| Edge-compatible | ⚠️ | pretext 使用 Canvas API，需在 Worker 中运行或提供 fallback |
| 禁止 any | ✅ | 所有新代码使用严格类型 |
| 禁止 useEffect fetch | ✅ | 内容获取通过 TanStack Query |
| Store 随 Feature | ✅ | 阅读状态 store 在 features/reader/ |
| 包依赖方向 | ✅ | reader-engine → rule-engine → infrastructure |
