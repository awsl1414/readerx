# Rule Management Reconnection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconnect the four rule management pages (replace-rule, txt-toc-rule, dict-rule, book-source-rule) with the rewritten rule engine, using a new schemas package as single source of truth, single IndexedDB rules table, and independent hand-written editors per rule type.

**Architecture:** Schemas package exports types + Zod schemas. Persistence uses single `rules` table with type discriminator. Each rule type has its own feature with hand-written editor. BookSource gets a VSCode-like workspace. Runtime interfaces are defined but not implemented.

**Tech Stack:** Zod 4, Dexie (IndexedDB), React 19, Next.js App Router, TanStack Query 5, shadcn/ui, Radix UI, Tailwind CSS 4

---

## File Structure

### New files to create

```
packages/schemas/
  package.json
  tsconfig.json
  src/
    index.ts
    types.ts              # RuleRecord, RuleType, BookSourceData, ReplaceRuleData, etc.
    schemas.ts            # Zod schemas migrated from rule-engine

packages/persistence/src/
  rules-repo.ts           # Unified RulesRepository (single table)
  rules-helpers.ts        # Type-safe data access helpers

apps/web/features/
  shared-rule-ui/
    index.ts
    components/
      regex-editor.tsx
      scope-editor.tsx
      pipeline-editor.tsx
      request-config-editor.tsx
      tag-input.tsx
      rule-import-dialog.tsx
      rule-list.tsx
      form-field.tsx
  replace-rule/
    index.ts
    replace-rule-list-page.tsx
    replace-rule-editor.tsx
    hooks/
      use-replace-rules.ts
  txt-toc-rule/
    index.ts
    toc-rule-list-page.tsx
    toc-rule-editor.tsx
    hooks/
      use-toc-rules.ts
  dict-rule/
    index.ts
    dict-rule-list-page.tsx
    dict-rule-editor.tsx
    hooks/
      use-dict-rules.ts
  book-source/
    index.ts
    workspace/
      source-workspace.tsx
      source-list-panel.tsx
      source-editor-panel.tsx
      module-navigator.tsx
      module-editor.tsx
      preview/
        request-preview.tsx
        result-preview.tsx
      test/
        rule-tester.tsx
    hooks/
      use-source-rules.ts
      use-source-mutations.ts

packages/rule-engine/src/
  ir/
    types.ts              # ExecutionPlan DAG IR types
  compiler/
    interface.ts          # RuleCompiler interface
  executor/
    interface.ts          # Executor interface
  cache/
    interface.ts          # CompileCache interface

packages/reader-engine/src/
  source-service.ts       # SourceService interface (empty impl)

packages/infrastructure/src/
  fetcher.ts              # Fetcher interface
```

### Files to modify

```
packages/persistence/
  src/database.ts         # Version 3: single rules table
  src/types.ts            # Add RuleRecord types, deprecate old rule types
  src/index.ts            # Export new RulesRepository

packages/rule-engine/
  package.json            # Add @readerx/schemas dependency
  src/index.ts            # Re-export from @readerx/schemas, add IR exports
  src/types.ts            # Keep runtime types, add IR re-exports
  src/schemas.ts          # Re-export from @readerx/schemas, keep bookSource specific

packages/reader-engine/
  package.json            # Ensure schemas dependency

apps/web/
  app/my/replace-rules/page.tsx    # Use new replace-rule feature
  app/my/txt-rules/page.tsx        # Use new txt-toc-rule feature
  app/my/dict-rules/page.tsx       # Use new dict-rule feature
  app/my/sources/page.tsx          # Use new book-source workspace

.claude/rules/architecture.md     # Update package dependency table
```

### Files to delete (deprecated)

```
apps/web/features/simple-rule-manager/     # Replaced by individual features + shared-rule-ui
apps/web/features/replace-rule-manager/    # Replaced by replace-rule/
apps/web/features/dict-rule-manager/       # Replaced by dict-rule/
apps/web/features/txt-rule-manager/        # Replaced by txt-toc-rule/
apps/web/features/source-manager/          # Replaced by book-source/

packages/persistence/src/replace-rule-repo.ts   # Replaced by rules-repo.ts
packages/persistence/src/dict-rule-repo.ts      # Replaced by rules-repo.ts
packages/persistence/src/txt-toc-rule-repo.ts   # Replaced by rules-repo.ts
```

---

## Phase 1: Foundation (schemas + persistence)

### Task 1: Create `@readerx/schemas` package

**Files:**
- Create: `packages/schemas/package.json`
- Create: `packages/schemas/tsconfig.json`
- Create: `packages/schemas/src/index.ts`
- Create: `packages/schemas/src/types.ts`
- Create: `packages/schemas/src/schemas.ts`

- [ ] **Step 1: Create package structure and types**

`packages/schemas/package.json`:
```json
{
  "name": "@readerx/schemas",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome check",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  }
}
```

`packages/schemas/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

`packages/schemas/src/types.ts` — defines all storage-level types:
```typescript
// ---- Rule Type Discriminator ----

type RuleType =
  | "book-source"
  | "dict"
  | "replace"
  | "txt-toc";

// ---- Unified Storage Record ----

type RuleRecord<T extends RuleType = RuleType> = {
  id: string;
  type: T;
  name: string;
  enabled: boolean;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  data: RuleDataType<T>;
};

type RuleDataType<T extends RuleType> =
  T extends "book-source" ? BookSourceData :
  T extends "dict" ? DictRuleData :
  T extends "replace" ? ReplaceRuleData :
  T extends "txt-toc" ? TxtTocRuleData :
  never;

// ---- BookSource Data ----

type BookSourceType = "novel" | "audio" | "comic" | "file";

type SourceModuleType =
  | "search"
  | "explore"
  | "detail"
  | "toc"
  | "content";

type BookSourceData = {
  description?: string;
  author?: string;
  version?: number;
  baseUrl: string;
  urlPattern?: string;
  headers?: Record<string, string>;
  loginUrl?: string;
  weight?: number;
  rateLimit?: number;
  modules: SourceModule[];
};

type SourceModule = {
  type: SourceModuleType;
  enabled?: boolean;
  request?: RequestConfig;
  rules: Record<string, RuleExpression>;
  nextUrl?: RuleExpression;
};

// Rule expression: string shorthand | RuleObject | RuleStep[]
type RuleExpression = string | RuleObjectDef | readonly RuleStepDef[];

type RuleObjectDef = {
  css?: string;
  xpath?: string;
  jsonpath?: string;
  regex?: string;
  template?: string;
  js?: string;
  attr?: string;
  output?: "text" | "html" | "outerHtml" | "attr";
  reverse?: boolean;
  separator?: string;
  transform?: readonly TransformStepDef[];
};

type RuleStepDef =
  | ExtractStepDef
  | TransformStepDef
  | ScriptStepDef;

type ExtractStepDef = {
  type: "extract";
  engine: "css" | "xpath" | "jsonpath" | "regex";
  selector: string;
  output?: "text" | "html" | "outerHtml" | "attr";
  attr?: string;
  baseUrl?: string;
};

type TransformStepDef =
  | StringTransformDef
  | DomTransformDef;

type StringTransformDef = {
  type: "transform";
  category: "string";
  action: "replace" | "match" | "split" | "template" | "trim";
  pattern?: string;
  with?: string;
  flags?: string;
  group?: number;
  template?: string;
};

type DomTransformDef = {
  type: "transform";
  category: "dom";
  action: "remove" | "unwrap" | "strip";
  selector: string;
  attrs?: readonly string[];
};

type ScriptStepDef = {
  type: "script";
  code: string;
};

// ---- Replace Rule Data ----

type ReplaceRuleData = {
  description?: string;
  pattern: string;
  flags?: string;
  literal?: boolean;
  replacement?: string;
  replacementJs?: string;
  scope?: ReplaceScope;
};

type ReplaceScope = {
  include?: readonly string[];
  exclude?: readonly string[];
  target?: "content" | "title" | "both";
};

// ---- TXT TOC Rule Data ----

