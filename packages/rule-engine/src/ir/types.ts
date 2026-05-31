/**
 * DAG IR types — execution plan nodes and runtime context.
 *
 * These types define the intermediate representation (IR) used by the
 * compiler-to-executor pipeline. The compiler produces an ExecutionPlan
 * (a DAG of typed nodes); the executor walks the DAG in dependency order.
 */

import type {
	RequestConfig,
	RuleRecord,
} from "@readerx/schemas";

type ExecutionPlan = {
	readonly nodes: Readonly<Record<string, ExecutionNode>>;
	readonly entry: string;
	readonly sourceHash: string;
	readonly createdAt: number;
};

type ExecutionNode =
	| RequestNode
	| ExtractNode
	| TransformNode
	| ScriptNode
	| BranchNode
	| MergeNode;

type RequestNode = {
	readonly type: "request";
	readonly id: string;
	readonly depends: readonly string[];
	readonly config: RequestConfig;
};

type ExtractNode = {
	readonly type: "extract";
	readonly id: string;
	readonly depends: readonly string[];
	readonly engine: "css" | "xpath" | "jsonpath" | "regex";
	readonly selector: string;
	readonly output?: "text" | "html" | "outerHtml" | "attr";
	readonly attr?: string;
};

type TransformNode = {
	readonly type: "transform";
	readonly id: string;
	readonly depends: readonly string[];
	readonly action: "replace" | "match" | "split" | "template" | "trim" | "remove" | "unwrap" | "strip";
	readonly params: Readonly<Record<string, unknown>>;
};

type ScriptNode = {
	readonly type: "script";
	readonly id: string;
	readonly depends: readonly string[];
	readonly code: string;
};

type BranchNode = {
	readonly type: "branch";
	readonly id: string;
	readonly depends: readonly string[];
	readonly condition: string;
	readonly then: string;
	readonly else: string;
};

type MergeNode = {
	readonly type: "merge";
	readonly id: string;
	readonly depends: readonly string[];
	readonly strategy: "concat" | "first" | "zip";
};

type ExecutionContext = {
	readonly variables: Readonly<Record<string, unknown>>;
	readonly previousResult?: unknown;
	readonly source: RuleRecord;
	readonly runtime: RuntimeAPI;
};

type RuntimeAPI = {
	readonly log: (message: string) => void;
	readonly cache: {
		readonly get: (key: string) => Promise<unknown | undefined>;
		readonly set: (key: string, value: unknown, ttl?: number) => Promise<void>;
	};
};

type ExecutionResult = {
	readonly success: boolean;
	readonly data: unknown;
	readonly nodeResults?: Readonly<Record<string, unknown>>;
	readonly error?: string;
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
