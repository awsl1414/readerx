# docs/

ReaderX 项目文档索引。

## 文档职责

| 文档 | 职责 | 读者 |
|---|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | AI 编码约束、架构硬规则、禁止模式 | AI / 开发者 |
| [`roadmap.md`](./roadmap.md) | 开发排期、模块状态、Step 详细内容 | 开发者 / 规划者 |
| [`web-design-philosophy.md`](./web-design-philosophy.md) | Web UI 设计哲学、视觉系统、交互模式、阅读器设计 | 设计 / 前端 |
| [`development-guide.md`](./development-guide.md) | 开发实操指南、环境搭建、Web 架构模式（RSC 边界、ReaderSession、Worker Bridge） | 开发者 |
| [`tech-standards.md`](./tech-standards.md) | 技术标准（TypeScript 配置、工具链、Node.js 类型策略） | 开发者 |

## 子目录

- `web/` — Web 前端各模块架构指南（Worker Bridge、阅读器、搜索等）
- `analysis/` — Legado 原版架构分析、ReaderX 改进对比
- `superpowers/plans/` — AI 辅助开发的实施计划

## 原则

- 每个文档有明确的单一职责，不重复其他文档的内容
- 架构决策放在 `roadmap.md`（规划）或 `development-guide.md`（实操）
- 设计哲学放在 `web-design-philosophy.md`
- 硬性约束放在 `CLAUDE.md`
- 修改代码后，检查相关文档是否需要同步更新

本目录包含 ReaderX 项目的开发文档和 Legado 原版参考文档。

## ReaderX 文档

| 文档 | 说明 |
|---|---|
| [开发指南](./development-guide.md) | 环境搭建、项目结构、工作流、编码规范快速参考 |
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
