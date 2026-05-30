"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useSimpleRuleMutations,
	useSimpleRules,
} from "../hooks/use-simple-rules";
import type { RuleManagerConfig } from "../types";
import { RuleEditDialog } from "./rule-edit-dialog";
import { RuleEmptyState } from "./rule-empty-state";
import { RuleListItem } from "./rule-list-item";

type RuleListPageProps<T extends { id: string }> = {
	readonly config: RuleManagerConfig<T>;
};

function RuleListPage<T extends { id: string }>({
	config,
}: RuleListPageProps<T>) {
	const t = useTranslations(config.i18nNamespace);
	const tCommon = useTranslations("common");

	const { data: rules = [], isLoading } = useSimpleRules(config);
	const { save, remove, toggleEnabled } = useSimpleRuleMutations(config);

	const [searchQuery, setSearchQuery] = useState("");
	const [editRuleId, setEditRuleId] = useState<string | null>(null);

	const filteredRules = useMemo(() => {
		if (!searchQuery.trim()) return rules;
		const query = searchQuery.toLowerCase();
		return rules.filter((rule) => {
			const record = rule as Record<string, unknown>;
			return Object.values(record).some(
				(val) => typeof val === "string" && val.toLowerCase().includes(query),
			);
		});
	}, [rules, searchQuery]);

	const editingRule = editRuleId
		? (rules.find((r) => r.id === editRuleId) ?? null)
		: null;
	const isNew = editRuleId !== null && !rules.some((r) => r.id === editRuleId);

	const handleAdd = () => {
		setEditRuleId(crypto.randomUUID());
	};

	const handleSave = (rule: T) => {
		save.mutate(rule, {
			onSuccess: () => {
				toast.success(t("saved"));
				setEditRuleId(null);
			},
		});
	};

	const handleDelete = (id: string) => {
		remove.mutate(id, {
			onSuccess: () => {
				toast.success(t("deleted"));
				setEditRuleId(null);
			},
		});
	};

	const handleToggle = (id: string, enabled: boolean) => {
		toggleEnabled.mutate({ id, enabled });
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3">
				<h1 className="text-foreground text-base font-medium">{t("title")}</h1>
				<Button size="sm" onClick={handleAdd}>
					<PlusIcon />
					{t("addRule")}
				</Button>
			</div>

			{/* Search */}
			{rules.length > 0 && (
				<div className="px-4 pb-3">
					<div className="relative">
						<SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t("searchPlaceholder")}
							className="pl-8"
						/>
					</div>
				</div>
			)}

			{/* List */}
			<ScrollArea className="flex-1">
				{rules.length === 0 ? (
					<RuleEmptyState
						onAdd={handleAdd}
						i18nNamespace={config.i18nNamespace}
					/>
				) : filteredRules.length === 0 ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-muted-foreground text-sm">{t("noRulesFound")}</p>
					</div>
				) : (
					<div className="divide-y divide-border">
						{filteredRules.map((rule) => (
							<RuleListItem
								key={rule.id}
								rule={rule}
								onEdit={setEditRuleId}
								onToggle={handleToggle}
								config={config}
							/>
						))}
					</div>
				)}
			</ScrollArea>

			{/* Edit Dialog */}
			<RuleEditDialog
				rule={isNew ? null : editingRule}
				config={config}
				open={editRuleId !== null}
				onOpenChange={(open) => {
					if (!open) setEditRuleId(null);
				}}
				onSave={handleSave}
				onDelete={handleDelete}
			/>
		</div>
	);
}

export { RuleListPage };
