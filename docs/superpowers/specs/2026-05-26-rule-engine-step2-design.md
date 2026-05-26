# Step 2: Rule Engine — URL 分析器 + Schema

> 日期：2026-05-26
> 状态：已批准
> 范围：packages/rule-engine

## 目标

完善 rule-engine 的两大功能：

1. **URL 分析器** — 将书源中的 URL 规则字符串解析为结构化请求配置
2. **Zod Schema** — 为 BookSource 及所有嵌套规则类型提供完整校验

## 职责边界

- URL 分析器**仅做解析**，输出 `AnalyzeUrlResult`（url + method + headers + body 等）
- 网络请求由调用方（reader-engine / infrastructure HttpClient）负责
- `@js:` 和 `{{js}}` 功能**延迟到 Step 1.5**（依赖 quickjs-runtime）
- `@put/@get` 变量系统**延迟到 Step 5**（依赖运行时状态）
- WebView 渲染、Cookie 管理、并发限流**永久舍弃**

## 1. URL 分析器设计

### 1.1 函数式管线

```
输入：ruleUrl + AnalyzeUrlContext
  │
  ├─ Step 1: splitUrlOptions(ruleUrl)
  │    将 "url, {json}" 分离为 { urlPart, optionJson? }
  │    正则：/,\s*(?={)/ 切分
  │
  ├─ Step 2: replaceVariables(urlPart, variables)
  │    替换 {{key}} 占位符
  │
  ├─ Step 3: resolvePage(urlPart, page)
  │    处理 <page> 和 <p1,p2,p3,...> 分页占位符
  │
  ├─ Step 4: resolveRelativeUrl(url, baseUrl)
  │    相对路径转绝对 URL（new URL(path, base)）
  │
  └─ Step 5: buildResult(url, optionJson, context)
       合并书源 headers + URL 选项 → AnalyzeUrlResult
```

### 1.2 类型定义

```typescript
// 输入上下文
interface AnalyzeUrlContext {
  variables?: Record<string, string>;
  page?: number;
  baseUrl?: string;
  headers?: Record<string, string>;
}

// URL 选项 JSON 结构
interface UrlOption {
  method?: string;
  charset?: string;
  headers?: Record<string, string>;
  body?: string;
  retry?: number;
  webJs?: string;
  type?: string;
  webView?: boolean;  // 解析但标记为 deprecated
}

// 输出
interface AnalyzeUrlResult {
  url: string;
  method: "GET" | "POST";
  charset?: string;
  headers: Record<string, string>;
  body?: string;
  webJs?: string;
  retry: number;
  type?: string;
}
```

### 1.3 主入口 API

```typescript
// 类保持（兼容现有使用方），内部重构为纯函数调用
class AnalyzeUrl {
  analyze(rule: string, context?: AnalyzeUrlContext): AnalyzeUrlResult;
}

// 纯函数导出（可单独使用和测试）
function analyzeUrl(rule: string, context?: AnalyzeUrlContext): AnalyzeUrlResult;
```

### 1.4 页码规则

Legado 支持两种 `<page>` 格式：

1. **数字页码**：`<page>` → 直接替换为 page 数字
2. **URL 列表**：`<第一页URL,第二页URL,...>` → 按 page 索引取值，超出取最后一项

ReaderX 支持格式 1 和 2，与 Legado 兼容。

### 1.5 URL 选项解析

URL 和选项以 `,{` 分隔：

```
https://example.com/search?q=test,{"method":"POST","body":"keyword=test"}
```

解析步骤：
1. 正则 `,\s*(?={)` 定位分隔点
2. 前半部分为 URL（已做变量/页码替换）
3. 后半部分为 JSON 选项，用 Zod `urlOptionSchema` 校验
4. 合并 headers：书源默认 < URL 选项覆盖

## 2. Zod Schema 设计

### 2.1 Schema 层次

```
urlOptionSchema
searchRuleSchema       → bookList*, name*, author*, bookUrl*
exploreRuleSchema      → 同 SearchRule（无 checkKeyWord）
bookInfoRuleSchema     → init?, name?, author?, intro?, tocUrl?, ...
tocRuleSchema          → chapterList*, chapterName*, chapterUrl*, nextTocUrl?
contentRuleSchema      → content*, nextContentUrl?, replaceRegex?, ...
reviewRuleSchema       → reviewUrl?, avatarRule?, contentRule?, ...
bookSourceSchema       → bookSourceUrl*, bookSourceName*, bookSourceType*, ...
```

标 `*` 为必填字段，校验缺失时给出明确错误消息。

### 2.2 导出 API

