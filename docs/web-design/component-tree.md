# ReaderX Component Tree — 组件树

> 本文档定义每个页面的组件分解和复用关系。页面结构见 [IA](./ia.md)，视觉令牌见 [Design Tokens](./design-tokens.yaml)。

## 1. 全局组件

```
App
├── RootLayout (Server Component)
│   ├── Providers (ThemeProvider + NextIntlClientProvider + WorkerBridgeProvider)
│   └── AppShell (Client Component)
│       ├── DesktopNav (侧边栏 56px, ≥ 768px)
│       │   ├── LogoLink
│       │   └── NavItem[] (书架/发现/订阅/我的, 智能显隐)
│       ├── MobileNav (底栏 3-4 Tab, < 768px)
│       │   └── NavTab[] (智能显隐)
│       ├── Header (毛玻璃顶栏)
│       │   ├── SearchButton → /search
│       │   └── ThemeToggle (Sun/Moon)
│       └── Main (内容区)
```

## 2. 书架（首页）— `/`

```
BookshelfPage
├── ContinueReadingHero (权重5)
│   ├── BookCover
│   ├── BookInfo (标题/作者)
│   ├── ProgressBar
│   └── ResumeButton → /reader/[bookId]
│
├── GroupChips (权重2)
│   └── GroupChip[] (水平滚动)
│
├── BookGrid / BookList (可切换, 权重3)
│   └── BookCard[]
│       ├── BookCover
│       ├── BookTitle
│       └── ProgressBadge
│
├── BookContextMenu (长按菜单)
│   ├── DeleteAction
│   ├── MoveToGroupAction
│   ├── ViewDetailAction
│   └── ChangeSourceAction
│
├── SortControl (排序选择)
├── ViewToggle (网格/列表切换)
└── EmptyBookshelf (空状态引导)
    ├── EmptyState
    └── ImportButton
```

## 3. 搜索页 — `/search`

```
SearchPage
├── SearchHeader
│   ├── BackButton
│   ├── SearchInput (debounce 300ms)
│   └── SourceSelector (全部/分组/指定源)
│
├── SearchHistory
│   └── HistoryChip[] (≤ 20 条)
│
├── SearchResults (流式展示)
│   ├── SearchResultCard[]
│   │   ├── BookCover
│   │   ├── BookInfo (标题/作者/最新章)
│   │   ├── SourceList (多来源标记)
│   │   └── InBookshelfBadge
│   └── SourceStatus (失败源汇总)
│
└── EmptySearch (无结果)
```

## 4. 书籍详情页 — `/book/[bookId]`

```
BookDetailPage
├── BookHeader
│   ├── BackButton
│   └── ActionMenu (编辑/删除)
│
├── BookInfoSection
│   ├── BookCover (大图)
│   ├── BookTitle
│   ├── BookAuthor
│   ├── BookTags
│   ├── LatestChapter
│   └── UpdateTime
│
├── BookIntro (可展开)
│
├── ActionButtons
│   ├── ReadButton → /reader/[bookId]
│   ├── AddToShelfButton
│   └── ChangeSourceButton
│
└── ChapterListPreview
    └── ChapterItem[] (最新 10 章)
```

## 5. 阅读器 — `/reader/[bookId]`

