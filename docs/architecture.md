# Legado（阅读）项目架构总览

## 项目简介

Legado 是一个开源 Android 小说阅读器，支持网络书源规则、本地 TXT/EPUB/UMD/MOBI/PDF、RSS 订阅、TTS 朗读和音频播放。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 语言 | Kotlin / Java 17 | Kotlin 2.3.0 |
| Android | compileSdk 36, minSdk 21 | targetSdk 36 |
| 构建 | Gradle + KSP + Version Catalog | AGP 8.13.2 |
| 数据库 | Room | 2.7.1 |
| 网络 | OkHttp 5.x / Cronet | 5.3.2 |
| 图片 | Glide | 5.0.5 |
| JS 引擎 | Mozilla Rhino | 1.8.1 |
| HTML 解析 | Jsoup + JsoupXpath | 1.16.2 / 2.5.3 |
| JSON 解析 | Gson + JsonPath | 2.10.0 |
| Web 服务 | NanoHTTPD | 2.3.1 |
| 协程 | kotlinx-coroutines | 1.10.2 |
| 媒体 | ExoPlayer (Media3) | 1.8.0 |
| Web 界面 | Vue 3 + TypeScript + Element Plus | Vite 构建 |

## 模块结构

```
legado/
├── app/                    # 主应用模块 (Kotlin)
│   └── io.legado.app/
│       ├── App.kt          # Application 入口
│       ├── base/           # 基类（Activity/Fragment/ViewModel/Service）
│       ├── ui/             # UI 层，按功能分包
│       ├── data/           # 数据层（Room 实体、DAO、AppDatabase）
│       ├── model/          # 业务逻辑
│       │   ├── analyzeRule/    # ★ 规则解析引擎
│       │   ├── webBook/        # 网络书源处理
│       │   ├── localBook/      # 本地书籍解析
│       │   ├── ReadBook.kt     # 阅读状态管理
│       │   └── AudioPlay.kt    # 音频播放管理
│       ├── service/        # 后台服务
│       ├── help/           # 工具类
│       ├── api/            # Web API 控制器
│       ├── web/            # HTTP/WebSocket 服务器
│       └── lib/            # 内嵌第三方库
├── modules/
│   ├── book/               # EPUB/UMD 书籍解析库 (Java, namespace: me.ag2s)
│   ├── rhino/              # JS 引擎封装 (com.script)
│   └── web/                # Vue 3 Web 管理界面
└── gradle/
    └── libs.versions.toml  # 统一依赖版本管理
```

## 架构模式：MVVM

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│   View    │────▶│  ViewModel   │────▶│    Model     │
│ (UI 层)   │◀────│ (状态管理)    │◀────│ (业务逻辑)   │
└──────────┘     └──────────────┘     └──────────────┘
     │                                        │
     │ ViewBinding                        Room DB
     │ LiveEventBus                     OkHttp/Rhino
     ▼                                        ▼
┌──────────┐                          ┌──────────────┐
│  Layout  │                          │    Data      │
│  (XML)   │                          │  (持久化层)   │
└──────────┘                          └──────────────┘
```

### 关键设计决策

| 设计 | 方案 | 说明 |
|------|------|------|
| 依赖注入 | 手动 DI（object 单例 + by lazy） | 无 Dagger/Hilt |
| 事件总线 | LiveEventBus | 跨组件通信 |
| 异步 | Kotlin 协程 + 自定义 Dispatcher | 统一异步管理 |
| 数据库 | Room + KSP | Schema 导出至 `app/schemas/`，支持自动迁移 |
| JS 引擎 | Mozilla Rhino（非 V8） | Android 兼容性好，支持 ES6 |
| 网络栈 | OkHttp 5.x 为主，Cronet 可选 | 自定义拦截器处理压缩/Cookie/SSL |

## 核心数据流

### 网络书籍获取流程

```
用户搜索/浏览
    │
    ▼
WebBook.searchBookAwait() / exploreBookAwait()
    │
    ├── AnalyzeUrl 解析 URL 规则（变量替换、JS 执行、分页）
    │       │
    │       ▼
    │   OkHttp 发送 HTTP 请求
    │       │
    │       ▼
    │   获得响应内容（HTML/JSON/XML）
    │
    ▼
AnalyzeRule 解析规则
    │
    ├── 自动检测内容类型（JSON / HTML）
    ├── 选择解析器：
    │   ├── JSoup CSS 选择器（默认）
    │   ├── XPath
    │   ├── JSONPath
    │   ├── JavaScript
    │   └── Regex
    │
    ▼
SearchBook / Book 实体 → Room 数据库 → UI 展示
```

### 书源规则处理流程

```
BookSource（书源配置）
    │
    ├── searchUrl    → 搜索 URL 规则
    ├── exploreUrl   → 发现页 URL 规则
    ├── ruleSearch   → 搜索结果解析规则
    ├── ruleExplore  → 发现页解析规则
    ├── ruleBookInfo → 书籍详情解析规则
    ├── ruleToc      → 目录解析规则
    └── ruleContent  → 正文解析规则
```

## UI 层结构

| 包名 | 功能 |
|------|------|
| `ui/main/bookshelf/` | 书架 |
| `ui/main/explore/` | 发现页 |
| `ui/main/rss/` | RSS 订阅 |
| `ui/main/my/` | 个人设置 |
| `ui/book/read/` | 阅读界面 |
| `ui/book/audio/` | 有声书播放 |
| `ui/book/manga/` | 漫画阅读 |
| `ui/book/search/` | 书籍搜索 |
| `ui/book/source/` | 书源管理 |
| `ui/book/info/`   | 书籍详情 |
| `ui/book/toc/`    | 目录管理 |
| `ui/book/cache/`  | 缓存下载 |
| `ui/rss/` | RSS 阅读器 |
| `ui/config/` | 设置界面 |

## 服务层

| 服务 | 说明 |
|------|------|
| `BaseReadAloudService` | TTS 朗读基类 |
| `TTSReadAloudService` | 系统 TTS 朗读 |
| `HttpReadAloudService` | HTTP TTS 朗读 |
| `AudioPlayService` | 有声书播放 |
| `DownloadService` | 文件下载 |
| `WebService` | Web 管理服务器 |
| `CacheBookService` | 书籍缓存 |
| `CheckSourceService` | 书源校验 |
| `ExportBookService` | 书籍导出 |

## 本地书籍支持

| 格式 | 解析类 |
|------|--------|
| TXT | `TextFile` |
| EPUB | `EpubFile`（依赖 modules/book） |
| PDF | `PdfFile` |
| MOBI | `MobiFile` |
| UMD | `UmdFile`（依赖 modules/book） |
