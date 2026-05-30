"use client";

import type { ReplaceRule } from "@readerx/persistence";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ReplaceRuleEditDialogProps = {
	readonly rule: ReplaceRule | null;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onSave: (rule: ReplaceRule) => void;
	readonly onDelete: (id: string) => void;
};

function createDefaultRule(): Omit<ReplaceRule, "id"> {
	return {
		name: "",
		pattern: "",
		replacement: "",
		isRegex: false,
		scopeTitle: false,
		scopeContent: true,
		enabled: true,
		order: 0,
		timeoutMillisecond: 3000,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}

function ReplaceRuleEditDialog({
	rule,
	open,
	onOpenChange,
	onSave,
	onDelete,
}: ReplaceRuleEditDialogProps) {
	const t = useTranslations("replaceRules");
	const isEditing = rule !== null;

	const [formState, setFormState] = useState<ReplaceRule>(
		() => rule ?? { ...createDefaultRule(), id: "" },
	);

	// Sync form when rule changes or dialog opens
	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			setFormState(rule ?? { ...createDefaultRule(), id: crypto.randomUUID() });
		}
		onOpenChange(isOpen);
	};

	const updateField = <K extends keyof ReplaceRule>(
		key: K,
		value: ReplaceRule[K],
	) => {
		setFormState((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = () => {
		const now = Date.now();
		const entity: ReplaceRule = {
			...formState,
			updatedAt: now,
			createdAt: formState.createdAt || now,
		};
		onSave(entity);
		onOpenChange(false);
	};

	const handleDelete = () => {
		if (rule) {
			onDelete(rule.id);
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? t("editTitle") : t("addTitle")}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{isEditing ? t("editTitle") : t("addTitle")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					{/* Name */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="name">{t("fieldName")}</Label>
						<Input
							id="name"
							value={formState.name}
							onChange={(e) => updateField("name", e.target.value)}
							required
						/>
					</div>

					{/* Group */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="group">{t("fieldGroup")}</Label>
						<Input
							id="group"
							value={formState.group ?? ""}
							onChange={(e) =>
								updateField("group", e.target.value || undefined)
							}
						/>
					</div>

					{/* Pattern */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="pattern">{t("fieldPattern")}</Label>
						<Textarea
							id="pattern"
							value={formState.pattern}
							onChange={(e) => updateField("pattern", e.target.value)}
							className="font-mono text-xs"
							required
						/>
					</div>

					{/* Replacement */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="replacement">{t("fieldReplacement")}</Label>
						<Textarea
							id="replacement"
							value={formState.replacement}
							onChange={(e) => updateField("replacement", e.target.value)}
							className="font-mono text-xs"
						/>
					</div>

					{/* IsRegex */}
					<div className="flex items-center gap-2">
						<Switch
							id="isRegex"
							checked={formState.isRegex}
							onCheckedChange={(checked: boolean) =>
								updateField("isRegex", checked)
							}
							size="sm"
						/>
						<Label htmlFor="isRegex" className="cursor-pointer">
							{t("fieldIsRegex")}
						</Label>
					</div>

					{/* ScopeTitle */}
					<div className="flex items-center gap-2">
						<Switch
							id="scopeTitle"
							checked={formState.scopeTitle}
							onCheckedChange={(checked: boolean) =>
								updateField("scopeTitle", checked)
							}
							size="sm"
						/>
						<Label htmlFor="scopeTitle" className="cursor-pointer">
							{t("fieldScopeTitle")}
						</Label>
					</div>

					{/* ScopeContent */}
					<div className="flex items-center gap-2">
						<Switch
							id="scopeContent"
							checked={formState.scopeContent}
							onCheckedChange={(checked: boolean) =>
								updateField("scopeContent", checked)
							}
							size="sm"
						/>
						<Label htmlFor="scopeContent" className="cursor-pointer">
							{t("fieldScopeContent")}
						</Label>
					</div>

					{/* Scope */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="scope">{t("fieldScope")}</Label>
						<Input
							id="scope"
							value={formState.scope ?? ""}
							onChange={(e) =>
								updateField("scope", e.target.value || undefined)
							}
							placeholder="e.g. example.com"
						/>
					</div>

					{/* ExcludeScope */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="excludeScope">{t("fieldExcludeScope")}</Label>
						<Input
							id="excludeScope"
							value={formState.excludeScope ?? ""}
							onChange={(e) =>
								updateField("excludeScope", e.target.value || undefined)
							}
						/>
					</div>

					{/* Timeout */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="timeoutMillisecond">{t("fieldTimeout")}</Label>
						<Input
							id="timeoutMillisecond"
							type="number"
							value={formState.timeoutMillisecond}
							onChange={(e) =>
								updateField("timeoutMillisecond", Number(e.target.value))
							}
							min={0}
						/>
					</div>
				</div>

				<DialogFooter>
					{isEditing && (
						<Button variant="destructive" size="sm" onClick={handleDelete}>
							{t("deleted")}
						</Button>
					)}
					<div className="flex-1" />
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
					>
						{t("cancel")}
					</Button>
					<Button size="sm" onClick={handleSave}>
						{t("save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { ReplaceRuleEditDialog };