type TxtTocRuleData = {
  description?: string;
  pattern: string;
  flags?: string;
};

// ---- Dict Rule Data ----

type DictRuleData = {
  description?: string;
  weight?: number;
  variables?: Record<string, string>;
  request: RequestConfig;
  fields?: Record<string, DictField>;
};

type DictField = {
  schema: "html" | "string" | "html[]" | "string[]";
  pipeline: readonly RuleStepDef[];
};

// ---- Request Config ----

type RequestConfig = {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: RequestBody;
  charset?: string;
  cookies?: Record<string, string>;
  timeout?: number;
  retry?: number;
  cache?: boolean | number;
  proxy?: string;
  followRedirect?: boolean;
  userAgent?: string;
  rateLimit?: number;
  variables?: Record<string, string>;
};

type RequestBody = {
  type: "form" | "json" | "raw";
  data: string;
};

// ---- Exploration ----

type ExploreCategory = {
  title: string;
  url?: string;
};

// ---- Replace Pair (book-source content module) ----

type ReplacePair = {
  pattern: string;
  with: string;
};

export type {
  RuleType,
  RuleRecord,
  RuleDataType,
  BookSourceType,
  SourceModuleType,
  BookSourceData,
  SourceModule,
  RuleExpression,
  RuleObjectDef,
  RuleStepDef,
  ExtractStepDef,
  TransformStepDef,
  StringTransformDef,
  DomTransformDef,
  ScriptStepDef,
  ReplaceRuleData,
  ReplaceScope,
  TxtTocRuleData,
  DictRuleData,
  DictField,
  RequestConfig,
  RequestBody,
  ExploreCategory,
  ReplacePair,
};
```

- [ ] **Step 2: Migrate Zod schemas to schemas package**

`packages/schemas/src/schemas.ts` — migrate from `packages/rule-engine/src/schemas.ts`, adapting to new types (modules[] for BookSource):

```typescript
import { z } from "zod";
import type { Result } from "./result";
import { err, ok } from "./result";

// ---- Result type (local copy, schemas has no deps) ----
// Re-exported for consumer convenience

// ---- Replace Rule Schema ----

const replaceScopeSchema = z.strictObject({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  target: z.enum(["content", "title", "both"]).optional(),
});

const replaceRuleDataSchema = z.strictObject({
  description: z.string().optional(),
  pattern: z.string(),
  flags: z.string().optional(),
  literal: z.boolean().optional(),
  replacement: z.string().optional(),
  replacementJs: z.string().optional(),
  scope: replaceScopeSchema.optional(),
});

// ---- TXT TOC Rule Schema ----

const txtTocRuleDataSchema = z.strictObject({
  description: z.string().optional(),
  pattern: z.string(),
  flags: z.string().optional(),
});

// ---- Dict Rule Schema ----

const extractStepSchema = z.strictObject({
  type: z.literal("extract"),
  engine: z.enum(["css", "xpath", "jsonpath", "regex"]),
  selector: z.string(),
  output: z.union([
    z.enum(["html", "text", "outerHtml"]),
    z.strictObject({ type: z.literal("attr"), name: z.string() }),
  ]).optional(),
  baseUrl: z.string().optional(),
}).transform((step) => {
  if (typeof step.output === "object" && step.output !== null && "type" in step.output) {
    const { output, ...rest } = step;
    return { ...rest, output: "attr" as const, attr: output.name };
  }
  return step;
});

const DOM_ACTIONS = ["remove", "unwrap", "strip"] as const;
const STRING_ACTIONS = ["replace", "match", "split", "template", "trim"] as const;

const transformStepSchema = z.strictObject({
  type: z.literal("transform"),
  action: z.enum([...DOM_ACTIONS, ...STRING_ACTIONS]),
  category: z.enum(["string", "dom"]).optional(),
  selector: z.string().optional(),
  attrs: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  with: z.string().optional(),
  flags: z.string().optional(),
  group: z.number().optional(),
  template: z.string().optional(),
}).transform((step) => {
  const category = DOM_ACTIONS.includes(step.action as (typeof DOM_ACTIONS)[number])
    ? ("dom" as const)
    : ("string" as const);
  return { ...step, category };
});

const scriptStepSchema = z.strictObject({
  type: z.literal("script"),
  code: z.string(),
});

const ruleStepSchema = z.union([extractStepSchema, transformStepSchema, scriptStepSchema]);

const dictFieldSchema = z.strictObject({
  schema: z.enum(["html", "string", "html[]", "string[]"]).default("html"),
  pipeline: z.array(ruleStepSchema),
});

const requestBodySchema = z.strictObject({
  type: z.enum(["form", "json", "raw"]),
  data: z.string(),
});

