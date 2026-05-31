/**
 * CompileCache interface — caches compiled ExecutionPlans by source hash.
 *
 * Named CachedCompiledPlan to avoid collision with the legacy CompiledRule
 * type in ../types.ts.
 */

import type { ExecutionPlan } from "../ir/types";

type CachedCompiledPlan = {
	readonly sourceHash: string;
	readonly plan: ExecutionPlan;
	readonly createdAt: number;
};

interface CompileCache {
	get(sourceHash: string): CachedCompiledPlan | undefined;
	set(sourceHash: string, plan: ExecutionPlan): void;
	invalidate(sourceId: string): void;
}

export type { CachedCompiledPlan, CompileCache };
