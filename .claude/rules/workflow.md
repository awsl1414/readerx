# 工作流

## 工具优先级

- **优先 MCP 工具** — 查库文档用 Context7（`resolve-library-id` → `query-docs`）而非 WebSearch；读网页用 `webReader`；分析图片用 `analyze_image`；文件批量操作用 `mcp__filesystem__*`
- **优先 Plugin 技能** — 匹配场景时必须调用 superpowers 技能（brainstorming → writing-plans → subagent-driven-development），而非裸手实现
- **优先记忆检索** — 回忆历史决策用 `claude-mem` 的 `search` → `timeline` → `get_observations` 三步流程，而非重读代码

## 任务完成前检查

每次任务结束前，必须检查并更新所有与本次任务相关的文件，保持高度一致性：

- **文档交叉引用**：CLAUDE.md、README.md、docs/ 下的所有文档，确保描述与实际代码状态一致
- **依赖关系**：package.json 依赖、tsconfig 引用、turbo.json 任务配置
- **类型与接口**：改动了接口或类型时，检查所有消费方的引用和用法
- **模块状态表**：`docs/roadmap.md` 中的模块状态和里程碑，反映最新进展

## 架构决策记录（ADR）

重要架构决策推荐记录为 ADR（Architecture Decision Record），存放于 `docs/adr/`：

```text
docs/adr/
  001-rsc-first.md          # 标题
  002-zustand-per-feature.md
  003-rule-engine-rewrite.md
```

每个 ADR 包含：Context（背景）、Decision（决策）、Consequences（后果）。AI Agent 优先读取 ADR 理解历史决策。

## graphify

项目在 `graphify-out/` 维护知识图谱（god nodes + community structure + cross-file relationships）。

- 回答代码库问题时，优先 `graphify query "<question>"`（返回 scoped subgraph，远小于 GRAPH_REPORT.md）
- 查关系用 `graphify path "<A>" "<B>"`，查概念用 `graphify explain "<concept>"`
- 宽泛导航用 `graphify-out/wiki/index.md`（如存在）
- `graphify-out/GRAPH_REPORT.md` 仅用于架构总览
- 修改代码后运行 `graphify update .` 更新图谱（AST-only，无 API 开销）
