"use client";

import type { ReplaceRule } from "@readerx/persistence";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type ReplaceRuleListItemProps = {
	readonly rule: ReplaceRule;
	readonly onEdit: (id: string) => void;
	readonly onToggle: (id: string, enabled: boolean) => void;
};

function ReplaceRuleListItem({
	rule,
	onEdit,
	onToggle,
}: ReplaceRuleListItemProps) {
	const t = useTranslations("replaceRules");

	return (
		<button
			type="button"
			className="flex w-full items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-left"
			onClick={() => onEdit(rule.id)}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p className="text-foreground truncate text-sm font-medium">
						{rule.name || rule.pattern}
					</p>
					{rule.group && (
						<Badge
							variant="outline"
							className="text-muted-foreground shrink-0 text-xs"
						>
							{rule.group}
						</Badge>
					)}
					<Badge
						variant={rule.isRegex ? "default" : "secondary"}
						className="shrink-0 text-xs"
					>
						{rule.isRegex ? t("regexBadge") : t("literalBadge")}
					</Badge>
					{rule.scopeTitle && (
						<Badge variant="outline" className="shrink-0 text-xs">
							{t("titleScope")}
						</Badge>
					)}
					{rule.scopeContent && (
						<Badge variant="outline" className="shrink-0 text-xs">
							{t("contentScope")}
						</Badge>
					)}
				</div>
				<p className="text-muted-foreground truncate text-xs mt-0.5 font-mono">
					{rule.pattern}
				</p>
			</div>

			<Switch
				checked={rule.enabled}
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

export { ReplaceRuleListItem };
