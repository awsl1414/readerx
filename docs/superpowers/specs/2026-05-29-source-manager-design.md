# 书源管理设计文档 v2

> 日期: 2026-05-29
> 范围: Roadmap Step 6.4 — 书源管理（全部 4 个子任务）
> 路由: `/settings/sources`

## 核心认知

书源管理不是"设置表单"，而是 **Scraping Workspace**。

基于真实书源分析（`shuyuan.json`），书源规则包含：
- XPath / CSS / JSONPath 混用的 DSL 选择器
- `@js:` 前缀和 `<js>...</js>` 内联脚本块（几十行 JS）
- `java.ajax` / `java.startBrowserAwait` / `cookie.removeCookie` 等 runtime API
- 动态 UA / headers / Referer / POST body 注入
- 多页正文 `nextContentUrl` / 多页目录 `nextTocUrl`
- 反爬（Cloudflare、人机验证、IP 封锁）
- `bookSourceComment` 中存储的解密函数和辅助代码

因此，系统的本质是：

```
DSL 编辑器 + 网络调试器 + HTML/JSON 解析器 + JS Runtime + Pipeline 可视化
```

不是 CRUD 表单后台。

## 核心隐喻：Scraping Workspace

```
/settings/sources = 母空间

Layer 0: Source List      — 始终可见的锚点（含运行态信息）
Layer 1: Source Editor    — 持久化详情面板（可折叠规则分组）
Layer 2: Source Debugger  — 一等公民工作面板（Pipeline + Network + Console）
```

设计参考：Chrome DevTools、Postman Collection Editor、Scraping IDE。

## 布局

### 桌面端（≥1024px）— 三段式 workspace

```
┌─────────────┬───────────────────┬──────────────┐
│  source     │  source editor    │  debugger    │
│  list       │                   │  (可折叠)    │
│             │  ▶ 基本信息       │              │
│  搜索       │  ▶ 搜索规则       │  Pipeline    │
│  筛选标签   │  ▶ 书籍信息规则   │  Network     │
│  健康状态   │  ▶ 目录规则       │  Console     │
│  能力标记   │  ▶ 正文规则       │  Result      │
│  启用开关   │  ▶ 发现/探索      │              │
│  导入按钮   │  ▶ Headers/高级   │              │
│             │                   │              │
│  (280px)   │  (flex)           │  (360px)     │
└─────────────┴───────────────────┴──────────────┘
```

### 平板（768–1023px）

```
┌──────────┬──────────────────────┐
│ source   │  source editor       │
│ list     │  ┌─ debugger ──────┐ │
│ (240px)  │  │ (编辑器底部折叠)  │ │
│          │  └─────────────────┘ │
└──────────┴──────────────────────┘
```

### 移动端（<768px）— Stack navigation

```
Layer 0: 列表（全屏）
  → Layer 1: 编辑器（全屏 push，顶部"返回列表"）
    → Layer 2: 调试器（全屏 subview，顶部"返回编辑"）
```

移动端允许 page-like navigation，因为小屏空间优先级高于空间连续性。

层级判断通过 Zustand state：
- `selectedSourceUrl === null` → 显示列表
- `selectedSourceUrl !== null && !debuggerOpen` → 显示编辑器
- `selectedSourceUrl !== null && debuggerOpen` → 显示调试器

## Feature 目录结构

