# ReaderX Theme System Design

> 日期：2026-05-30
> 状态：已确认

## 概述

为 ReaderX 构建完整主题系统：落地设计令牌到 CSS、实现阅读器主题纯 CSS 化、创建 `/my/theme` 设置页（外观模式 + 阅读器排印设置 + 实时预览），并抽象 SettingsStorage 层以支持未来扩展。

核心原则：**CSS Variables First**、**单一事实来源**、**面向扩展**。

---

## §1 CSS 令牌体系

### 1.1 Surface 层级

采用 5 层 surface 体系，与 Material 3 / Radix / Linear / Vercel 同架构：

| Token | 用途 | 暗色 | 亮色 |
|-------|------|------|------|
| `--surface-0` | 页面底 / 最底层 | `oklch(0.13 0 0)` | `oklch(0.98 0 0)` |
| `--surface-1` | 卡片 / 列表项 | `oklch(0.18 0 0)` | `oklch(0.995 0 0)` |
| `--surface-2` | popover / hover 态 | `oklch(0.22 0 0)` | `oklch(0.96 0 0)` |
| `--surface-3` | modal / dialog | `oklch(0.25 0 0)` | `oklch(0.93 0 0)` |
| `--surface-4` | overlay / toast | `oklch(0.28 0 0)` | `oklch(0.90 0 0)` |

暗色 surface 使用**中性灰**（零色度），不携带色调。

### 1.2 Semantic Color 映射

shadcn/ui 语义变量映射到 surface 层级：

```
--background  → --surface-0   (页面底)
--card        → --surface-1   (卡片)
--popover     → --surface-2   (弹出层)
--sidebar     → --surface-0   (与页面底同级)
```

Tailwind `@theme inline` 新增映射：

```css
--color-surface-0: var(--surface-0);
--color-surface-1: var(--surface-1);
--color-color-surface-2: var(--surface-2);
--color-surface-3: var(--surface-3);
--color-surface-4: var(--surface-4);
```

### 1.3 Primary 蓝紫化

采用 hue 260 蓝紫色系，与 Linear / Raycast / Arc / Cursor 工具产品同系：

| 变量 | 暗色 | 亮色 |
|------|------|------|
| `--primary` | `oklch(0.72 0.16 260)` | `oklch(0.55 0.15 260)` |
| `--primary-foreground` | `oklch(0.15 0 0)` | `oklch(0.98 0 0)` |

### 1.4 新增语义色

| 变量 | 色值（暗色） | 色值（亮色） |
|------|-------------|-------------|
| `--success` | `oklch(0.65 0.17 155)` | `oklch(0.50 0.12 155)` |
| `--warning` | `oklch(0.75 0.15 80)` | `oklch(0.60 0.10 80)` |
| `--danger` | `oklch(0.60 0.20 25)` | `oklch(0.45 0.15 25)` |

### 1.5 现有代码影响

项目中 25+ 处 `bg-surface-1/2/3` 引用（分布在 13 个文件）在 CSS 变量落地后自动生效，但需要根据语义重新校验层级是否正确：

- `bg-surface-1` 用于设置页列表容器 → 应为 `bg-surface-0`（页面级容器）
- `bg-surface-2` 用于卡片/hover → 保留 `bg-surface-1`（卡片级）
- `bg-surface-3` 用于 hover 态 → 保留 `bg-surface-2`（提升级）

即现有代码中的 `surface-N` 整体偏移 +1，需要在实施时批量修正。

---

## §2 阅读器主题纯 CSS 化

### 2.1 设计决策

删除 `READER_THEME_COLORS` JS 对象（`atmosphere.ts` 中），改为纯 CSS `[data-reader-theme]` 属性选择器。单一事实来源：CSS。

### 2.2 CSS 定义

```css
/* globals.css */

/* 默认值（无 data-reader-theme 时） */
:root {
  --reader-bg: oklch(0.98 0.005 80);
  --reader-text: oklch(0.30 0.01 60);
  --reader-text-secondary: oklch(0.50 0.01 60);
}

[data-reader-theme="warm-white"] {
  --reader-bg: oklch(0.98 0.005 80);
  --reader-text: oklch(0.30 0.01 60);
  --reader-text-secondary: oklch(0.50 0.01 60);
}

[data-reader-theme="beige"] {
  --reader-bg: oklch(0.93 0.02 80);
  --reader-text: oklch(0.28 0.02 60);
  --reader-text-secondary: oklch(0.50 0.02 60);
}

[data-reader-theme="green"] {
  --reader-bg: oklch(0.92 0.03 155);
  --reader-text: oklch(0.25 0.02 140);
  --reader-text-secondary: oklch(0.45 0.02 140);
}

[data-reader-theme="sepia"] {
  --reader-bg: oklch(0.25 0.03 60);
  --reader-text: oklch(0.75 0.03 70);
  --reader-text-secondary: oklch(0.55 0.03 70);
}

[data-reader-theme="black"] {
  --reader-bg: oklch(0.12 0 0);
  --reader-text: oklch(0.65 0 0);
  --reader-text-secondary: oklch(0.45 0 0);
}
```

