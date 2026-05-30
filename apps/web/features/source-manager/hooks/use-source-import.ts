// features/source-manager/hooks/use-source-import.ts

import type { BookSourceRecord } from "@readerx/persistence";
import { parseBookSource } from "@readerx/rule-engine";
import { analyzeCapabilities } from "../lib/capability-analyzer";
import type { ImportResult } from "../types";

type RawSource = Record<string, unknown>;

function classifySource(raw: RawSource): {
	record: BookSourceRecord;
	compatWarnings: string[];
} | null {
	const parsed = parseBookSource(raw);
	if (!parsed.success) return null;

	const source = parsed.data;
	const caps = analyzeCapabilities(source as Record<string, unknown>);

	const compatWarnings: string[] = [];
	if (caps.usesJs) compatWarnings.push("Uses JS runtime");
	if (caps.usesCookieJar) compatWarnings.push("Uses Cookie Jar");
	if (caps.usesWebView)
		compatWarnings.push("Requires WebView (unsupported on Web)");
	if (caps.usesJavaApi)
		compatWarnings.push("Uses Java API (partial support on Web)");

	return {
		record: source as BookSourceRecord,
		compatWarnings,
	};
}

function importSources(rawSources: RawSource[]): ImportResult {
	const success: ImportResult["success"] = [];
	const warnings: ImportResult["warnings"] = [];
	const failures: ImportResult["failures"] = [];

	for (const raw of rawSources) {
		const classified = classifySource(raw);
		if (!classified) {
			const parsed = parseBookSource(raw);
			failures.push({
				raw,
				reasons: parsed.success
					? ["Unknown validation error"]
					: parsed.errors.issues.map(
							(i) => `${i.path.join(".")}: ${i.message}`,
						),
			});
			continue;
		}

		success.push(classified.record);

		if (classified.compatWarnings.length > 0) {
			warnings.push({
				source: classified.record,
				reasons: classified.compatWarnings,
			});
		}
	}

	return { success, warnings, failures };
}

export { importSources };