```
features/source-manager/
├── components/
│   ├── source-workspace.tsx          # 主 workspace 容器（三段式布局）
│   ├── source-list.tsx               # Layer 0: 书源列表（左面板）
│   ├── source-list-item.tsx          # 单个书源行（含健康状态和能力标记）
│   ├── source-filter-bar.tsx         # 搜索 + 筛选标签 + 导入按钮
│   ├── source-editor.tsx             # Layer 1: 编辑器（中间面板）
│   ├── rule-section.tsx              # 可折叠规则分组（搜索/信息/目录/正文/发现/高级）
│   ├── rule-field-editor.tsx         # Schema-aware 规则字段编辑器
│   ├── header-editor.tsx             # Key-Value headers 编辑器
│   ├── source-debugger.tsx           # Layer 2: 调试器（右侧面板）
│   ├── debug-pipeline.tsx            # Pipeline Timeline（阶段执行可视化）
│   ├── debug-network.tsx             # Network Inspector（请求/响应详情）
│   ├── debug-console.tsx             # Console（日志 + 错误）
│   ├── debug-result-viewer.tsx       # 结果查看器（raw/formatted/DOM tree）
│   ├── import-dialog.tsx             # 导入 Dialog（URL/文件/粘贴）
│   ├── import-result-report.tsx      # 导入结果报告（含兼容性分析）
│   └── source-empty-state.tsx        # 无书源时的引导页
├── hooks/
│   ├── use-sources.ts                # TanStack Query: 书源列表 CRUD
│   ├── use-source-detail.ts          # TanStack Query: 单个书源详情 + 编辑
│   ├── use-source-import.ts          # 导入逻辑（URL fetch / 文件读取 / 粘贴解析 + 兼容性分析）
│   ├── use-source-debug.ts           # 调试逻辑（Pipeline 逐阶段执行）
│   └── use-source-capabilities.ts    # 运行能力检测（JS/Cookie/WebView/Java API）
├── lib/
│   ├── capability-analyzer.ts        # 书源能力分析（静态扫描规则字段）
│   └── pipeline-runner.ts            # Pipeline 执行器（编排多阶段调试）
├── store.ts                          # 纯 UI state
├── actions.ts                        # (空)
├── types.ts                          # 本 feature 类型
└── index.ts                          # barrel export
```

## 状态分层

### Zustand store（仅 UI state）

```ts
type SourceManagerState = {
	selectedSourceUrl: string | null;
	filterMode: "all" | "enabled" | "disabled" | "error";
	searchQuery: string;
	debuggerOpen: boolean;
	editorDirty: boolean;
	expandedSections: Set<string>;  // 哪些规则分组展开
};
```

### TanStack Query（IndexedDB 数据）

- `["sources", filterMode, searchQuery]` → BookSourceRepository.search / getAll
- `["source", url]` → BookSourceRepository.get
- mutations: save, saveBatch, enable, delete, deleteBatch

Query Key 使用原始值数组，符合 CLAUDE.md 要求。

### Worker Bridge（规则调试）

- executeRule(rule, content, options) → 缓存在 hook 内，不进 Query cache

### react-hook-form（编辑表单）

30+ 字段需要 dirty tracking、Zod 实时校验、reset 能力。

## Layer 0: Source List（源列表）

```
┌─────────────────────────────────┐
│ 🔍 搜索书源...                   │
├─────────────────────────────────┤
│ [全部] [已启用] [已禁用] [异常]   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 笔趣阁                      │ │
│ │ www.biquge.com       [●开关] │ │
│ │ [JS] [Cookie] · 成功率 82%  │ │  ← 能力标记 + 运行态信息
│ │ 分组: 网文                   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 69书吧                      │ │
│ │ 69shuba.cx            [○开关] │ │
│ │ [CF] [代理] [WebView]        │ │  ← 反爬/限制标记
│ │ ⚠ 搜索不可用                 │ │
│ └─────────────────────────────┘ │
│         ···                     │
├─────────────────────────────────┤
│ [+ 导入书源]                    │
└─────────────────────────────────┘
```

### 能力标记系统（静态分析，从规则字段推断）

| 标记 | 含义 | 推断方式 |
|------|------|---------|
| `[JS]` | 使用 JS Runtime | 规则字段包含 `@js:` 或 `<js>` |
| `[Cookie]` | 使用 Cookie Jar | `enabledCookieJar: true` |
| `[WebView]` | 需要 WebView | 规则含 `startBrowserAwait` |
| `[CF]` | Cloudflare 防护 | bookSourceComment 含提示，或历史失败模式 |
| `[代理]` | 需要代理 | bookSourceComment 含提示 |
| `[API]` | API 类型 | `bookSourceType: 0` + URL 为 API |
| `[网页]` | 网页类型 | `bookSourceType: 3` |

分析由 `capability-analyzer.ts` 完成，纯静态扫描规则字符串，不执行任何请求。

### 运行态信息（调试时积累，持久化到 IndexedDB）

未来扩展，v1 预留字段但不主动采集：
- 最近成功率、平均响应时间、最近错误

### 交互

- 点击列表项 → Zustand 设置 selectedSourceUrl → 编辑器加载详情
- 开关切换 → 直接 mutation
- 搜索 → debounce 300ms → Query refetch
- 筛选标签 → `[全部] [已启用] [已禁用] [异常]`
- 无书源 → SourceEmptyState（引导导入）

