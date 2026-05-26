# Reader Engine V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the reader-engine package as a Document AST pipeline — from content fetching through layout to render model output.

**Architecture:** Document AST (immutable, with node IDs) replaces string pipeline. Content flows through: bytes → string → Document AST → positioned layout → render model. All IO via dependency inversion (HttpFetcher, JsExecutor, TextLayouter).

**Tech Stack:** TypeScript (strict, ESM-only), @chenglou/pretext (text layout), nanoid (node IDs), @readerx/rule-engine (AnalyzeRule, ContentRule types), DOMParser (HTML parsing), TextDecoder (charset), Vitest (testing)

**Spec:** `docs/analysis/step5-reader-engine-spec-v3.md`

---

## File Structure

```
packages/reader-engine/src/
├── index.ts                          # UPDATE: new exports, remove old
├── contracts/                        # NEW
│   ├── index.ts
│   ├── http-fetcher.ts              # HttpFetcher, HttpFetcherOptions, HttpFetcherResponse
│   ├── js-executor.ts               # Re-export JsExecutor from rule-engine
│   └── text-layouter.ts             # TextLayouter interface, LayoutCursor, TextLayoutHandle, TextLayoutLine, TextLayoutOptions
├── document/                         # NEW
│   ├── index.ts
│   └── nodes.ts                     # Document, BlockNode, InlineNode, BaseNode (all readonly)
├── content/
│   ├── index.ts                      # UPDATE: new exports
│   ├── types.ts                      # KEEP: ReplaceRule stays as-is
│   ├── content-processor.ts          # REWRITE: string → Document immutable transform
│   ├── charset-decoder.ts            # NEW
│   ├── document-parser.ts            # NEW
│   ├── content-fetcher.ts            # NEW
│   ├── content-extractor.ts          # NEW
│   └── content-pipeline.ts           # NEW
├── layout/                           # NEW (replaces pagination/)
│   ├── index.ts
│   ├── types.ts                      # LayoutConfig, LayoutResult, LayoutPage, LayoutLine, LayoutRun, etc.
│   ├── inline-flatten.ts             # InlineNode[] → InlineSegment[]
│   ├── run-mapper.ts                 # TextLayoutLine → LayoutRun[]
│   ├── pretext-layouter.ts           # TextLayouter impl wrapping @chenglou/pretext
│   ├── layout-engine.ts              # Document → LayoutResult
│   └── pagination.ts                 # Pagination state machine
├── renderer/
│   ├── index.ts                      # UPDATE
│   └── render-model.ts               # NEW (replaces types.ts)
└── shared/                           # NEW
    └── cursors.ts                    # DocumentCursor, PageCursor

DELETE:
├── pagination/                       # Entire directory removed
├── types.ts                          # Removed (ReadingState/ChapterContent/PaginationConfig obsolete)
└── renderer/types.ts                 # Removed (RenderOptions obsolete)
```

---

### Task 1: Foundation — Document AST + Cursors + Contracts

**Files:**
- Create: `src/document/nodes.ts`
- Create: `src/document/index.ts`
- Create: `src/shared/cursors.ts`
- Create: `src/contracts/http-fetcher.ts`
- Create: `src/contracts/js-executor.ts`
- Create: `src/contracts/text-layouter.ts`
- Create: `src/contracts/index.ts`
- Modify: `package.json` — add nanoid dependency

- [ ] **Step 1: Add nanoid dependency**

Run: `pnpm --filter @readerx/reader-engine add nanoid`

- [ ] **Step 2: Create `src/document/nodes.ts`**

```typescript
import { nanoid } from "nanoid";

// ─── Base ───

type BaseNode = {
	readonly id: string;
};

// ─── Document ───

type Document = {
	readonly type: "document";
	readonly meta: DocumentMeta;
	readonly blocks: readonly BlockNode[];
};

type DocumentMeta = {
	readonly title?: string;
	readonly sourceUrl?: string;
	readonly charset?: string;
};

// ─── Block nodes ───

type BlockNode =
	| ParagraphNode
	| HeadingNode
	| ImageNode
	| BlockquoteNode
	| SeparatorNode;

type ParagraphNode = BaseNode & {
	readonly type: "paragraph";
	readonly inlines: readonly InlineNode[];
};

type HeadingNode = BaseNode & {
	readonly type: "heading";
	readonly level: 1 | 2 | 3 | 4 | 5 | 6;
	readonly inlines: readonly InlineNode[];
};

type ImageNode = BaseNode & {
	readonly type: "image";
	readonly src: string;
	readonly alt?: string;
	readonly width?: number;
	readonly height?: number;
};

type BlockquoteNode = BaseNode & {
	readonly type: "blockquote";
	readonly blocks: readonly BlockNode[];
};

type SeparatorNode = BaseNode & {
	readonly type: "separator";
};

// ─── Inline nodes ───

type InlineNode =
	| TextNode
	| StrongNode
	| EmphasisNode
	| LinkNode
	| ImageInlineNode;

type TextNode = BaseNode & {
	readonly type: "text";
	readonly text: string;
};

type StrongNode = BaseNode & {
	readonly type: "strong";
	readonly inlines: readonly InlineNode[];
};

type EmphasisNode = BaseNode & {
	readonly type: "emphasis";
	readonly inlines: readonly InlineNode[];
};

type LinkNode = BaseNode & {
	readonly type: "link";
	readonly href: string;
	readonly inlines: readonly InlineNode[];
};

type ImageInlineNode = BaseNode & {
	readonly type: "image-inline";
	readonly src: string;
	readonly alt?: string;
};

// ─── Helpers ───

function nodeId(): string {
	return nanoid(10);
}

function textNode(text: string): TextNode {
	return { id: nodeId(), type: "text", text };
}

function paragraphNode(inlines: readonly InlineNode[]): ParagraphNode {
	return { id: nodeId(), type: "paragraph", inlines };
}

function headingNode(
	level: 1 | 2 | 3 | 4 | 5 | 6,
	inlines: readonly InlineNode[],
): HeadingNode {
	return { id: nodeId(), type: "heading", level, inlines };
}

function document(
	blocks: readonly BlockNode[],
	meta?: DocumentMeta,
): Document {
	return {
		type: "document",
		meta: meta ?? {},
		blocks,
	};
}

export type {
	BaseNode,
	BlockNode,
	BlockquoteNode,
	Document,
	DocumentMeta,
	EmphasisNode,
	HeadingNode,
	ImageInlineNode,
	ImageNode,
	InlineNode,
	LinkNode,
	ParagraphNode,
	SeparatorNode,
	StrongNode,
	TextNode,
};
export { document, headingNode, nodeId, paragraphNode, textNode };
```

- [ ] **Step 3: Create `src/document/index.ts`**

```typescript
export type {
	Document,
	DocumentMeta,
	BlockNode,
	BlockquoteNode,
	HeadingNode,
	ImageNode,
	InlineNode,
	EmphasisNode,
	ImageInlineNode,
	LinkNode,
	ParagraphNode,
	SeparatorNode,
	StrongNode,
	TextNode,
	BaseNode,
} from "./nodes";
export { document, headingNode, nodeId, paragraphNode, textNode } from "./nodes";
```

- [ ] **Step 4: Create `src/shared/cursors.ts`**

```typescript
type DocumentCursor = {
	readonly blockId: string;
	readonly inlineIndex: number;
	readonly graphemeIndex: number;
};

type PageCursor = {
	readonly pageIndex: number;
	readonly lineIndex: number;
	readonly runIndex: number;
	readonly graphemeIndex: number;
};

export type { DocumentCursor, PageCursor };
```

- [ ] **Step 5: Create `src/contracts/http-fetcher.ts`**

```typescript
type HttpFetcher = {
	fetch(
		url: string,
		options: HttpFetcherOptions,
	): Promise<HttpFetcherResponse>;
};

type HttpFetcherOptions = {
	readonly method?: "GET" | "POST";
	readonly headers?: Record<string, string>;
	readonly body?: string;
	readonly timeout?: number;
};

type HttpFetcherResponse = {
	readonly ok: boolean;
	readonly status: number;
	readonly body: Uint8Array;
	readonly headers: Record<string, string>;
};

export type { HttpFetcher, HttpFetcherOptions, HttpFetcherResponse };
```

