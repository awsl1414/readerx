# ReaderX 开发路线图

## 当前状态总览

| 模块 | 已完成 | 待实现 | 状态 |
|---|---|---|---|
| rule-engine | 类型系统、Zod 校验、正则替换 | CSS/XPath/JSONPath 解析器、URL 分析器、组合运算符 | 🟡 核心 |
| infrastructure | HTTP 客户端、Logger、Config | — | 🟢 完成 |
| persistence | 数据模型类型 | IndexedDB (Dexie)、OPFS | 🔴 存根 |
| quickjs-runtime | 类型定义 | QuickJS WASM 集成、Worker 通信 | 🔴 存根 |
| reader-engine | 类型定义、ContentProcessor | 分页引擎、渲染器 | 🔴 存根 |
| services/api | 路由结构 | Hono app、DB schema、所有路由 | 🔴 存根 |
| apps/web | Layout、CSS 主题、shadcn button | 全部 4 个 feature 模块 | 🔴 存根 |

## 开发阶段

依赖关系决定了开发顺序：

```
Phase 1: rule-engine ─────────────────────────────────────────┐
                                                               │
Phase 2: persistence ──────┐                                   │
                           ├─→ Phase 4: reader-engine ──┐     │
Phase 3: quickjs-runtime ──┘                            │     │
                                                        ├─→ Phase 5: apps/web ──→ Phase 6: services/api
Phase 1.5: rule-engine (JS 解析) ───────────────────────┘
```

---

## Phase 1: 规则引擎核心（rule-engine）

规则引擎是整个项目的基础，必须最先完成。没有它，搜索、书源管理、内容获取都无法工作。

### 1.1 组合运算符处理（rule-operators.ts）

**为什么先做**: 所有解析器都需要它能拆分和组合规则字符串。

- 实现 `&&`（AND 拼接）、`||`（OR 首个非空）、`%%`（ZIP 交错合并）、`##`（正则替换链）
- 输入一条规则字符串，输出拆分后的子规则列表及其运算符
- 参考 `docs/book-source-rule-engine.md` 中的运算符优先级和嵌套规则

**验证标准**: 单元测试覆盖所有运算符组合，包括嵌套场景（如 `class.a##regex1&&class.b##regex2`）

### 1.2 CSS 选择器解析器（css.ts）

**为什么先做**: CSS 是 Legado 书源最常用的解析模式（`default` 模式）。

- 实现 `getString(rule, content)` — 从 HTML 中提取单个文本
- 实现 `getStringList(rule, content)` — 提取列表
- 实现 `getElements(rule, content)` — 提取元素列表
- 支持 `@attr` 属性提取（如 `a@href`、`img@src`）
- 支持 `tag.class` 简写、`!` 排除、`-1` 最后一个等 Legado 扩展语法
- DOM 解析：浏览器环境用 `DOMParser`，Node/Bun 环境用 `linkedom` 或 `happy-dom`
- 参考 `docs/book-source-rule-engine.md` 中 CSS 规则段落

**验证标准**: 用 Legado 社区的实际书源规则作为测试用例

### 1.3 JSONPath 解析器（jsonpath.ts）

- 使用 `jsonpath-plus` 库实现 JSONPath 查询
- `getString` / `getStringList` 与 CSS 解析器接口一致
- 处理 `$.data.list[*].name` 等标准 JSONPath 表达式

### 1.4 XPath 解析器（xpath.ts）

- 使用 `xpath` + `xmldom` 实现 XPath 查询（Node 环境）
- 浏览器环境使用原生 `document.evaluate`
- 处理 Legado 的 XPath 扩展（如 `//div[@class='content']/text()`）

### 1.5 AnalyzeRule 主入口整合（analyzer.ts）

- 将 4 个解析器整合到 `AnalyzeRule` 中
- 根据规则前缀自动选择解析模式
- 支持规则嵌套：一条规则字符串中混合多种模式（如 `class.name@js:result.trim()`）
- 集成组合运算符处理

### 1.6 URL 分析器完善（url-analyzer.ts）

- 解析 URL 规则中的选项 JSON（method、charset、headers、body、webJs、retry）
- 支持 `@js:` 动态 URL 生成（需要 Phase 3 的 quickjs-runtime）
- 支持 `<page>` 页码占位符
- 支持 POST 请求体构造

### 1.7 Zod Schema 完善（schemas.ts）

- 为 SearchRule、BookInfoRule、TocRule、ContentRule 等嵌套规则添加完整校验
- 校验 URL 格式、正则表达式有效性
- 导出完整的 BookSource 校验函数，用于导入书源时的验证

---

## Phase 2: 数据持久层（persistence）

数据层是所有 feature 的基础——书架、书源、阅读进度都需要它。

### 2.1 IndexedDB 数据库（indexeddb.ts）

- 使用 Dexie 定义数据库表：Book、BookChapter、BookGroup、Bookmark、SearchKeyword、Cache
- 表结构和索引参考 `docs/database-schema.md`
- 实现 CRUD 操作：增删改查，按条件过滤和排序
- 实现书源导入/导出（JSON 格式）

### 2.2 OPFS 文件存储（opfs.ts）

- 实现 `OPFSStorage`：`writeFile`、`readFile`、`deleteFile`
- 用于存储书籍正文缓存、封面图片等二进制数据
- 使用 `navigator.storage.getDirectory()` API

