# 规则管理 5 页面设计 Spec

> 日期：2026-05-30
> 状态：v1.0 — 待实施
> 范围：`/my/sources`（重写）+ 4 个新页面

## 1. 概述

实现"我的 → 规则管理"下的 5 个页面，统一视觉风格（Tailwind + shadcn/ui），替换现有的内联样式实现。

### 页面分级策略

| 模式 | 页面 | 复杂度 | 编辑器 |
|------|------|--------|--------|
| **Workspace** | 书源管理 `/my/sources` | 30+ 字段，嵌套规则组 | 三段式布局 + 调试器 |
| **Workspace** | 订阅源管理 `/my/rss-sources` | ~10 字段 | 两段式布局 |
| **独立 Feature** | 替换净化 `/my/replace-rules` | ~10 字段，复杂组合逻辑 | 列表 + Dialog |
| **SimpleRuleManager 模板** | TXT 目录规则 `/my/txt-rules` | 3 字段 | 列表 + Dialog |
| **SimpleRuleManager 模板** | 字典规则 `/my/dict-rules` | 3 字段 | 列表 + Dialog |

---

## 2. 数据层

### 2.1 组合式类型 Traits

不强制统一 RuleBase，使用组合式类型 traits：

```ts
// packages/persistence/src/types.ts

type EnableableEntity = {
  enabled: boolean;
};

type SortableEntity = {
  order: number;
};

type TimestampEntity = {
  createdAt: number;
  updatedAt: number;
};
```

各实体按需组合：

### 2.2 实体定义

**ReplaceRule**（已有，升级）：

```ts
type ReplaceRule = EnableableEntity &
  SortableEntity &
  TimestampEntity & {
    id: string; // UUID，从 number? 升级
    name: string;
    group?: string;
    pattern: string;
    replacement: string;
    scope?: string;
    scopeTitle: boolean;
    scopeContent: boolean;
    excludeScope?: string;
    isRegex: boolean;
    timeoutMillisecond: number;
  };
```

**RssSourceRecord**：

```ts
type RssSourceRecord = EnableableEntity &
  TimestampEntity & {
    sourceUrl: string; // PK，兼容 Legado 导入
    sourceName: string;
    sourceGroup?: string;
    customOrder: number;
    raw: Record<string, unknown>; // ruleArticles, ruleTitle 等存这里
  };
```

**TxtTocRule**：

```ts
type TxtTocRule = EnableableEntity & {
  id: string; // UUID
  name: string;
  rule: string; // 正则规则
};
```

**DictRule**：

```ts
type DictRule = EnableableEntity & {
  id: string; // UUID，不用 name 作 PK
  name: string;
  urlRule?: string;
  showRule?: string;
};
```

**设计决策**：
- TxtTocRule 和 DictRule 不需要 `order`（数量少，按名称排序即可）和 `createdAt`/`updatedAt`（用户不关心）
- RssSourceRecord 保留 `sourceUrl` 作 PK（兼容 Legado 导入导出），不用 UUID
- ReplaceRule 最复杂，需要完整的 traits 组合
- BookSourceRecord 保持现有 passthrough 模式不变（已有大量代码依赖）

### 2.3 IndexedDB v1 → v2 迁移

```ts
// 新增表
rssSources: "sourceUrl, sourceName, *sourceGroup, enabled, [sourceGroup+enabled]"
txtTocRules: "id, name, enabled"
dictRules:   "id, name, enabled"

// replaceRules 索引更新（id 从 ++id → id string）
replaceRules: "id, name, group, order, isEnabled"
```

> ⚠️ `replaceRules` 的 `++id` → `id` (UUID) 是破坏性变更。开发阶段数据量为 0，直接升级。

### 2.4 Repository 设计（两层）

**BaseDexieRepository\<T\>** — 薄封装，仅 CRUD：

```ts
// packages/persistence/src/base-repository.ts

class BaseDexieRepository<T> {
  constructor(protected table: Table<T, string>) {}

  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  async getById(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  async save(entity: T): Promise<void> {
    await this.table.put(entity);
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }

  async deleteBatch(ids: string[]): Promise<void> {
    await this.table.bulkDelete(ids);
  }
}
```

**具体 Repository** — 继承 Base，各自添加业务查询：

