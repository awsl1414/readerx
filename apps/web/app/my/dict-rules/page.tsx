"use client";

import { dictRuleConfig } from "@/features/dict-rule-manager";
import { RuleListPage } from "@/features/simple-rule-manager";

export default function DictRulesPage() {
	return <RuleListPage config={dictRuleConfig} />;
}