### 2.3 数据同步与缓存策略

- 定义缓存过期策略（Cache 表的 deadline 字段）
- 搜索关键词使用频率统计（SearchKeyword 表）
- 书籍阅读进度自动保存

---

## Phase 3: QuickJS 沙箱运行时（quickjs-runtime）

书源 JS 规则的安全执行环境。独立模块，可与 Phase 2 并行。

### 3.1 QuickJS WASM 集成

- 集成 `quickjs-emscripten` 或类似库
- 实现 `QuickJSSandbox.eval(code, context)` — 在沙箱中执行 JS 代码
- 支持 `timeout`（执行超时）和 `memoryLimit`（内存限制）配置

### 3.2 Web Worker 通信

- 使用 `comlink` 实现 Worker 线程与主线程的 RPC 通信
- Worker 入口文件 `worker.ts` 实例化沙箱并暴露 API
- 主线程通过 comlink proxy 调用 Worker 中的沙箱方法

### 3.3 上下文注入

- 定义书源 JS 规则可用的上下文对象（`java.ajax`、`java.log`、`result` 等）
- 模拟 Legado 的 JS 接口（`java.getString`、`java.getStringList`、`java.ajax`）
- 限制沙箱可访问的全局对象（禁止 `fetch`、`XMLHttpRequest` 等）

---

## Phase 4: 阅读引擎（reader-engine）

阅读体验的核心。依赖 rule-engine 和 persistence。

### 4.1 内容获取与解析

- 使用 rule-engine 的 ContentRule 从网页中提取正文
- 处理分页内容（`nextContentUrl` 串联多页）
- 应用净化规则（ReplaceRule）清洗正文

### 4.2 分页引擎（pagination/）

- 基于 `@chenglou/pretext` 实现纯数学文本排版
- 输入：正文文本 + PaginationConfig（字号、行高、页面尺寸、边距）
- 输出：Page 数组（每页的文本内容和位置信息）
- 纯计算，零 DOM 依赖

### 4.3 渲染器（renderer/）

- 将分页结果渲染到 DOM / Canvas
- 支持主题切换（字体、颜色、行距）
- 支持图片混排
- 支持翻页动画（滑动/覆盖/无动画）

---

## Phase 5: Web 前端（apps/web）

用户可见的界面层。依赖所有 packages。

### 5.1 基础 UI 框架

- 搭建全局布局：侧边栏导航 + 主内容区
- 实现主题切换（亮/暗模式，用 `next-themes` 或自定义 provider）
- 搭建 providers 层：QueryClientProvider、ThemeProvider、全局 Toast
- 添加 shadcn/ui 常用组件：Sidebar、Dialog、Sheet、Toast、Tabs

### 5.2 书源管理（features/source-manager/）

- 书源列表：搜索、分组、启用/禁用
- 书源导入：支持 URL 导入、文件导入、粘贴 JSON
- 书源编辑：表单编辑各规则字段，带实时校验（Zod）
- 书源调试：输入规则 → 实时显示解析结果（依赖 rule-engine）

### 5.3 搜索（features/search/）

- 搜索界面：输入关键词，多书源并发搜索
- 搜索结果：书籍列表（书名、作者、来源、简介、封面）
- 搜索结果缓存（TanStack Query + persistence）

### 5.4 书架（features/bookshelf/）

- 书架展示：网格/列表视图切换
- 添加书籍（从搜索结果）
- 阅读进度显示
- 书籍分组管理
- 本地数据持久化（persistence）

### 5.5 阅读器（features/reader/）

- 阅读界面：全屏沉浸式，点击翻页/滑动翻页
- 依赖 reader-engine 的分页和渲染
- 阅读设置：字号、行距、主题
- 目录跳转（TocRule 解析结果）
- 进度自动保存与恢复
- 上下章切换

---

## Phase 6: 后端 API（services/api）

可选，主要提供云端同步和数据中转。可与 Phase 5 并行。

### 6.1 基础框架

- 初始化 Hono app，挂载路由
- 配置 CORS、日志中间件
- 配置 Drizzle ORM + PostgreSQL 连接

### 6.2 数据模型

- 定义 Drizzle schema：User、BookSource、Book、ReadingProgress
- 数据库迁移

### 6.3 路由实现

- 书源路由：CRUD、导入/导出、分享
- 书籍路由：书架同步、进度同步
- RSS 路由：RSS 源管理

---

## 验证里程碑

| 里程碑 | 标准 | 涉及 Phase |
|---|---|---|
| **M1: 规则引擎可用** | 输入一段 HTML + CSS 规则 → 正确提取文本 | Phase 1 |
| **M2: 书源导入** | 导入一个 Legado 书源 JSON → 校验通过 → 存入 IndexedDB | Phase 1 + 2 |
| **M3: 搜索跑通** | 输入关键词 → 调用书源搜索 URL → 解析结果 → 展示列表 | Phase 1 + 2 + 5.3 |
| **M4: 阅读跑通** | 点击搜索结果 → 获取目录 → 获取正文 → 分页渲染 → 翻页阅读 | Phase 1-5 |
| **M5: 完整体验** | 书源管理 + 搜索 + 书架 + 阅读器 全链路可用 | Phase 1-5 |
| **M6: 云端同步** | 阅读进度和书架可跨设备同步 | Phase 1-6 |
