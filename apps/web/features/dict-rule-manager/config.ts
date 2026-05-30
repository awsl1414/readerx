import { DictRuleRepository, db } from "@readerx/persistence";
import type { RuleManagerConfig } from "@/features/simple-rule-manager";
import type { DictRule } from "@readerx/persistence";

const dictRuleConfig: RuleManagerConfig<DictRule> = {
	i18nNamespace: "dictRules",
	queryKeyPrefix: "dictRules",
	createRepository: () => new DictRuleRepository(db.dictRules),
	fields: [
		{ key: "name", labelKey: "fieldName", type: "text", required: true },
		{ key: "urlRule", labelKey: "fieldUrlRule", type: "textarea", monospace: true },
		{ key: "showRule", labelKey: "fieldShowRule", type: "textarea", monospace: true },
	],
	defaultValue: { name: "", enabled: true },
	importParser: (raw) => {
		const parsed: unknown = JSON.parse(raw);
		const items = Array.isArray(parsed) ? parsed : [parsed];
		return items.map((item: unknown) => ({
			id: crypto.randomUUID(),
			name: (item as Record<string, unknown>).name as string ?? "",
			urlRule: (item as Record<string, unknown>).urlRule as string | undefined,
			showRule: (item as Record<string, unknown>).showRule as string | undefined,
			enabled: true,
		}));
	},
};

export { dictRuleConfig };
