// features/source-manager/lib/pipeline-runner.ts

import type {
	DebugLog,
	DebugStageResult,
	NetworkRequest,
} from "../types";

type PipelineContext = {
	readonly testUrl: string;
	readonly source: Record<string, unknown>;
	readonly executeRule: (
		rule: string,
		content: string,
		options?: { baseUrl?: string },
	) => Promise<{
		ok: boolean;
		value: string | string[];
		error?: string;
	}>;
	readonly fetchHtml: (
		url: string,
		options?: { headers?: Record<string, string> },
	) => Promise<{ ok: boolean; status: number; body: string }>;
	readonly signal?: AbortSignal;
};

type PipelineResult = {
	readonly stages: readonly DebugStageResult[];
	readonly networkRequests: readonly NetworkRequest[];
	readonly logs: readonly DebugLog[];
};

/** Run the full source debug pipeline (search -> bookInfo -> toc -> content). */
async function runPipeline(
	_ctx: PipelineContext,
): Promise<PipelineResult> {
	const stages: DebugStageResult[] = [];
	const networkRequests: NetworkRequest[] = [];
	const logs: DebugLog[] = [];

	return { stages, networkRequests, logs };
}

export type { PipelineContext, PipelineResult };
export { runPipeline };
