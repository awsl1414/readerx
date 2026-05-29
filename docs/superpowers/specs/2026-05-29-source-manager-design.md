# 书源管理设计文档

> 日期: 2026-05-29
> 范围: Roadmap Step 6.4 — 书源管理（全部 4 个子任务）
> 路由: `/settings/sources`

## 核心隐喻

书源管理是 **Layered Workspace**，不是设置页面。它本质上是 power-user tooling，信息密度和工具化程度允许高于阅读器 UI。

```
/settings/sources = 母空间（永远不消失）

Layer 0: Source List      — 始终可见的锚点
Layer 1: Source Editor    — 持久化的详情面板
Layer 2: Source Debugger  — 独立工具面板（mini devtool）
```

设计参考：Arc split view、Linear issue detail、Notion peek、Chrome DevTools。

## 布局

### 桌面端（≥1024px）— 三段式 workspace

```
┌─────────────┬───────────────────┬──────────────┐
│  source     │  source editor    │  debugger    │
│  list       │                   │  (可折叠)    │
│             │  规则字段          │              │
│  搜索       │  选择器编辑        │  response    │
│  筛选标签   │  headers           │  DOM tree    │
│  启用开关   │  parser 配置       │  console     │
│  导入按钮   │                   │  timing      │
│             │                   │  test result │
│  (280px)   │  (flex)           │  (360px)     │
└─────────────┴───────────────────┴──────────────┘
```

- 列表固定 280px，始终可见
- 编辑器占据中间弹性区域
- 调试器右侧可折叠面板 360px，折叠时编辑器占满右侧

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
│   ├── source-list-item.tsx          # 单个书源行
│   ├── source-filter-bar.tsx         # 搜索 + 筛选标签 + 导入按钮
│   ├── source-editor.tsx             # Layer 1: 编辑器（中间面板）
│   ├── rule-field-editor.tsx         # 通用规则字段编辑组件
│   ├── source-debugger.tsx           # Layer 2: 调试器（右侧面板）
│   ├── debug-stage.tsx               # 调试单个阶段的结果展示
│   ├── import-dialog.tsx             # 导入 Dialog（URL/文件/粘贴）
│   ├── import-result-report.tsx      # 导入结果报告
│   └── source-empty-state.tsx        # 无书源时的引导页
├── hooks/
│   ├── use-sources.ts                # TanStack Query: 书源列表 CRUD
│   ├── use-source-detail.ts          # TanStack Query: 单个书源详情 + 编辑
│   ├── use-source-import.ts          # 导入逻辑
│   └── use-source-debug.ts           # 调试逻辑（Worker Bridge）
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
	filterMode: "all" | "enabled" | "disabled";
	searchQuery: string;
	debuggerOpen: boolean;
	editorDirty: boolean;
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

## 各层组件详细设计

### Layer 0: Source List

结构：

```
┌─────────────────────────────┐
│ 🔍 搜索书源...               │
├─────────────────────────────┤
│ [全部] [已启用] [已禁用]      │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 名称                     │ │
│ │ 域名              [开关] │ │
│ │ 分组标签                 │ │
│ └─────────────────────────┘ │
│         ...                 │
├─────────────────────────────┤
│ [+ 导入书源]                │
└─────────────────────────────┘
```

交互：
- 点击列表项 → Zustand 设置 selectedSourceUrl → 编辑器加载详情
- 开关切换 → 直接 mutation（不进入编辑器）
- 搜索 → debounce 300ms → Zustand 更新 searchQuery → Query refetch
- 分组 → 从 getAll() 结果提取唯一分组，动态生成标签
- 无书源 → SourceEmptyState（引导导入）

数据获取：
- searchQuery 非空 → BookSourceRepository.search(query)
- searchQuery 为空 → BookSourceRepository.getAll() + client-side filter

### Layer 1: Source Editor

分区结构：
1. 标题栏 — 书源名称 + 保存/删除按钮
2. 基本信息 — 名称、URL、类型、分组、启用/探索开关
3. 搜索规则 — searchUrl + ruleSearch 字段组
4. 书籍信息规则 — ruleBookInfo 字段组
5. 目录规则 — ruleToc 字段组
6. 正文规则 — ruleContent 字段组
7. 调试器入口 — 展开/折叠按钮

**RuleFieldEditor**：通用规则字段组件，每个字段用 `<Textarea>`（规则可能很长），Zod 校验实时反馈。