```typescript
// 快速布尔校验（兼容现有使用方）
validateBookSource(source: unknown): source is BookSource

// 带错误详情解析
parseBookSource(source: unknown):
  | { success: true; data: BookSource }
  | { success: false; errors: ZodError }

// URL 选项解析
parseUrlOption(json: string):
  | { success: true; data: UrlOption }
  | { success: false; error: string }
```

### 2.3 校验规则细节

- `bookSourceUrl`：非空字符串
- `bookSourceType`：枚举 0 | 1 | 2 | 3
- `header`：可选，若提供需为合法 JSON 字符串
- `method`（UrlOption）：可选 "GET" | "POST"，默认 "GET"
- `retry`：可选整数 ≥ 0，默认 0
- 额外字段：`passthrough`（允许未知字段，兼容社区书源扩展）
- 嵌套规则：`ruleSearch` 等为可选，若提供则深度校验必填字段

## 3. 文件变更

| 文件 | 变更 |
|------|------|
| `src/url-analyzer.ts` | 重写：纯函数管线 + AnalyzeUrlContext 接口 |
| `src/schemas.ts` | 重写：完整 Zod schema 体系 + parse/validate 导出 |
| `src/types.ts` | 扩展：新增 UrlOption 类型，更新 AnalyzeUrlResult |
| `src/index.ts` | 更新：导出新接口和类型 |
| `__tests__/url-analyzer.test.ts` | 重写：覆盖完整管线 |
| `__tests__/schemas.test.ts` | 新增：Schema 校验测试 |

## 4. 测试计划

### URL 分析器（~25 用例）

- 基础 URL 不变
- 变量替换 `{{key}}`
- 多变量替换、重复变量、未引用变量保持原样
- 页码 `<page>` 简单替换
- 页码 `<p1,p2,p3>` 列表替换
- URL + JSON 选项分离
- POST method + body 提取
- headers 合并（书源默认 + URL 选项）
- 相对 URL → 绝对 URL
- 无效 JSON 选项（降级为无选项）
- 空字符串、纯空格

### Schema（~15 用例）

- 合法 BookSource 完整通过
- 最小 BookSource（仅必填字段）
- 缺少 bookSourceUrl 报错
- bookSourceType 非法值报错
- 嵌套规则 ruleSearch.bookList 缺失报错
- UrlOption method 非法值报错
- UrlOption retry 负数报错
- 额外字段 passthrough 不报错
- header 字段非法 JSON 报错
- parseBookSource 返回错误详情

## 5. 改进与舍弃记录

### 改进

| 领域 | Legado | ReaderX |
|------|--------|---------|
| URL 解析 | 851 行 AnalyzeUrl 类，混合网络请求 | ~200 行纯函数管线，仅解析 |
| 请求配置 | 内部直接发起 HTTP 请求 | 输出结构化 AnalyzeUrlResult，调用方决定请求方式 |
| 选项校验 | UrlOption data class + Gson 宽松解析 | Zod schema 严格校验 + 人类可读错误 |
| 类型安全 | Kotlin data class 默认值兜底 | TypeScript discriminated union + Zod 校验 |
| 可测试性 | 需要 mock 网络层 | 纯函数，直接单元测试 |

### 舍弃

| 项 | 原因 |
|----|------|
| `getStrResponse` / `getResponse` | 网络请求职责，由 infrastructure HttpClient 处理 |
| Cookie 管理 | Web 端由浏览器/HTTP 客户端处理 |
| WebView 渲染 | Web 端不需要（浏览器本身就是渲染引擎） |
| Proxy 配置 | 服务端关注，URL 解析不需要 |
| ConcurrentRateLimiter | 并发控制由调用方处理 |
| Base64 Data URI | 低优先级，后续按需添加 |
| GlideUrl / ExoPlayer | Android 图片/音频加载库，Web 端无用 |
| `@js:` / `{{js}}` 执行 | 延迟到 Step 1.5（quickjs-runtime） |
| `@put/@get` 变量 | 延迟到 Step 5（reader-engine 运行时） |
| `serverID` | Legado 服务器功能，ReaderX 暂不需要 |
| `webViewDelayTime` | WebView 功能的一部分，随 WebView 一起舍弃 |

### 新增

| 项 | 说明 |
|----|------|
| `AnalyzeUrlContext` | 统一的输入上下文接口 |
| `splitUrlOptions()` | 独立的 URL/选项分离函数 |
| `resolvePage()` | 独立的页码解析函数 |
| `resolveRelativeUrl()` | 独立的相对 URL 解析函数 |
| `urlOptionSchema` | URL 选项的 Zod schema |
| `parseBookSource()` | 带错误详情的 BookSource 解析 |
| `parseUrlOption()` | URL 选项 JSON 解析 |
