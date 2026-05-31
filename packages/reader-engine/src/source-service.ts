/**
 * SourceService interface — high-level rule execution entry point.
 *
 * Orchestrates compilation + execution for a given source and module type.
 * Implementation will reside in reader-engine; this file provides the
 * contract only.
 */

import type { ExecutionContext, ExecutionResult } from "@readerx/rule-engine";
import type { SourceModuleType } from "@readerx/schemas";

interface SourceService {
	execute(
		sourceId: string,
		moduleType: SourceModuleType,
		context: Partial<ExecutionContext>,
	): Promise<ExecutionResult>;
}

export type { SourceService };