## Layer 1: Source Editor（编辑器）

### 可折叠规则分组（IDE 风格，非全展开）

```
▼ 基本信息
  名称 / URL / 类型 / 分组 / 启用 / 探索

▶ 搜索规则 (searchUrl + ruleSearch)
▶ 书籍信息规则 (ruleBookInfo)
▶ 目录规则 (ruleToc)
▶ 正文规则 (ruleContent + replaceRegex)
▶ 发现/探索 (exploreUrl + ruleExplore)
▶ Headers / 高级 (header / loginUrl / concurrentRate / enabledCookieJar)
```

每个分组默认折叠，用户按需展开。`expandedSections` 存储在 Zustand 中。

### RuleFieldEditor — Schema-aware 编辑器

规则不是普通文本，而是混合 DSL。每个字段根据其语义提供不同的编辑体验：

| 字段类型 | UI 组件 | 说明 |
|---------|---------|------|
| 规则字段（bookList/name/content 等）| Code Textarea | monospace、自动扩展、解析器类型提示 |
| enabled / enabledExplore | Switch | 开关 |
| enabledCookieJar | Switch（标记为能力）| 带"Web 端可能不支持"提示 |
| searchUrl / exploreUrl | Input（模板感知）| `{{key}}` `{{page}}` 高亮 |
| header | Key-Value Editor | 结构化 JSON/键值对编辑 |
| weight / customOrder | Number Input | 数字输入 |
| bookSourceComment | Code Textarea（大）| 多行代码编辑 |
| bookSourceGroup | Select + 自定义 | 分组选择 + 自定义输入 |

### Code Textarea 设计

不使用 Monaco（太重）。使用轻量方案：

- **monospace 字体**
- **自动行高扩展**（根据内容行数调整 height）
- **解析器类型提示徽章**：根据规则前缀自动识别并显示
  - `class.` / `tag.` → `[CSS]`
  - `//` / `@` → `[XPath]`
  - `$.` → `[JSONPath]`
  - `@js:` / `<js>` → `[JS]`
  - `##` 包含 → `[Regex]`
- **Zod 实时校验标记**（字段右下角 ✓/✗）
- **lazy mount**（折叠时不渲染 editor 内容）

### 表单管理

react-hook-form，因为 30+ 字段需要 dirty tracking、条件显示、整体验证、reset。

## Layer 2: Source Debugger（调试器 = 一等公民）

调试器不是附属面板，而是核心工作区。与编辑器同级。

### 三大区域

```
┌──────────────────────────────────┐
│ 测试 URL:                        │
│ [https://www.biquge.com/      ] │
│         [▶ Run Pipeline] [■ Stop]│  ← 显式执行，可中断
├──────────────────────────────────┤
│                                  │
│ Pipeline Timeline                │  ← 阶段可视化
│ [✓] Fetch    230ms               │
│ [✓] Parse HTML                   │
│ [✓] bookList → 12 条             │
│ [✗] coverUrl → 空                │  ← 错误立即可见
│ [ ] bookUrl                      │
│ [ ] ...                          │
│                                  │
├──────────────────────────────────┤
│ [Pipeline] [Network] [Console]   │  ← Tab 切换
├──────────────────────────────────┤
│                                  │
│ (对应 Tab 的内容)                 │
│                                  │
└──────────────────────────────────┘
```

### Pipeline Timeline（最重要的新增）

逐步可视化执行过程，用户能精确定位哪个阶段失败：

```
[✓] Fetch HTML          230ms  12KB
[✓] Parse HTML                  → DOM Tree
[✓] ruleSearch.bookList         → 12 条结果
[✓] ruleSearch.name             → "斗破苍穹"
[✗] ruleSearch.coverUrl         → 空 (selector 无匹配)
[✓] ruleSearch.bookUrl          → /book/123.html
[✓] Fetch BookInfo       180ms
[✓] ruleBookInfo.init           → JS 执行成功
[✓] ruleBookInfo.author         → "天蚕土豆"
[▶] ruleToc...                  → 执行中
[ ] ruleContent
```

每个阶段显示：状态（✓/✗/▶/待执行）、timing、结果摘要。点击阶段展开详细结果。

### Network Inspector

类似 Chrome DevTools Network 面板：