```ts
// 每个 Repo 只添加自己需要的查询方法
class ReplaceRuleRepository extends BaseDexieRepository<ReplaceRule> {
  async getEnabled(): Promise<ReplaceRule[]> { ... }
  async getByScope(name: string, origin: string, scope: "title" | "content"): Promise<ReplaceRule[]> { ... }
}

class RssSourceRepository extends BaseDexieRepository<RssSourceRecord> {
  // PK 是 sourceUrl 不是 id，需要 override getById
  constructor(table: Table<RssSourceRecord, string>) {
    super(table);
  }
  async getById(sourceUrl: string): Promise<RssSourceRecord | undefined> {
    return this.table.get(sourceUrl);
  }
}
```

**不要做**：`IRuleRepository` 接口层。两层足够（Base + 具体）。

### 2.5 Zod Schemas（rule-engine）

```ts
// packages/rule-engine/src/schemas.ts — 新增

const replaceRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  group: z.string().optional(),
  pattern: z.string().min(1),
  replacement: z.string(),
  scope: z.string().optional(),
  scopeTitle: z.boolean(),
  scopeContent: z.boolean(),
  excludeScope: z.string().optional(),
  isEnabled: z.boolean(),
  isRegex: z.boolean(),
  timeoutMillisecond: z.number(),
  order: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const txtTocRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  rule: z.string().min(1),
  enabled: z.boolean(),
});

const dictRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  urlRule: z.string().optional(),
  showRule: z.string().optional(),
  enabled: z.boolean(),
});

// parseReplaceRule, parseTxtTocRule, parseDictRule 导出函数
```

---

## 3. Feature 层架构

### 3.1 目录结构

```
features/
  source-manager/              # 书源管理（Workspace，重写 UI）
    components/                # 13 个组件全部重写
      source-workspace.tsx       # 响应式三段布局
      source-list-panel.tsx
      source-list-item.tsx
      source-editor-panel.tsx
      rule-section.tsx
      rule-field-editor.tsx
      source-debugger-panel.tsx  # 单步调试器
      debug-test-form.tsx
      debug-result-viewer.tsx
      import-dialog.tsx
      import-result-report.tsx
      source-empty-state.tsx
    hooks/
      use-sources.ts
      use-source-detail.ts
      use-source-import.ts
      use-source-debug.ts
      use-source-capabilities.ts
    lib/
      capability-analyzer.ts
    store.ts
    types.ts
    index.ts

  rss-source-manager/           # 订阅源管理（轻量 Workspace）
    components/
      rss-source-workspace.tsx
      rss-source-list-panel.tsx
      rss-source-list-item.tsx
      rss-source-editor-panel.tsx
      rss-source-empty-state.tsx
    hooks/
      use-rss-sources.ts
      use-rss-source-detail.ts
      use-rss-source-import.ts
    store.ts
    types.ts
    index.ts

  replace-rule-manager/         # 替换净化（独立 Feature，不用模板）
    components/
      replace-rule-page.tsx      # 完整页面
      replace-rule-list-item.tsx
      replace-rule-edit-dialog.tsx
      replace-rule-empty-state.tsx
    hooks/
      use-replace-rules.ts
      use-replace-rule-mutations.ts
      use-replace-rule-import.ts
    types.ts
    index.ts

  simple-rule-manager/           # 通用简单规则模板
    components/
      rule-list-page.tsx
      rule-list-item.tsx
      rule-edit-dialog.tsx       # 字段由 config 驱动
      rule-empty-state.tsx
    hooks/
      use-simple-rules.ts        # 泛型 hook
    types.ts                     # RuleManagerConfig<T>
    index.ts

  txt-rule-manager/              # TXT 目录规则（用 SimpleRuleManager）
    config.ts                    # txtRuleConfig: RuleManagerConfig<TxtTocRule>
    index.ts

  dict-rule-manager/             # 字典规则（用 SimpleRuleManager）
    config.ts                    # dictRuleConfig: RuleManagerConfig<DictRule>
    index.ts
```

### 3.2 SimpleRuleManager 配置

仅用于 TxtTocRule（3 字段）和 DictRule（3 字段）：

```ts
type FieldDef = {
  key: string;
  labelKey: string;           // i18n key
  type: "text" | "textarea" | "switch";
  required?: boolean;
  placeholder?: string;
  monospace?: boolean;
};

type RuleManagerConfig<T> = {
  i18nNamespace: string;
  queryKeyPrefix: string;
  createRepository: () => BaseDexieRepository<T>;
  fields: FieldDef[];
  defaultValue: Partial<T>;
  importParser: (raw: string) => T[];
};
```

**不做**：`render?`、`validator?`、`visibility?`、`dependency?`。如果字段需要这些，说明它不属于 SimpleRuleManager。