表单管理：react-hook-form，因为 30+ 字段需要 dirty tracking、条件显示、整体验证、reset。

### Layer 2: Source Debugger

独立面板，不是表单的一部分。

桌面端：编辑器右侧可折叠面板。
移动端：全屏 push。

结构：
1. 测试 URL 输入 + "执行全部阶段"按钮
2. 各阶段结果（Collapsible）：
   - 阶段名称 + 状态（成功/失败/待执行）+ timing
   - raw / formatted / DOM tree 三种视图 Tab
3. 控制台（Collapsible）：请求日志 + 错误日志

执行流程：
1. 输入测试 URL → 点击执行
2. use-source-debug hook → WorkerBridge.executeRule 逐阶段执行
3. 搜索 → 取第一条 → 书籍信息 → 目录 → 正文
4. 每个阶段结果逐步追加到 state
5. 错误不中断，标记后继续下一阶段

### Import Dialog

三 Tab：URL 导入 / 文件导入 / 粘贴导入。

流程：
1. 获取 JSON → JSON.parse → 检测数组/单对象
2. 逐个 parseBookSource() (Zod) → 收集成功/失败
3. 成功 → BookSourceRepository.saveBatch()
4. 渲染 ImportResultReport（成功 N / 失败 M + 失败原因）
5. 关闭 Dialog → invalidate Query → 列表刷新

**关键：导入允许部分成功。**

## 错误处理

| 场景 | 策略 |
|------|------|
| 导入 JSON 解析失败 | ImportResultReport 内联展示 |
| 导入 Zod 校验失败 | 逐条标记原因，成功的照常导入 |
| 导入网络 fetch 失败 | Dialog 内 inline error + 重试 |
| 编辑字段校验失败 | 红色边框 + 错误文字（Zod 实时） |
| 编辑保存失败 | Toast 提示 |
| 调试规则执行错误 | DebugStage 红色状态 + console error，不阻塞 |
| 调试 Worker 崩溃 | WorkerBridge 自动恢复 + 重试按钮 |
| 启用/禁用失败 | 乐观回滚 + Toast |
| 列表空数据 | SourceEmptyState 引导页 |

## shadcn/ui 组件清单（14 个，按需安装）

| 组件 | 用途 |
|------|------|
| Dialog | 导入书源 |
| Input | 搜索框、URL 输入 |
| Textarea | 规则字段编辑、粘贴导入 |
| Switch | 启用/禁用开关 |
| Tabs | 导入方式切换 |
| ScrollArea | 列表、编辑器、调试器滚动 |
| Badge | 书源类型、健康状态 |
| Select | 书源类型下拉、分组选择 |
| Collapsible | 调试器阶段折叠 |
| Separator | 面板分隔 |
| DropdownMenu | 列表项操作菜单 |
| Tooltip | 规则字段说明 |
| Sonner (Toast) | 保存/操作提示 |
| Label | 表单字段标签 |

## 测试策略

目标 ~30-40 个测试，覆盖：

- **use-sources**: Query key 正确、筛选逻辑、mutation invalidate
- **use-source-import**: URL fetch → parse → validate → saveBatch 全流程
- **use-source-debug**: Worker Bridge 调用、阶段结果累积、错误处理
- **SourceList**: 渲染、筛选、搜索交互
- **ImportDialog**: URL/文件/粘贴三种路径
- **SourceEditor**: 表单填充、dirty tracking、保存
- **SourceDebugger**: 阶段执行、结果展示、错误展示
- **集成**: 选择书源 → 编辑 → 保存 → 列表刷新

## 需要安装的依赖

| 包 | 用途 |
|---|------|
| react-hook-form | 编辑表单管理（30+ 字段的 dirty tracking、校验、reset） |
| @hookform/resolvers | react-hook-form + Zod 集成 |
| sonner | Toast 提示（替代 shadcn toast，更现代） |

## 设计原则

| 原则 | 含义 |
|------|------|
| 列表永不消失 | 桌面端左侧列表始终可见 |
| 编辑器是 workspace | 不是临时弹窗，用户会停留很久 |
| 调试器 = mini devtool | 独立面板，未来可扩展 |
| Power-user 信息密度 | 书源管理允许比阅读器更高的工具化程度 |
| Import 是 transient | 导入是短暂动作，Dialog 足够 |
| 导入允许部分成功 | 不因部分失败而阻塞全部导入 |
