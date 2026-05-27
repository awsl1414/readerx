# docs/

ReaderX 项目文档索引。

## 文档职责

| 文档 | 职责 | 读者 |
|---|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | AI 编码约束 — 禁止什么、必须遵守什么 | AI / 开发者 |
| [`development-guide.md`](./development-guide.md) | 开发实操 — 环境搭建、Web 架构模式（RSC 边界、ReaderSession、Worker Bridge）、工作流 | 开发者 |
| [`roadmap.md`](./roadmap.md) | 开发排期 — 模块状态、Step 详细内容、里程碑 | 开发者 / 规划者 |
| [`tech-standards.md`](./tech-standards.md) | 技术标准 — TypeScript / React / Next.js 等各技术栈的正确用法和注意事项 | 开发者 |
| [`web-design-philosophy.md`](./web-design-philosophy.md) | Web UI 设计哲学 — 视觉系统、交互模式、阅读器设计 | 设计 / 前端 |
| [`rule-engine-changes.md`](./rule-engine-changes.md) | 规则引擎改进记录 — 相对 Legado 的改进、舍弃项和架构变更 | 开发者 |

## 子目录

| 目录 | 内容 |
|---|---|
| `web/` | Web 前端各模块架构指南（Worker Bridge、阅读器） |
| `analysis/` | Legado 原版架构分析、ReaderX 改进对比 |
| `superpowers/` | AI 辅助开发的设计规格和实施计划 |

## Legado 原版参考文档

以下文档来自 [Legado（阅读）](https://github.com/gedoor/legado) 项目，作为 ReaderX 重写时的架构和接口参考。

| 文档 | 说明 | ReaderX 用途 |
|---|---|---|
| [架构总览](./legado/architecture.md) | Legado 整体架构、MVVM、核心数据流 | 理解原有设计意图 |
| [书源规则引擎](./legado/book-source-rule-engine.md) | 规则解析引擎：语法、模式、运算符、处理流程 | rule-engine 实现参考 |
| [书源配置字段](./legado/book-source-fields.md) | BookSource 实体及规则子对象字段说明 | rule-engine 类型定义参考 |
| [净化规则](./legado/replace-rules.md) | ReplaceRule 净化规则和 ContentProcessor 流程 | reader-engine 内容处理参考 |
| [数据库 Schema](./legado/database-schema.md) | Room 数据库实体、字段、关系 | persistence 数据模型参考 |
| [Web API](./legado/web-api.md) | REST API、WebSocket 接口文档 | services/api 路由设计参考 |

## 原则

- 每个文档有明确的单一职责，不重复其他文档的内容
- 硬性约束 → `CLAUDE.md`（禁止/必须）
- 正确用法 → `tech-standards.md`（怎么做对）
- 实操指南 → `development-guide.md`（怎么干活）
- 排期规划 → `roadmap.md`（做什么/什么时候做）
- 设计哲学 → `web-design-philosophy.md`（为什么这样设计）
- 修改代码后，检查相关文档是否需要同步更新