### 3.3 组件复用矩阵

| 组件 | 书源 | 订阅源 | 替换净化 | TXT | 字典 |
|------|:----:|:------:|:--------:|:---:|:----:|
| SourceWorkspace 布局 | ✅ | — | — | — | — |
| RssSourceWorkspace 布局 | — | ✅ | — | — | — |
| RuleListPage 模板 | — | — | — | ✅ | ✅ |
| 独立页面 | — | — | ✅ | — | — |
| ImportDialog（三 Tab） | ✅ | ✅ | ✅ | ✅ | ✅ |
| EmptyState | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lucide Icons | ✅ | ✅ | ✅ | ✅ | ✅ |
| shadcn/ui 全套 | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. 各页面详细设计

### 4.1 书源管理 `/my/sources`（重写）

#### 响应式布局

```
桌面端（≥1024px）：
┌─────────────┬────────────────────┬──────────────┐
│ List 280px  │ Editor flex-1      │ Debugger     │
│             │                    │ 320px 可折叠  │
└─────────────┴────────────────────┴──────────────┘

平板端（768-1023px）：
┌─────────────┬────────────────────┐
│ List 240px  │ Editor flex-1      │
└─────────────┴────────────────────┘

移动端（<768px）：
Stack 导航 — Zustand mobileLayer 控制：
  Layer 0: List（默认）
  Layer 1: Editor（选中源后推入）
  Layer 2: Debugger（调试按钮推入）
  每层有 ← 返回按钮
```

#### Layer 0：源列表

- `Input` 搜索框（300ms debounce → Zustand store）
- `Tabs`：全部 / 已启用 / 已禁用
- `SourceListItem`：图标 + 名称 + 域名 + 能力 Badge + Switch
- 底部统计 `text-muted-foreground text-xs`
- 空状态：图标 + 文案 + 导入 CTA

#### Layer 1：源编辑器

- 标题栏：← 返回 + 源名称 + 调试按钮 + 保存按钮
- `RuleSection`（Collapsible）：基本信息 / 搜索规则 / 书籍信息 / 目录规则 / 正文规则 / 高级设置
- `RuleFieldEditor`：Label + Textarea（font-mono）+ 解析器类型 Badge（CSS/XPath/JSON/JS/Regex）
- `Select`：书源类型
- **Dirty State 保护**：切换源或返回时检测未保存变更 → 确认 Dialog

#### Layer 2：单步调试器（P0）

- `Tabs`：搜索 / 书籍信息 / 目录 / 正文
- 测试输入区：关键词（搜索模式）或 URL（其他模式）
- 运行 / 停止按钮
- 结果区：`ScrollArea` + JSON（font-mono）
- 状态：idle → running → success / error
- 错误时显示错误信息 + 重试

**P0 调试器只做单步规则执行**。Pipeline Timeline、Console、Network Inspector 属于 P1。

#### Dirty State 保护

```
编辑器有未保存修改
  │
  ├─ 用户切换书源 → 确认 Dialog
  │   [保存] → 保存当前 → 切换到新书源
  │   [放弃] → 丢弃修改 → 切换到新书源
  │   [取消] → 留在当前编辑器
  │
  ├─ 用户点击返回 → 确认 Dialog（同上）
  │
  └─ 自动保存 — P1，暂不实现
```

实现方式：`useState` 跟踪 `dirtyFields`，Zustand action `selectSource` 前检查 dirty。

### 4.2 订阅源管理 `/my/rss-sources`

两段式 Workspace（无调试器）：

```
桌面：List 280px | Editor flex-1
移动：Stack 导航（List → Editor）
```

编辑器字段从 `raw` 读写：
- 基本信息：源名称、源URL、源分组、文章样式（Select）
- 规则：文章列表规则、标题规则、内容规则、描述规则（Textarea font-mono）

### 4.3 替换净化 `/my/replace-rules`（独立 Feature）

列表页 + Dialog 编辑（不用 SimpleRuleManager 模板）：

```
┌─────────────────────────────┐
│ ← 替换净化         [+ 添加]  │
├─────────────────────────────┤
│ 🔍 搜索规则...               │
├─────────────────────────────┤
│ 去广告                    [●]│
│ 默认 · 正则 · 正文+标题      │
├─────────────────────────────┤
│ ...                          │
└─────────────────────────────┘
```

