# 规则引擎改进记录

记录 ReaderX 规则引擎实现过程中，相对 Legado 原版的改进、舍弃项和架构变更。

## Step 1: 运算符与解析器

### 改进

| 领域 | Legado（原版） | ReaderX（改进） |
|------|---------------|----------------|
| 操作符拆分 | `RuleAnalyzer` 类混合拆分和执行，可变状态 | 纯函数 `splitRuleByOperators()`，无副作用 |
| 错误处理 | try-catch 静默失败返回空字符串 | `ParseResult` discriminated union (`ok: true/false`) |
| 解析器接口 | 各解析器方法签名不同（Android 特定） | 统一 `RuleParser` 接口：`getString`/`getStringList`/`getElements` |
| DOM 解析 | Jsoup（Java/Android only） | linkedom（Node）+ 原生 DOMParser（浏览器） |
| XPath | JXNode（Java only） | 原生 `document.evaluate()` + @xmldom/xmldom |
| JSONPath | Jayway JsonPath（Java only） | jsonpath-plus（JS，browser + Node） |
| JS 执行 | Mozilla Rhino，混合在规则分析器中 | 完全延迟到 Step 1.5（QuickJS 沙箱），干净分离 |
| 状态管理 | `AnalyzeRule` 用可变字段存储多步评估结果 | `setContent()` 创建解析上下文 |
| 类型 | Kotlin 字符串规则解析 | TypeScript discriminated unions（ParseResult、CombineOperator） |
| 测试 | 规则引擎无单元测试 | 44 个 Vitest 测试覆盖核心逻辑 |
| 变量系统 | `@put:{}`/`@get:{}` 混在解析逻辑中 | 延迟到 Step 2（URL 分析器），解析器保持纯函数 |
| 正则替换 | 混在 SourceRule 内部类中 | 独立模块 `regex.ts`，`parseReplaceChain` + `applyReplacements` |

### 舍弃项

| 项 | 原因 |
|----|------|
| WebView 渲染 | Android 特有，Web 端不需要（浏览器本身就是渲染引擎） |
| Cookie 自动管理 | Web 端由浏览器/HTTP 客户端处理 |
| Base64 Data URI | 低优先级，后续按需添加 |
| Proxy 配置 | 服务端关注，规则引擎不需要 |
| Android Log 日志 | 使用 infrastructure 的 Logger |
| Rhino JS 引擎 | 替换为 QuickJS（Web Worker 沙箱），Step 1.5 实现 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `parser-interface.ts` | 统一解析器契约 `RuleParser` |
| `dom-utils.ts` | 浏览器/Node 双环境 DOM 解析抽象 |
| `__tests__/` | 测试目录，含 fixtures（书源和净化规则 JSON） |

### Bug 修复

| 原文件 | 问题 | 修复 |
|--------|------|------|
| `rule-operators.ts` | 内容是 `AnalyzeUrl` 的复制粘贴 | 完全重写为操作符拆分算法 |
| `regex.ts` | `parseReplaceChain` 中 `parts.length < 3` 应为 `< 2` | 修复阈值并重写为 `splitByDoubleHash` |
| `regex.ts` | class 包装不必要 | 改为纯函数导出 |
