# 阅读器架构指南

阅读器是 ReaderX 的核心 feature，也是技术风险最高的部分。本文档定义阅读器的架构决策、组件结构和数据流。

## 架构决策

**ReaderSession 模式：** 阅读器状态由 session 对象管理，不使用全局 Zustand store。Session 拥有分页状态、游标、章节缓存和预取队列的完整生命周期。React 只是 session 的 viewer。

**为什么不用全局 store：**
- 阅读器是长生命周期状态机（打开 → 阅读 → 退出），不是 UI state
- 分页计算涉及 Worker 调用，不适合放在 store 的同步更新中
- 全局 store 会随功能膨胀，难以控制重渲染范围

**Render Scheduler：** 布局失效（字号/行距/窗口变更）由 session 内部的调度器驱动，不在 useEffect 中触发。

## 目录结构

```text
features/reader/
├── components/
│   ├── reader-view.tsx       # 主容器，持有 session
│   ├── page-renderer.tsx     # 单页渲染（Page → React 元素）
│   ├── control-bar.tsx       # 顶栏 + 底栏浮出层
│   ├── toc-panel.tsx         # 目录面板
│   └── settings-panel.tsx    # 阅读设置（字号/行距/主题）
├── hooks/
│   ├── use-reader-session.ts # session 生命周期管理
│   └── use-gesture.ts        # 翻页手势
├── session.ts                # ReaderSession 类
├── render-scheduler.ts       # 布局失效调度器
└── types.ts                  # 类型定义
```

## ReaderSession API

```ts
class ReaderSession {
  // 打开书籍
  static async open(bookId: string): Promise<ReaderSession>

  // 分页
  getPage(cursor: PageCursor): Page | undefined
  nextPage(): PageCursor | undefined
  prevPage(): PageCursor | undefined

  // 跳转
  jumpToChapter(chapterIndex: number): Promise<void>
  jumpToPage(pageIndex: number): void

  // 设置变更（触发重排）
  updateSettings(settings: Partial<ReaderSettings>): void

  // 状态
  readonly chapters: ChapterInfo[]      // 目录
  readonly currentChapter: number       // 当前章节索引
  readonly pageCount: number            // 当前章节总页数
  readonly settings: ReaderSettings     // 当前设置

  // 清理
  dispose(): void
}
```

## 生命周期

```text
用户点击"开始阅读"
  ↓
ReaderSession.open(bookId)
  ├── 从 IndexedDB 加载书籍信息和目录
  ├── 获取第一章内容（通过 Worker Bridge 执行规则）
  ├── 调用 reader-engine 排版
  └── 返回 session 实例
  ↓
React 渲染第一页
  ↓
用户翻页 → session.nextPage() → React 渲染下一页
  ↓
用户改字号 → session.updateSettings({ fontSize: 18 })
  → Render Scheduler 调度重排
  → 排版完成 → React 重新渲染
  ↓
用户退出 → session.dispose()
  ├── 保存阅读进度到 IndexedDB
  └── 清理 Worker 连接和章节缓存
```

## RenderModel → React 映射

reader-engine 输出的 RenderModel 结构：

```ts
type Page = {
  lines: Line[]
}

type Line = {
  segments: InlineSegment[]
}

type InlineSegment = {
  text: string
  style: SegmentStyle  // bold, italic, link, etc.
}
```

React 组件映射：

```text
<reader-view>               ← 持有 session，监听翻页手势
  <page-renderer>           ← 渲染单个 Page
    <p>                     ← 每个 Line → <p>
      <span> / <strong>     ← 每个 Segment → 对应的 inline 元素
    </p>
  </page-renderer>
</reader-view>
```

渲染原则：
- 不使用 dangerouslySetInnerHTML
- 不递归渲染，使用 flatMap（Page.lines → Line.segments → inline elements）
- 每页独立渲染，翻页时只替换当前页内容

## 翻页手势

三种模式，用户可配置：

| 模式 | 触发方式 | 行为 |
|---|---|---|
| 左右翻页 | touch/pointer 水平滑动 | 滑动超过阈值翻页，否则回弹 |
| 上下翻页 | touch/pointer 垂直滑动 | 滑动超过阈值翻页 |
| 滚动 | wheel / touch scroll | 连续滚动，按页截断 |

翻页时：
- 无动画（设计哲学：翻页就是内容切换）
- 更新 cursor → session.getPage(newCursor) → React 渲染

## Render Scheduler

布局失效的触发源和处理方式：

| 触发源 | 处理 |
|---|---|
| 字号变更 | `session.updateSettings()` → scheduler 标记 invalidation → 重排当前章节 |
| 行距变更 | 同上 |
| 窗口尺寸变更 | ResizeObserver → scheduler 标记 invalidation → debounce 200ms → 重排 |
| 主题变更 | 仅 CSS class 切换，不触发重排 |

Scheduler 内部：
1. 收到 invalidation 请求 → 取消上一次未完成的重排
2. 用新 settings 调用 `reader-engine.layoutDocument()`
3. 重排完成后通知 React 重新渲染

**禁止 useEffect 触发重排。** 重排由 session 内部驱动，React 只消费结果。

## 章节预取

Session 维护预取队列：

- 当前章节加载完成后，自动预取下一章（和上一章，如果未缓存）
- 预取通过 Worker Bridge 异步执行，不阻塞阅读
- 预取结果缓存在 session 内部，翻到该章时直接使用

## 进度保存

- 翻页时保存 cursor（chapterIndex + pageIndex）到 session
- 退出阅读器时（dispose），一次性写入 IndexedDB
- 再次打开同一本书时，从上次位置恢复

## 禁止

- 全局 reader Zustand store
- useEffect 触发重排
- dangerouslySetInnerHTML 渲染内容
- 在 Server Component 中处理阅读器逻辑
- 递归组件渲染（用 flatMap）
