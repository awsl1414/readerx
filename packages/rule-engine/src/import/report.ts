import type { ConversionReport, ConversionResult } from "./types";

export function createReport(results: readonly ConversionResult[]): ConversionReport {
	let convertedRules = 0;
	let partialConvertedRules = 0;
	let scriptFallbackRules = 0;
	const featureSet = new Set<string>();

	for (const result of results) {
		if (result.unsupported.length === 0 && result.steps && !result.legacyScript) {
			convertedRules++;
		} else if (result.legacyScript && (!result.steps || result.steps.length === 0)) {
			scriptFallbackRules++;
		} else {
			partialConvertedRules++;
		}

		for (const feature of result.unsupported) {
			featureSet.add(feature);
		}
	}

	return {
		totalRules: results.length,
		convertedRules,
		partialConvertedRules,
		scriptFallbackRules,
		unsupportedFeatures: [...featureSet],
	};
}

export function mergeReports(reports: readonly ConversionReport[]): ConversionReport {
	let totalRules = 0;
	let convertedRules = 0;
	let partialConvertedRules = 0;
	let scriptFallbackRules = 0;
	const featureSet = new Set<string>();

	for (const report of reports) {
		totalRules += report.totalRules;
		convertedRules += report.convertedRules;
		partialConvertedRules += report.partialConvertedRules;
		scriptFallbackRules += report.scriptFallbackRules;
		for (const feature of report.unsupportedFeatures) {
			featureSet.add(feature);
		}
	}

	return {
		totalRules,
		convertedRules,
		partialConvertedRules,
		scriptFallbackRules,
		unsupportedFeatures: [...featureSet],
	};
}
