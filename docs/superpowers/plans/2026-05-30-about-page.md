# About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/my/about` 路由页面，展示 ReaderX 项目信息、版本号、开源许可证、GitHub 链接和 Legado 致谢。

**Architecture:** 纯 RSC（Server Component），使用 `next-intl/server` 的 `getTranslations` 做 i18n，版本号从 `package.json` 读取。零客户端 JS。

**Tech Stack:** Next.js App Router · React Server Component · next-intl · lucide-react · Tailwind CSS 4

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/messages/zh.json` | 新增 `about` i18n 命名空间（中文） |
| Modify | `apps/web/messages/en.json` | 新增 `about` i18n 命名空间（英文） |
| Create | `apps/web/app/my/about/page.tsx` | 关于页面 RSC |

---

### Task 1: 添加 i18n 消息

**Files:**
- Modify: `apps/web/messages/zh.json`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: 在 `zh.json` 中添加 `about` 命名空间**

在顶层 JSON 对象中新增 `"about"` 键（与 `"my"` 同级）：

```json
"about": {
  "title": "关于",
  "version": "v{version}",
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
```

- [ ] **Step 2: 在 `en.json` 中添加 `about` 命名空间**

```json
"about": {
  "title": "About",
  "version": "v{version}",
  "description": "Open-source reading, your way.",
  "aboutReaderX": "About ReaderX",
  "aboutDescription": "ReaderX is a web rewrite and enhancement of Legado, dedicated to providing a modern web reading experience.",
  "license": "License",
  "licenseType": "MIT License",
  "github": "GitHub",
  "acknowledgements": "Acknowledgements",
  "thanksLegado": "Thanks to Legado",
  "thanksLegadoDesc": "Built on the Legado open-source project",
  "copyright": "© 2026 ReaderX",
  "basedOn": "Based on Legado"
}
```

- [ ] **Step 3: 提交**

```bash
git add apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat(about): add i18n messages for about page"
```

---

### Task 2: 创建关于页面

**Files:**
- Create: `apps/web/app/my/about/page.tsx`

**参考模式：** `apps/web/app/search/page.tsx` 使用 `getTranslations` 的 RSC 模式；`apps/web/app/my/page.tsx` 的卡片样式。

- [ ] **Step 1: 创建 `apps/web/app/my/about/page.tsx`**

```tsx
import { BookOpen, ExternalLink, Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import pkg from "@/package.json";

export default async function AboutPage() {
	const t = await getTranslations("about");

	return (
		<div className="mx-auto max-w-lg space-y-6">
			{/* Hero */}
			<div className="flex flex-col items-center gap-3 py-4">
				<BookOpen className="size-16 text-primary" />
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold">ReaderX</h1>
					<Badge variant="secondary">{t("version", { version: pkg.version })}</Badge>
				</div>
				<p className="text-sm text-muted-foreground">{t("description")}</p>
			</div>

			{/* 信息链接组 */}
			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("aboutReaderX")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<div className="px-4 py-3 text-sm text-muted-foreground">
						{t("aboutDescription")}
					</div>
				</div>
			</div>

			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("license")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<div className="flex items-center gap-3 px-4 py-3 text-sm">
						<span className="flex-1">{t("licenseType")}</span>
					</div>
				</div>
			</div>

			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("github")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<a
						href="https://github.com/awsl1414/readerx"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2 first:rounded-t-lg last:rounded-b-lg"
					>
						<ExternalLink className="size-4 text-muted-foreground" />
						<span className="flex-1">GitHub</span>
						<span className="text-muted-foreground">↗</span>
					</a>
				</div>
			</div>

			{/* 致谢 */}
			<div>
				<h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("acknowledgements")}
				</h2>
				<div className="divide-y divide-border rounded-lg border border-border bg-surface-1">
					<a
						href="https://github.com/gedoor/legado"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2 first:rounded-t-lg last:rounded-b-lg"
					>
						<Heart className="size-4 text-muted-foreground" />
						<div className="flex-1">
							<span>{t("thanksLegado")}</span>
							<p className="text-xs text-muted-foreground">{t("thanksLegadoDesc")}</p>
						</div>
						<span className="text-muted-foreground">↗</span>
					</a>
				</div>
			</div>

			{/* 底部版权 */}
			<p className="pb-8 text-center text-xs text-muted-foreground">
				{t("copyright")} · {t("basedOn")}
			</p>
		</div>
	);
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `pnpm --filter web typecheck`
Expected: 无错误

- [ ] **Step 3: 验证 Lint 通过**

Run: `pnpm --filter web lint`
Expected: 无错误

- [ ] **Step 4: 浏览器验证**

Run: 在浏览器打开 `http://localhost:3000/my/about`
Expected:
- 页面正常渲染，显示 Hero 区（Logo + "ReaderX" + 版本 Badge + 简介）
- 信息卡片组正确显示（关于描述、MIT License、GitHub 链接）
- 致谢组显示 Legado 链接
- 底部版权信息居中
- 从 `/my` 页面点击"关于"可正确跳转

- [ ] **Step 5: 提交**

```bash
git add apps/web/app/my/about/page.tsx
git commit -m "feat(about): add about page with RSC"
```

---

### Task 3: 更新 roadmap

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: 更新 roadmap 中 about 页面的状态**

找到 roadmap 中关于 "我的/设置子页面" 或 `/my/about` 的条目，标记为已完成。

- [ ] **Step 2: 提交**

```bash
git add docs/roadmap.md
git commit -m "docs: update roadmap — about page complete"
```