### 2.3 `@theme inline` 映射

```css
@theme inline {
  --color-reader-bg: var(--reader-bg);
  --color-reader-text: var(--reader-text);
  --color-reader-text-secondary: var(--reader-text-secondary);
}
```

### 2.4 JS 端改动

**`atmosphere.ts`**：
- 删除 `READER_THEME_COLORS` 常量
- 删除 `getThemeColors()` 函数
- `toLayoutConfig()` 移除颜色相关参数（颜色由 CSS 层处理）

**`reader-view.tsx`**：
- 删除 `import { getThemeColors }` 和 `const colors = getThemeColors(...)`
- 删除内联 `style={{ background: colors.bg, color: colors.text }}`
- 改为 `<div data-reader-theme={state.atmosphere.theme} className="bg-reader-bg text-reader-text">`
- 删除硬编码 oklch 值（loading 态的 `oklch(0.12 0 0)` 和 TOC 分割线的 `oklch(0.22 0 0)`），改用 CSS 变量

**`atmosphere-picker.tsx`** 及其他消费 `READER_THEME_COLORS` 的组件：
- 主题预览色块改为直接使用 CSS 中定义的值（可通过 `getComputedStyle` 读取，或维护一份仅供预览用的静态映射）

### 2.5 优势

- 单一事实来源：颜色只在 CSS 中定义一次
- DevTools 可直接查看 `[data-reader-theme="warm-white"]` 规则
- SSR 友好：`<body data-reader-theme="warm-white">` 首屏即正确，无闪烁
- 零 JS 颜色对象运行时开销

---

## §3 `/my/theme` 主题设置页

### 3.1 文件结构

```
apps/web/app/my/theme/
  page.tsx                # RSC 入口（SEO / metadata）
  theme-settings.tsx      # "use client" 主组件
```

### 3.2 页面区块（垂直排列）

#### 3.2.1 外观模式

三选一：浅色 / 深色 / 跟随系统。

- 使用 `next-themes` 的 `useTheme()`
- UI：三个等宽按钮横排，当前选中项 `bg-primary text-primary-foreground`，未选中 `bg-surface-1`
- 图标：Sun / Moon / Monitor（lucide-react）

#### 3.2.2 阅读器主题

5 个主题色块预览横排：

- 每个色块显示该主题的背景色 + 模拟两行文字（用该主题的文字色）
- 选中态：`ring-2 ring-primary ring-offset-2`
- 标签文字在色块下方
- 选中值通过 `useReaderSettings()` 管理

#### 3.2.3 字体排印设置

| 设置项 | 控件 | 范围 | 默认值 | 存储键 |
|--------|------|------|--------|--------|
| 字体 | Select 下拉 | system / serif / sans | `serif` | `readerx:reader-font` |
| 字号 | Slider + 数值 | 14–24px，步长 1 | `17` | `readerx:reader-font-size` |
| 行高 | Slider + 数值 | 1.5–2.5，步长 0.1 | `1.9` | `readerx:reader-line-height` |
| 段间距 | Slider + 数值 | 0.5–2.0，步长 0.1 | `1.2` | `readerx:reader-paragraph-spacing` |
| 内容宽度 | Slider + 数值 | 480–900px，步长 20 | `680` | `readerx:reader-content-width` |
| 段首缩进 | Select 下拉 | 无缩进 / 2em | `2em` | `readerx:reader-text-indent` |
| 文字对齐 | Select 下拉 | 左对齐 / 两端对齐 | `justify` | `readerx:reader-text-align` |

**字体预设**（抽象分类，不使用具体字体名）：

```ts
const FONT_PRESETS = {
  system: 'system-ui, -apple-system, sans-serif',
  serif: 'ui-serif, Georgia, "Noto Serif SC", serif',
  sans: 'ui-sans-serif, "Noto Sans SC", sans-serif',
} as const;

type ReaderFontPreset = keyof typeof FONT_PRESETS;
```

用户选择 "Serif" 而非 "Georgia"，浏览器根据平台自动选择最佳衬线字体。

#### 3.2.4 实时阅读预览

- 固定高度容器 `h-48`，`overflow-hidden`
- 应用当前阅读器主题的 `bg-reader-bg text-reader-text`
- 显示约 100 字中文文学片段
- 字体、字号、行高、段间距、内容宽度、缩进、对齐方式实时反映设置变化
- 通过 `data-reader-theme` 属性切换主题，CSS 变量自动生效

### 3.3 国际化

新增翻译 key 到 `apps/web/messages/zh.json` 的 `my` 命名空间：