```
┌──────┬────────────────────────┬────────┬─────────┐
│ 方法 │ URL                    │ 状态    │ 耗时    │
├──────┼────────────────────────┼────────┼─────────┤
│ GET  │ /search?q=斗破        │ 200    │ 230ms   │
│ GET  │ /book/123.html         │ 200    │ 180ms   │
│ GET  │ /chapters              │ 403    │ 3200ms  │ ← 红色高亮
└──────┴────────────────────────┴────────┴─────────┘

点击请求展开详情：
  Request Headers: { User-Agent: "...", Referer: "..." }
  Response Headers: { Content-Type: "text/html", ... }
  Body / Timing
```

### Console

日志输出，类似 Chrome DevTools Console：

```
[info] Fetching https://www.biquge.com/search?q=...
[info] ruleSearch.bookList matched 12 items
[warn] ruleSearch.coverUrl: empty result
[error] ruleToc.chapterList: XPath //div[@class='list'] returned 0 nodes
[warn] JS rule timeout (>5000ms) in ruleBookInfo.init
```

### 执行控制

- **显式触发**：用户点击 "Run Pipeline" 执行，不实时执行
- **可中断**：AbortController 支持，防止反爬/慢请求阻塞 UI
- **单阶段执行**：可单独运行某个阶段（调试单个规则）
- **全 Pipeline**：从搜索 → 书籍信息 → 目录 → 正文 逐步执行

## Import Dialog（导入 = 短暂动作）

三 Tab：URL 导入 / 文件导入 / 粘贴导入。

### 导入流程

1. 获取 JSON → `JSON.parse` → 检测数组/单对象
2. 逐个 `parseBookSource()` (Zod) → 收集成功/失败
3. 对每个成功的书源运行 `capability-analyzer` → 生成能力标记
4. 成功的 → `BookSourceRepository.saveBatch()`
5. 渲染 `ImportResultReport`
6. 关闭 Dialog → invalidate Query → 列表刷新

### ImportResultReport — 含兼容性分析

```
导入完成: 5 成功 / 2 警告 / 1 失败

✓ 笔趣阁
✓ 酷我小说
  ⚠ 使用 Cookie Jar (Web 端部分支持)
✓ 熊猫看书
  ⚠ 使用 java.ajax, bookSourceComment 含解密代码
✓ 69书吧
  ⚠ 需要 Cloudflare 验证, 需要代理
✓ 番茄免费小说

⚠ 番茄小说 (不兼容)
  - 使用 java.androidId() (Android 专有 API)
  - 使用 startBrowserAwait (需要 WebView)

✗ 书源X (校验失败)
  - bookSourceUrl: 必填字段缺失
```

兼容性分级：
- **✓ Compatible** — 纯 CSS/XPath/JSONPath 规则
- **⚠ Partial** — 使用 JS runtime、Cookie 等部分支持的能力
- **✗ Unsupported** — 使用 WebView、Android 专有 API 等不支持的能力

## 书源能力检测（capability-analyzer.ts）

纯静态扫描规则字符串，不执行任何请求：

```ts
type SourceCapabilities = {
	readonly usesJs: boolean;          // 规则含 @js: 或 <js>
	readonly usesCookieJar: boolean;   // enabledCookieJar
	readonly usesWebView: boolean;     // 规则含 startBrowserAwait / launchBrowser
	readonly usesJavaApi: boolean;     // 规则含 java.ajax / java.get / java.put
	readonly usesCrypto: boolean;      // 规则含 AES / DES / base64 / md5
	readonly usesMultiPage: boolean;   // 规则含 nextContentUrl / nextTocUrl
	readonly webCompatibility: "full" | "partial" | "unsupported";
};
```

推断逻辑：
- `usesJs`: 正则 `/@js:|<js>|<\/js>/`
- `usesWebView`: 正则 `/startBrowserAwait|launchBrowser/`
- `usesJavaApi`: 正则 `/java\.(ajax|get|put|getString|getStringList|log)/`
- `webCompatibility`:
  - `full`: 无 JS/Cookie/WebView/JavaApi
  - `partial`: 有 JS 但无 WebView/AndroidApi
  - `unsupported`: 有 WebView 或 Android 专有 API

## 错误处理