```
ReaderPage (全屏，无导航)
├── ReaderView (内容渲染区)
│   ├── PageRenderer (RenderModel → DOM)
│   │   ├── PageLine[] (flatMap 渲染，禁止递归组件)
│   │   └── InlineElement[] (span/strong/a)
│   ├── ChapterEnd
│   │   └── NextChapterButton
│   └── LoadingError (加载失败状态)
│
├── ControlOverlay (控制层，点击浮出/3s无操作后200ms淡出)
│   ├── TopBar
│   │   ├── BackButton
│   │   ├── ChapterTitle
│   │   └── MoreMenu
│   │       ├── SourceChange → 换源
│   │       ├── BookmarkToggle
│   │       ├── TocToggle → 目录面板
│   │       ├── SettingsToggle → 设置面板
│   │       └── SearchInBook → 书内搜索
│   ├── BottomBar
│   │   ├── PrevChapterButton
│   │   ├── ProgressIndicator (百分比 + 页码)
│   │   └── NextChapterButton
│   └── IntentOverlay (滑动选择面板)
│
├── TocPanel (目录面板)
│   ├── TocSearch (章节搜索)
│   └── ChapterList
│       └── ChapterItem[] (当前章节高亮)
│
├── SettingsPanel (阅读设置)
│   ├── FontSizeSlider (14-24px)
│   ├── LineHeightSlider (1.5-2.5)
│   ├── PageModeToggle (滚动/分页)
│   └── AtmospherePicker (5 套阅读器主题)
│
├── TextSelectionMenu (选中文字浮出)
│   ├── CopyAction
│   ├── HighlightAction
│   └── SearchAction
│
├── ReadingRhythmManager (阅读节奏 hook)
│   ├── 连续阅读检测 → 控制层超时延长 (3s→5s)
│   ├── 快速跳章检测 → 导航元素持久显示
│   └── 操作计数 → 动效渐进退化（与 design-tokens motion.degradation 配合）
│
└── SourceChangeDialog (换源)
    ├── SourceList (当前/成功/失败/慢)
    └── SourceItem
```

### 阅读器内部架构

阅读器不使用全局 Zustand store，使用 ReaderSession 模式：

```
ReaderSession
├── pagination state (分页结果缓存)
├── cursor (当前位置)
├── chapter cache (已加载章节)
├── prefetch queue (预取队列)
└── settings snapshot (字号/行距/主题快照)
```

- session 由 React 组件持有，组件卸载时 dispose
- 字号/行距变更 → session 内部触发重排 → 输出新的分页结果
- React 只负责渲染当前 viewport 可见的 pages
- 禁止 useEffect 触发重排：布局计算由 session 内部的 RenderScheduler 驱动

## 6. 发现页 — `/explore`

```
ExplorePage
├── ExploreHeader
│   └── GroupFilter (分组选择)
│
├── ExploreSourceList
│   └── ExploreSourceItem[]
│       ├── SourceName (可点击展开/收起)
│       ├── ExpandArrow
│       ├── LoadingSpinner (展开时)
│       └── ExploreKindTags (FlexboxLayout)
│           └── ExploreKindChip[] (分类标签)
│
└── EmptyExplore (无 exploreUrl 书源)
```

### 发现书籍列表页 — `/explore/show`

```
ExploreShowPage
├── ShowHeader
│   ├── BackButton
│   └── CategoryTitle
│
├── BookList (自动翻页)
│   └── SearchResultCard[] (复用搜索结果组件)
│
└── LoadMoreTrigger
```

## 7. 订阅页 — `/rss`

```
RssPage
├── RssHeader
│   └── MoreMenu (管理/收藏)
│
├── RssSourceList
│   └── RssSourceItem[]
│       ├── SourceIcon
│       ├── SourceName
│       ├── SourceGroup
│       └── UnreadBadge (新文章数)
│
└── EmptyRss (无 RSS 源)
```

### RSS 文章列表 — `/rss/[sourceId]`

```
RssArticlesPage
├── ArticleSortSelector (分类选择)
├── RssArticleList
│   └── RssArticleItem[]
│       ├── ArticleTitle
│       ├── ArticleDescription
│       ├── ArticleTime
│       └── ReadStatus
└── EmptyArticles
```

### RSS 文章阅读 — `/rss/article/[articleId]`

```
RssArticlePage
├── ArticleHeader
│   ├── BackButton
│   └── FavoriteToggle
├── ArticleContent
└── ArticleFooter
```

### RSS 收藏 — `/rss/favorites`

```
RssFavoritesPage
├── RssFavoritesList
│   └── RssArticleItem[] (复用)
└── EmptyFavorites
```

## 8. 我的页 — `/my`

```
MyPage
├── SettingSection[] (分组)
│   └── SettingItem[]
│       ├── ItemIcon
│       ├── ItemLabel
│       ├── ItemValue (可选)
│       └── ChevronRight
│
├── 规则管理
│   ├── SourceManageItem → /my/sources
│   ├── RssSourceManageItem → /my/rss-sources
│   ├── ReplaceRuleItem → /my/replace-rules
│   ├── TxtTocRuleItem → /my/txt-rules
│   └── DictRuleItem → /my/dict-rules
│
├── 个性化
│   ├── ThemeItem → /my/theme
│   └── ReadingSettingsItem → /my/reading
│
├── 数据
│   ├── BackupItem → /my/backup
│   ├── ImportItem → /my/import
│   └── DownloadsItem → /my/downloads
│
├── 统计
│   ├── BookmarksItem → /my/bookmarks
│   └── ReadRecordItem → /my/read-record
│
└── 其他
    └── AboutItem → /my/about
```

