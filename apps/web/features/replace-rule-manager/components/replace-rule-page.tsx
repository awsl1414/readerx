"use client";

import type { ReplaceRule } from "@readerx/persistence";
import { FileTextIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useReplaceRuleMutations,
	useReplaceRules,
} from "../hooks/use-replace-rules";
import { ReplaceRuleEditDialog } from "./replace-rule-edit-dialog";
import { ReplaceRuleListItem } from "./replace-rule-list-item";

function ReplaceRulePage() {
	const t = useTranslations("replaceRules");
	const tCommon = useTranslations("common");

	const { data: rules = [], isLoading } = useReplaceRules();
	const { save, remove, toggleEnabled } = useReplaceRuleMutations();

	const [searchQuery, setSearchQuery] = useState("");
	const [editRuleId, setEditRuleId] = useState<string | null>(null);

	const filteredRules = useMemo(() => {
		if (!searchQuery.trim()) return rules;
		const query = searchQuery.toLowerCase();
		return rules.filter((rule) => {
			const nameMatch = rule.name.toLowerCase().includes(query);
			const groupMatch = (rule.group ?? "").toLowerCase().includes(query);
			const patternMatch = rule.pattern.toLowerCase().includes(query);
			return nameMatch || groupMatch || patternMatch;
		});
	}, [rules, searchQuery]);

	const editingRule = editRuleId
		? (rules.find((r) => r.id === editRuleId) ?? null)
		: null;
	const isNew = editRuleId !== null && !rules.some((r) => r.id === editRuleId);

	const handleAdd = () => {
		setEditRuleId(crypto.randomUUID());
	};

	const handleSave = (rule: ReplaceRule) => {
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
					<div className="flex flex-col items-center justify-center px-6 py-12 text-center">
						<div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
							<FileTextIcon className="text-muted-foreground size-6" />
						</div>
						<p className="text-foreground mb-1 text-sm font-medium">
							{t("emptyTitle")}
						</p>
						<p className="text-muted-foreground mb-6 text-xs">
							{t("emptyDescription")}
						</p>
						<Button size="sm" onClick={handleAdd}>
							<PlusIcon />
							{t("addRule")}
						</Button>
					</div>
				) : filteredRules.length === 0 ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-muted-foreground text-sm">{t("noRulesFound")}</p>
					</div>
				) : (
					<div className="divide-y divide-border">
						{filteredRules.map((rule) => (
							<ReplaceRuleListItem
								key={rule.id}
								rule={rule}
								onEdit={setEditRuleId}
								onToggle={handleToggle}
							/>
						))}
					</div>
				)}
			</ScrollArea>

			{/* Edit Dialog */}
			<ReplaceRuleEditDialog
				rule={isNew ? null : editingRule}
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

export { ReplaceRulePage };