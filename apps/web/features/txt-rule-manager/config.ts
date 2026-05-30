import { TxtTocRuleRepository, db } from "@readerx/persistence";
import type { RuleManagerConfig } from "@/features/simple-rule-manager";
import type { TxtTocRule } from "@readerx/persistence";

const txtRuleConfig: RuleManagerConfig<TxtTocRule> = {
	i18nNamespace: "txtRules",
	queryKeyPrefix: "txtRules",
	createRepository: () => new TxtTocRuleRepository(db.txtTocRules),
	fields: [
		{ key: "name", labelKey: "fieldName", type: "text", required: true },
		{ key: "rule", labelKey: "fieldRule", type: "textarea", required: true, monospace: true },
	],
	defaultValue: { name: "", rule: "", enabled: true },
	importParser: (raw) => {
		const parsed: unknown = JSON.parse(raw);
		const items = Array.isArray(parsed) ? parsed : [parsed];
		return items.map((item: unknown) => ({
			id: crypto.randomUUID(),
			name: (item as Record<string, unknown>).name as string ?? "",
			rule: (item as Record<string, unknown>).rule as string ?? "",
			enabled: true,
		}));
	},
};

export { txtRuleConfig };