- `RuleListItem`：名称 + 分组 Badge + 匹配模式 Badge + 作用域标签 + Switch
- 点击 → `ReplaceRuleEditDialog`（Dialog 内表单，不用模板驱动）
- Dialog 包含所有 ReplaceRule 字段的专用 UI（scope 选择器、isRegex 开关、timeout 输入等）

### 4.4 TXT 目录规则 `/my/txt-rules`（SimpleRuleManager 模板）

极简：名称 + 规则（monospace Textarea）+ 启用开关。

### 4.5 字典规则 `/my/dict-rules`（SimpleRuleManager 模板）

极简：名称 + URL规则 + 显示规则 + 启用开关。

---

## 5. 状态管理

### 5.1 TanStack Query — Query Key 不含搜索/过滤

所有 IndexedDB 本地数据的 Query Key 只按实体分类：

```ts
["sources"]       // 书源列表（全量缓存）
["source", url]   // 单个书源
["rssSources"]    // 订阅源列表
["rssSource", url]
["replaceRules"]  // 替换规则列表
["txtRules"]      // TXT 规则列表
["dictRules"]     // 字典规则列表
```

**搜索和过滤在内存完成**：

```ts
function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: () => new BookSourceRepository(db.bookSources).getAll(),
    staleTime: 60_000,
  });
}

// 在组件中用 useMemo 过滤
const filteredSources = useMemo(() => {
  if (!sources) return [];
  return sources
    .filter(s => filterMode === "all" ||
      (filterMode === "enabled" ? s.enabled : !s.enabled))
    .filter(s => !searchQuery || s.bookSourceName.includes(searchQuery));
}, [sources, filterMode, searchQuery]);
```

### 5.2 Zustand — 仅 ephemeral UI state

**sourceManagerStore**：

```ts
type SourceManagerState = {
  selectedSourceUrl: string | null;
  filterMode: "all" | "enabled" | "disabled";
  searchQuery: string;
  debuggerOpen: boolean;
  mobileLayer: 0 | 1 | 2;
};
// Actions: selectSource, setFilterMode, setSearchQuery, toggleDebugger, navigateToLayer, goBack
```

**rssSourceStore**（同构，去掉 debugger/mobileLayer 2）：

```ts
type RssSourceState = {
  selectedSourceUrl: string | null;
  filterMode: "all" | "enabled" | "disabled";
  searchQuery: string;
  mobileLayer: 0 | 1;
};
```

**简单页面** — `useState` 足够，不建 Zustand store：

```ts
const [editRuleId, setEditRuleId] = useState<string | null>(null);
const [importOpen, setImportOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
```

### 5.3 表单管理

- **书源编辑器（30+ 字段）**：P0 用受控组件 `useState`（不引入 react-hook-form），P1 迁移到 react-hook-form
- **订阅源编辑器（~10 字段）**：同上
- **替换净化 Dialog**：受控组件 `useState`
- **TXT/字典 Dialog**：受控组件（字段少）

### 5.4 Mutations

```ts
function useSourceMutations() {
  const queryClient = useQueryClient();
  return {
    save: useMutation({
      mutationFn: (source: BookSourceRecord) => repo.save(source),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["sources"] });
        toast.success(t("saved"));
      },
      onError: (err) => toast.error(`保存失败: ${err.message}`),
    }),
    toggleEnabled: useMutation({ ... }),
    remove: useMutation({ ... }),
    batchRemove: useMutation({ ... }),
  };
}
```

---

## 6. 样式规范

### 6.1 从内联样式到 Tailwind

| 方面 | 旧实现 | 新实现 |
|------|--------|--------|
| 样式 | `style={{ background: "oklch(0.12 0 0)" }}` | Tailwind 类 + CSS 变量 |
| 组件 | 原生 `<div>` `<button>` | shadcn/ui |
| 主题 | 仅暗色 | 亮/暗双主题 |
| 图标 | Emoji | Lucide React |
| i18n | 硬编码中文 | next-intl |

### 6.2 Surface 分层

```
Surface 0 — bg-background      最底层
Surface 1 — bg-surface-1       列表面板、编辑器面板
Surface 2 — bg-surface-2       选中项、hover
Surface 3 — bg-surface-3       Dialog、Tooltip
```

### 6.3 响应式

- `<768px`（`md:` 以下）：移动端 Stack 导航，单层显示
- `768-1023px`（`md:` 到 `lg:`）：双栏
- `≥1024px`（`lg:` 以上）：三栏全展开（仅书源有调试器第三栏）

### 6.4 动效