const requestConfigSchema = z.strictObject({
  url: z.string(),
  method: z.enum(["GET", "POST"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: requestBodySchema.optional(),
  charset: z.string().optional(),
  cookies: z.record(z.string(), z.string()).optional(),
  timeout: z.number().optional(),
  retry: z.number().optional(),
  cache: z.union([z.boolean(), z.number()]).optional(),
  proxy: z.string().optional(),
  followRedirect: z.boolean().optional(),
  userAgent: z.string().optional(),
  rateLimit: z.number().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

const dictRuleDataSchema = z.strictObject({
  description: z.string().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  variables: z.record(z.string(), z.string()).optional(),
  request: requestConfigSchema,
  fields: z.record(z.string(), dictFieldSchema).optional(),
});

// ---- Book Source Schema (modules[] format) ----

const ruleExpressionSchema = z.union([
  z.string(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

const sourceModuleSchema = z.strictObject({
  type: z.enum(["search", "explore", "detail", "toc", "content"]),
  enabled: z.boolean().optional(),
  request: requestConfigSchema.optional(),
  rules: z.record(z.string(), ruleExpressionSchema),
  nextUrl: ruleExpressionSchema.optional(),
});

const exploreCategorySchema = z.strictObject({
  title: z.string(),
  url: z.string().optional(),
});

const bookSourceDataSchema = z.strictObject({
  description: z.string().optional(),
  author: z.string().optional(),
  version: z.number().int().min(1).optional(),
  baseUrl: z.string(),
  urlPattern: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  loginUrl: z.string().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  rateLimit: z.number().int().min(0).optional(),
  modules: z.array(sourceModuleSchema),
  exploreCategories: z.array(exploreCategorySchema).optional(),
});

// ---- File-level schemas (for import/export) ----

export const replaceRuleFileSchema = z.strictObject({
  $schema: z.string(),
  rules: z.array(z.strictObject({
    name: z.string(),
    pattern: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    scope: replaceScopeSchema.optional(),
    flags: z.string().optional(),
    literal: z.boolean().optional(),
    replacement: z.string().optional(),
    replacementJs: z.string().optional(),
  })),
});

export const txtTocRuleFileSchema = z.strictObject({
  $schema: z.string(),
  rules: z.array(z.strictObject({
    name: z.string(),
    pattern: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    flags: z.string().optional(),
  })),
});

export const dictRuleFileSchema = z.strictObject({
  $schema: z.string(),
  authors: z.array(z.string()).optional(),
  description: z.string().optional(),
  updatedAt: z.string().optional(),
  rules: z.array(z.strictObject({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    weight: z.number().int().min(0).max(100).optional(),
    variables: z.record(z.string(), z.string()).optional(),
    request: z.strictObject({
      url: z.string(),
      method: z.enum(["GET", "POST"]).optional(),
      charset: z.string().optional(),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.union([
        z.string(),
        z.strictObject({ type: z.enum(["form", "json", "raw"]), data: z.unknown() }),
      ]).optional(),
    }),
    fields: z.record(z.string(), dictFieldSchema).optional(),
  })),
});

export const bookSourceSchema = z.strictObject({
  $schema: z.string(),
  id: z.string(),
  name: z.string(),
  type: z.enum(["novel", "audio", "comic", "file"]),
  baseUrl: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  version: z.number().int().min(1).optional(),
  urlPattern: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  loginUrl: z.string().optional(),
  enabled: z.boolean().optional(),
  weight: z.number().int().min(0).max(100).optional(),
  order: z.number().int().min(0).optional(),
  rateLimit: z.number().int().min(0).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  // NEW: modules[] replaces fixed search/explore/bookInfo/toc/content fields
  modules: z.array(sourceModuleSchema),
  exploreCategories: z.array(exploreCategorySchema).optional(),
});

// ---- Data-level schemas (for RuleRecord.data validation) ----

export { replaceRuleDataSchema, txtTocRuleDataSchema, dictRuleDataSchema, bookSourceDataSchema };
export { requestConfigSchema, ruleStepSchema, dictFieldSchema, sourceModuleSchema, ruleExpressionSchema };

// ---- Validation helpers ----

function validate<T>(schema: z.ZodType<T>, data: unknown): Result<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  const issues = result.error.issues;
  const message = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  return err({ code: "VALIDATION_ERROR", message: `Validation failed: ${message}`, cause: result.error });
}

export function validateReplaceRuleData(data: unknown): Result<z.output<typeof replaceRuleDataSchema>> {
  return validate(replaceRuleDataSchema, data);
}

export function validateTxtTocRuleData(data: unknown): Result<z.output<typeof txtTocRuleDataSchema>> {
  return validate(txtTocRuleDataSchema, data);
}

export function validateDictRuleData(data: unknown): Result<z.output<typeof dictRuleDataSchema>> {
  return validate(dictRuleDataSchema, data);
}

export function validateBookSourceData(data: unknown): Result<z.output<typeof bookSourceDataSchema>> {
  return validate(bookSourceDataSchema, data);
}

export function validateReplaceRuleFile(data: unknown): Result<z.output<typeof replaceRuleFileSchema>> {
  return validate(replaceRuleFileSchema, data);
}

export function validateTxtTocRuleFile(data: unknown): Result<z.output<typeof txtTocRuleFileSchema>> {
  return validate(txtTocRuleFileSchema, data);
}

export function validateDictRuleFile(data: unknown): Result<z.output<typeof dictRuleFileSchema>> {
  return validate(dictRuleFileSchema, data);
}

export function validateBookSource(data: unknown): Result<z.output<typeof bookSourceSchema>> {
  return validate(bookSourceSchema, data);
}

export type ReplaceRuleFileOutput = z.output<typeof replaceRuleFileSchema>;
export type TxtTocRuleFileOutput = z.output<typeof txtTocRuleFileSchema>;
export type DictRuleFileOutput = z.output<typeof dictRuleFileSchema>;
export type BookSourceOutput = z.output<typeof bookSourceSchema>;
```

`packages/schemas/src/result.ts`:
```typescript
type Result<T, E = RuleValidationError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

type RuleValidationError = {
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
};

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E extends RuleValidationError>(error: E): Result<never, E> {
  return { ok: false, error };
}

function isOk<T>(result: Result<T>): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

function isErr<E extends RuleValidationError>(result: Result<unknown, E>): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

export type { Result, RuleValidationError };
export { ok, err, isOk, isErr };
```

`packages/schemas/src/index.ts`:
```typescript
// Types
export type {
  RuleType,
  RuleRecord,
  RuleDataType,
  BookSourceType,
  SourceModuleType,
  BookSourceData,
  SourceModule,
  RuleExpression,
  RuleObjectDef,
  RuleStepDef,
  ExtractStepDef,
  TransformStepDef,
  StringTransformDef,
  DomTransformDef,
  ScriptStepDef,
  ReplaceRuleData,
  ReplaceScope,
  TxtTocRuleData,
  DictRuleData,
  DictField,
  RequestConfig,
  RequestBody,
  ExploreCategory,
  ReplacePair,
} from "./types";

// Schemas
export {
  replaceRuleFileSchema,
  txtTocRuleFileSchema,
  dictRuleFileSchema,
  bookSourceSchema,
  replaceRuleDataSchema,
  txtTocRuleDataSchema,
  dictRuleDataSchema,
  bookSourceDataSchema,
  requestConfigSchema,
  ruleStepSchema,
  dictFieldSchema,
  sourceModuleSchema,
  ruleExpressionSchema,
  validateReplaceRuleData,
  validateTxtTocRuleData,
  validateDictRuleData,
  validateBookSourceData,
  validateReplaceRuleFile,
  validateTxtTocRuleFile,
  validateDictRuleFile,
  validateBookSource,
} from "./schemas";

export type {
  ReplaceRuleFileOutput,
  TxtTocRuleFileOutput,
  DictRuleFileOutput,
  BookSourceOutput,
} from "./schemas";

// Result
export type { Result, RuleValidationError } from "./result";
export { ok, err, isOk, isErr } from "./result";
```

- [ ] **Step 3: Install dependencies**

Run: `cd /Volumes/Data/workspaces/front/readerx/.claude/worktrees/refactor+rule-engine3 && pnpm install`

- [ ] **Step 4: Write schema tests**

Create `packages/schemas/__tests__/schemas.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import {
  validateReplaceRuleData,
  validateTxtTocRuleData,
  validateDictRuleData,
  validateBookSourceData,
} from "../src/schemas";

describe("validateReplaceRuleData", () => {
  it("accepts valid replace rule data", () => {
    const result = validateReplaceRuleData({
      pattern: "\\s+",
      replacement: " ",
      flags: "g",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing pattern", () => {
    const result = validateReplaceRuleData({});
    expect(result.ok).toBe(false);
  });

  it("accepts scope with include/exclude", () => {
    const result = validateReplaceRuleData({
      pattern: "ad",
      scope: {
        include: ["source1"],
        exclude: ["source2"],
        target: "content",
      },
    });
    expect(result.ok).toBe(true);
  });
});

describe("validateTxtTocRuleData", () => {
  it("accepts valid toc rule data", () => {
    const result = validateTxtTocRuleData({
      pattern: "^第[一二三四五六七八九十百千万]+章",
      flags: "gm",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing pattern", () => {
    const result = validateTxtTocRuleData({});
    expect(result.ok).toBe(false);
  });
});

describe("validateDictRuleData", () => {
  it("accepts valid dict rule data", () => {
    const result = validateDictRuleData({
      request: { url: "https://dict.cn/search?q={{key}}" },
      fields: {
        definition: {
          schema: "string",
          pipeline: [
            { type: "extract", engine: "css", selector: ".definition" },
          ],
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing request", () => {
    const result = validateDictRuleData({});
    expect(result.ok).toBe(false);
  });
});

describe("validateBookSourceData", () => {
  it("accepts valid book source data with modules", () => {
    const result = validateBookSourceData({
      baseUrl: "https://example.com",
      modules: [
        {
          type: "search",
          request: { url: "/search?q={{key}}" },
          rules: {
            list: ".result-list > .item",
            name: ".book-name",
            url: ".book-link@href",
          },
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing baseUrl", () => {
    const result = validateBookSourceData({
      modules: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects missing modules", () => {
    const result = validateBookSourceData({
      baseUrl: "https://example.com",
    });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @readerx/schemas test`
Expected: All tests pass

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @readerx/schemas typecheck`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add packages/schemas/
git commit -m "feat(schemas): create @readerx/schemas package with types and Zod schemas"
```

---

### Task 2: Update rule-engine to depend on schemas

**Files:**
- Modify: `packages/rule-engine/package.json`
- Modify: `packages/rule-engine/src/index.ts`
- Modify: `packages/rule-engine/src/types.ts`
- Modify: `packages/rule-engine/src/schemas.ts`

- [ ] **Step 1: Add schemas dependency to rule-engine**

Update `packages/rule-engine/package.json` dependencies:
```json
{
  "dependencies": {
    "@readerx/schemas": "workspace:*",
    "@swaggerexpert/jsonpath": "^4.0.4",
    "happy-dom": "^20.9.0",
    "wicked-good-xpath": "^1.3.0",
    "zod": "^4.4.3"
  }
}
```

- [ ] **Step 2: Update rule-engine types.ts**

Add re-exports from schemas at the top of `packages/rule-engine/src/types.ts`, keeping runtime-specific types (CompiledRule, EvalContext, etc.) that don't belong in schemas:

```typescript
// Re-export domain types from @readerx/schemas
export type {
  RuleType,
  RuleRecord,
  RuleDataType,
  BookSourceType,
  SourceModuleType,
  BookSourceData,
  SourceModule,
  RuleExpression,
  RuleObjectDef,
  RuleStepDef,
  ExtractStepDef,
  TransformStepDef,
  StringTransformDef,
  DomTransformDef,
  ScriptStepDef,
  ReplaceRuleData,
  ReplaceScope,
  TxtTocRuleData,
  DictRuleData,
  DictField,
  RequestConfig as SchemaRequestConfig,
  RequestBody,
  ExploreCategory,
  ReplacePair,
} from "@readerx/schemas";

// Keep runtime-only types below (not duplicated in schemas)
// ... (RuleError, RuntimeValue, CompiledRule, EvalContext, etc.)
```

Keep all runtime types (RuleErrorCode, RuleError, RuntimeValue, CompiledRule, EvalContext, JsExecutor, DocumentCache, etc.) that are execution-specific.

Mark old types (`BookSource` with fixed modules, old `DictRule`, old `ReplaceRule`, old `TxtTocRule`) as `@deprecated` with a comment pointing to the schemas types. Do NOT delete yet to avoid breaking existing consumers.

- [ ] **Step 3: Update rule-engine schemas.ts**

Re-export schemas from `@readerx/schemas` and add a deprecation notice:

```typescript
// Re-export from @readerx/schemas — canonical source
export {
  validateReplaceRuleData,
  validateTxtTocRuleData,
  validateDictRuleData,
  validateBookSourceData,
  validateReplaceRuleFile,
  validateTxtTocRuleFile,
  validateDictRuleFile,
  validateBookSource,
  bookSourceSchema,
  replaceRuleFileSchema,
  txtTocRuleFileSchema,
  dictRuleFileSchema,
} from "@readerx/schemas";

// Keep legacy validate/parse functions for backward compat (deprecated)
// ... existing functions with @deprecated JSDoc
```

- [ ] **Step 4: Update rule-engine index.ts exports**

Add new schema type exports, mark old ones deprecated:

```typescript
// New: from schemas
export type {
  RuleRecord,
  RuleType,
  BookSourceData,
  SourceModule,
  ReplaceRuleData,
  TxtTocRuleData,
  DictRuleData,
} from "@readerx/schemas";

// Deprecated old types (still exported for transition)
/** @deprecated Use BookSourceData from @readerx/schemas */
export type { BookSource } from "./types";
```

- [ ] **Step 5: Install and verify**

Run: `pnpm install && pnpm --filter @readerx/rule-engine typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/rule-engine/
git commit -m "refactor(rule-engine): depend on @readerx/schemas, deprecate old types"
```

---

### Task 3: Refactor persistence to single rules table

**Files:**
- Modify: `packages/persistence/src/database.ts`
- Modify: `packages/persistence/src/types.ts`
- Modify: `packages/persistence/src/index.ts`
- Modify: `packages/persistence/package.json`
- Create: `packages/persistence/src/rules-repo.ts`
- Test: `packages/persistence/__tests__/rules-repo.test.ts`

- [ ] **Step 1: Add schemas dependency**

Update `packages/persistence/package.json`:
```json
{
  "dependencies": {
    "@readerx/schemas": "workspace:*",
    "dexie": "^4.4.2"
  }
}
```

- [ ] **Step 2: Update types.ts**

Add `RuleRecord` import and deprecate old types:

```typescript
// New unified storage type
export type { RuleRecord, RuleType } from "@readerx/schemas";

// Deprecated: old per-table types (kept for non-rule tables)
/** @deprecated Use RuleRecord<"replace"> with ReplaceRuleData from @readerx/schemas */
// old ReplaceRule, DictRule, TxtTocRule types remain for reference
```

- [ ] **Step 3: Update database.ts to version 3**

```typescript
import type { Table } from "dexie";
import Dexie from "dexie";
import type {
  Book,
  BookChapter,
  BookGroup,
  Bookmark,
  BookSourceRecord,
  Cache,
  Cookie,
  RuleRecord,
  RssSourceRecord,
  SearchKeyword,
} from "./types";

export const DB_NAME = "readerx";
export const DB_VERSION = 3;

export class ReaderXDB extends Dexie {
  bookSources!: Table<BookSourceRecord, string>;
  books!: Table<Book, string>;
  chapters!: Table<BookChapter, string>;
  bookGroups!: Table<BookGroup, number>;
  bookmarks!: Table<Bookmark, number>;
  searchKeywords!: Table<SearchKeyword, string>;
  caches!: Table<Cache, string>;
  cookies!: Table<Cookie, string>;
  rssSources!: Table<RssSourceRecord, string>;
  // NEW: single rules table
  rules!: Table<RuleRecord, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      bookSources: "bookSourceUrl, bookSourceName, *bookSourceGroup, enabled, enabledExplore, bookSourceType, customOrder, lastUpdateTime",
      books: "bookUrl, name, author, *groupIds, origin, durChapterTime, order",
      chapters: "[url+bookUrl], bookUrl, [bookUrl+index]",
      bookGroups: "groupId, groupName, order",
      bookmarks: "time, [bookName+bookAuthor], bookUrl",
      searchKeywords: "word, usage, lastUseTime",
      caches: "key, deadline",
      replaceRules: "++id, name, group, order, isEnabled",
      cookies: "url",
    });
    this.version(2).stores({
      replaceRules: "id, name, group, order, enabled",
      rssSources: "sourceUrl, sourceName, *sourceGroup, enabled, [sourceGroup+enabled]",
      txtTocRules: "id, name, enabled",
      dictRules: "id, name, enabled",
    }).upgrade((tx) => {
      return tx.table("replaceRules").toCollection().modify((rule) => {
        rule.id = String(rule.id);
        rule.enabled = rule.isEnabled ?? true;
        rule.createdAt = rule.createdAt ?? Date.now();
        rule.updatedAt = rule.updatedAt ?? Date.now();
        delete rule.isEnabled;
      });
    });
    // Version 3: add unified rules table, keep old tables temporarily
    this.version(3).stores({
      rules: "id, type, enabled, name, updatedAt, [type+enabled]",
      // Old tables kept but will be removed in future version
      // after migration is confirmed
    });
  }
}

export function createDB(name?: string): ReaderXDB {
  return new ReaderXDB(name);
}

export const db = createDB();
```

- [ ] **Step 4: Create RulesRepository**

`packages/persistence/src/rules-repo.ts`:
```typescript
import type { Table } from "dexie";
import type { RuleRecord, RuleType } from "@readerx/schemas";

class RulesRepository {
  private table: Table<RuleRecord, string>;

  constructor(table: Table<RuleRecord, string>) {
    this.table = table;
  }

  async getByType<T extends RuleType>(type: T): Promise<RuleRecord<T>[]> {
    return this.table.where("type").equals(type).toArray() as Promise<RuleRecord<T>[]>;
  }

  async getEnabledByType<T extends RuleType>(type: T): Promise<RuleRecord<T>[]> {
    return this.table.where("[type+enabled]").equals([type, 1]).toArray() as Promise<RuleRecord<T>[]>;
  }

  async getById(id: string): Promise<RuleRecord | undefined> {
    return this.table.get(id);
  }

  async save<T extends RuleType>(record: RuleRecord<T>): Promise<void> {
    await this.table.put(record);
  }

  async saveBatch(records: RuleRecord[]): Promise<void> {
    await this.table.bulkPut(records);
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }

  async deleteBatch(ids: string[]): Promise<void> {
    await this.table.bulkDelete(ids);
  }

  async search(type: RuleType, query: string): Promise<RuleRecord[]> {
    const all = await this.getByType(type);
    const q = query.toLowerCase();
    return all.filter((rule) => rule.name.toLowerCase().includes(q));
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    await this.table.update(id, { enabled, updatedAt: new Date().toISOString() });
  }

  async count(type?: RuleType): Promise<number> {
    if (type) {
      return this.table.where("type").equals(type).count();
    }
    return this.table.count();
  }
}

export { RulesRepository };
```

- [ ] **Step 5: Update index.ts exports**

Add to `packages/persistence/src/index.ts`:
```typescript
// New: unified rules repository
export { RulesRepository } from "./rules-repo";
```

- [ ] **Step 6: Write tests**

Create `packages/persistence/__tests__/rules-repo.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import type { RuleRecord } from "@readerx/schemas";
import { createDB } from "../src/database";
import { RulesRepository } from "../src/rules-repo";

function createTestDB() {
  return createDB(`test-${Date.now()}-${Math.random()}`);
}

function makeReplaceRule(overrides: Partial<RuleRecord<"replace">> = {}): RuleRecord<"replace"> {
  return {
    id: crypto.randomUUID(),
    type: "replace",
    name: "Test Replace Rule",
    enabled: true,
    tags: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      pattern: "\\s+",
      replacement: " ",
      flags: "g",
    },
    ...overrides,
  };
}

function makeTocRule(overrides: Partial<RuleRecord<"txt-toc">> = {}): RuleRecord<"txt-toc"> {
  return {
    id: crypto.randomUUID(),
    type: "txt-toc",
    name: "Test TOC Rule",
    enabled: true,
    tags: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      pattern: "^第.+章",
      flags: "gm",
    },
    ...overrides,
  };
}

describe("RulesRepository", () => {
  let repo: RulesRepository;

  beforeEach(() => {
    const db = createTestDB();
    repo = new RulesRepository(db.rules);
  });

  it("saves and retrieves a rule by type", async () => {
    const rule = makeReplaceRule();
    await repo.save(rule);
    const rules = await repo.getByType("replace");
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(rule.id);
    expect(rules[0].data.pattern).toBe("\\s+");
  });

  it("separates rules by type", async () => {
    await repo.save(makeReplaceRule());
    await repo.save(makeTocRule());
    const replaceRules = await repo.getByType("replace");
    const tocRules = await repo.getByType("txt-toc");
    expect(replaceRules).toHaveLength(1);
    expect(tocRules).toHaveLength(1);
  });

  it("gets enabled rules by type", async () => {
    await repo.save(makeReplaceRule({ enabled: true }));
    await repo.save(makeReplaceRule({ enabled: false, id: crypto.randomUUID() }));
    const enabled = await repo.getEnabledByType("replace");
    expect(enabled).toHaveLength(1);
  });

  it("deletes a rule", async () => {
    const rule = makeReplaceRule();
    await repo.save(rule);
    await repo.delete(rule.id);
    const rules = await repo.getByType("replace");
    expect(rules).toHaveLength(0);
  });

  it("batch saves rules", async () => {
    const rules = [makeReplaceRule(), makeReplaceRule({ id: crypto.randomUUID() })];
    await repo.saveBatch(rules);
    const all = await repo.getByType("replace");
    expect(all).toHaveLength(2);
  });

  it("batch deletes rules", async () => {
    const r1 = makeReplaceRule();
    const r2 = makeReplaceRule({ id: crypto.randomUUID() });
    await repo.saveBatch([r1, r2]);
    await repo.deleteBatch([r1.id, r2.id]);
    const all = await repo.getByType("replace");
    expect(all).toHaveLength(0);
  });

  it("searches rules by name", async () => {
    await repo.save(makeReplaceRule({ name: "Remove whitespace" }));
    await repo.save(makeReplaceRule({ name: "Fix encoding", id: crypto.randomUUID() }));
    const results = await repo.search("replace", "whitespace");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Remove whitespace");
  });

  it("toggles enabled state", async () => {
    const rule = makeReplaceRule({ enabled: true });
    await repo.save(rule);
    await repo.toggleEnabled(rule.id, false);
    const fetched = await repo.getById(rule.id);
    expect(fetched?.enabled).toBe(false);
  });

  it("counts rules by type", async () => {
    await repo.save(makeReplaceRule());
    await repo.save(makeTocRule());
    expect(await repo.count("replace")).toBe(1);
    expect(await repo.count("txt-toc")).toBe(1);
    expect(await repo.count()).toBe(2);
  });
});
```

- [ ] **Step 7: Install and run tests**

Run: `pnpm install && pnpm --filter @readerx/persistence test`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add packages/persistence/
git commit -m "feat(persistence): add unified rules table and RulesRepository"
```

---

## Phase 2: Shared UI Primitives

### Task 4: Create shared-rule-ui components

**Files:**
- Create: `apps/web/features/shared-rule-ui/index.ts`
- Create: `apps/web/features/shared-rule-ui/components/regex-editor.tsx`
- Create: `apps/web/features/shared-rule-ui/components/scope-editor.tsx`
- Create: `apps/web/features/shared-rule-ui/components/pipeline-editor.tsx`
- Create: `apps/web/features/shared-rule-ui/components/request-config-editor.tsx`
- Create: `apps/web/features/shared-rule-ui/components/tag-input.tsx`
- Create: `apps/web/features/shared-rule-ui/components/rule-import-dialog.tsx`
- Create: `apps/web/features/shared-rule-ui/components/rule-list.tsx`
- Create: `apps/web/features/shared-rule-ui/components/form-field.tsx`

> **Note:** These are hand-written UI components, not generated from schema. Each is a focused, reusable primitive.

- [ ] **Step 1: Create form-field.tsx**

A wrapper around shadcn/ui Input/Textarea/Switch/Select that provides consistent layout:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type FormFieldProps = {
  id: string;
  label: string;
  type: "text" | "textarea" | "switch" | "select";
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
  required?: boolean;
  monospace?: boolean;
  options?: readonly { label: string; value: string }[];
  className?: string;
};

function FormField({ id, label, type, value, onChange, placeholder, required, monospace, options, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {type !== "switch" && <Label htmlFor={id}>{label}</Label>}
      {type === "text" && (
        <Input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} />
      )}
      {type === "textarea" && (
        <Textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={cn(monospace && "font-mono text-xs")} />
      )}
      {type === "switch" && (
        <div className="flex items-center gap-2">
          <Switch id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} size="sm" />
          <Label htmlFor={id} className="cursor-pointer">{label}</Label>
        </div>
      )}
      {type === "select" && options && (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>
            {options.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
```

- [ ] **Step 2: Create regex-editor.tsx**

Pattern + flags + real-time test:

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type RegexEditorProps = {
  pattern: string;
  flags: string;
  literal?: boolean;
  onChange: (values: { pattern: string; flags: string; literal?: boolean }) => void;
  showLiteral?: boolean;
};

function RegexEditor({ pattern, flags, literal, onChange, showLiteral = false }: RegexEditorProps) {
  const [testInput, setTestInput] = useState("");
  const testResult = (() => {
    if (!pattern || !testInput) return null;
    try {
      const regex = new RegExp(pattern, flags);
      return regex.test(testInput);
    } catch {
      return "error";
    }
  })();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label>匹配模式</Label>
          <Input value={pattern} onChange={(e) => onChange({ pattern: e.target.value, flags, literal })} placeholder="正则表达式" className="font-mono text-xs" />
        </div>
        <div className="w-24">
          <Label>标志</Label>
          <Input value={flags} onChange={(e) => onChange({ pattern, flags: e.target.value, literal })} placeholder="g" className="font-mono text-xs" />
        </div>
      </div>
      {showLiteral && (
        <div className="flex items-center gap-2">
          <Switch checked={literal ?? false} onCheckedChange={(v) => onChange({ pattern, flags, literal: v })} size="sm" />
          <Label className="cursor-pointer">字面量匹配</Label>
        </div>
      )}
      <div>
        <Label>测试</Label>
        <Textarea value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="输入测试文本..." className="font-mono text-xs" rows={2} />
        {testResult !== null && (
          <p className={`mt-1 text-xs ${testResult === "error" ? "text-destructive" : testResult ? "text-green-500" : "text-muted-foreground"}`}>
            {testResult === "error" ? "正则语法错误" : testResult ? "✓ 匹配成功" : "✗ 不匹配"}
          </p>
        )}
      </div>
    </div>
  );
}

export { RegexEditor };
```

- [ ] **Step 3: Create scope-editor.tsx**

Include/exclude/target for replace rules:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReplaceScope } from "@readerx/schemas";

type ScopeEditorProps = {
  scope?: ReplaceScope;
  onChange: (scope: ReplaceScope | undefined) => void;
};

function ScopeEditor({ scope, onChange }: ScopeEditorProps) {
  const update = (partial: Partial<ReplaceScope>) => {
    const next = { ...scope, ...partial };
    // Clean up empty scope
    if (!next.include?.length && !next.exclude?.length && !next.target) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Label>包含书源（逗号分隔，空 = 全部）</Label>
        <Input
          value={scope?.include?.join(", ") ?? ""}
          onChange={(e) => update({ include: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined })}
          placeholder="全部书源"
        />
      </div>
      <div>
        <Label>排除书源（逗号分隔）</Label>
        <Input
          value={scope?.exclude?.join(", ") ?? ""}
          onChange={(e) => update({ exclude: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined })}
          placeholder="无排除"
        />
      </div>
      <div>
        <Label>作用目标</Label>
        <Select value={scope?.target ?? "both"} onValueChange={(v) => update({ target: v as ReplaceScope["target"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="both">正文 + 标题</SelectItem>
            <SelectItem value="content">仅正文</SelectItem>
            <SelectItem value="title">仅标题</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export { ScopeEditor };
```

- [ ] **Step 4: Create tag-input.tsx**

Simple tag input with add/remove:

```tsx
"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
};

function TagInput({ tags, onChange, label, placeholder = "添加标签后回车" }: TagInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-transparent px-3 py-2">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-xs">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={tags.length === 0 ? placeholder : ""} className="min-w-[80px] flex-1 bg-transparent text-sm outline-none" />
      </div>
    </div>
  );
}

export { TagInput };
```

- [ ] **Step 5: Create pipeline-editor.tsx, request-config-editor.tsx, rule-import-dialog.tsx, rule-list.tsx**

Follow the same pattern — focused, hand-written components. These are larger components so implement each in its own step with full JSX.

`pipeline-editor.tsx` — edit an array of RuleStepDef (extract/transform/script steps):
- Shows each step as a row with type badge + summary
- Add/remove/reorder steps
- Click step to expand inline editor

`request-config-editor.tsx` — edit RequestConfig:
- URL input (with `{{key}}` template highlight)
- Method select (GET/POST)
- Headers key-value editor
- Body editor (form/json/raw)
- Charset, timeout, retry fields

`rule-import-dialog.tsx` — import rules from JSON:
- Textarea for pasting JSON
- File upload button
- Format auto-detection via rule-engine's `tryDetectFormat`
- Preview count before import

`rule-list.tsx` — generic rule list with search/sort/batch:
- Search bar
- Scrollable list with items showing name + enabled toggle
- Batch operations toolbar (enable all, disable all, delete selected)

- [ ] **Step 6: Create index.ts barrel export**

```typescript
export { FormField } from "./components/form-field";
export type { FormFieldProps } from "./components/form-field";
export { RegexEditor } from "./components/regex-editor";
export { ScopeEditor } from "./components/scope-editor";
export { TagInput } from "./components/tag-input";
export { PipelineEditor } from "./components/pipeline-editor";
export { RequestConfigEditor } from "./components/request-config-editor";
export { RuleImportDialog } from "./components/rule-import-dialog";
export { RuleList } from "./components/rule-list";
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/shared-rule-ui/
git commit -m "feat(web): add shared rule UI primitive components"
```

---

## Phase 3: Rule Features (parallelizable)

### Task 5: Replace Rule feature

**Files:**
- Create: `apps/web/features/replace-rule/index.ts`
- Create: `apps/web/features/replace-rule/replace-rule-list-page.tsx`
- Create: `apps/web/features/replace-rule/replace-rule-editor.tsx`
- Create: `apps/web/features/replace-rule/hooks/use-replace-rules.ts`
- Modify: `apps/web/app/my/replace-rules/page.tsx`

- [ ] **Step 1: Create hooks**

`apps/web/features/replace-rule/hooks/use-replace-rules.ts`:
```typescript
"use client";

import type { RuleRecord } from "@readerx/schemas";
import { validateReplaceRuleData } from "@readerx/schemas";
import { db, RulesRepository } from "@readerx/persistence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const repo = new RulesRepository(db.rules);
const TYPE = "replace" as const;
const QUERY_KEY = ["rules", TYPE];

function useReplaceRules() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => repo.getByType(TYPE),
    staleTime: 60_000,
  });
}

function useReplaceRuleMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const save = useMutation({
    mutationFn: (record: RuleRecord<"replace">) => {
      const validation = validateReplaceRuleData(record.data);
      if (!validation.ok) throw new Error(validation.error.message);
      return repo.save(record);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: invalidate,
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      repo.toggleEnabled(id, enabled),
    onSuccess: invalidate,
  });

  const importRules = useMutation({
    mutationFn: async (records: RuleRecord<"replace">[]) => {
      // Validate all before saving
      for (const record of records) {
        const validation = validateReplaceRuleData(record.data);
        if (!validation.ok) throw new Error(`Rule "${record.name}": ${validation.error.message}`);
      }
      await repo.saveBatch(records);
    },
    onSuccess: invalidate,
  });

  return { save, remove, toggleEnabled, importRules };
}

export { useReplaceRules, useReplaceRuleMutations };
```

- [ ] **Step 2: Create replace-rule-editor.tsx**

Hand-written dialog with: name, description, RegexEditor, replacement input, replacementJs textarea, ScopeEditor, enabled switch, order input, TagInput.

- [ ] **Step 3: Create replace-rule-list-page.tsx**

Uses RuleList from shared-rule-ui + replace-rule-editor. Shows list items with pattern preview, scope badges, enabled toggle.

- [ ] **Step 4: Create index.ts**

```typescript
export { ReplaceRuleListPage } from "./replace-rule-list-page";
```

- [ ] **Step 5: Update page route**

`apps/web/app/my/replace-rules/page.tsx`:
```tsx
"use client";
import { ReplaceRuleListPage } from "@/features/replace-rule";
export default function ReplaceRulesPage() {
  return <ReplaceRuleListPage />;
}
```

- [ ] **Step 6: Verify in dev**

Run: `pnpm --filter web dev`
Navigate to `/my/replace-rules`, verify list page renders empty state.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/replace-rule/ apps/web/app/my/replace-rules/
git commit -m "feat(replace-rule): new replace rule feature with editor and list"
```

---

### Task 6: TXT TOC Rule feature

**Files:**
- Create: `apps/web/features/txt-toc-rule/index.ts`
- Create: `apps/web/features/txt-toc-rule/toc-rule-list-page.tsx`
- Create: `apps/web/features/txt-toc-rule/toc-rule-editor.tsx`
- Create: `apps/web/features/txt-toc-rule/hooks/use-toc-rules.ts`
- Modify: `apps/web/app/my/txt-rules/page.tsx`

Same structure as Task 5 but simpler (only name + description + RegexEditor + enabled + order + tags).

- [ ] **Step 1: Create hooks**

`apps/web/features/txt-toc-rule/hooks/use-toc-rules.ts`:
```typescript
"use client";

import type { RuleRecord } from "@readerx/schemas";
import { validateTxtTocRuleData } from "@readerx/schemas";
import { db, RulesRepository } from "@readerx/persistence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const repo = new RulesRepository(db.rules);
const TYPE = "txt-toc" as const;
const QUERY_KEY = ["rules", TYPE];

function useTocRules() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => repo.getByType(TYPE),
    staleTime: 60_000,
  });
}

function useTocRuleMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const save = useMutation({
    mutationFn: (record: RuleRecord<"txt-toc">) => {
      const validation = validateTxtTocRuleData(record.data);
      if (!validation.ok) throw new Error(validation.error.message);
      return repo.save(record);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: invalidate,
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      repo.toggleEnabled(id, enabled),
    onSuccess: invalidate,
  });

  const importRules = useMutation({
    mutationFn: async (records: RuleRecord<"txt-toc">[]) => {
      for (const record of records) {
        const validation = validateTxtTocRuleData(record.data);
        if (!validation.ok) throw new Error(`Rule "${record.name}": ${validation.error.message}`);
      }
      await repo.saveBatch(records);
    },
    onSuccess: invalidate,
  });

  return { save, remove, toggleEnabled, importRules };
}

export { useTocRules, useTocRuleMutations };
```

- [ ] **Step 2: Create toc-rule-editor.tsx**

Hand-written dialog with: name, description, RegexEditor (pattern + flags + test), enabled switch, order input, TagInput.

- [ ] **Step 3: Create toc-rule-list-page.tsx**

Uses RuleList + toc-rule-editor. Shows pattern preview and enabled toggle.

- [ ] **Step 4: Create index.ts and update page route**

Same pattern as replace-rule.

- [ ] **Step 5: Verify in dev**

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/txt-toc-rule/ apps/web/app/my/txt-rules/
git commit -m "feat(txt-toc-rule): new TXT TOC rule feature"
```

---

### Task 7: Dict Rule feature

**Files:**
- Create: `apps/web/features/dict-rule/index.ts`
- Create: `apps/web/features/dict-rule/dict-rule-list-page.tsx`
- Create: `apps/web/features/dict-rule/dict-rule-editor.tsx`
- Create: `apps/web/features/dict-rule/hooks/use-dict-rules.ts`
- Modify: `apps/web/app/my/dict-rules/page.tsx`

Medium complexity — adds RequestConfigEditor + PipelineEditor for fields.

- [ ] **Step 1: Create hooks**

Same pattern but with `TYPE = "dict"` and `validateDictRuleData`.

- [ ] **Step 2: Create dict-rule-editor.tsx**

Hand-written dialog with:
- name, description
- RequestConfigEditor (URL with `{{key}}` template, method, charset, headers)
- Fields section: add/remove fields, each with name input + schema select + PipelineEditor
- Variables key-value editor
- enabled switch, weight input, TagInput

- [ ] **Step 3: Create dict-rule-list-page.tsx**

- [ ] **Step 4: Create index.ts and update page route**

- [ ] **Step 5: Verify in dev**

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/dict-rule/ apps/web/app/my/dict-rules/
git commit -m "feat(dict-rule): new dict rule feature with request and pipeline editor"
```

---

### Task 8: Book Source Workspace

**Files:**
- Create: `apps/web/features/book-source/index.ts`
- Create: `apps/web/features/book-source/workspace/source-workspace.tsx`
- Create: `apps/web/features/book-source/workspace/source-list-panel.tsx`
- Create: `apps/web/features/book-source/workspace/source-editor-panel.tsx`
- Create: `apps/web/features/book-source/workspace/module-navigator.tsx`
- Create: `apps/web/features/book-source/workspace/module-editor.tsx`
- Create: `apps/web/features/book-source/workspace/preview/request-preview.tsx`
- Create: `apps/web/features/book-source/workspace/preview/result-preview.tsx`
- Create: `apps/web/features/book-source/workspace/test/rule-tester.tsx`
- Create: `apps/web/features/book-source/hooks/use-source-rules.ts`
- Create: `apps/web/features/book-source/hooks/use-source-mutations.ts`
- Modify: `apps/web/app/my/sources/page.tsx`

This is the most complex feature. Follow the VS Code/Postman-like workspace layout from the design spec.

- [ ] **Step 1: Create hooks**

`use-source-rules.ts` — query book sources from `rules` table with `type: "book-source"`.

`use-source-mutations.ts` — save/delete/toggle/import book sources, validating with `validateBookSourceData`.

- [ ] **Step 2: Create source-list-panel.tsx**

Left panel: search bar, scrollable list of book sources, import button. Each item shows name, enabled badge, weight, type badge.

- [ ] **Step 3: Create module-navigator.tsx**

Tab-like navigation for modules: shows tabs for each module in the current source's `modules[]` array, plus a "+" button to add new modules.

- [ ] **Step 4: Create module-editor.tsx**

For the selected module:
- RequestConfigEditor for request config
- Rules section: key-value pairs where key is the field name (e.g., "list", "name", "url") and value is a RuleExpression editor
- RuleExpression editor supports: string shorthand, RuleObject editor, or PipelineEditor for step arrays

- [ ] **Step 5: Create source-editor-panel.tsx**

Right panel layout:
1. Basic info section (name, type, baseUrl, urlPattern, headers, loginUrl, weight)
2. ModuleNavigator
3. ModuleEditor for selected module
4. Save button

- [ ] **Step 6: Create request-preview.tsx and result-preview.tsx**

Placeholder panels for the preview/test section. These will show the request URL (with variables expanded) and result output. For now, they display "Preview not yet implemented" with the interface layout ready.

- [ ] **Step 7: Create rule-tester.tsx**

Placeholder test panel with:
- Module type selector
- Variable inputs (keyword, page, etc.)
- "Run Test" button (disabled, shows "Runtime not yet implemented")
- Result display area

- [ ] **Step 8: Create source-workspace.tsx**

Main layout component combining all panels:

```tsx
// Desktop: side-by-side panels
// Mobile: stacked with navigation
// Uses useMediaQuery or CSS responsive for layout switch
```

- [ ] **Step 9: Create index.ts and update page route**

`apps/web/app/my/sources/page.tsx`:
```tsx
"use client";
import { SourceWorkspace } from "@/features/book-source";
export default function SourcesPage() {
  return (
    <div className="-mx-4 -mt-11 md:-mx-6 lg:-mx-8">
      <SourceWorkspace />
    </div>
  );
}
```

- [ ] **Step 10: Verify in dev**

Run: `pnpm --filter web dev`
Navigate to `/my/sources`, verify workspace renders with empty state.

- [ ] **Step 11: Commit**

```bash
git add apps/web/features/book-source/ apps/web/app/my/sources/
git commit -m "feat(book-source): new book source workspace with module editor"
```

---

## Phase 4: Runtime Interfaces

### Task 9: DAG IR types and runtime interfaces

**Files:**
- Create: `packages/rule-engine/src/ir/types.ts`
- Create: `packages/rule-engine/src/compiler/interface.ts`
- Create: `packages/rule-engine/src/executor/interface.ts`
- Create: `packages/rule-engine/src/cache/interface.ts`
- Create: `packages/reader-engine/src/source-service.ts`
- Create: `packages/infrastructure/src/fetcher.ts`
- Modify: `packages/rule-engine/src/index.ts`

- [ ] **Step 1: Create DAG IR types**

`packages/rule-engine/src/ir/types.ts`:
```typescript
/** DAG Execution Plan — intermediate representation */

type ExecutionPlan = {
  nodes: Record<string, ExecutionNode>;
  entry: string;
  sourceHash: string;
  createdAt: number;
};

type ExecutionNode =
  | RequestNode
  | ExtractNode
  | TransformNode
  | ScriptNode
  | BranchNode
  | MergeNode;

type RequestNode = {
  type: "request";
  id: string;
  depends: string[];
  config: import("@readerx/schemas").RequestConfig;
};

type ExtractNode = {
  type: "extract";
  id: string;
  depends: string[];
  engine: "css" | "xpath" | "jsonpath" | "regex";
  selector: string;
  output?: "text" | "html" | "outerHtml" | "attr";
  attr?: string;
};

type TransformNode = {
  type: "transform";
  id: string;
  depends: string[];
  action: "replace" | "match" | "split" | "template" | "trim" | "remove" | "unwrap" | "strip";
  params: Record<string, unknown>;
};

type ScriptNode = {
  type: "script";
  id: string;
  depends: string[];
  code: string;
};

type BranchNode = {
  type: "branch";
  id: string;
  depends: string[];
  condition: string;
  then: string;
  else: string;
};

type MergeNode = {
  type: "merge";
  id: string;
  depends: string[];
  strategy: "concat" | "first" | "zip";
};

// ---- Execution Context ----

type ExecutionContext = {
  variables: Record<string, unknown>;
  previousResult?: unknown;
  source: import("@readerx/schemas").RuleRecord;
  runtime: RuntimeAPI;
};

type RuntimeAPI = {
  log: (message: string) => void;
  cache: {
    get: (key: string) => Promise<unknown | undefined>;
    set: (key: string, value: unknown, ttl?: number) => Promise<void>;
  };
};

type ExecutionResult = {
  success: boolean;
  data: unknown;
  nodeResults?: Record<string, unknown>;
  error?: string;
};

export type {
  ExecutionPlan,
  ExecutionNode,
  RequestNode,
  ExtractNode,
  TransformNode,
  ScriptNode,
  BranchNode,
  MergeNode,
  ExecutionContext,
  RuntimeAPI,
  ExecutionResult,
};
```

- [ ] **Step 2: Create compiler interface**

`packages/rule-engine/src/compiler/interface.ts`:
```typescript
import type { BookSourceData, DictRuleData, ReplaceRuleData, TxtTocRuleData, SourceModuleType } from "@readerx/schemas";
import type { ExecutionPlan } from "../ir/types";

interface RuleCompiler {
  compileModule(source: BookSourceData, moduleType: SourceModuleType): ExecutionPlan;
  compileReplaceRules(rules: ReplaceRuleData[]): ExecutionPlan;
  compileTocRules(rules: TxtTocRuleData[]): ExecutionPlan;
  compileDictRule(rule: DictRuleData): ExecutionPlan;
}

export type { RuleCompiler };
```

- [ ] **Step 3: Create executor interface**

`packages/rule-engine/src/executor/interface.ts`:
```typescript
import type { ExecutionPlan, ExecutionContext, ExecutionResult } from "../ir/types";

interface Executor {
  execute(plan: ExecutionPlan, context: ExecutionContext): Promise<ExecutionResult>;
}

export type { Executor };
```

- [ ] **Step 4: Create cache interface**

`packages/rule-engine/src/cache/interface.ts`:
```typescript
import type { ExecutionPlan } from "../ir/types";

type CompiledRule = {
  sourceHash: string;
  plan: ExecutionPlan;
  createdAt: number;
};

interface CompileCache {
  get(sourceHash: string): CompiledRule | undefined;
  set(sourceHash: string, plan: ExecutionPlan): void;
  invalidate(sourceId: string): void;
}

export type { CompiledRule, CompileCache };
```

- [ ] **Step 5: Create SourceService interface**

`packages/reader-engine/src/source-service.ts`:
```typescript
import type { SourceModuleType, RuleRecord } from "@readerx/schemas";
import type { ExecutionContext, ExecutionResult } from "@readerx/rule-engine";

interface SourceService {
  execute(
    sourceId: string,
    moduleType: SourceModuleType,
    context: Partial<ExecutionContext>,
  ): Promise<ExecutionResult>;
}

export type { SourceService };
```

- [ ] **Step 6: Create Fetcher interface**

`packages/infrastructure/src/fetcher.ts`:
```typescript
import type { RequestConfig } from "@readerx/schemas";

type FetcherResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
  dom?: () => Document;
  json?: () => unknown;
};

interface Fetcher {
  fetch(request: RequestConfig): Promise<FetcherResponse>;
}

export type { Fetcher, FetcherResponse };
```

- [ ] **Step 7: Update rule-engine index.ts**

Add new exports:
```typescript
// DAG IR types
export type {
  ExecutionPlan, ExecutionNode, RequestNode, ExtractNode,
  TransformNode, ScriptNode, BranchNode, MergeNode,
  ExecutionContext, RuntimeAPI, ExecutionResult,
} from "./ir/types";

// Runtime interfaces
export type { RuleCompiler } from "./compiler/interface";
export type { Executor } from "./executor/interface";
export type { CompiledRule, CompileCache } from "./cache/interface";
```

- [ ] **Step 8: Update infrastructure index.ts**

Add Fetcher export:
```typescript
export type { Fetcher, FetcherResponse } from "./fetcher";
```

- [ ] **Step 9: Typecheck all packages**

Run: `pnpm --filter @readerx/rule-engine typecheck && pnpm --filter @readerx/infrastructure typecheck && pnpm --filter @readerx/reader-engine typecheck`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add packages/rule-engine/src/ir/ packages/rule-engine/src/compiler/ packages/rule-engine/src/executor/ packages/rule-engine/src/cache/ packages/rule-engine/src/index.ts packages/reader-engine/src/source-service.ts packages/infrastructure/src/fetcher.ts packages/infrastructure/src/index.ts
git commit -m "feat(runtime): add DAG IR types and runtime interfaces (RuleCompiler, Executor, Fetcher, SourceService)"
```

---

## Phase 5: Cleanup

### Task 10: Remove deprecated features and update architecture docs

**Files:**
- Delete: `apps/web/features/simple-rule-manager/`
- Delete: `apps/web/features/replace-rule-manager/`
- Delete: `apps/web/features/dict-rule-manager/`
- Delete: `apps/web/features/txt-rule-manager/`
- Delete: `apps/web/features/source-manager/`
- Delete: `packages/persistence/src/replace-rule-repo.ts`
- Delete: `packages/persistence/src/dict-rule-repo.ts`
- Delete: `packages/persistence/src/txt-toc-rule-repo.ts`
- Modify: `.claude/rules/architecture.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Delete old features**

```bash
rm -rf apps/web/features/simple-rule-manager/
rm -rf apps/web/features/replace-rule-manager/
rm -rf apps/web/features/dict-rule-manager/
rm -rf apps/web/features/txt-rule-manager/
rm -rf apps/web/features/source-manager/
rm packages/persistence/src/replace-rule-repo.ts
rm packages/persistence/src/dict-rule-repo.ts
rm packages/persistence/src/txt-toc-rule-repo.ts
```

- [ ] **Step 2: Update persistence index.ts**

Remove exports for deleted repos:
```typescript
// Remove: ReplaceRuleRepository, DictRuleRepository, TxtTocRuleRepository
// Keep: RulesRepository, BookSourceRepository, etc.
```

- [ ] **Step 3: Update architecture.md**

Add schemas to the package dependency table:
```markdown
| schemas | 类型层 | 零内部依赖（仅 zod） |
| persistence | 数据层 | schemas, infrastructure |
| rule-engine | 领域引擎 | schemas, infrastructure |
```

- [ ] **Step 4: Update roadmap.md**

Update module status for rule management.

- [ ] **Step 5: Full typecheck**

Run: `turbo typecheck`
Expected: No errors

- [ ] **Step 6: Full lint**

Run: `turbo lint`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove deprecated rule features, update architecture docs"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Task |
|---|---|
| 2. 包架构 | Task 1 (schemas), Task 2 (rule-engine update), Task 3 (persistence) |
| 3. Schemas 包 | Task 1 (types + Zod) |
| 4. Persistence 层 | Task 3 (single table + RulesRepository) |
| 5. 运行时接口 | Task 9 (DAG IR + interfaces) |
| 6. UI 架构 | Tasks 4-8 (shared UI + 4 features) |
| 7. 数据流 | Covered by hooks in Tasks 5-8 |
| 8. 测试策略 | Covered by test steps in Tasks 1, 3 |
| 9. 实施优先级 | Phase order matches |

### Placeholder Scan

No TBD/TODO found. All steps contain code or precise instructions.

### Type Consistency

- `RuleRecord` defined in `@readerx/schemas/src/types.ts` → used in `RulesRepository`, all hooks
- `RuleType` discriminator: `"replace"`, `"txt-toc"`, `"dict"`, `"book-source"` → consistent across all files
- `ExecutionPlan` DAG IR → defined in `ir/types.ts` → referenced in compiler/executor interfaces
- `RequestConfig` in schemas → used in SourceModule, DictRuleData, Fetcher interface
