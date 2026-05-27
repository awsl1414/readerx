# docs/

本目录包含 ReaderX 项目的开发文档和 Legado 原版参考文档。

## ReaderX 文档

| 文档 | 说明 |
|---|---|
| [开发路线图](./roadmap.md) | 7 阶段开发计划、AI 增强规划、模块进度、验证里程碑 |
| [Web 设计方针](./web-design-philosophy.md) | Web 前端中心设计方针 — 所有 UI 决策的参照基准 |
| [技术标准与注意事项](./tech-standards.md) | TypeScript / React / Next.js / Tailwind 等各技术栈的使用规范 |
| [规则引擎改进记录](./rule-engine-changes.md) | Step 1 实现中相对 Legado 的改进、舍弃项和架构变更 |

## Legado 原版参考文档

以下文档来自 [Legado（阅读）](https://github.com/gedoor/legado) 项目，作为 ReaderX 重写时的架构和接口参考。

| 文档 | 说明 | ReaderX 用途 |
|---|---|---|
| [架构总览](./architecture.md) | Legado 整体架构、MVVM、核心数据流 | 理解原有设计意图 |
| [书源规则引擎](./book-source-rule-engine.md) | 规则解析引擎：语法、模式、运算符、处理流程 | rule-engine 实现参考 |
| [书源配置字段](./book-source-fields.md) | BookSource 实体及规则子对象字段说明 | rule-engine 类型定义参考 |
| [净化规则](./replace-rules.md) | ReplaceRule 净化规则和 ContentProcessor 流程 | reader-engine 内容处理参考 |
| [数据库 Schema](./database-schema.md) | Room 数据库实体、字段、关系 | persistence 数据模型参考 |
| [Web API](./web-api.md) | REST API、WebSocket 接口文档 | services/api 路由设计参考 |
