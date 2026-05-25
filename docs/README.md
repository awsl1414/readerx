# Legado 项目文档

本目录包含 Legado（阅读）Android 小说的阅读器项目的详细技术文档。

## 文档目录

| 文档 | 说明 |
|------|------|
| [架构总览](./architecture.md) | 项目整体架构、技术栈、模块关系、核心数据流 |
| [书源规则引擎](./book-source-rule-engine.md) | 规则解析引擎核心：语法、模式、运算符、处理流程 |
| [书源配置字段](./book-source-fields.md) | BookSource 实体及所有规则子对象（SearchRule/TocRule/ContentRule 等）的字段说明 |
| [净化规则](./replace-rules.md) | ReplaceRule 净化规则字段、作用域、ContentProcessor 处理流程 |
| [数据库 Schema](./database-schema.md) | Room 数据库全部实体、字段、关系、DAO 操作 |
| [Web API](./web-api.md) | REST API、WebSocket、ContentProvider 接口文档 |
| [Web 模块](./web-module.md) | Vue 3 Web 管理界面结构、路由、组件 |
| [构建与发布](./build-and-release.md) | 构建配置、变体、CI/CD 流程、发布流程 |

## 快速导航

### 书源开发者

如果你要编写或理解书源规则，重点阅读：
1. [书源规则引擎](./book-source-rule-engine.md) — 理解规则语法和解析流程
2. [书源配置字段](./book-source-fields.md) — 了解每个规则字段的含义
3. [净化规则](./replace-rules.md) — 内容净化和替换规则

### App 开发者

如果你要修改 App 代码：
1. [架构总览](./architecture.md) — 了解整体架构
2. [数据库 Schema](./database-schema.md) — 理解数据层
3. [Web API](./web-api.md) — 理解 API 接口

### Web 开发者

如果你要修改 Web 管理界面：
1. [Web 模块](./web-module.md) — 技术栈和结构
2. [Web API](./web-api.md) — 前后端通信接口
