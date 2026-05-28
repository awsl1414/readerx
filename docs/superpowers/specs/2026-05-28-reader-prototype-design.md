# 6.1 阅读器原型设计规格

> 阅读空间系统（Reading Space System）—— 不是 UI，是空间状态变化。

## 设计哲学

**Content is physically stable.** 正文永远不 blur、不移位、不被遮挡。控件是「意图瞬现的轻粒子」，不是「压缩阅读空间的工具栏」。

三原则：
1. **沉浸优先** — UI 只在意图产生瞬间存在，0.8s 后开始消失
2. **氛围而非参数** — 用户选阅读气候，不调 CSS
3. **空间位移** — 目录/设置是空间扩展，不是 overlay

## 目录结构

```text
features/reader/
├── components/
│   ├── reader-view.tsx       # 主容器，持有 session，管理控制层可见性
│   ├── page-renderer.tsx     # RenderPage → React 元素（flatMap，禁止递归）
│   ├── intent-overlay.tsx    # 意图瞬现控制层（capsule 式，自动消失）
│   ├── atmosphere-picker.tsx # 氛围选择器（底部极简 preset 列表）
│   ├── toc-panel.tsx         # 目录：空间位移式，非 drawer overlay
│   └── chapter-end.tsx       # 章节结束节奏页（留白 + 继续提示）
├── hooks/
│   ├── use-reader-session.ts # session 生命周期（open → 阅读 → dispose）
│   └── use-gesture.ts        # 翻页手势（左右/上下/滚动三模式）
├── session.ts                # ReaderSession 类
├── render-scheduler.ts       # 布局失效调度器
├── atmosphere.ts              # 阅读氛围预设定义
└── types.ts                  # 类型定义
```

## 阅读氛围系统

替代传统字号/行距/主题参数面板。用户选择「阅读气候」，系统自动调整排版参数。

### Atmosphere 类型

```ts
type AtmospherePreset =
  | "novel"    // 小说：17px, 1.9 行距, 680px 宽, 暖白
  | "focus"    // 专注：19px, 2.0 行距, 580px 宽, 纯黑
  | "dense";   // 密集：15px, 1.7 行距, 760px 宽, 护眼绿

type ReadingAtmosphere = {
  readonly preset: AtmospherePreset;
  readonly fontSize: number;       // px
  readonly lineHeight: number;     // 倍数
  readonly maxWidth: number;       // px
  readonly paragraphSpacing: number; // 倍行高
  readonly theme: ReaderTheme;
  readonly font: string;
};

type ReaderTheme =
  | "warm-white"  // oklch(0.98 0.005 80) / oklch(0.30 0.01 60)
  | "black"       // oklch(0.08 0 0)      / oklch(0.60 0 0)
  | "green"       // oklch(0.92 0.03 155) / oklch(0.25 0.02 140)
  | "sepia"       // oklch(0.25 0.03 60)  / oklch(0.75 0.03 70)
  | "beige";      // oklch(0.93 0.02 80)  / oklch(0.28 0.02 60)
```

### 预设映射

| 预设 | fontSize | lineHeight | maxWidth | paragraphSpacing | theme |
|------|----------|------------|----------|------------------|-------|
| novel | 17 | 1.9 | 680 | 1.2 行 | warm-white |
| focus | 19 | 2.0 | 580 | 1.4 行 | black |
| dense | 15 | 1.7 | 760 | 0.6 行 | green |

### 实现

`atmosphere.ts` 导出 `ATMOSPHERE_PRESETS: Record<AtmospherePreset, ReadingAtmosphere>` 和 `toLayoutConfig(atmosphere, viewport): LayoutConfig`。

LayoutConfig（reader-engine 的排版输入）由 atmosphere + viewport 尺寸自动计算，不暴露给 UI 层。

## ReaderSession

### API

```ts
class ReaderSession {
  static async open(bookId: string): Promise<ReaderSession>

  // 分页
  getPage(pageIndex: number): RenderPage | undefined
  nextPage(): number
  prevPage(): number

  // 跳转
  jumpToChapter(chapterIndex: number): Promise<void>

  // 氛围变更（触发重排）
  setAtmosphere(preset: AtmospherePreset): void

  // 状态
  readonly chapters: ChapterInfo[]
  readonly currentChapter: number
  readonly pageCount: number
  readonly currentPage: number
  readonly atmosphere: ReadingAtmosphere

  // 事件
  onStateChange(callback: (state: ReaderState) => void): () => void

  // 清理
  dispose(): void
}
```

### 生命周期

