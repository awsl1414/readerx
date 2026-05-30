# ReaderX IA — 信息架构

> 本文档定义 ReaderX 的页面结构、路由映射和导航行为。决策依据见 [PRD](./prd.md)。

## 1. 设计原则

- 阅读器不是内容平台。导航围绕"我有书 → 我读书"的核心闭环
- 书架是首页，搜索是工具（不是目的地）
- 与 Legado 原版导航保持一致，降低用户迁移成本

## 2. 一级导航

### 底部 Tab（移动端）/ 侧边栏（桌面端）

4 个一级区域，其中发现和订阅**智能显隐**：

| Tab | 图标 | 始终可见 | 显隐条件 |
|---|---|---|---|
| **书架** | 📚 Library | ✅ | — |
| **发现** | 🔭 Compass | ❌ | 至少 1 个书源有 `exploreUrl` 时显示 |
| **订阅** | 📡 Rss | ❌ | 至少 1 个 RSS 源时显示 |
| **我的** | 👤 User | ✅ | — |

**最小状态**：2 Tab（书架 + 我的）。
**完整状态**：4 Tab（书架 + 发现 + 订阅 + 我的）。

**搜索**：不是 Tab，是 Toolbar 搜索图标入口 → 全屏搜索页。

### 侧边栏（桌面端 > 1024px）

56px 宽，图标 + hover 文字，无背景无边框：

```
R (logo)     — 回首页
📚 书架
🔭 发现       — 仅当有 exploreUrl 书源时
📡 订阅       — 仅当有 RSS 源时
─────────────
👤 我的
```

### 底栏（移动端 < 768px）

毛玻璃效果（`backdrop-filter: blur(20px)` + 半透明背景），仅显示可见的 Tab。

### 顶栏

毛玻璃（`backdrop-filter: blur(20px)` + 半透明背景）。搜索入口 + 主题切换。

## 3. 路由映射

### 书架（首页）

```
/                          → 书架（首页）
  /search                  → 搜索页（独立路由页面）
  /book/[bookId]           → 书籍详情页
  /reader/[bookId]         → 阅读器（全屏，无导航）
```

### 发现

```
/explore                   → 发现页
  /explore/[sourceId]      → 书源发现分类（FlexboxLayout 标签）
  /explore/show            → 分类书籍列表（exploreName + exploreUrl 参数）
```

### 订阅

```
/rss                       → 订阅页（RSS 源列表）
  /rss/[sourceId]          → RSS 源文章列表
  /rss/article/[articleId] → RSS 文章阅读
  /rss/favorites           → RSS 收藏
```

### 我的

```
/my                        → 我的（设置中心）
  /my/sources              → 书源管理（Scraping Workspace）
  /my/rss-sources          → 订阅源管理
  /my/replace-rules        → 替换净化
  /my/txt-rules            → TXT 目录规则
  /my/dict-rules           → 字典规则
  /my/theme                → 主题设置
  /my/reading              → 阅读设置
  /my/backup               → 备份恢复
  /my/import               → Legado 数据导入
  /my/bookmarks            → 全部书签
  /my/read-record          → 阅读记录
  /my/downloads            → 下载管理
  /my/about                → 关于
```

## 4. "发现"页详解

发现页展示所有有 `exploreUrl` 的书源。每个书源可展开，显示其发现分类（ExploreKind）。

**数据来源**：书源的 `exploreUrl` 字段，解析为 `List<ExploreKind>`。

**ExploreKind 格式**：
- JSON 数组：`[{"title":"玄幻","url":"https://..."}]`
- 纯文本：`玄幻::https://...\n都市::https://...`
- JS 脚本：`<js>...返回上述字符串...</js>`

**操作流程**：
```
发现页 → 书源列表（可按分组过滤）
  → 展开书源 → 分类标签（玄幻/都市/完本...）
  → 点击分类 → 分类书籍列表（翻页加载）
  → 点击书籍 → 书籍详情
```

**发现与搜索的区别**：
- 搜索：用户输入关键词，多书源并发搜索
- 发现：浏览单个书源的预设分类，无需输入

## 5. "我的"页详解

设置中心，分组组织：

| 分组 | 内容 |
|---|---|
| **规则管理** | 书源管理、订阅源管理、替换净化、TXT 目录规则、字典规则 |
| **个性化** | 主题、阅读设置 |
| **数据** | 备份恢复、Legado 数据导入、下载管理 |
| **统计** | 全部书签、阅读记录 |
| **其他** | 关于 |

桌面端可使用侧边列表 + 右侧内容的双栏布局，充分利用水平空间。

## 6. 导航行为

- 路由用 Next.js App Router，标准 URL 路由
- 页面切换用简单 cross-fade（150ms）
- 浏览器前进后退正常工作
- URL 是用户可理解、可分享的
- 阅读器是唯一全屏状态，进入/退出用简单 fade（150ms）

## 7. 响应式

| 断点 | 宽度 | 导航 | 布局 |
|---|---|---|---|
| Mobile | < 768px | 底部 Tab（智能显隐） | 单列 |
| Tablet | 768-1024px | 侧边栏折叠 | 两列 |
| Desktop | > 1024px | 侧边栏 56px | 多列 |

阅读器在所有断点全屏，无侧边栏、无底栏。

## 8. 书源管理路由说明

书源管理使用 Scraping Workspace 模式，不是标准页面导航：

- **桌面端**：三段式 workspace — 列表(280px) | 编辑器(flex) | 调试器(360px, 可折叠)
- **移动端**：Stack navigation（列表 → 编辑器 → 调试器）

详细设计见 `docs/superpowers/specs/2026-05-29-source-manager-design.md`（本节仅描述导航层面的路由，完整组件树见 [Component Tree](./component-tree.md)）。