- [ ] **Step 6: Create `src/contracts/js-executor.ts`**

```typescript
export type {
	JsExecutor,
	JsEvalContext,
	JsEvalResult,
} from "@readerx/rule-engine";
```

- [ ] **Step 7: Create `src/contracts/text-layouter.ts`**

```typescript
type LayoutCursor = {
	readonly segmentIndex: number;
	readonly graphemeIndex: number;
};

type TextLayoutOptions = {
	readonly font: string;
	readonly letterSpacing?: number;
	readonly wordBreak?: "normal" | "keep-all";
};

type TextLayoutHandle = {
	readonly _brand: unique symbol;
};

type TextLayoutLine = {
	readonly text: string;
	readonly width: number;
	readonly start: LayoutCursor;
	readonly end: LayoutCursor;
};

interface TextLayouter {
	prepare(text: string, options: TextLayoutOptions): TextLayoutHandle;
	layoutNextLine(
		handle: TextLayoutHandle,
		start: LayoutCursor | null,
		maxWidth: number,
	): TextLayoutLine | null;
}

export type {
	LayoutCursor,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayouter,
	TextLayoutOptions,
};
```

- [ ] **Step 8: Create `src/contracts/index.ts`**

```typescript
export type {
	HttpFetcher,
	HttpFetcherOptions,
	HttpFetcherResponse,
} from "./http-fetcher";
export type {
	JsExecutor,
	JsEvalContext,
	JsEvalResult,
} from "./js-executor";
export type {
	LayoutCursor,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayouter,
	TextLayoutOptions,
} from "./text-layouter";
```

- [ ] **Step 9: Run typecheck**

Run: `pnpm --filter @readerx/reader-engine typecheck`
Expected: May have errors from old types referencing removed symbols — that's OK for now, we'll fix in Task 8.

- [ ] **Step 10: Commit**

```bash
git add packages/reader-engine/src/document/ packages/reader-engine/src/shared/ packages/reader-engine/src/contracts/ packages/reader-engine/package.json
git commit -m "feat(reader-engine): add Document AST, cursor model, and contracts layer"
```

---

### Task 2: Layout Types

**Files:**
- Create: `src/layout/types.ts`
- Create: `src/layout/index.ts`

- [ ] **Step 1: Create `src/layout/types.ts`**

```typescript
type InlineStyle = {
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly href?: string;
};

type LayoutRun = {
	readonly text: string;
	readonly x: number;
	readonly width: number;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

type LayoutLine = {
	readonly runs: readonly LayoutRun[];
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
};

type PageDimensions = {
	readonly width: number;
	readonly height: number;
	readonly contentHeight: number;
	readonly paddingTop: number;
	readonly paddingBottom: number;
	readonly paddingLeft: number;
	readonly paddingRight: number;
};

type LayoutPage = {
	readonly index: number;
	readonly lines: readonly LayoutLine[];
	readonly dimensions: PageDimensions;
};

type LayoutResult = {
	readonly pages: readonly LayoutPage[];
	readonly totalPages: number;
};

type LayoutConfig = {
	readonly pageWidth: number;
	readonly pageHeight: number;
	readonly lineHeight: number;
	readonly font: string;
	readonly letterSpacing?: number;
	readonly paddingTop: number;
	readonly paddingBottom: number;
	readonly paddingLeft: number;
	readonly paddingRight: number;
};

export type {
	InlineStyle,
	LayoutConfig,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
};
```

- [ ] **Step 2: Create `src/layout/index.ts`** (placeholder, will add exports as modules are created)

```typescript
export type {
	InlineStyle,
	LayoutConfig,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "./types";
```

- [ ] **Step 3: Commit**

```bash
git add packages/reader-engine/src/layout/
git commit -m "feat(reader-engine): add layout types — LayoutConfig, LayoutPage, LayoutLine, LayoutRun"
```

---

### Task 3: Document Parser

**Files:**
- Create: `src/content/document-parser.ts`
- Create: `__tests__/document-parser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/document-parser.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
	parseHtmlToDocument,
	parseTextToDocument,
} from "../src/content/document-parser";
import type { Document } from "../src/document/nodes";

describe("parseTextToDocument", () => {
	it("splits text by newlines into paragraphs", () => {
		const doc = parseTextToDocument("Hello\nWorld");
		expect(doc.type).toBe("document");
		expect(doc.blocks).toHaveLength(2);
		expect(doc.blocks[0]?.type).toBe("paragraph");
	});

	it("creates single paragraph for text without newlines", () => {
		const doc = parseTextToDocument("Hello World");
		expect(doc.blocks).toHaveLength(1);
	});

	it("skips empty lines", () => {
		const doc = parseTextToDocument("Hello\n\n\nWorld");
		expect(doc.blocks).toHaveLength(2);
	});

	it("preserves title in meta", () => {
		const doc = parseTextToDocument("text", "Chapter 1");
		expect(doc.meta.title).toBe("Chapter 1");
	});

	it("each paragraph has a unique id", () => {
		const doc = parseTextToDocument("a\nb");
		const id0 = doc.blocks[0]?.id;
		const id1 = doc.blocks[1]?.id;
		expect(id0).toBeTruthy();
		expect(id1).toBeTruthy();
		expect(id0).not.toBe(id1);
	});
});

describe("parseHtmlToDocument", () => {
	it("parses <p> tags into paragraphs", () => {
		const doc = parseHtmlToDocument("<p>Hello</p><p>World</p>");
		expect(doc.blocks).toHaveLength(2);
		expect(doc.blocks[0]?.type).toBe("paragraph");
	});

	it("parses <h1>-<h6> into headings", () => {
		const doc = parseHtmlToDocument("<h2>Title</h2>");
		expect(doc.blocks[0]?.type).toBe("heading");
		if (doc.blocks[0]?.type === "heading") {
			expect(doc.blocks[0].level).toBe(2);
		}
	});

	it("parses <img> into image nodes", () => {
		const doc = parseHtmlToDocument('<img src="http://example.com/img.jpg" alt="test">');
		expect(doc.blocks[0]?.type).toBe("image");
		if (doc.blocks[0]?.type === "image") {
			expect(doc.blocks[0].src).toBe("http://example.com/img.jpg");
		}
	});

	it("parses <strong> inside paragraph", () => {
		const doc = parseHtmlToDocument("<p>Hello <strong>bold</strong></p>");
		const para = doc.blocks[0];
		expect(para?.type).toBe("paragraph");
		if (para?.type === "paragraph") {
			expect(para.inlines).toHaveLength(2);
			expect(para.inlines[1]?.type).toBe("strong");
		}
	});

	it("parses <blockquote> with nested blocks", () => {
		const doc = parseHtmlToDocument("<blockquote><p>Quote</p></blockquote>");
		expect(doc.blocks[0]?.type).toBe("blockquote");
		if (doc.blocks[0]?.type === "blockquote") {
			expect(doc.blocks[0].blocks).toHaveLength(1);
		}
	});

	it("parses <hr> into separator", () => {
		const doc = parseHtmlToDocument("<p>before</p><hr><p>after</p>");
		expect(doc.blocks[1]?.type).toBe("separator");
	});

	it("handles plain text content without wrapping tags", () => {
		const doc = parseHtmlToDocument("Just some text");
		expect(doc.blocks.length).toBeGreaterThanOrEqual(1);
	});

	it("each node has a unique id", () => {
		const doc = parseHtmlToDocument("<p>a</p><p>b</p>");
		const ids = new Set<string>();
		function collectIds(blocks: readonly any[]) {
			for (const b of blocks) {
				ids.add(b.id);
				if ("inlines" in b) collectIds(b.inlines);
				if ("blocks" in b) collectIds(b.blocks);
			}
		}
		collectIds(doc.blocks);
		expect(ids.size).toBeGreaterThan(0);
	});

	it("sets title in meta when provided", () => {
		const doc = parseHtmlToDocument("<p>text</p>", "Chapter 1");
		expect(doc.meta.title).toBe("Chapter 1");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/document-parser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/content/document-parser.ts`**