```
ReaderSession.open(bookId)
  → IndexedDB 加载书籍 + 目录
  → 获取当前章节内容（Worker Bridge 执行规则）
  → reader-engine 排版（atmosphere → LayoutConfig）
  → 返回 session（currentPage = 恢复位置 或 0）
  → 自动预取前后章节

翻页 → session.nextPage()/prevPage()
  → 更新 currentPage
  → 触发 onStateChange → React 渲染

切换氛围 → session.setAtmosphere("focus")
  → Render Scheduler 取消未完成重排
  → reader-engine 用新 LayoutConfig 重排当前章节
  → onStateChange → React 渲染

章节跳转 → session.jumpToChapter(5)
  → 清除当前分页缓存
  → 获取目标章节（优先从缓存）
  → 排版 → onStateChange

退出 → session.dispose()
  → 保存进度（chapterIndex + pageIndex）到 IndexedDB
  → 清理缓存
```

### 内部结构

```text
ReaderSession
├── chapters: ChapterInfo[]          // 目录（从 IndexedDB）
├── chapterCache: Map<number, {      // 已加载章节
│     document: Document,
│     renderResult: RenderResult
│   }>
├── prefetchQueue: Set<number>       // 预取中的章节索引
├── currentPage: number              // 当前页码
├── currentChapter: number           // 当前章节索引
├── atmosphere: ReadingAtmosphere    // 当前氛围
├── scheduler: RenderScheduler       // 重排调度器
├── bridge: WorkerBridge             // Worker 通信
└── listeners: Set<callback>         // 状态变更监听
```

### 数据流

```
WorkerBridge 获取内容
  → reader-engine.fetchAndParse(pipelineConfig)
  → Document AST
  → ContentProcessor.process(document, rules)
  → Document

排版：
  → layoutConfig = toLayoutConfig(atmosphere, viewport)
  → layoutDocument(document, layoutConfig)
  → LayoutResult
  → toRenderModel(layoutResult)
  → RenderResult { pages: RenderPage[] }

渲染：
  → pages[currentPage] → page-renderer.tsx
```

## 意图瞬现控制层

### 行为

| 交互 | 出现 | 消失 |
|------|------|------|
| 点击阅读区 | 0.3s 淡入控制层 | 1.4s 后完全消失（0.8s 开始淡出） |
| 点击控制层元素 | 立即执行操作 | 操作后 0.8s 淡出 |
| 翻页 | 控制层不出现 | — |
| 章节结束 | 显示章节结束节奏页 | 用户点击「继续」后消失 |

### 控制层结构

不使用实体工具条。所有控件为浮动元素，浮在内容之上：

- **左上**：返回 capsule（`← 返回`）
- **右上**：目录 capsule（`☰`）
- **底部**：进度线 + 上一章/下一章文字（极淡）
- **底部点击**：展开氛围选择器（三个 emoji 图标，当前选中下划线）

### 空间锚点

章节标题极淡浮现于顶部，opacity 0.12，仅用于空间定位。滚动时缓慢淡出。

### 禁止

- 实体背景工具条
- blur 正文
- 超过 3s 仍可见的非进度 UI
- 遮罩 overlay

## RenderModel → React 渲染

### page-renderer.tsx

```tsx
// flatMap 渲染，禁止递归组件
function PageRenderer({ page }: { page: RenderPage }) {
  return (
    <div className="reader-page" style={{ maxWidth: atmosphere.maxWidth, margin: "0 auto" }}>
      {page.lines.map((line, i) => (
        <p key={i} style={{ height: line.height }}>
          {line.runs.map((run, j) => (
            <RunRenderer key={j} run={run} />
          ))}
        </p>
      ))}
    </div>
  )
}
```

### RunRenderer

```tsx
function RunRenderer({ run }: { run: RenderRun }) {
  const style = {
    fontSize: atmosphere.fontSize,
    lineHeight: atmosphere.lineHeight,
  }

  if (run.style?.href) return <a href={run.style.href} style={style}>{run.text}</a>
  if (run.style?.bold && run.style?.italic) return <strong><em style={style}>{run.text}</em></strong>
  if (run.style?.bold) return <strong style={style}>{run.text}</strong>
  if (run.style?.italic) return <em style={style}>{run.text}</em>
  return <span style={style}>{run.text}</span>
}
```

### CSS 变量

阅读器内容区使用 3 个 CSS 变量，由氛围 preset 控制：

```css
.reader-page {
  --reader-bg: var(--atmosphere-bg);
  --reader-text: var(--atmosphere-text);
  --reader-text-secondary: var(--atmosphere-text-secondary);
}
```

## 翻页手势

三种模式，用户可通过氛围外的独立配置选择：

