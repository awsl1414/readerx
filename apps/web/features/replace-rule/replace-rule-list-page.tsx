"use client";

import type { ReplaceRuleData, RuleRecord } from "@readerx/schemas";
import { validateReplaceRuleFile } from "@readerx/schemas";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RuleImportDialog, RuleList } from "@/features/shared-rule-ui";
import { useReplaceRuleMutations, useReplaceRules } from "./hooks/use-replace-rules";
import { ReplaceRuleEditor } from "./replace-rule-editor";

function ReplaceRuleListPage() {
	const t = useTranslations("replaceRules");
	const { data: rules = [], isLoading } = useReplaceRules();
	const { save, remove, toggleEnabled, importRules } =
		useReplaceRuleMutations();

	const [editorOpen, setEditorOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<RuleRecord<"replace"> | null>(
		null,
	);
	const [importOpen, setImportOpen] = useState(false);

	const handleAdd = () => {
		setEditingRule(null);
		setEditorOpen(true);
	};

	const handleEdit = (id: string) => {
		const rule = rules.find((r) => r.id === id);
		if (rule) {
			setEditingRule(rule);
			setEditorOpen(true);
		}
	};

	const handleSave = (rule: RuleRecord<"replace">) => {
		save.mutate(rule, {
			onSuccess: () => toast.success(t("saved")),
			onError: (err) => toast.error(`Save failed: ${err.message}`),
		});
	};

	const handleDelete = (id: string) => {
		remove.mutate(id, {
			onSuccess: () => toast.success(t("deleted")),
			onError: (err) => toast.error(`Delete failed: ${err.message}`),
		});
	};

	const handleToggle = (id: string, enabled: boolean) => {
		toggleEnabled.mutate(
			{ id, enabled },
			{
				onError: (err) => toast.error(`Toggle failed: ${err.message}`),
			},
		);
	};

	const handleImport = (raw: string) => {
		try {
			// Try ReaderX file format first
			const parsed: unknown = JSON.parse(raw);
			const fileValidation = validateReplaceRuleFile(parsed);

			if (fileValidation.ok) {
				const now = new Date().toISOString();
				const parsedRules = fileValidation.value.rules;
				const records: RuleRecord<"replace">[] = parsedRules.map(
					(item, index): RuleRecord<"replace"> => {
						// Build data — collect optional fields in a mutable record, then spread
						const extras: Record<string, unknown> = {};
						if (item.description) extras.description = item.description;
						if (item.flags) extras.flags = item.flags;
						if (item.literal) extras.literal = item.literal;
						if (item.replacement) extras.replacement = item.replacement;
						if (item.replacementJs) extras.replacementJs = item.replacementJs;
						if (item.scope) extras.scope = item.scope;

						const data = { pattern: item.pattern, ...extras } as unknown as ReplaceRuleData;

						return {
							id: crypto.randomUUID(),
							type: "replace",
							name: item.name,
							enabled: item.enabled ?? true,
							tags: [...(item.tags ?? [])],
							order: item.order ?? index,
							createdAt: now,
							updatedAt: now,
							data,
						};
					},
				);
				importRules.mutate(records, {
					onSuccess: () => toast.success(t("imported", { count: records.length })),
					onError: (err) => toast.error(t("importFailed")),
				});
				return;
			}

			// Fallback: try flat array of rule data
			const items = Array.isArray(parsed) ? parsed : [parsed];
			const now = new Date().toISOString();
			const records: RuleRecord<"replace">[] = items.map((item, index) => {
				const record = item as Record<string, unknown>;
				const data: ReplaceRuleData = {
					pattern: (record.pattern as string) ?? "",
					...(typeof record.description === "string" && {
						description: record.description,
					}),
					...(typeof record.flags === "string" && { flags: record.flags }),
					...(typeof record.literal === "boolean" && {
						literal: record.literal,
					}),
					...(typeof record.replacement === "string" && {
						replacement: record.replacement,
					}),
					...(typeof record.replacementJs === "string" && {
						replacementJs: record.replacementJs,
					}),
				};
				return {
					id: crypto.randomUUID(),
					type: "replace",
					name: (record.name as string) ?? `Rule ${index + 1}`,
					enabled: true,
					tags: [],
					order: index,
					createdAt: now,
					updatedAt: now,
					data,
				};
			});
			importRules.mutate(records, {
				onSuccess: () => toast.success(t("imported", { count: records.length })),
				onError: (err) => toast.error(t("importFailed")),
			});
		} catch {
			toast.error(t("invalidJson"));
		}
	};

	const handleBatchDelete = (ids: readonly string[]) => {
		for (const id of ids) {
			remove.mutate(id);
		}
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-4 py-3">
				<h1 className="text-lg font-semibold">{t("title")}</h1>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
						{t("importLabel")}
					</Button>
					<Button size="sm" onClick={handleAdd}>
						<PlusIcon className="size-3.5" />
						{t("addLabel")}
					</Button>
				</div>
			</div>

			{/* List */}
			<RuleList<"replace">
				items={rules}
				isLoading={isLoading}
				onEdit={handleEdit}
				onToggle={handleToggle}
				onBatchDelete={handleBatchDelete}
				emptyMessage={t("emptyMessage")}
			/>

			{/* Editor Dialog */}
			<ReplaceRuleEditor
				rule={editingRule}
				open={editorOpen}
				onOpenChange={setEditorOpen}
				onSave={handleSave}
				onDelete={handleDelete}
			/>

			{/* Import Dialog */}
			<RuleImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				ruleType="Replace"
				onImport={handleImport}
				labels={{
					importLabel: t("importLabel"),
					cancelLabel: t("cancel"),
					uploadFileLabel: t("uploadFileLabel"),
				}}
			/>
		</div>
	);
}

export { ReplaceRuleListPage };
