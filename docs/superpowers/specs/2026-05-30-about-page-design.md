# About Page Design Spec

## Context

ReaderX 的 `/my` 设置中心已有指向 `/my/about` 的链接（Info 图标），但目标页面不存在（404）。需要实现"关于"页面，展示项目信息、版本、开源许可证、GitHub 链接和 Legado 致谢。

## Decision

采用纯 RSC（Server Component）方案，理由：
- 页面内容 100% 静态，零交互需求
- 零客户端 JS 开销
- 符合项目规则"RSC 是默认渲染模式"
- 使用 `next-intl/server` 的 `getTranslations` 做 i18n

## Page Structure

页面沿用 `/my` 的 `max-w-lg` 居中布局，从上到下 4 个区块：

### 1. Hero 区（居中）

- ReaderX Logo：`lucide-react` 的 `BookOpen` 图标，`size-16`（64px），`text-primary`
- 标题："ReaderX" + 版本号 Badge（从 `package.json` 的 `version` 字段读取）
- 一句话简介（i18n key：`about.description`）

### 2. 信息链接组

复用 `/my` 页面的卡片样式：
- 容器：`divide-y divide-border rounded-lg border border-border bg-surface-1`
- 链接项：左图标 + 中间文字 + 右箭头 `›`
- 3 个链接：
  - **关于 ReaderX**（Info 图标）→ 直接在 Hero 区下方展示项目介绍文字，无需折叠
  - **开源许可证**（FileText 图标）→ 显示 "MIT License"，静态文字行
  - **GitHub**（ExternalLink 图标）→ 外部链接到仓库 `https://github.com/awsl1414/readerx`

### 3. 致谢链接组

同样复用卡片样式：
- **感谢 Legado**（Heart 图标）→ 外部链接到 `https://github.com/gedoor/legado`

### 4. 底部版权

- 居中、`text-xs text-muted-foreground`
- `© 2026 ReaderX · Based on Legado`

## File Structure

```
apps/web/app/my/about/
  page.tsx          ← RSC 页面
```

单个文件，无需 feature 目录（内容简单，无复用需求，无 hooks/store/actions）。

## i18n

在 `messages/zh.json` 和 `messages/en.json` 中新增顶级 `"about"` 命名空间：

```json
{
  "about": {
    "version": "版本 {version}",
    "description": "开源阅读，自在掌控。",
    "aboutReaderX": "关于 ReaderX",
    "aboutDescription": "ReaderX 是 Legado（阅读）的 Web 重写增强项目，致力于提供现代化的 Web 阅读体验。",
    "license": "开源许可证",
    "licenseType": "MIT License",
    "github": "GitHub",
    "acknowledgements": "致谢",
    "thanksLegado": "感谢 Legado",
    "thanksLegadoDesc": "基于 Legado 开源项目构建",
    "copyright": "© 2026 ReaderX",
    "basedOn": "Based on Legado"
  }
}
```

## Technical Details

- **纯 RSC**：使用 `getTranslations` from `next-intl/server`
- **版本号**：从 `apps/web/package.json` 的 `version` 字段读取
- **图标**：全部来自 `lucide-react`（BookOpen, Info, FileText, ExternalLink, Heart）
- **外链**：`<a target="_blank" rel="noopener noreferrer">`
- **样式复用**：与 `/my/page.tsx` 保持一致的 `max-w-lg` + 卡片样式
- **静态展示**：项目介绍直接展示在页面上，无需折叠组件，保持纯 RSC

## Consequences

- **正向**：零客户端 JS、SEO 友好、符合 RSC 优先原则
- **限制**：无法在页面内做"检查更新"等需要客户端 API 的功能（当前不需要）
- **维护**：版本号跟随 `package.json`，发布时更新一处即可