- hover：`transition-colors duration-150`
- 折叠：Collapsible 内置
- Dialog：Radix 内置
- Toast：Sonner 内置
- 页面切换：无额外动效

---

## 7. i18n

### 7.1 命名空间

```
sourceManager   — 书源管理所有文案
rssSourceManager — 订阅源管理
replaceRules    — 替换净化
txtRules        — TXT 目录规则
dictRules       — 字典规则
import          — 导入 Dialog 通用文案
```

### 7.2 使用

```tsx
const t = useTranslations("sourceManager");
<Input placeholder={t("searchPlaceholder")} />
```

---

## 8. 错误处理

### 8.1 分层

```
UI 层      — Sonner Toast（保存成功、删除失败）
Query 层   — isError + ErrorState 组件 + 重试按钮
Mutation 层 — onError → toast
导入层     — Zod 逐条校验 → ImportResultReport
调试层     — try/catch + AbortController → 错误信息 + 重试
```

### 8.2 Dirty State 保护

编辑器跟踪 `dirty` 状态。切换源或返回前：
- dirty → 确认 Dialog（保存 / 放弃 / 取消）
- 非 dirty → 直接切换

---

## 9. 导入

### 9.1 ImportDialog（三 Tab：URL / 文件 / 粘贴）

UI 统一，业务逻辑各自实现：

- 书源导入：`source-manager/hooks/use-source-import.ts`
- 订阅源导入：`rss-source-manager/hooks/use-rss-source-import.ts`
- 替换规则导入：`replace-rule-manager/hooks/use-replace-rule-import.ts`
- TXT/字典导入：`simple-rule-manager` 内的 importParser 配置

### 9.2 不做

不做 ImportFramework。不抽象 `beforeImport`/`afterImport`/`transform`/`conflictResolver`。

---

## 10. 实施范围

### 10.1 P0 — 本次完成

- 数据层：类型 + Repository + Dexie v2 迁移 + Zod schemas
- 书源管理：13 个组件重写 + 单步调试器
- 订阅源管理：完整新 Feature
- 替换净化：独立 Feature
- TXT 目录规则 + 字典规则：SimpleRuleManager 模板
- i18n：zh.json + en.json 新增命名空间
- 5 个路由页面

### 10.2 明确排除

| 功能 | 原因 |
|------|------|
| Pipeline Timeline 可视化 | P1 |
| Console 日志面板 | P1 |
| 网络请求 Inspector | P1 |
| 拖拽排序 | P1，需要 dnd-kit |
| 导出功能 | P1 |
| 批量编辑 | P1 |
| 自动保存 | P1 |
| react-hook-form 集成 | P1 |

### 10.3 实施顺序

```
Phase 1 — 数据层
  1. 组合式类型 traits + 新增实体类型
  2. ReplaceRule 类型升级
  3. Dexie v2 迁移
  4. BaseDexieRepository<T> + 具体 Repository
  5. Zod schemas

Phase 2 — 通用框架
  6. SimpleRuleManager 模板组件
  7. i18n 新增命名空间

Phase 3 — 书源管理重写
  8. source-manager 13 个组件 Tailwind 重写
  9. 单步调试器
  10. Dirty State 保护

Phase 4 — 新页面
  11. rss-source-manager 完整 Feature
  12. replace-rule-manager 独立 Feature
  13. txt-rule-manager 配置 + 页面
  14. dict-rule-manager 配置 + 页面
  15. 4 个新路由 page.tsx
```

### 10.4 文件变更预估

```
新增文件 (~28)：
  packages/persistence/src/base-repository.ts
  packages/persistence/src/rss-source-repo.ts
  packages/rule-engine/src/schemas.ts (新增 schema)
  apps/web/app/my/rss-sources/page.tsx
  apps/web/app/my/replace-rules/page.tsx
  apps/web/app/my/txt-rules/page.tsx
  apps/web/app/my/dict-rules/page.tsx
  apps/web/features/rss-source-manager/** (~8 文件)
  apps/web/features/replace-rule-manager/** (~6 文件)
  apps/web/features/simple-rule-manager/** (~6 文件)
  apps/web/features/txt-rule-manager/config.ts
  apps/web/features/dict-rule-manager/config.ts

重写文件 (~13)：
  apps/web/features/source-manager/components/*.tsx

修改文件 (~6)：
  packages/persistence/src/types.ts
  packages/persistence/src/database.ts
  packages/persistence/src/replace-rule-repo.ts
  apps/web/messages/zh.json
  apps/web/messages/en.json
  apps/web/app/my/sources/page.tsx
```
