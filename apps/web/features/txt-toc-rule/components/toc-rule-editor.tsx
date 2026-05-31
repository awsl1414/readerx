"use client";

import type { RuleRecord, TxtTocRuleData } from "@readerx/schemas";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
	RegexEditor,
	TagInput,
} from "@/features/shared-rule-ui";
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

type TocRuleEditorProps = {
	readonly rule: RuleRecord<"txt-toc"> | null;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onSave: (rule: RuleRecord<"txt-toc">) => void;
	readonly onDelete: (id: string) => void;
};

function createDefaultRule(): RuleRecord<"txt-toc"> {
	const now = new Date().toISOString();
	return {
		id: "",
		type: "txt-toc",
		name: "",
		enabled: true,
		tags: [],
		order: 0,
		createdAt: now,
		updatedAt: now,
		data: {
			pattern: "",
		},
	};
}

function omitDataKey(
	data: TxtTocRuleData,
	key: "description" | "flags",
): TxtTocRuleData {
	const result = { ...data };
	delete result[key];
	return result;
}

function TocRuleEditor({
	rule,
	open,
	onOpenChange,
	onSave,
	onDelete,
}: TocRuleEditorProps) {
	const t = useTranslations("txtRules");
	const isEditing = rule !== null;

	const [formState, setFormState] = useState<RuleRecord<"txt-toc">>(
		() => rule ?? createDefaultRule(),
	);

	// Reset form when switching between different rules
	useEffect(() => {
		setFormState(rule ?? createDefaultRule());
	}, [rule]);

	// Sync form when dialog opens
	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			setFormState(
				rule ?? { ...createDefaultRule(), id: crypto.randomUUID() },
			);
		}
		onOpenChange(isOpen);
	};

	const updateField = <K extends keyof RuleRecord<"txt-toc">>(
		key: K,
		value: RuleRecord<"txt-toc">[K],
	) => {
		setFormState((prev) => ({ ...prev, [key]: value }));
	};

	const updateData = (patch: { pattern: string } | { flags: string } | { description: string }) => {
		setFormState((prev) => ({
			...prev,
			data: { ...prev.data, ...patch },
		}));
	};

	const handleSave = () => {
		const now = new Date().toISOString();
		const entity: RuleRecord<"txt-toc"> = {
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
						<Label htmlFor="toc-name">
							{t("fieldName")}
							<span className="text-destructive ml-0.5">*</span>
						</Label>
						<Input
							id="toc-name"
							value={formState.name}
							onChange={(e) => updateField("name", e.target.value)}
							required
						/>
					</div>

					{/* Description */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="toc-description">{t("fieldDescription")}</Label>
						<Textarea
							id="toc-description"
							value={formState.data.description ?? ""}
							onChange={(e) => {
								const val = e.target.value;
								if (val) {
									updateData({ description: val });
								} else {
									setFormState((prev) => ({
										...prev,
										data: omitDataKey(prev.data, "description"),
									}));
								}
							}}
						/>
					</div>

					{/* Regex Pattern + Flags */}
					<RegexEditor
						pattern={formState.data.pattern}
						onPatternChange={(pattern) => updateData({ pattern })}
						flags={formState.data.flags ?? ""}
						onFlagsChange={(flags) => {
							if (flags) {
								updateData({ flags });
							} else {
								setFormState((prev) => ({
									...prev,
									data: omitDataKey(prev.data, "flags"),
								}));
							}
						}}
						showTest
						labels={{
							patternLabel: t("fieldRule"),
							flagsLabel: t("fieldFlags"),
							testLabel: t("fieldTestInput"),
							matchLabel: t("fieldTestMatch"),
							noMatchLabel: t("fieldTestNoMatch"),
							patternPlaceholder: t("patternPlaceholder"),
						}}
					/>

					{/* Enabled */}
					<div className="flex items-center gap-2">
						<Switch
							id="toc-enabled"
							checked={formState.enabled}
							onCheckedChange={(checked: boolean) =>
								updateField("enabled", checked)
							}
							size="sm"
						/>
						<Label htmlFor="toc-enabled" className="cursor-pointer">
							{t("fieldEnabled")}
						</Label>
					</div>

					{/* Order */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="toc-order">{t("fieldOrder")}</Label>
						<Input
							id="toc-order"
							type="number"
							value={formState.order}
							onChange={(e) =>
								updateField("order", Number(e.target.value))
							}
							min={0}
						/>
					</div>

					{/* Tags */}
					<TagInput
						tags={[...formState.tags]}
						onChange={(tags) => updateField("tags", tags)}
						placeholder="Add tags..."
					/>
				</div>

				<DialogFooter>
					{isEditing && (
						<Button variant="destructive" size="sm" onClick={handleDelete}>
							{t("delete")}
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

export { TocRuleEditor };
