/**
 * Executor interface — walks an ExecutionPlan DAG and produces results.
 */

import type {
	ExecutionContext,
	ExecutionPlan,
	ExecutionResult,
} from "../ir/types";

interface Executor {
	execute(
		plan: ExecutionPlan,
		context: ExecutionContext,
	): Promise<ExecutionResult>;
}

export type { Executor };
