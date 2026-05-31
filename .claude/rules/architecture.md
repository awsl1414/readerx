# 架构约束

1. **按边界分包** — 每个包是完整领域，类型/逻辑/校验内聚，禁止按文件类型拆包
2. **Feature 和 Engine 分离** — Engine 是纯逻辑（packages/），Feature 是 UI 层（apps/web/features/），禁止交叉
3. **Runtime 独立** — quickjs-runtime 仅 peer dep 引用 rule-engine 类型（import type only），禁止引入其他包
4. **shared 克制** — 禁止创建独立 shared 包放业务逻辑；允许最小 shared-kernel（仅 types / errors / Result / ID 类型），禁止包含业务逻辑；`apps/web/lib/` 只放 infra helper（cn.ts, env.ts, fetch.ts），禁止放业务逻辑
5. **Store 随 Feature** — Zustand store 在 feature 内部，禁止全局 stores/
6. **Worker 随 Runtime** — Worker 入口在 runtime 包内，禁止放在 apps/web
7. **RSC 是默认渲染模式** — Server Component 负责数据获取/页面组装/Streaming；Client Component 仅在交互/浏览器 API/本地状态时使用
8. **ESM-only** — 禁止 CommonJS（`require` / `module.exports`）
9. **Edge-compatible** — packages/ 中的代码必须兼容 Edge Runtime，禁止使用 Node 专有 API（除非有 `"types": ["node"]` 的包）
10. **平台文件分离** — 需要双环境的模块推荐 `package.json exports` 条件导出（`"browser"` / `"node"` / `"default"` 条件），兼容回退使用 `.browser.ts` / `.node.ts` 文件分离。禁止客户端 bundle 可达文件引用 `node:module`、`node:fs`

## 包依赖方向（禁止违反）

```text
infrastructure  ←  schemas  ←  rule-engine  ←  reader-engine
                      ↑
              persistence

                        ↑
                quickjs-runtime (peer dep，import type only)

rule-engine  ←  services/api
      ↑
  apps/web → reader-engine, persistence, infrastructure, quickjs-runtime
```

禁止：
- `persistence` 依赖 `rule-engine`
- 任何包循环依赖
- 从 `dist/` 导入
- 不通过 package.json exports 导入

## 包类型

| 包 | 类型 | 允许的依赖方向 |
|---|---|---|
| infrastructure | 基础设施 | 零内部依赖 |
| schemas | 类型层 | 零内部依赖（仅 zod） |
| rule-engine | 领域引擎 | ← schemas, infrastructure |
| reader-engine | 领域引擎 | ← rule-engine, infrastructure |
| quickjs-runtime | 运行时 | 仅 peer dep → rule-engine（import type） |
| persistence | 数据层 | ← schemas, infrastructure |
| ai（未来） | 增强层 | 仅 peer dep → rule-engine（import type） |

新增包必须在此表登记并声明类型和依赖方向。

## AI 增强层

`packages/ai/` — 独立 AI 能力包，可选增强，不影响核心阅读流程。

- 优先云端 AI（用户自带 key）和本地部署（Ollama），暂不支持端侧推理
- 仅 peer dep 引用 rule-engine 类型，不依赖其他业务包
- 详细规划见 [`docs/roadmap.md`](../../docs/roadmap.md) AI 增强规划章节
