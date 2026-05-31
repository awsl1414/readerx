/**
 * RuleCompiler interface — compiles rule data into ExecutionPlan DAGs.
 */

import type {
	BookSourceData,
	DictRuleData,
	ReplaceRuleData,
	SourceModuleType,
	TxtTocRuleData,
} from "@readerx/schemas";
import type { ExecutionPlan } from "../ir/types";

interface RuleCompiler {
	compileModule(source: BookSourceData, moduleType: SourceModuleType): ExecutionPlan;
	compileReplaceRules(rules: readonly ReplaceRuleData[]): ExecutionPlan;
	compileTocRules(rules: readonly TxtTocRuleData[]): ExecutionPlan;
	compileDictRule(rule: DictRuleData): ExecutionPlan;
}

export type { RuleCompiler };