| 模式 | 触发 | 行为 |
|------|------|------|
| 左右 | touch/pointer 水平滑动超过 30% | 直接切换页面内容，无动画 |
| 上下 | touch/pointer 垂直滑动超过 30% | 同上 |
| 滚动 | wheel / touch scroll | 连续滚动，按页截断 |

翻页 = 更新 session.currentPage → onStateChange → React 渲染。无动画。

## 目录面板：空间位移

### 交互

1. 点击右上目录 capsule → 阅读内容整体左移（transform: translateX(-24px)，0.3s transition）→ 右侧露出目录面板
2. 目录面板宽度：移动端 60%，桌面端 35%
3. 无黑色遮罩 overlay
4. 当前章节高亮（背景 elevation，非 border）
5. 点击章节 → session.jumpToChapter(index) → 目录收起
6. 点击内容区或 Esc → 目录收起

### 实现

CSS transform + transition，不改变 DOM 结构。reader-view 内部用 flex 布局，toc-panel 通过 state 控制宽度（0 → 目标宽度）。

## 章节结束节奏

当 `currentPage === pageCount - 1` 时，渲染章节结束页替代控制层：

- 大量留白（至少 40vh）
- 正文最后一段正常渲染
- 分隔线（1px，极淡）
- "你已读完本章"（opacity 0.4）
- "继续下一章 →"（opacity 0.6，可点击）
- 当前章节名（opacity 0.25）

## 章节预取

- 当前章节加载完成后，自动预取下一章和上一章
- 预取通过 Worker Bridge 异步执行，不阻塞阅读
- 预取结果：Document AST + RenderResult 缓存在 session.chapterCache
- 翻到已缓存章节时直接使用，无 loading
- 缓存策略：最多保留当前 ±2 章的 RenderResult

## 进度保存与恢复

- 翻页时更新 session 内 cursor（currentChapter + currentPage）
- `session.dispose()` 时一次性写入 IndexedDB（BookRepository.updateProgress）
- `ReaderSession.open(bookId)` 时从 IndexedDB 读取上次位置，恢复到精确页

## Render Scheduler

### 触发源

| 触发 | 处理 |
|------|------|
| 氛围切换 | 取消未完成重排 → 用新 atmosphere 计算 LayoutConfig → 重排 |
| 窗口 Resize | ResizeObserver debounce 200ms → 重排 |
| 章节跳转 | 清除旧分页 → 加载新章节 → 排版 |

### 禁止

- useEffect 触发重排
- 多次并发重排（必须取消前一次）

### 实现

```ts
class RenderScheduler {
  private version = 0  // 递增版本号，丢弃过期结果

  invalidate(document: Document, atmosphere: ReadingAtmosphere, viewport: { width: number; height: number }) {
    const expectedVersion = ++this.version
    const config = toLayoutConfig(atmosphere, viewport)
    const result = layoutDocument(document, config)
    const renderResult = toRenderModel(result)
    if (this.version !== expectedVersion) return  // 已被新的 invalidate 覆盖
    // notify session → onStateChange
  }
}
```

注意：`layoutDocument` 是同步纯函数，无需 AbortController。版本号机制防止快速连续触发时使用过期结果。

## 排版参数计算

`toLayoutConfig(atmosphere, viewport)` 将氛围预设 + viewport 转换为 reader-engine 的 LayoutConfig：

```ts
function toLayoutConfig(atm: ReadingAtmosphere, viewport: { width: number; height: number }): LayoutConfig {
  const paddingH = viewport.width < 768 ? 20 : 40  // 移动 20px，桌面 40px
  return {
    pageWidth: Math.min(atm.maxWidth, viewport.width) - paddingH * 2,
    pageHeight: viewport.height - paddingH * 2,  // 上下留白同水平
    lineHeight: atm.fontSize * atm.lineHeight,
    font: atm.font,
    paddingTop: atm.fontSize * atm.paragraphSpacing,  // 段距由 paragraphSpacing 决定
    paddingBottom: atm.fontSize * atm.paragraphSpacing,
    paddingLeft: paddingH,
    paddingRight: paddingH,
  }
}
```

## 验证标准

- [ ] 用 reader-engine 测试 fixture（不依赖真实书源）渲染出正确 HTML 结构
- [ ] 三种氛围预设切换，重排无卡顿（< 300ms）
- [ ] 翻页手势三种模式均可用
- [ ] 意图瞬现控制层正常出现/消失
- [ ] 目录空间位移正常工作
- [ ] 章节跳转正常
- [ ] 章节结束节奏页正常显示
- [ ] 退出后进度保存，再次打开恢复到正确位置
- [ ] 桌面端和移动端布局均正常