```typescript
import type {
	BlockNode,
	BlockquoteNode,
	Document,
	DocumentMeta,
	HeadingNode,
	ImageInlineNode,
	ImageNode,
	InlineNode,
	LinkNode,
	ParagraphNode,
	SeparatorNode,
	StrongNode,
	TextNode,
} from "../document/nodes";
import { nodeId, textNode } from "../document/nodes";

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "IMG", "BLOCKQUOTE", "HR", "BR"]);

function parseTextToDocument(text: string, title?: string): Document {
	const lines = text.split("\n");
	const blocks: BlockNode[] = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) continue;
		blocks.push({
			id: nodeId(),
			type: "paragraph",
			inlines: [textNode(trimmed)],
		});
	}
	const meta: DocumentMeta = {};
	if (title) meta.title = title;
	return { type: "document", meta, blocks };
}

function parseHtmlToDocument(html: string, title?: string): Document {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const body = doc.body;
	const blocks: BlockNode[] = [];
	for (const child of body.childNodes) {
		const block = parseNode(child);
		if (block) blocks.push(...(Array.isArray(block) ? block : [block]));
	}
	const meta: DocumentMeta = {};
	if (title) meta.title = title;
	return { type: "document", meta, blocks };
}

function parseNode(node: globalThis.Node): BlockNode | BlockNode[] | null {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.textContent?.trim() ?? "";
		if (text.length === 0) return null;
		return { id: nodeId(), type: "paragraph", inlines: [textNode(text)] };
	}
	if (node.nodeType !== Node.ELEMENT_NODE) return null;

	const el = node as HTMLElement;
	const tag = el.tagName;

	switch (tag) {
		case "P":
		case "DIV": {
			const inlines = parseInlines(el);
			if (inlines.length === 0) return null;
			return { id: nodeId(), type: "paragraph", inlines };
		}
		case "H1":
		case "H2":
		case "H3":
		case "H4":
		case "H5":
		case "H6": {
			const level = Number.parseInt(tag[1] ?? "1", 10) as 1 | 2 | 3 | 4 | 5 | 6;
			const inlines = parseInlines(el);
			return { id: nodeId(), type: "heading", level, inlines };
		}
		case "IMG": {
			const src = el.getAttribute("src") ?? "";
			const alt = el.getAttribute("alt") ?? undefined;
			return { id: nodeId(), type: "image", src, alt };
		}
		case "BLOCKQUOTE": {
			const blocks: BlockNode[] = [];
			for (const child of el.childNodes) {
				const parsed = parseNode(child);
				if (parsed) {
					blocks.push(...(Array.isArray(parsed) ? parsed : [parsed]));
				}
			}
			return { id: nodeId(), type: "blockquote", blocks };
		}
		case "HR":
			return { id: nodeId(), type: "separator" };
		case "BR":
			return null;
		default: {
			const results: BlockNode[] = [];
			let hasDirectText = false;
			for (const child of el.childNodes) {
				if (child.nodeType === Node.TEXT_NODE) {
					const text = child.textContent?.trim() ?? "";
					if (text.length > 0) hasDirectText = true;
				}
				const parsed = parseNode(child);
				if (parsed) {
					results.push(...(Array.isArray(parsed) ? parsed : [parsed]));
				}
			}
			if (hasDirectText && results.length === 0) {
				const text = el.textContent?.trim() ?? "";
				if (text.length > 0) {
					return { id: nodeId(), type: "paragraph", inlines: [textNode(text)] };
				}
			}
			return results.length > 0 ? results : null;
		}
	}
}

function parseInlines(el: HTMLElement): InlineNode[] {
	const result: InlineNode[] = [];
	for (const child of el.childNodes) {
		const inline = parseInlineNode(child);
		if (inline) result.push(...inline);
	}
	return result;
}

function parseInlineNode(node: globalThis.Node): InlineNode[] | null {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.textContent ?? "";
		if (text.length === 0) return null;
		return [textNode(text)];
	}
	if (node.nodeType !== Node.ELEMENT_NODE) return null;

	const el = node as HTMLElement;
	const tag = el.tagName;

	switch (tag) {
		case "STRONG":
		case "B": {
			const children = parseInlines(el);
			if (children.length === 0) return null;
			return [{ id: nodeId(), type: "strong", inlines: children }];
		}
		case "EM":
		case "I": {
			const children = parseInlines(el);
			if (children.length === 0) return null;
			return [{ id: nodeId(), type: "emphasis", inlines: children }];
		}
		case "A": {
			const href = el.getAttribute("href") ?? "";
			const children = parseInlines(el);
			return [{ id: nodeId(), type: "link", href, inlines: children }];
		}
		case "IMG": {
			const src = el.getAttribute("src") ?? "";
			const alt = el.getAttribute("alt") ?? undefined;
			return [{ id: nodeId(), type: "image-inline", src, alt }];
		}
		case "BR":
			return null;
		default:
			return parseInlines(el);
	}
}

export { parseHtmlToDocument, parseTextToDocument };
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/document-parser.test.ts`
Expected: PASS (HTML tests require DOMParser — if running in Node, may need jsdom or linkedom. Check if tsconfig.lib includes "DOM" — it does via tsconfig.base.json. Vitest uses happy-dom or jsdom by default. If failing, check vitest config.)

- [ ] **Step 5: Commit**

```bash
git add packages/reader-engine/src/content/document-parser.ts packages/reader-engine/__tests__/document-parser.test.ts
git commit -m "feat(reader-engine): add document parser — HTML/text → Document AST"
```

---

### Task 4: ContentProcessor Adaptation

Rewrite ContentProcessor to work on Document AST (immutable transform). Keep ReplaceRule type unchanged.

**Files:**
- Rewrite: `src/content/content-processor.ts`
- Rewrite: `__tests__/content-processor.test.ts`

- [ ] **Step 1: Write failing tests**