```json
{
  "my": {
    "appearance": "外观",
    "light": "浅色",
    "dark": "深色",
    "system": "跟随系统",
    "readerTheme": "阅读器主题",
    "typography": "字体排印",
    "font": "字体",
    "fontSize": "字号",
    "lineHeight": "行高",
    "paragraphSpacing": "段间距",
    "contentWidth": "内容宽度",
    "textIndent": "段首缩进",
    "textAlign": "文字对齐",
    "noIndent": "无缩进",
    "indent2em": "2 字符",
    "alignLeft": "左对齐",
    "alignJustify": "两端对齐",
    "preview": "预览",
    "fontSystem": "系统",
    "fontSerif": "衬线",
    "fontSans": "无衬线"
  }
}
```

---

## §4 SettingsStorage 抽象层

### 4.1 接口设计

```ts
interface SettingsStorage {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  subscribe(key: string, callback: (value: unknown) => void): () => void;
}
```

### 4.2 首次实现

```ts
class LocalStorageSettingsStorage implements SettingsStorage {
  get<T>(key: string, fallback: T): T { /* JSON.parse(localStorage.getItem(key)) ?? fallback */ }
  set<T>(key: string, value: T): void { /* localStorage.setItem(key, JSON.stringify(value)) */ }
  subscribe(key: string, callback: (value: unknown) => void): () => void {
    /* StorageEvent listener for cross-tab sync */
  }
}
```

### 4.3 未来扩展

- `IndexedDBSettingsStorage`：大容量存储，支持二进制数据
- `CloudSettingsStorage`：云端同步，多设备一致

业务代码通过 `SettingsStorage` 接口访问，切换实现无需改动业务逻辑。

---

## §5 useReaderSettings Hook

### 5.1 类型

```ts
type ReaderSettings = {
  theme: ReaderTheme;
  font: ReaderFontPreset;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  contentWidth: number;
  textIndent: string;
  textAlign: "left" | "justify";
};
```

### 5.2 API

```ts
function useReaderSettings(): {
  settings: ReaderSettings;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
};
```

单一 `updateSettings(partial)` 替代多个 setter，面向未来扩展。新增设置项（如 `letterSpacing`、`columnWidth`）只需扩展 `ReaderSettings` 类型，无需改 Hook API。

### 5.3 默认值

```ts
const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: "warm-white",
  font: "serif",
  fontSize: 17,
  lineHeight: 1.9,
  paragraphSpacing: 1.2,
  contentWidth: 680,
  textIndent: "2em",
  textAlign: "justify",
};
```

### 5.4 文件位置

`apps/web/features/reader/hooks/use-reader-settings.ts`

---

## §6 文件改动清单

### 新增

| 文件 | 说明 |
|------|------|
| `apps/web/app/my/theme/page.tsx` | RSC 入口页 |
| `apps/web/app/my/theme/theme-settings.tsx` | Client Component，主题设置主界面 |
| `apps/web/features/reader/hooks/use-reader-settings.ts` | 阅读器偏好 Hook |
| `apps/web/lib/settings-storage.ts` | SettingsStorage 接口 + LocalStorage 实现 |

### 修改

| 文件 | 改动 |
|------|------|
| `apps/web/app/globals.css` | 重写 `:root`/`.dark` 色值；新增 surface-0~4 CSS 变量；新增 `@theme inline` 映射（surface + reader）；新增 `[data-reader-theme]` 属性选择器；删除 `.reader-theme-*` CSS 类 |
| `apps/web/features/reader/atmosphere.ts` | 删除 `READER_THEME_COLORS`；删除 `getThemeColors()`；`toLayoutConfig()` 移除颜色参数 |
| `apps/web/features/reader/types.ts` | 新增 `ReaderFontPreset` 类型 |
| `apps/web/features/reader/components/reader-view.tsx` | 改用 `data-reader-theme` + Tailwind CSS 类；删除内联样式中的 oklch 值 |
| `apps/web/features/reader/components/atmosphere-picker.tsx` | 主题预览改为读取 CSS 变量或使用静态映射 |
| `apps/web/messages/zh.json` | 新增主题设置相关翻译 key |
| 13 个使用 `bg-surface-*` 的组件文件 | 批量修正 surface 层级偏移（surface-N → surface-(N-1)） |

### 删除

| 内容 | 位置 | 原因 |
|------|------|------|
| `.reader-theme-*` CSS 类 | `globals.css` | 被 `[data-reader-theme]` 替代，从未被消费 |
| `READER_THEME_COLORS` 常量 | `atmosphere.ts` | 被 CSS 变量替代 |
| `getThemeColors()` 函数 | `atmosphere.ts` | 被 CSS 变量替代 |

### 不变

| 文件 | 原因 |
|------|------|
| `apps/web/app/layout.tsx` | ThemeProvider 配置不变 |
| `apps/web/components/layout/app-shell.tsx` | 已有 light/dark 切换 |
| `apps/web/app/my/page.tsx` | `/my/theme` 链接已存在 |

---

## §7 不做的事

- 不引入 Zustand 管理主题状态
- 不引入 theme 编译工具链（style-dictionary 等）
- 不自动从 YAML 生成 CSS
- 不创建 Design Token 构建流水线
- 不现在实施云同步（SettingsStorage 接口预留即可）
