"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { RuleManagerConfig } from "../types";

type RuleListItemProps<T extends { id: string }> = {
	readonly rule: T;
	readonly onEdit: (id: string) => void;
	readonly onToggle: (id: string, enabled: boolean) => void;
	readonly config: RuleManagerConfig<T>;
};

function RuleListItem<T extends { id: string }>({
	rule,
	onEdit,
	onToggle,
	config,
}: RuleListItemProps<T>) {
	const t = useTranslations(config.i18nNamespace);
	const nameField = config.fields.find((f) => f.key === "name");
	const displayName = nameField
		? String((rule as Record<string, unknown>)[nameField.key] ?? "")
		: rule.id;

	const isEnabled = "enabled" in rule ? Boolean(rule.enabled) : true;

	return (
		<button
			type="button"
			className="flex w-full items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-left"
			onClick={() => onEdit(rule.id)}
		>
			<div className="min-w-0 flex-1">
				<p className="text-foreground truncate text-sm font-medium">
					{displayName}
				</p>
			</div>

			{!isEnabled && (
				<Badge variant="outline" className="text-muted-foreground shrink-0">
					{t("disabledBadge")}
				</Badge>
			)}

			<Switch
				checked={isEnabled}
				onCheckedChange={(checked: boolean) => {
					onToggle(rule.id, checked);
				}}
				onClick={(e: React.MouseEvent) => e.stopPropagation()}
				size="sm"
				aria-label="Toggle enabled"
				className="shrink-0"
			/>
		</button>
	);
}

export { RuleListItem };