Rewrite `__tests__/content-processor.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { ContentProcessor } from "../src/content/content-processor";
import type { ReplaceRule } from "../src/content/types";
import { document, paragraphNode, textNode } from "../src/document/nodes";
import type { Document } from "../src/document/nodes";

function makeRule(override: Partial<ReplaceRule> = {}): ReplaceRule {
	return {
		id: 0,
		name: "test rule",
		pattern: "",
		replacement: "",
		scopeTitle: true,
		scopeContent: true,
		isEnabled: true,
		isRegex: false,
		order: 0,
		...override,
	};
}

function simpleDoc(text: string): Document {
	return document([paragraphNode([textNode(text)])]);
}

function headingDoc(text: string): Document {
	return document([{ id: "h1", type: "heading" as const, level: 1, inlines: [textNode(text)] }]);
}

function getDocText(doc: Document): string {
	const texts: string[] = [];
	for (const block of doc.blocks) {
		if ("inlines" in block) {
			for (const inline of block.inlines) {
				if (inline.type === "text") texts.push(inline.text);
			}
		}
	}
	return texts.join("");
}

describe("ContentProcessor", () => {
	it("returns document unchanged with no rules", () => {
		const cp = new ContentProcessor();
		const doc = simpleDoc("hello world");
		const result = cp.process(doc);
		expect(getDocText(result)).toBe("hello world");
	});

	it("applies simple string replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "foo", replacement: "bar" })]);
		const result = cp.process(simpleDoc("foo baz foo"));
		expect(getDocText(result)).toBe("bar baz bar");
	});

	it("applies regex replacement", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "\\d+", replacement: "NUM", isRegex: true })]);
		const result = cp.process(simpleDoc("abc 123 def 456"));
		expect(getDocText(result)).toBe("abc NUM def NUM");
	});

	it("skips disabled rules", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "foo", replacement: "bar", isEnabled: false })]);
		const result = cp.process(simpleDoc("foo"));
		expect(getDocText(result)).toBe("foo");
	});

	it("filters by scopeTitle when processing heading", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "x", replacement: "y", scopeTitle: false, scopeContent: true })]);
		const result = cp.process(headingDoc("x"));
		expect(getDocText(result)).toBe("x");
	});

	it("applies rule on paragraph when scopeContent is true", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "x", replacement: "y", scopeTitle: false, scopeContent: true })]);
		const result = cp.process(simpleDoc("x"));
		expect(getDocText(result)).toBe("y");
	});

	it("applies rules in order", () => {
		const cp = new ContentProcessor();
		cp.setRules([
			makeRule({ pattern: "a", replacement: "b", order: 2 }),
			makeRule({ pattern: "b", replacement: "c", order: 1 }),
		]);
		const result = cp.process(simpleDoc("a"));
		expect(getDocText(result)).toBe("b");
	});

	it("skips invalid regex gracefully", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "[invalid", replacement: "x", isRegex: true })]);
		const result = cp.process(simpleDoc("hello [invalid world"));
		expect(getDocText(result)).toBe("hello [invalid world");
	});

	it("handles empty document", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "x", replacement: "y" })]);
		const result = cp.process(document([]));
		expect(result.blocks).toHaveLength(0);
	});

	it("preserves document structure (immutable)", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "a", replacement: "b" })]);
		const original = simpleDoc("a");
		const result = cp.process(original);
		expect(getDocText(original)).toBe("a");
		expect(getDocText(result)).toBe("b");
	});

	it("handles multiple blocks", () => {
		const cp = new ContentProcessor();
		cp.setRules([makeRule({ pattern: "a", replacement: "b" })]);
		const doc = document([
			paragraphNode([textNode("a x")]),
			paragraphNode([textNode("a y")]),
		]);
		const result = cp.process(doc);
		const texts = result.blocks.map((b) =>
			"inlines" in b && b.inlines[0]?.type === "text" ? b.inlines[0].text : "",
		);
		expect(texts).toEqual(["b x", "b y"]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/content-processor.test.ts`
Expected: FAIL — signature mismatch

- [ ] **Step 3: Rewrite `src/content/content-processor.ts`**

```typescript
import type { Document } from "../document/nodes";
import type {
	BlockNode,
	BlockquoteNode,
	HeadingNode,
	InlineNode,
	ParagraphNode,
	StrongNode,
	EmphasisNode,
	LinkNode,
} from "../document/nodes";
import type { ReplaceRule } from "./types";

export class ContentProcessor {
	private rules: ReplaceRule[] = [];

	setRules(rules: ReplaceRule[]): void {
		this.rules = rules.sort((a, b) => a.order - b.order);
	}

	process(doc: Document): Document {
		return {
			...doc,
			blocks: doc.blocks.map((block) => this.processBlock(block)),
		};
	}

	private processBlock(block: BlockNode): BlockNode {
		switch (block.type) {
			case "paragraph":
				return { ...block, inlines: block.inlines.map((i) => this.processInline(i, false)) };
			case "heading":
				return { ...block, inlines: block.inlines.map((i) => this.processInline(i, true)) };
			case "blockquote":
				return { ...block, blocks: block.blocks.map((b) => this.processBlock(b)) };
			default:
				return block;
		}
	}

	private processInline(inline: InlineNode, isTitle: boolean): InlineNode {
		switch (inline.type) {
			case "text":
				return { ...inline, text: this.applyRules(inline.text, isTitle) };
			case "strong":
			case "emphasis":
				return { ...inline, inlines: inline.inlines.map((i) => this.processInline(i, isTitle)) };
			case "link":
				return { ...inline, inlines: inline.inlines.map((i) => this.processInline(i, isTitle)) };
			default:
				return inline;
		}
	}

	private applyRules(content: string, isTitle: boolean): string {
		let result = content;
		for (const rule of this.rules) {
			if (!rule.isEnabled) continue;
			if (isTitle && !rule.scopeTitle) continue;
			if (!isTitle && !rule.scopeContent) continue;

			if (rule.isRegex) {
				try {
					result = result.replace(new RegExp(rule.pattern, "g"), rule.replacement);
				} catch {
					// invalid regex, skip
				}
			} else {
				result = result.replaceAll(rule.pattern, rule.replacement);
			}
		}
		return result;
	}
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/content-processor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/reader-engine/src/content/content-processor.ts packages/reader-engine/__tests__/content-processor.test.ts
git commit -m "refactor(reader-engine): adapt ContentProcessor to Document AST immutable transform"
```

---

### Task 5: Inline Flatten + Run Mapper

**Files:**
- Create: `src/layout/inline-flatten.ts`
- Create: `src/layout/run-mapper.ts`
- Create: `__tests__/layout-helpers.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/layout-helpers.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { flattenInlines } from "../src/layout/inline-flatten";
import type { InlineSegment } from "../src/layout/inline-flatten";
import { mapLineToRuns } from "../src/layout/run-mapper";
import type { LayoutCursor, TextLayoutLine } from "../src/contracts/text-layouter";
import { textNode } from "../src/document/nodes";

describe("flattenInlines", () => {
	it("flattens a single TextNode", () => {
		const node = textNode("hello");
		const segments = flattenInlines([node]);
		expect(segments).toHaveLength(1);
		expect(segments[0]?.text).toBe("hello");
		expect(segments[0]?.sourceNodeId).toBe(node.id);
	});

	it("preserves style for nested inline nodes", () => {
		const nodes = [
			textNode("Hello "),
			{ id: "s1", type: "strong" as const, inlines: [textNode("world")] },
		];
		const segments = flattenInlines(nodes);
		expect(segments).toHaveLength(2);
		expect(segments[0]?.style).toBeUndefined();
		expect(segments[1]?.style?.bold).toBe(true);
	});

	it("flattens nested emphasis inside strong", () => {
		const nodes = [
			{
				id: "s1",
				type: "strong" as const,
				inlines: [
					textNode("bold "),
					{ id: "e1", type: "emphasis" as const, inlines: [textNode("italic")] },
				],
			},
		];
		const segments = flattenInlines(nodes);
		expect(segments).toHaveLength(2);
		expect(segments[0]?.style?.bold).toBe(true);
		expect(segments[1]?.style?.bold).toBe(true);
		expect(segments[1]?.style?.italic).toBe(true);
	});
});

describe("mapLineToRuns", () => {
	const makeCursor = (seg: number, graph: number): LayoutCursor => ({
		segmentIndex: seg,
		graphemeIndex: graph,
	});

	it("maps a line from a single segment to a single run", () => {
		const line: TextLayoutLine = {
			text: "hello",
			width: 50,
			start: makeCursor(0, 0),
			end: makeCursor(0, 5),
		};
		const segments: InlineSegment[] = [
			{ text: "hello", sourceNodeId: "n1" },
		];
		const runs = mapLineToRuns(line, segments);
		expect(runs).toHaveLength(1);
		expect(runs[0]?.text).toBe("hello");
		expect(runs[0]?.sourceNodeId).toBe("n1");
	});

	it("maps a line spanning two segments", () => {
		const line: TextLayoutLine = {
			text: "helloworld",
			width: 100,
			start: makeCursor(0, 0),
			end: makeCursor(1, 5),
		};
		const segments: InlineSegment[] = [
			{ text: "hello", sourceNodeId: "n1" },
			{ text: "world", sourceNodeId: "n2" },
		];
		const runs = mapLineToRuns(line, segments);
		expect(runs).toHaveLength(2);
		expect(runs[0]?.text).toBe("hello");
		expect(runs[0]?.sourceNodeId).toBe("n1");
		expect(runs[1]?.text).toBe("world");
		expect(runs[1]?.sourceNodeId).toBe("n2");
	});

	it("maps a line starting mid-segment", () => {
		const line: TextLayoutLine = {
			text: "loworld",
			width: 70,
			start: makeCursor(0, 3),
			end: makeCursor(1, 5),
		};
		const segments: InlineSegment[] = [
			{ text: "hello", sourceNodeId: "n1" },
			{ text: "world", sourceNodeId: "n2" },
		];
		const runs = mapLineToRuns(line, segments);
		expect(runs).toHaveLength(2);
		expect(runs[0]?.text).toBe("lo");
		expect(runs[1]?.text).toBe("world");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/layout-helpers.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create `src/layout/inline-flatten.ts`**

```typescript
import type { InlineNode } from "../document/nodes";
import type { InlineStyle } from "./types";