## 9. 书源管理（Scraping Workspace）— `/my/sources`

```
SourceWorkspace (桌面三段/移动 stack)
├── SourceListPanel (Layer 0, 280px)
│   ├── SourceFilterBar
│   │   ├── SearchInput (debounce 300ms)
│   │   ├── FilterTabs (全部/已启用/已禁用/异常)
│   │   └── ImportButton
│   ├── SourceListItem[]
│   │   ├── SourceName
│   │   ├── SourceDomain
│   │   ├── CapabilityTags ([JS][Cookie][CF][WebView])
│   │   └── EnableToggle
│   └── SourceEmptyState
│
├── SourceEditorPanel (Layer 1, flex)
│   ├── RuleSection[] (可折叠规则组)
│   │   └── RuleFieldEditor (monospace + 解析器类型提示)
│   └── SaveButton
│
├── SourceDebuggerPanel (Layer 2, 360px, 可折叠)
│   ├── PipelineTimeline (阶段可视化)
│   ├── NetworkInspector (请求/响应详情)
│   ├── DebugConsole (日志 info/warn/error)
│   └── RunButton + AbortButton
│
└── ImportDialog (overlay)
    ├── ImportMethodTabs (URL/文件/粘贴)
    ├── ImportResultReport
    │   └── CompatibilityGrade (✓/⚠/✗)
    └── ConfirmButton
```

## 10. 共享组件清单

### shadcn/ui 复用

| 组件 | 用途 |
|---|---|
| Button | 所有按钮 |
| Dialog | 模态对话框 |
| Sheet | 底部弹出面板 |
| Tabs | 书架分组/书源筛选 |
| Input, Textarea | 搜索/编辑器 |
| Select | 书源选择/排序选择 |
| Badge | 状态标记 |
| Tooltip | 辅助提示 |
| Separator | 分隔线 |
| ScrollArea | 滚动容器 |
| Collapsible | 规则分组折叠 |
| DropdownMenu | 更多操作菜单 |
| Switch | 启用/禁用开关 |
| Label | 表单标签 |
| Toast (Sonner) | 全局提示 |
| Command (cmdk) | ⌘K 命令面板（P2） |

### 自定义共享组件

| 组件 | 用途 | 复用页面 |
|---|---|---|
| BookCover | 封面展示（带 fallback） | 书架/搜索/详情 |
| ProgressBar | 阅读进度条 | 书架卡片/阅读器 |
| EmptyState | 通用空状态 | 所有页面 |
| SourceBadge | 书源状态标记 | 搜索/换源/书源列表 |
| SourceCapabilityTag | 能力标记 [JS][Cookie][CF] | 书源列表 |
| ImportDialog | 通用导入（URL/文件/粘贴） | 书源/RSS/规则 |
| SearchResultCard | 搜索结果卡片 | 搜索/发现 |
| RssArticleItem | RSS 文章条目 | 订阅列表/收藏 |

## 11. 状态管理映射

| 组件 | 状态方案 | 说明 |
|---|---|---|
| 阅读器 | ReaderSession | session 模式，非全局 store |
| 书架 | TanStack Query + Zustand | Query 缓存书籍列表，Zustand 管理 UI 状态 |
| 搜索 | TanStack Query | 缓存搜索结果（key: `["search", keyword, sourceIds]`） |
| 书源管理 | TanStack Query + Zustand | Query 缓存书源列表，Zustand 管理 workspace UI 状态 |
| 主题 | next-themes | 全局 UI 主题（cookie + `.dark` class） |
| 阅读器主题 | CSS class | 只影响阅读器内容区 3 个 CSS custom property (--reader-bg, --reader-text, --reader-text-secondary) |
| i18n | next-intl | cookie → Accept-Language → 默认 zh |
