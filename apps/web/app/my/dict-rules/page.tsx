"use client";

import { RuleListPage } from "@/features/simple-rule-manager";
import { dictRuleConfig } from "@/features/dict-rule-manager";

export default function DictRulesPage() {
	return <RuleListPage config={dictRuleConfig} />;
}
