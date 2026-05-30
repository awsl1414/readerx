import type { BookSourceRecord } from "@readerx/persistence";
import { useMemo } from "react";
import { analyzeCapabilities } from "../lib/capability-analyzer";
import type { SourceCapabilities } from "../types";

function useSourceCapabilities(
	source: BookSourceRecord | null | undefined,
): SourceCapabilities {
	return useMemo(() => analyzeCapabilities(source ?? {}), [source]);
}

export { useSourceCapabilities };
