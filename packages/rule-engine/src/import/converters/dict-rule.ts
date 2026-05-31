import type { DictRule, DictRuleFile, RuleStep, ScriptStep } from "../../types";
import { parseLegadoRule } from "../parser";
import { createReport } from "../report";
import type {
	ConversionResult,
	ImportedResult,
	LegadoDictRule,
} from "../types";

const SCHEMA_ID = "readerx/dict-rule/v1" as const;

export function convertLegadoDictRules(
	rules: readonly LegadoDictRule[],
): ImportedResult<DictRuleFile> {
	const convertedResults: ConversionResult[] = [];
	const convertedRules: DictRule[] = [];

	for (const rule of rules) {
		const name = rule.name ?? "";
		const url = rule.urlRule ?? "";

		// Convert showRule to pipeline
		const showRule = rule.showRule;
		let fields: DictRule["fields"] | undefined;
		let conversionResult: ConversionResult;

		if (showRule && showRule !== "") {
			conversionResult = parseLegadoRule(showRule);

			if (
				conversionResult.legacyScript &&
				(!conversionResult.steps || conversionResult.steps.length === 0)
			) {
				// Legacy script → wrap as ScriptStep
				const scriptStep: ScriptStep = {
					type: "script",
					code: conversionResult.legacyScript,
				};
				fields = {
					definition: {
						pipeline: [scriptStep],
					},
				};
			} else if (conversionResult.steps && conversionResult.steps.length > 0) {
				// Structured steps → use as pipeline directly
				fields = {
					definition: {
						pipeline: conversionResult.steps as readonly RuleStep[],
					},
				};
			} else {
				// Empty steps from parser
				conversionResult = { steps: [], unsupported: [] };
			}
		} else {
			// No showRule → no fields
			conversionResult = { steps: [], unsupported: [] };
		}

		convertedResults.push(conversionResult);

		const dictRule: DictRule = {
			id: name,
			name,
			enabled: rule.enabled ?? true,
			request: {
				url,
			},
			...(rule.sortNumber !== undefined && { weight: rule.sortNumber }),
			...(fields && { fields }),
		};

		convertedRules.push(dictRule);
	}

	const report = createReport(convertedResults);

	return {
		data: {
			$schema: SCHEMA_ID,
			rules: convertedRules,
		},
		report,
		warnings: [],
	};
}
