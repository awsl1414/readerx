import type { DictRule } from "@readerx/persistence";
import { DictRuleRepository, db } from "@readerx/persistence";
import type { RuleManagerConfig } from "@/features/simple-rule-manager";

const dictRuleConfig: RuleManagerConfig<DictRule> = {
	i18nNamespace: "dictRules",
	queryKeyPrefix: "dictRules",
	createRepository: () => new DictRuleRepository(db.dictRules),
	fields: [
		{ key: "name", labelKey: "fieldName", type: "text", required: true },
		{
			key: "urlRule",
			labelKey: "fieldUrlRule",
			type: "textarea",
			monospace: true,
		},
		{
			key: "showRule",
			labelKey: "fieldShowRule",
			type: "textarea",
			monospace: true,
		},
	],
	defaultValue: { name: "", enabled: true },
	importParser: (raw) => {
		const parsed: unknown = JSON.parse(raw);
		const items = Array.isArray(parsed) ? parsed : [parsed];
		return items.map((item: unknown) => {
			const record = item as Record<string, unknown>;
			const result: DictRule = {
				id: crypto.randomUUID(),
				name: (record.name as string) ?? "",
				enabled: true,
			};
			if (typeof record.urlRule === "string") result.urlRule = record.urlRule;
			if (typeof record.showRule === "string")
				result.showRule = record.showRule;
			return result;
		});
	},
};

export { dictRuleConfig };
