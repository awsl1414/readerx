"use client";

import { RuleListPage } from "@/features/simple-rule-manager";
import { txtRuleConfig } from "@/features/txt-rule-manager";

export default function TxtRulesPage() {
	return <RuleListPage config={txtRuleConfig} />;
}