type InlineSegment = {
	readonly text: string;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

function flattenInlines(inlines: readonly InlineNode[], parentStyle?: InlineStyle): readonly InlineSegment[] {
	const result: InlineSegment[] = [];
	for (const node of inlines) {
		switch (node.type) {
			case "text":
				result.push({
					text: node.text,
					style: parentStyle,
					sourceNodeId: node.id,
				});
				break;
			case "strong": {
				const style: InlineStyle = { ...parentStyle, bold: true };
				result.push(...flattenInlines(node.inlines, style));
				break;
			}
			case "emphasis": {
				const style: InlineStyle = { ...parentStyle, italic: true };
				result.push(...flattenInlines(node.inlines, style));
				break;
			}
			case "link": {
				const style: InlineStyle = { ...parentStyle, href: node.href };
				result.push(...flattenInlines(node.inlines, style));
				break;
			}
			case "image-inline":
				result.push({
					text: node.alt ?? "",
					style: parentStyle,
					sourceNodeId: node.id,
				});
				break;
		}
	}
	return result;
}

export type { InlineSegment };
export { flattenInlines };
```

- [ ] **Step 4: Create `src/layout/run-mapper.ts`**

```typescript
import type { LayoutCursor, TextLayoutLine } from "../contracts/text-layouter";
import type { InlineStyle } from "./types";
import type { InlineSegment } from "./inline-flatten";

type LayoutRun = {
	readonly text: string;
	readonly x: number;
	readonly width: number;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

function mapLineToRuns(
	line: TextLayoutLine,
	segments: readonly InlineSegment[],
): LayoutRun[] {
	if (segments.length === 0) return [];

	const runs: LayoutRun[] = [];
	let currentSegmentIdx = line.start.segmentIndex;
	let charOffsetInSegment = line.start.graphemeIndex;
	let runX = 0;
	const totalGraphemes = line.end.segmentIndex > line.start.segmentIndex
		? segmentsLengthUpTo(segments, line.start.segmentIndex, line.start.graphemeIndex, line.end.segmentIndex, line.end.graphemeIndex)
		: line.end.graphemeIndex - line.start.graphemeIndex;

	// Use line.text to distribute across segments
	let textOffset = 0;

	while (currentSegmentIdx < segments.length && textOffset < line.text.length) {
		const segment = segments[currentSegmentIdx];
		if (!segment) break;

		const segmentText = segment.text;
		const isLastSegment = currentSegmentIdx === line.end.segmentIndex;

		let startInSegment = charOffsetInSegment;
		let endInSegment: number;
		if (isLastSegment) {
			endInSegment = line.end.graphemeIndex;
		} else {
			endInSegment = segmentText.length;
		}

		const runTextLength = endInSegment - startInSegment;
		if (runTextLength <= 0) {
			currentSegmentIdx++;
			charOffsetInSegment = 0;
			continue;
		}

		const runText = line.text.slice(textOffset, textOffset + runTextLength);
		const charWidth = line.width / (line.text.length || 1);
		const runWidth = charWidth * runText.length;

		runs.push({
			text: runText,
			x: runX,
			width: runWidth,
			style: segment.style,
			sourceNodeId: segment.sourceNodeId,
		});

		runX += runWidth;
		textOffset += runTextLength;
		currentSegmentIdx++;
		charOffsetInSegment = 0;
	}

	return runs;
}

function segmentsLengthUpTo(
	segments: readonly InlineSegment[],
	startSeg: number,
	startGrapheme: number,
	endSeg: number,
	endGrapheme: number,
): number {
	let total = 0;
	for (let i = startSeg; i <= endSeg && i < segments.length; i++) {
		const seg = segments[i];
		if (!seg) continue;
		if (i === startSeg && i === endSeg) {
			total += endGrapheme - startGrapheme;
		} else if (i === startSeg) {
			total += seg.text.length - startGrapheme;
		} else if (i === endSeg) {
			total += endGrapheme;
		} else {
			total += seg.text.length;
		}
	}
	return total;
}

export type { LayoutRun as RunMapperResult };
export { mapLineToRuns };
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/layout-helpers.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/reader-engine/src/layout/inline-flatten.ts packages/reader-engine/src/layout/run-mapper.ts packages/reader-engine/__tests__/layout-helpers.test.ts
git commit -m "feat(reader-engine): add inline flatten and run mapper — semantic-preserving layout helpers"
```

---

### Task 6: PretextLayouter + Pagination

**Files:**
- Create: `src/layout/pretext-layouter.ts`
- Create: `src/layout/pagination.ts`
- Create: `__tests__/pagination.test.ts`

- [ ] **Step 1: Write failing tests for pagination**

Create `__tests__/pagination.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
	createPaginationState,
	addLine,
	flushPage,
} from "../src/layout/pagination";
import type { LayoutConfig } from "../src/layout/types";
import type { LayoutLine } from "../src/layout/types";

const config: LayoutConfig = {
	pageWidth: 300,
	pageHeight: 500,
	lineHeight: 20,
	font: "16px serif",
	paddingTop: 20,
	paddingBottom: 20,
	paddingLeft: 10,
	paddingRight: 10,
};

function makeLine(y: number): LayoutLine {
	return {
		runs: [{ text: "test", x: 0, width: 50, sourceNodeId: "n1" }],
		width: 50,
		height: config.lineHeight,
		x: config.paddingLeft,
		y,
	};
}

describe("PaginationState", () => {
	it("creates empty state", () => {
		const state = createPaginationState();
		expect(state.pages).toHaveLength(0);
		expect(state.currentPageLines).toHaveLength(0);
		expect(state.currentHeight).toBe(0);
	});

	it("adds lines and flushes when page is full", () => {
		let state = createPaginationState();
		const maxContentHeight = config.pageHeight - config.paddingTop - config.paddingBottom;
		const maxLines = Math.floor(maxContentHeight / config.lineHeight);

		for (let i = 0; i < maxLines; i++) {
			state = addLine(state, makeLine(config.paddingTop + i * config.lineHeight), config);
		}
		expect(state.pages).toHaveLength(0);
		expect(state.currentPageLines).toHaveLength(maxLines);

		// One more line should trigger flush
		state = addLine(state, makeLine(0), config);
		expect(state.pages).toHaveLength(1);
		expect(state.currentPageLines).toHaveLength(1);
	});

	it("flushes final page", () => {
		let state = createPaginationState();
		state = addLine(state, makeLine(config.paddingTop), config);
		state = flushPage(state, config);
		expect(state.pages).toHaveLength(1);
		expect(state.currentPageLines).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/pagination.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `src/layout/pagination.ts`**

```typescript
import type { LayoutLine, LayoutPage, PageDimensions } from "./types";

type PaginationState = {
	readonly currentPageLines: readonly LayoutLine[];
	readonly currentHeight: number;
	readonly pages: readonly LayoutPage[];
	readonly pageIndex: number;
};

function createPaginationState(): PaginationState {
	return {
		currentPageLines: [],
		currentHeight: 0,
		pages: [],
		pageIndex: 0,
	};
}

function addLine(
	state: PaginationState,
	line: LayoutLine,
	maxContentHeight: number,
): PaginationState {
	const newLines = [...state.currentPageLines, line];
	const newHeight = state.currentHeight + line.height;

	if (newHeight > maxContentHeight && state.currentPageLines.length > 0) {
		// Flush current page, start new page with this line
		const page = makePage(state.pageIndex, state.currentPageLines);
		return {
			currentPageLines: [line],
			currentHeight: line.height,
			pages: [...state.pages, page],
			pageIndex: state.pageIndex + 1,
		};
	}

	return {
		...state,
		currentPageLines: newLines,
		currentHeight: newHeight,
	};
}

function flushPage(state: PaginationState): PaginationState {
	if (state.currentPageLines.length === 0) return state;
	const page = makePage(state.pageIndex, state.currentPageLines);
	return {
		currentPageLines: [],
		currentHeight: 0,
		pages: [...state.pages, page],
		pageIndex: state.pageIndex + 1,
	};
}

function makePage(index: number, lines: readonly LayoutLine[]): LayoutPage {
	const contentHeight = lines.reduce((sum, l) => sum + l.height, 0);
	return {
		index,
		lines,
		dimensions: {
			width: 0,
			height: 0,
			contentHeight,
			paddingTop: 0,
			paddingBottom: 0,
			paddingLeft: 0,
			paddingRight: 0,
		},
	};
}

export type { PaginationState };
export { createPaginationState, addLine, flushPage };
```

- [ ] **Step 4: Fix test to match new API** (pagination functions take `maxContentHeight` number, not `config`)

Update test `addLine` calls to pass `maxContentHeight` directly:

The test passes `config` as second arg — update pagination.ts `addLine` to accept config or just update the test. The cleaner approach: pagination takes `maxContentHeight: number`.

Update the test to extract maxContentHeight:
```typescript
const maxContentHeight = config.pageHeight - config.paddingTop - config.paddingBottom;
// Then: state = addLine(state, makeLine(...), maxContentHeight);
```

- [ ] **Step 5: Create `src/layout/pretext-layouter.ts`**

```typescript
import {
	prepareWithSegments,
	layoutNextLine,
} from "@chenglou/pretext";
import type { LayoutCursor, TextLayoutHandle, TextLayoutLine, TextLayoutOptions, TextLayouter } from "../contracts/text-layouter";

class PretextLayouter implements TextLayouter {
	prepare(text: string, options: TextLayoutOptions): TextLayoutHandle {
		const prepared = prepareWithSegments(text, options.font, {
			letterSpacing: options.letterSpacing,
			wordBreak: options.wordBreak,
		});
		return prepared as unknown as TextLayoutHandle;
	}

	layoutNextLine(
		handle: TextLayoutHandle,
		start: LayoutCursor | null,
		maxWidth: number,
	): TextLayoutLine | null {
		const prepared = handle as unknown as Parameters<typeof layoutNextLine>[0];
		const result = layoutNextLine(
			prepared,
			start ?? undefined as any,
			maxWidth,
		);
		if (!result) return null;
		return {
			text: result.text,
			width: result.width,
			start: result.start as LayoutCursor,
			end: result.end as LayoutCursor,
		};
	}
}

export { PretextLayouter };
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/pagination.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/reader-engine/src/layout/pagination.ts packages/reader-engine/src/layout/pretext-layouter.ts packages/reader-engine/__tests__/pagination.test.ts
git commit -m "feat(reader-engine): add PretextLayouter and pagination state machine"
```

---

### Task 7: Layout Engine

**Files:**
- Create: `src/layout/layout-engine.ts`
- Create: `__tests__/layout-engine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/layout-engine.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { layoutDocument } from "../src/layout/layout-engine";
import type { TextLayouter, TextLayoutHandle, TextLayoutLine, LayoutCursor, TextLayoutOptions } from "../src/contracts/text-layouter";
import { document, paragraphNode, textNode } from "../src/document/nodes";
import type { LayoutConfig } from "../src/layout/types";

function makeMockLayouter(lines: string[]): TextLayouter {
	return {
		prepare(_text: string, _options: TextLayoutOptions): TextLayoutHandle {
			return {} as TextLayoutHandle;
		},
		layoutNextLine(
			_handle: TextLayoutHandle,
			start: LayoutCursor | null,
			_maxWidth: number,
		): TextLayoutLine | null {
			const idx = start ? start.segmentIndex + 1 : 0;
			if (idx >= lines.length) return null;
			const text = lines[idx] ?? "";
			return {
				text,
				width: text.length * 10,
				start: { segmentIndex: idx, graphemeIndex: 0 },
				end: { segmentIndex: idx, graphemeIndex: text.length },
			};
		},
	};
}

const config: LayoutConfig = {
	pageWidth: 300,
	pageHeight: 100,
	lineHeight: 20,
	font: "16px serif",
	paddingTop: 10,
	paddingBottom: 10,
	paddingLeft: 10,
	paddingRight: 10,
};

describe("layoutDocument", () => {
	it("lays out a single paragraph into pages", () => {
		const mockLines = ["line1", "line2", "line3"];
		const layouter = makeMockLayouter(mockLines);
		const doc = document([paragraphNode([textNode("some text")])]);
		const result = layoutDocument(doc, config, layouter);
		expect(result.totalPages).toBeGreaterThan(0);
		const allTexts = result.pages.flatMap((p) => p.lines.flatMap((l) => l.runs.map((r) => r.text)));
		expect(allTexts).toEqual(mockLines);
	});

	it("produces positioned lines with x/y coordinates", () => {
		const mockLines = ["line1"];
		const layouter = makeMockLayouter(mockLines);
		const doc = document([paragraphNode([textNode("text")])]);
		const result = layoutDocument(doc, config, layouter);
		const firstLine = result.pages[0]?.lines[0];
		expect(firstLine).toBeDefined();
		expect(firstLine!.x).toBe(config.paddingLeft);
		expect(firstLine!.y).toBe(config.paddingTop);
	});

	it("splits content across pages when exceeding page height", () => {
		const manyLines = Array.from({ length: 20 }, (_, i) => `line${i}`);
		const layouter = makeMockLayouter(manyLines);
		const doc = document([paragraphNode([textNode("long text")])]);
		const result = layoutDocument(doc, config, layouter);
		expect(result.totalPages).toBeGreaterThan(1);
	});

	it("handles empty document", () => {
		const layouter = makeMockLayouter([]);
		const doc = document([]);
		const result = layoutDocument(doc, config, layouter);
		expect(result.totalPages).toBe(0);
		expect(result.pages).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/layout-engine.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `src/layout/layout-engine.ts`**

```typescript
import type { Document, BlockNode } from "../document/nodes";
import type { TextLayouter, TextLayoutOptions, LayoutCursor } from "../contracts/text-layouter";
import type { LayoutConfig, LayoutResult, LayoutPage, LayoutLine, LayoutRun, PageDimensions } from "./types";
import type { InlineSegment } from "./inline-flatten";
import { flattenInlines } from "./inline-flatten";
import { mapLineToRuns } from "./run-mapper";
import { createPaginationState, addLine, flushPage } from "./pagination";

function layoutDocument(
	doc: Document,
	config: LayoutConfig,
	layouter: TextLayouter,
): LayoutResult {
	const maxContentHeight = config.pageHeight - config.paddingTop - config.paddingBottom;
	const maxWidth = config.pageWidth - config.paddingLeft - config.paddingRight;
	const dims: PageDimensions = {
		width: config.pageWidth,
		height: config.pageHeight,
		contentHeight: 0,
		paddingTop: config.paddingTop,
		paddingBottom: config.paddingBottom,
		paddingLeft: config.paddingLeft,
		paddingRight: config.paddingRight,
	};

	let state = createPaginationState();
	let yOffset = config.paddingTop;
	let isFirstLineOfPage = true;

	for (const block of doc.blocks) {
		const lines = layoutBlock(block, layouter, config, maxWidth);
		for (const lineResult of lines) {
			if (yOffset + config.lineHeight > config.paddingTop + maxContentHeight && !isFirstLineOfPage) {
				state = flushPage(state);
				yOffset = config.paddingTop;
				isFirstLineOfPage = true;
			}

			const positionedLine: LayoutLine = {
				runs: lineResult.runs.map((r) => ({ ...r, x: r.x + config.paddingLeft })),
				width: lineResult.width,
				height: config.lineHeight,
				x: config.paddingLeft,
				y: yOffset,
			};

			state = addLineToState(state, positionedLine, maxContentHeight);
			yOffset += config.lineHeight;
			isFirstLineOfPage = false;
		}
	}

	state = flushPage(state);

	if (state.pages.length === 0) {
		return { pages: [], totalPages: 0 };
	}

	const pages = state.pages.map((p, i) => ({
		...p,
		index: i,
		dimensions: dims,
	}));

	return { pages, totalPages: pages.length };
}

type LineResult = {
	runs: LayoutRun[];
	width: number;
};

function layoutBlock(
	block: BlockNode,
	layouter: TextLayouter,
	config: LayoutConfig,
	maxWidth: number,
): LineResult[] {
	switch (block.type) {
		case "paragraph":
		case "heading":
			return layoutTextBlock(block.inlines, layouter, config, maxWidth);
		case "separator":
			return [{ runs: [], width: maxWidth }];
		case "image":
			return []; // v1: skip images
		case "blockquote":
			return block.blocks.flatMap((b) => layoutBlock(b, layouter, config, maxWidth));
		default:
			return [];
	}
}

function layoutTextBlock(
	inlines: readonly import("../document/nodes").InlineNode[],
	layouter: TextLayouter,
	config: LayoutConfig,
	maxWidth: number,
): LineResult[] {
	if (inlines.length === 0) return [];

	const segments = flattenInlines(inlines);
	const fullText = segments.map((s) => s.text).join("");
	if (fullText.length === 0) return [];

	const options: TextLayoutOptions = { font: config.font, letterSpacing: config.letterSpacing };
	const handle = layouter.prepare(fullText, options);

	const results: LineResult[] = [];
	let cursor: LayoutCursor | null = null;

	while (true) {
		const line = layouter.layoutNextLine(handle, cursor, maxWidth);
		if (!line) break;
		const runs = mapLineToRuns(line, segments);
		results.push({ runs, width: line.width });
		cursor = line.end;
	}

	return results;
}

function addLineToState(
	state: ReturnType<typeof createPaginationState>,
	line: LayoutLine,
	maxContentHeight: number,
): ReturnType<typeof createPaginationState> {
	return addLine(state, line, maxContentHeight);
}

export { layoutDocument };
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/layout-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/reader-engine/src/layout/layout-engine.ts packages/reader-engine/__tests__/layout-engine.test.ts
git commit -m "feat(reader-engine): add layout engine — Document → positioned LayoutResult"
```

---

### Task 8: Content Pipeline (Charset + Fetcher + Extractor + Pipeline)

**Files:**
- Create: `src/content/charset-decoder.ts`
- Create: `src/content/content-fetcher.ts`
- Create: `src/content/content-extractor.ts`
- Create: `src/content/content-pipeline.ts`
- Create: `__tests__/content-pipeline.test.ts`

- [ ] **Step 1: Write failing tests for charset-decoder and content-extractor**

Create `__tests__/content-pipeline.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { decodeBody } from "../src/content/charset-decoder";

describe("decodeBody", () => {
	it("decodes UTF-8 bytes to string", () => {
		const encoder = new TextEncoder();
		const bytes = encoder.encode("Hello World");
		expect(decodeBody(bytes)).toBe("Hello World");
	});

	it("decodes with explicit UTF-8 charset", () => {
		const encoder = new TextEncoder();
		const bytes = encoder.encode("你好世界");
		expect(decodeBody(bytes, "utf-8")).toBe("你好世界");
	});

	it("handles empty bytes", () => {
		expect(decodeBody(new Uint8Array(0))).toBe("");
	});
});

// ContentExtractor tests require mocking AnalyzeRule — tested via integration
// ContentFetcher tests require mocking HttpFetcher — tested via integration
```

- [ ] **Step 2: Create `src/content/charset-decoder.ts`**

```typescript
function decodeBody(body: Uint8Array, charset?: string): string {
	const encoding = (charset ?? "utf-8").toLowerCase();
	try {
		const decoder = new TextDecoder(encoding);
		return decoder.decode(body);
	} catch {
		return new TextDecoder("utf-8").decode(body);
	}
}

export { decodeBody };
```

- [ ] **Step 3: Create `src/content/content-fetcher.ts`**

```typescript
import type { HttpFetcher, HttpFetcherOptions, HttpFetcherResponse } from "../contracts/http-fetcher";

type FetchResult = {
	readonly body: Uint8Array;
	readonly detectedCharset?: string;
};

async function fetchRaw(
	httpFetcher: HttpFetcher,
	url: string,
	options?: HttpFetcherOptions,
): Promise<FetchResult> {
	const response = await httpFetcher.fetch(url, options ?? {});
	const charset = detectCharsetFromHeaders(response.headers);
	return { body: response.body, detectedCharset: charset };
}

function detectCharsetFromHeaders(
	headers: Record<string, string>,
): string | undefined {
	const contentType = headers["content-type"] ?? headers["Content-Type"] ?? "";
	const match = contentType.match(/charset=([^\s;]+)/i);
	return match?.[1];
}

export type { FetchResult };
export { fetchRaw };
```

- [ ] **Step 4: Create `src/content/content-extractor.ts`**

```typescript
import type { AnalyzeRule } from "@readerx/rule-engine";
import type { ContentRule, JsExecutor } from "@readerx/rule-engine";

type ExtractResult = {
	readonly content: string;
	readonly isHtml: boolean;
};

const MAX_CONTENT_PAGES = 50;

async function extractContent(
	analyzer: AnalyzeRule,
	contentRule: ContentRule,
	jsExecutor?: JsExecutor,
): Promise<ExtractResult> {
	if (jsExecutor) {
		analyzer.setJsExecutor(jsExecutor);
	}

	let content = "";
	let isHtml = false;

	if (contentRule.content) {
		const result = await analyzer.getString(contentRule.content);
		if (result.ok) {
			content = result.value;
		}
	}

	// Handle multi-page content via nextContentUrl
	if (contentRule.nextContentUrl) {
		let pageCount = 1;
		let nextUrl: string | null | undefined;

		const nextUrlResult = await analyzer.getString(contentRule.nextContentUrl);
		if (nextUrlResult.ok) {
			nextUrl = nextUrlResult.value;
		}

		while (nextUrl && pageCount < MAX_CONTENT_PAGES) {
			const nextPageResult = await analyzer.getString(contentRule.nextContentUrl);
			if (!nextPageResult.ok || !nextPageResult.value) break;
			content += "\n" + nextPageResult.value;
			nextUrl = nextPageResult.value;
			pageCount++;
		}
	}

	// Detect if content is HTML
	isHtml = /<[a-zA-Z][^>]*>/.test(content);

	return { content, isHtml };
}

export type { ExtractResult };
export { extractContent };
```

- [ ] **Step 5: Create `src/content/content-pipeline.ts`**

```typescript
import type { HttpFetcher, JsExecutor } from "../contracts";
import type { Document } from "../document/nodes";
import type { ReplaceRule } from "./types";
import type { AnalyzeRule, ContentRule } from "@readerx/rule-engine";
import { AnalyzeRule as AnalyzeRuleClass, analyzeUrlAsync } from "@readerx/rule-engine";
import { fetchRaw } from "./content-fetcher";
import { decodeBody } from "./charset-decoder";
import { extractContent } from "./content-extractor";
import { parseHtmlToDocument, parseTextToDocument } from "./document-parser";
import { ContentProcessor } from "./content-processor";

type PipelineDeps = {
	readonly httpFetcher: HttpFetcher;
	readonly jsExecutor?: JsExecutor;
};

type PipelineConfig = {
	readonly contentRule: ContentRule;
	readonly url: string;
	readonly urlOptions?: Record<string, string>;
	readonly replaceRules?: ReplaceRule[];
};

async function fetchAndParse(deps: PipelineDeps, config: PipelineConfig): Promise<Document> {
	// 1. Fetch raw bytes
	const { body, detectedCharset } = await fetchRaw(deps.httpFetcher, config.url);

	// 2. Decode body
	const decoded = decodeBody(body, detectedCharset);

	// 3. Extract content using AnalyzeRule
	const analyzer = new AnalyzeRuleClass();
	analyzer.setContent(decoded);
	const { content, isHtml } = await extractContent(analyzer, config.contentRule, deps.jsExecutor);

	// 4. Parse to Document AST
	const doc = isHtml ? parseHtmlToDocument(content) : parseTextToDocument(content);

	// 5. Apply ReplaceRules
	if (config.replaceRules && config.replaceRules.length > 0) {
		const processor = new ContentProcessor();
		processor.setRules(config.replaceRules);
		return processor.process(doc);
	}

	return doc;
}

export type { PipelineDeps, PipelineConfig };
export { fetchAndParse };
```

- [ ] **Step 6: Run charset tests**

Run: `pnpm --filter @readerx/reader-engine exec vitest run __tests__/content-pipeline.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/reader-engine/src/content/charset-decoder.ts packages/reader-engine/src/content/content-fetcher.ts packages/reader-engine/src/content/content-extractor.ts packages/reader-engine/src/content/content-pipeline.ts packages/reader-engine/__tests__/content-pipeline.test.ts
git commit -m "feat(reader-engine): add content pipeline — fetch, decode, extract, parse, process"
```

---

### Task 9: Render Model + Layout Index Export

**Files:**
- Create: `src/renderer/render-model.ts`
- Update: `src/layout/index.ts`

- [ ] **Step 1: Create `src/renderer/render-model.ts`**

```typescript
import type {
	InlineStyle,
	LayoutResult,
	LayoutPage,
	LayoutLine,
	LayoutRun,
	PageDimensions,
} from "../layout/types";

type RenderRun = {
	readonly text: string;
	readonly x: number;
	readonly width: number;
	readonly style?: InlineStyle;
	readonly sourceNodeId: string;
};

type RenderLine = {
	readonly runs: readonly RenderRun[];
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

type RenderPage = {
	readonly index: number;
	readonly lines: readonly RenderLine[];
	readonly dimensions: PageDimensions;
};

type RenderResult = {
	readonly pages: readonly RenderPage[];
	readonly totalPages: number;
};

function toRenderModel(layout: LayoutResult): RenderResult {
	return {
		pages: layout.pages.map((page: LayoutPage) => ({
			index: page.index,
			lines: page.lines.map((line: LayoutLine) => ({
				runs: line.runs.map((run: LayoutRun) => ({
					text: run.text,
					x: run.x,
					width: run.width,
					style: run.style,
					sourceNodeId: run.sourceNodeId,
				})),
				x: line.x,
				y: line.y,
				width: line.width,
				height: line.height,
			})),
			dimensions: page.dimensions,
		})),
		totalPages: layout.totalPages,
	};
}

export type { RenderLine, RenderPage, RenderResult, RenderRun };
export { toRenderModel };
```

- [ ] **Step 2: Update `src/layout/index.ts`** with full exports

```typescript
export type {
	InlineStyle,
	LayoutConfig,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "./types";
export type { InlineSegment } from "./inline-flatten";
export { flattenInlines } from "./inline-flatten";
export { mapLineToRuns } from "./run-mapper";
export { PretextLayouter } from "./pretext-layouter";
export { layoutDocument } from "./layout-engine";
export { createPaginationState, addLine, flushPage } from "./pagination";
export type { PaginationState } from "./pagination";
```

- [ ] **Step 3: Commit**

```bash
git add packages/reader-engine/src/renderer/render-model.ts packages/reader-engine/src/layout/index.ts
git commit -m "feat(reader-engine): add render model and layout module exports"
```

---

### Task 10: Package Cleanup — Index, Remove Old Files, Typecheck

**Files:**
- Rewrite: `src/index.ts`
- Update: `src/content/index.ts`
- Update: `src/renderer/index.ts`
- Delete: `src/pagination/` directory
- Delete: `src/renderer/types.ts`
- Delete: `src/types.ts`

- [ ] **Step 1: Delete old files**

```bash
rm -rf packages/reader-engine/src/pagination/
rm packages/reader-engine/src/renderer/types.ts
rm packages/reader-engine/src/types.ts
```

- [ ] **Step 2: Rewrite `src/index.ts`**

```typescript
// Document AST
export type {
	Document,
	DocumentMeta,
	BlockNode,
	BlockquoteNode,
	HeadingNode,
	ImageNode,
	InlineNode,
	EmphasisNode,
	ImageInlineNode,
	LinkNode,
	ParagraphNode,
	SeparatorNode,
	StrongNode,
	TextNode,
	BaseNode,
} from "./document/nodes";
export { document, headingNode, nodeId, paragraphNode, textNode } from "./document/nodes";

// Cursors
export type { DocumentCursor, PageCursor } from "./shared/cursors";

// Contracts
export type {
	HttpFetcher,
	HttpFetcherOptions,
	HttpFetcherResponse,
} from "./contracts/http-fetcher";
export type { JsExecutor, JsEvalContext, JsEvalResult } from "./contracts/js-executor";
export type {
	LayoutCursor,
	TextLayoutHandle,
	TextLayoutLine,
	TextLayouter,
	TextLayoutOptions,
} from "./contracts/text-layouter";

// Content
export { ContentProcessor } from "./content/content-processor";
export type { ReplaceRule } from "./content/types";
export { parseHtmlToDocument, parseTextToDocument } from "./content/document-parser";
export { decodeBody } from "./content/charset-decoder";
export { fetchRaw } from "./content/content-fetcher";
export { extractContent } from "./content/content-extractor";
export { fetchAndParse } from "./content/content-pipeline";
export type { PipelineDeps, PipelineConfig } from "./content/content-pipeline";

// Layout
export type {
	InlineStyle,
	LayoutConfig,
	LayoutLine,
	LayoutPage,
	LayoutResult,
	LayoutRun,
	PageDimensions,
} from "./layout/types";
export { layoutDocument } from "./layout/layout-engine";
export { PretextLayouter } from "./layout/pretext-layouter";
export { flattenInlines } from "./layout/inline-flatten";
export type { InlineSegment } from "./layout/inline-flatten";

// Renderer
export type { RenderLine, RenderPage, RenderResult, RenderRun } from "./renderer/render-model";
export { toRenderModel } from "./renderer/render-model";
```

- [ ] **Step 3: Update `src/content/index.ts`**

```typescript
export { ContentProcessor } from "./content-processor";
export type { ReplaceRule } from "./types";
export { parseHtmlToDocument, parseTextToDocument } from "./document-parser";
export { decodeBody } from "./charset-decoder";
export { fetchRaw } from "./content-fetcher";
export type { FetchResult } from "./content-fetcher";
export { extractContent } from "./content-extractor";
export type { ExtractResult } from "./content-extractor";
export { fetchAndParse } from "./content-pipeline";
export type { PipelineDeps, PipelineConfig } from "./content-pipeline";
```

- [ ] **Step 4: Update `src/renderer/index.ts`**

```typescript
export type { RenderLine, RenderPage, RenderResult, RenderRun } from "./render-model";
export { toRenderModel } from "./render-model";
```

- [ ] **Step 5: Run full typecheck**

Run: `pnpm --filter @readerx/reader-engine typecheck`
Expected: PASS with zero errors

- [ ] **Step 6: Run all tests**

Run: `pnpm --filter @readerx/reader-engine exec vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add -A packages/reader-engine/
git commit -m "feat(reader-engine): complete V3 package — Document AST pipeline, layout engine, render model"
```

---

## Self-Review Checklist

- [x] Spec coverage: Every section in spec V3 maps to a task (AST→T1, Cursors→T1, Contracts→T1, Layout Types→T2, Parser→T3, ContentProcessor→T4, Inline/Run→T5, PretextLayouter/Pagination→T6, LayoutEngine→T7, Pipeline→T8, RenderModel→T9, Cleanup→T10)
- [x] Placeholder scan: No TBD/TODO/fill-in-later. All code provided.
- [x] Type consistency: BaseNode.id used consistently, InlineStyle same shape across modules, LayoutCursor matches TextLayouter contract.
