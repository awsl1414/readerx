# Web 管理界面模块

> 源码位置：`modules/web/`

基于 Vue 3 + TypeScript + Element Plus 的 Web 管理界面，通过浏览器管理书架和编辑书源。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.5.12 | 前端框架 |
| TypeScript | — | 类型安全 |
| Element Plus | 2.8.5 | UI 组件库 |
| Pinia | 2.2.4 | 状态管理 |
| Vue Router | 4.4.5 | 路由 |
| Axios | 1.7.7 | HTTP 客户端 |
| Vite | 5.4.8 | 构建工具 |
| pnpm | ≥9 | 包管理器 |
| Node.js | ≥20 | 运行环境 |

## 目录结构

```
modules/web/
├── src/
│   ├── api/
│   │   └── api.ts              # HTTP/WebSocket API 封装
│   ├── router/
│   │   ├── bookRouter.ts       # 书籍相关路由
│   │   └── sourceRouter.ts     # 书源相关路由
│   ├── views/
│   │   ├── BookShelf.vue       # 书架页面
│   │   ├── BookChapter.vue     # 章节阅读页面
│   │   └── SourceEditor.vue    # 书源编辑页面
│   ├── components/
│   │   ├── ChapterContent.vue  # 章节内容组件
│   │   ├── BookItems.vue       # 书籍列表组件
│   │   ├── SourceList.vue      # 书源列表组件
│   │   ├── SourceDebug.vue     # 书源调试组件
│   │   ├── ToolBar.vue         # 工具栏组件
│   │   └── ReadSettings.vue    # 阅读设置组件
│   ├── assets/                 # 静态资源
│   ├── App.vue                 # 根组件
│   └── main.ts                 # 入口文件
├── index.html
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 依赖配置
```

## 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | BookShelf | 书架（默认页） |
| `/chapter` | BookChapter | 章节阅读 |
| `/bookSource` | SourceEditor | 书源编辑 |
| `/rssSource` | SourceEditor | RSS 源编辑 |

## API 通信

`api.ts` 封装了与 Android App 的通信：

### HTTP 请求

通过 Axios 调用 App 的 REST API（见 [Web API 文档](./web-api.md)）。

### WebSocket 通信

用于实时操作：

| 端点 | 用途 |
|------|------|
| `/bookSourceDebug` | 书源规则调试 |
| `/rssSourceDebug` | RSS 源调试 |
| `/searchBook` | 实时搜索 |

## 开发命令

```bash
cd modules/web
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器
pnpm build            # 生产构建
pnpm type-check       # TypeScript 类型检查
```

## 构建产物

`pnpm build` 产出的静态文件会被自动复制到 `app/src/main/assets/web/` 目录，随 App 一起打包，由 NanoHTTPD 提供服务。