| 场景 | 策略 |
|------|------|
| 导入 JSON 解析失败 | ImportResultReport 内联展示 |
| 导入 Zod 校验失败 | 逐条标记原因，成功的照常导入 |
| 导入网络 fetch 失败 | Dialog 内 inline error + 重试 |
| 编辑字段校验失败 | Zod 实时反馈（红色边框 + 错误文字） |
| 编辑保存失败 | Toast 提示 |
| 调试规则执行错误 | Pipeline Timeline 标红 + Console error，不阻塞后续阶段 |
| 调试 Worker 崩溃 | WorkerBridge 自动恢复 + Console warn |
| 调试请求被反爬 | Network Inspector 显示 403/503，Console 提示 |
| 调试超时 | AbortController 中断 + Console 提示 |
| 启用/禁用失败 | 乐观回滚 + Toast |
| 不兼容书源 | 导入时警告，列表显示标记，不阻止导入 |

## 需要安装的依赖

| 包 | 用途 |
|---|------|
| react-hook-form | 编辑表单管理（30+ 字段） |
| @hookform/resolvers | react-hook-form + Zod 集成 |
| sonner | Toast 提示 |

## shadcn/ui 组件清单（14 个，按需安装）

| 组件 | 用途 |
|------|------|
| Dialog | 导入书源 |
| Input | 搜索框、URL 输入 |
| Textarea | Code Textarea（规则字段） |
| Switch | 启用/禁用、能力开关 |
| Tabs | 导入方式切换、调试器区域切换 |
| ScrollArea | 列表、编辑器、调试器滚动 |
| Badge | 能力标记、健康状态、解析器类型 |
| Select | 书源类型、分组选择 |
| Collapsible | 规则分组折叠、Pipeline 阶段折叠 |
| Separator | 面板分隔 |
| DropdownMenu | 列表项操作菜单 |
| Tooltip | 规则字段说明 |
| Sonner (Toast) | 操作提示 |
| Label | 表单标签 |

## 测试策略

目标 ~40-50 个测试，覆盖：

- **capability-analyzer**: 检测 JS/Cookie/WebView/Java API/兼容性分级
- **pipeline-runner**: 多阶段编排、错误不中断、AbortController
- **use-sources**: Query key 正确、筛选逻辑、mutation invalidate
- **use-source-import**: URL fetch → parse → validate → capability → saveBatch
- **use-source-debug**: Worker Bridge 调用、阶段结果累积、错误处理
- **SourceList**: 渲染、筛选、搜索、能力标记显示
- **ImportDialog**: URL/文件/粘贴三种路径 + 兼容性报告
- **SourceEditor**: 表单填充、折叠展开、保存
- **RuleFieldEditor**: 解析器类型推断、monospace 渲染
- **DebugPipeline**: Timeline 渲染、阶段状态、timing
- **DebugNetwork**: 请求列表、详情展开
- **DebugConsole**: 日志分级、错误高亮

## v1 不做的事

以下功能留待后续迭代，避免首版过度工程：

| 排除项 | 原因 |
|--------|------|
| Monaco / CodeMirror 全量编辑器 | 30+ editor 实例在移动端性能不可控 |
| DOM tree 可视化查看器 | 需要 HTML parser，首版用 raw text 足够 |
| Visual selector（点击页面选元素）| 需要真实页面渲染，复杂度高 |
| Breakpoint debugger | 需要 Worker 级别的暂停/恢复能力 |
| 书源自动更新/订阅 | 需要后台定时任务 |
| 书源分享/市场 | 需要后端 API |
| 运行态健康数据自动采集 | 需要搜索/阅读时埋点，跨 feature 依赖 |

## 设计原则

| 原则 | 含义 |
|------|------|
| Scraping Workspace | 不是设置页面，是 IDE |
| 列表永不消失 | 桌面端左侧列表始终可见 |
| 编辑器 = 持久 workspace | 不是临时弹窗，用户会停留很久 |
| 调试器 = 一等公民 | 与编辑器同级，核心工作区 |
| Pipeline 优先 | 用户第一需求是"定位哪个阶段坏了" |
| 显式执行 | 不自动执行规则，用户主动 Run |
| Schema-aware UI | 不同字段类型用不同组件，不是全是 Textarea |
| 折叠分组 | 30+ 字段不全展开，按需展开 |
| 能力分析先行 | 导入时就告诉用户兼容性 |
| 轻量 editor | monospace textarea + 类型提示，不用 Monaco |
| Import 允许部分成功 | 不因部分失败阻塞全部导入 |
