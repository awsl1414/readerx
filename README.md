# ReaderX

[Legado（阅读）](https://github.com/gedoor/legado) 的 Web 重写增强项目 —— 基于 Legado 的书源规则引擎，使用现代 TypeScript 全栈技术重新实现，目标是将阅读体验带到浏览器。

## 特性

- **书源规则兼容** — 兼容 Legado 书源生态，支持 CSS 选择器 / XPath / JSONPath / JavaScript / 正则 5 种解析模式
- **离线阅读** — IndexedDB + OPFS 本地存储，无网络也可阅读
- **QuickJS 沙箱** — 书源 JavaScript 规则在 Web Worker 沙箱中安全执行
- **精确分页** — 基于 [Pretext](https://github.com/nicolo-ribaudo/pretext) 的纯数学文本排版，零 DOM 依赖
- **跨平台** — 纯 Web 技术，浏览器即用；未来可扩展至 Tauri / Electron

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Node |
| 包管理 | pnpm 11 |
| 构建 | Turborepo + Turbopack |
| 前端 | Next.js 16 (App Router) · React 19 |
| UI | shadcn/ui · Radix UI · Tailwind CSS 4 |
| 状态管理 | Zustand · TanStack Query |
| 后端 | Hono |
| 数据库 | PostgreSQL + Drizzle ORM (服务端) · IndexedDB + OPFS (客户端) |
| 校验 | Zod |
| 文本排版 | @chenglou/pretext |
| JS 沙箱 | QuickJS + Comlink (Web Worker) |
| 测试 | Vitest |
| Lint / Format | Biome |
| 类型检查 | TypeScript 6 |

## 项目结构

```
readerx/
├── apps/web/                       # Next.js 前端应用（App Router + Feature 模块）
│   ├── app/                        #   路由页面
│   ├── components/                 #   通用 UI 组件（shadcn/ui + 布局）
│   ├── features/                   #   业务功能模块（reader / bookshelf / search / source-manager）
│   ├── i18n/                       #   国际化配置
│   ├── messages/                   #   翻译文件（zh / en）
│   └── lib/                        #   工具函数（cn.ts）
├── packages/
│   ├── rule-engine/                # 规则解析引擎
│   ├── reader-engine/              # 阅读引擎（分页 / 渲染 / 净化）
│   ├── quickjs-runtime/            # QuickJS 沙箱运行时
│   ├── persistence/                # 数据持久层（IndexedDB + OPFS）
│   └── infrastructure/            # 基础设施（HTTP / 日志 / 配置）
├── services/api/                   # Hono 后端 API
└── docs/                           # 开发文档 + Legado 原版参考
```

### 包依赖关系

```
infrastructure  ←  rule-engine  ←  reader-engine
                        ↑
                quickjs-runtime (peer dep)

rule-engine  ←  services/api
      ↑
  apps/web → reader-engine · persistence · infrastructure · quickjs-runtime
```

### 架构原则

- **按边界分包** — 每个包是完整领域，类型 / 逻辑 / 校验内聚
- **Feature 和 Engine 分离** — Engine 是纯逻辑 (packages/)，Feature 是 UI 层 (apps/web/features/)
- **Runtime 独立** — quickjs-runtime 无内部依赖
- **Store 随 Feature** — Zustand store 在 feature 内部，不设全局 store
- **shared 克制** — 无独立 shared 包，跨域通过包依赖解决

## 规则引擎

规则引擎是项目核心，负责将书源中定义的规则字符串解析并提取网页 / JSON 内容。支持 Legado 完整的规则语法：

| 运算符 | 含义 | 示例 |
|--------|------|------|
| `&&` | AND — 拼接结果 | `class.name&&class.author` |
| `\|\|` | OR — 首个非空 | `class.title\|\|class.name` |
| `%%` | ZIP — 交错合并 | `class.name%%class.url` |
| `##` | 正则替换 | `class.title##^【(.+)】##$1` |
| `@` | 属性提取 | `a@href`, `img@src` |

详细的规则语法和书源字段说明见 [`docs/`](./docs/) 目录。

## 数据层

| 层 | 技术 | 用途 |
|---|---|---|
| 客户端 | IndexedDB (Dexie) + OPFS | 书架、书源、阅读进度、缓存文件 |
| 服务端 | PostgreSQL + Drizzle ORM | 用户数据、同步状态 |

客户端数据模型参考 [`docs/database-schema.md`](./docs/database-schema.md)。

## 文档

| 文档 | 说明 |
|---|---|
| [开发指南](./docs/development-guide.md) | 环境搭建、常用命令、项目架构、开发工作流 |
| [开发路线图](./docs/roadmap.md) | 7 阶段开发计划、模块进度、验证里程碑 |
| [Web 设计方针](./docs/web-design-philosophy.md) | Web 前端设计原则 — 所有 UI 决策的参照基准 |
| [技术标准与注意事项](./docs/tech-standards.md) | TypeScript / React / Next.js 等各技术栈的正确用法 |
| [规则引擎改进记录](./docs/rule-engine-changes.md) | 相对 Legado 的改进、舍弃项和架构变更 |
| [文档索引](./docs/README.md) | 完整文档目录（含 Legado 原版参考文档） |

## 致谢

- [Legado（阅读）](https://github.com/gedoor/legado) — 原版 Android 小说阅读器，本项目的架构基础和规则引擎参考
