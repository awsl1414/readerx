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
| 运行时 | Bun |
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
├── apps/
│   └── web/                       # Next.js 前端应用
│       ├── app/                   #   App Router 页面
│       ├── components/            #   通用 UI 组件 (shadcn/ui)
│       ├── features/              #   业务功能模块
│       │   ├── reader/            #     阅读器
│       │   ├── bookshelf/         #     书架
│       │   ├── search/            #     搜索
│       │   └── source-manager/    #     书源管理
│       ├── providers/             #   React Context providers
│       └── lib/                   #   工具函数
├── packages/
│   ├── rule-engine/               # 规则解析引擎
│   ├── reader-engine/             # 阅读引擎 (分页 / 渲染 / 净化)
│   ├── quickjs-runtime/           # QuickJS 沙箱运行时
│   ├── persistence/               # 数据持久层 (IndexedDB + OPFS)
│   └── infrastructure/            # 基础设施 (HTTP / 日志 / 配置)
├── services/
│   └── api/                       # Hono 后端 API
└── docs/                          # Legado 原版架构参考文档
```

### 包依赖关系

```
infrastructure  ←  rule-engine  ←  reader-engine
                        ↑               ↑
                quickjs-runtime    persistence
                   (peer dep)

rule-engine  ←  services/api
      ↑
  apps/web ──→ reader-engine · persistence · infrastructure · quickjs-runtime
```

### 架构原则

- **按边界分包** — 每个包是完整领域，类型 / 逻辑 / 校验内聚
- **Feature 和 Engine 分离** — Engine 是纯逻辑 (packages/)，Feature 是 UI 层 (apps/web/features/)
- **Runtime 独立** — quickjs-runtime 无内部依赖
- **Store 随 Feature** — Zustand store 在 feature 内部，不设全局 store
- **shared 克制** — 无独立 shared 包，跨域通过包依赖解决

## 快速开始

### 环境要求

- [Bun](https://bun.sh) >= 1.3
- [pnpm](https://pnpm.io) >= 11
- Node.js >= 22 (运行后端服务时需要)
- PostgreSQL (后端服务可选)

### 安装

```bash
git clone https://github.com/<your-org>/readerx.git
cd readerx
pnpm install
```

### 开发

```bash
pnpm dev                # 启动所有包的开发模式
pnpm --filter web dev   # 仅启动前端 (http://localhost:3000)
```

### 构建

```bash
pnpm build
```

### 其他命令

```bash
pnpm lint               # Lint 所有包
pnpm typecheck          # 类型检查所有包
pnpm test               # 运行测试
pnpm test:watch         # 监听模式运行测试
pnpm format             # 格式化代码
```

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

## 代码规范

- TypeScript strict mode + `noUncheckedIndexedAccess`
- Tab 缩进，双引号
- Biome 负责 lint 和 format（不使用 ESLint / Prettier）
- 路径别名：`@/*` → `apps/web/*`

## 文档

完整的项目架构参考文档位于 [`docs/`](./docs/)：

- [架构总览](./docs/architecture.md)
- [书源规则引擎](./docs/book-source-rule-engine.md)
- [书源配置字段](./docs/book-source-fields.md)
- [净化规则](./docs/replace-rules.md)
- [数据库 Schema](./docs/database-schema.md)
- [Web API](./docs/web-api.md)

## 致谢

- [Legado（阅读）](https://github.com/gedoor/legado) — 原版 Android 小说阅读器，本项目的架构基础和规则引擎参考
