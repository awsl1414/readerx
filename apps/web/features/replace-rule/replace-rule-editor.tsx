"use client";

import type { ReplaceRuleData, RuleRecord } from "@readerx/schemas";
import type { ReplaceScope } from "@readerx/schemas";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import {
	RegexEditor,
	ScopeEditor,
	TagInput,
} from "@/features/shared-rule-ui";

type ReplaceRuleEditorProps = {
	readonly rule: RuleRecord<"replace"> | null;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onSave: (rule: RuleRecord<"replace">) => void;
	readonly onDelete: (id: string) => void;
};

type FormState = {
	readonly id: string;
	readonly name: string;
	readonly enabled: boolean;
	readonly order: number;
	readonly tags: readonly string[];
	readonly description: string;
	readonly pattern: string;
	readonly flags: string;
	readonly literal: boolean;
	readonly replacement: string;
	readonly replacementJs: string;
	readonly scope: ReplaceScope;
};

function createDefaultForm(): FormState {
	return {
		id: "",
		name: "",
		enabled: true,
		order: 0,
		tags: [],
		description: "",
		pattern: "",
		flags: "",
		literal: false,
		replacement: "",
		replacementJs: "",
		scope: { target: "both" },
	};
}

function ruleToForm(rule: RuleRecord<"replace">): FormState {
	return {
		id: rule.id,
		name: rule.name,
		enabled: rule.enabled,
		order: rule.order,
		tags: rule.tags,
		description: rule.data.description ?? "",
		pattern: rule.data.pattern,
		flags: rule.data.flags ?? "",
		literal: rule.data.literal ?? false,
		replacement: rule.data.replacement ?? "",
		replacementJs: rule.data.replacementJs ?? "",
		scope: rule.data.scope ?? { target: "both" },
	};
}

function formToRecord(form: FormState): RuleRecord<"replace"> {
	const now = new Date().toISOString();
	const data: ReplaceRuleData = {
		pattern: form.pattern,
		...(form.description && { description: form.description }),
		...(form.flags && { flags: form.flags }),
		...(form.literal && { literal: form.literal }),
		...(form.replacement && { replacement: form.replacement }),
		...(form.replacementJs && { replacementJs: form.replacementJs }),
		...(Object.keys(form.scope).length > 0 && { scope: form.scope }),
	};

	return {
		id: form.id || crypto.randomUUID(),
		type: "replace",
		name: form.name,
		enabled: form.enabled,
		tags: form.tags,
		order: form.order,
		createdAt: now,
		updatedAt: now,
		data,
	};
}

function ReplaceRuleEditor({
	rule,
	open,
	onOpenChange,
	onSave,
	onDelete,
}: ReplaceRuleEditorProps) {
	const t = useTranslations("replaceRules");
	const isEditing = rule !== null;

	const [formState, setFormState] = useState<FormState>(() =>
		rule ? ruleToForm(rule) : createDefaultForm(),
	);

	// Reset form when switching between different rules
	useEffect(() => {
		setFormState(rule ? ruleToForm(rule) : createDefaultForm());
	}, [rule]);

	// Sync form when dialog opens
	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			setFormState(
				rule ? ruleToForm(rule) : { ...createDefaultForm(), id: crypto.randomUUID() },
			);
		}
		onOpenChange(isOpen);
	};

	const updateField = <K extends keyof FormState>(
		key: K,
		value: FormState[K],
	) => {
		setFormState((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = () => {
		onSave(formToRecord(formState));
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
						<Label htmlFor="rr-name">
							{t("fieldName")}
							<span className="text-destructive ml-0.5">*</span>
						</Label>
						<Input
							id="rr-name"
							value={formState.name}
							onChange={(e) => updateField("name", e.target.value)}
							required
						/>
					</div>

					{/* Description */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="rr-description">{t("fieldDescription")}</Label>
						<Textarea
							id="rr-description"
							value={formState.description}
							onChange={(e) => updateField("description", e.target.value)}
						/>
					</div>

					{/* Regex Editor */}
					<RegexEditor
						pattern={formState.pattern}
						onPatternChange={(p) => updateField("pattern", p)}
						flags={formState.flags}
						onFlagsChange={(f) => updateField("flags", f)}
						literal={formState.literal}
						onLiteralChange={(l) => updateField("literal", l)}
						labels={{
							patternLabel: t("fieldPattern"),
							flagsLabel: t("fieldFlags"),
							literalLabel: t("fieldLiteral"),
							testLabel: t("fieldTestInput"),
							matchLabel: t("fieldTestMatch"),
							noMatchLabel: t("fieldTestNoMatch"),
							patternPlaceholder: t("patternPlaceholder"),
						}}
					/>

					{/* Replacement */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="rr-replacement">{t("fieldReplacement")}</Label>
						<Input
							id="rr-replacement"
							value={formState.replacement}
							onChange={(e) => updateField("replacement", e.target.value)}
							placeholder="Replacement text (leave empty to delete matches)"
						/>
					</div>

					{/* Replacement JS */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="rr-replacement-js">
							{t("fieldReplacementJs")}
							<span className="text-muted-foreground ml-1 text-xs">
								(optional)
							</span>
						</Label>
						<Textarea
							id="rr-replacement-js"
							value={formState.replacementJs}
							onChange={(e) => updateField("replacementJs", e.target.value)}
							className="font-mono text-xs"
							placeholder="(match, ...groups) => { return ... }"
						/>
					</div>

					{/* Scope Editor */}
					<ScopeEditor
						scope={formState.scope}
						onChange={(s) => updateField("scope", s)}
						labels={{
							includeLabel: t("fieldScopeInclude"),
							excludeLabel: t("fieldScopeExclude"),
							targetLabel: t("fieldScopeTarget"),
							targetBoth: t("fieldScopeTargetBoth"),
							targetContent: t("fieldScopeTargetContent"),
							targetTitle: t("fieldScopeTargetTitle"),
						}}
					/>

					{/* Enabled */}
					<div className="flex items-center gap-2">
						<Switch
							id="rr-enabled"
							checked={formState.enabled}
							onCheckedChange={(checked: boolean) =>
								updateField("enabled", checked)
							}
							size="sm"
						/>
						<Label htmlFor="rr-enabled" className="cursor-pointer">
							{t("fieldEnabled")}
						</Label>
					</div>

					{/* Order */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="rr-order">{t("fieldOrder")}</Label>
						<Input
							id="rr-order"
							type="number"
							value={formState.order}
							onChange={(e) => updateField("order", Number(e.target.value))}
							min={0}
						/>
					</div>

					{/* Tags */}
					<TagInput
						tags={formState.tags}
						onChange={(t) => updateField("tags", t)}
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
					<Button size="sm" onClick={handleSave} disabled={!formState.name || !formState.pattern}>
						{t("save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { ReplaceRuleEditor };
