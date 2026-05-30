"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import { cn } from "@/lib/cn";
import type { RuleManagerConfig } from "../types";

type RuleEditDialogProps<T extends { id: string }> = {
	readonly rule: T | null;
	readonly config: RuleManagerConfig<T>;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onSave: (rule: T) => void;
	readonly onDelete: (id: string) => void;
};

function RuleEditDialog<T extends { id: string }>({
	rule,
	config,
	open,
	onOpenChange,
	onSave,
	onDelete,
}: RuleEditDialogProps<T>) {
	const t = useTranslations(config.i18nNamespace);
	const tCommon = useTranslations("common");
	const isEditing = rule !== null;

	const [formState, setFormState] = useState<Record<string, unknown>>(() => {
		if (rule) {
			return { ...rule };
		}
		return { ...config.defaultValue, id: "" };
	});

	// Reset form when switching between different rules
	useEffect(() => {
		if (rule) {
			setFormState({ ...rule });
		} else {
			setFormState({ ...config.defaultValue, id: "" });
		}
	}, [rule, config.defaultValue]);

	// Reset form when rule changes or dialog opens
	const handleClose = (isOpen: boolean) => {
		if (!isOpen) {
			if (rule) {
				setFormState({ ...rule });
			} else {
				setFormState({ ...config.defaultValue, id: "" });
			}
		}
		onOpenChange(isOpen);
	};

	const handleFieldChange = (key: string, value: unknown) => {
		setFormState((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = () => {
		const id = rule?.id ?? formState.id;
		if (!id) return;

		const entity = { ...formState, id } as T;
		onSave(entity);
		handleClose(false);
	};

	const handleDelete = () => {
		if (rule) {
			onDelete(rule.id);
			handleClose(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEditing ? t("editTitle") : t("addTitle")}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{isEditing ? t("editTitle") : t("addTitle")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					{config.fields.map((field) => (
						<div key={field.key} className="flex flex-col gap-1.5">
							<Label htmlFor={field.key}>{t(field.labelKey)}</Label>

							{field.type === "text" && (
								<Input
									id={field.key}
									value={String(formState[field.key] ?? "")}
									onChange={(e) => handleFieldChange(field.key, e.target.value)}
									placeholder={field.placeholder}
									required={field.required}
								/>
							)}

							{field.type === "textarea" && (
								<Textarea
									id={field.key}
									value={String(formState[field.key] ?? "")}
									onChange={(e) => handleFieldChange(field.key, e.target.value)}
									placeholder={field.placeholder}
									required={field.required}
									className={cn(field.monospace && "font-mono text-xs")}
								/>
							)}

							{field.type === "switch" && (
								<div className="flex items-center gap-2">
									<Switch
										id={field.key}
										checked={Boolean(formState[field.key])}
										onCheckedChange={(checked: boolean) =>
											handleFieldChange(field.key, checked)
										}
										size="sm"
									/>
									<Label htmlFor={field.key} className="cursor-pointer">
										{t(field.labelKey)}
									</Label>
								</div>
							)}
						</div>
					))}
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
						onClick={() => handleClose(false)}
					>
						{tCommon("cancel")}
					</Button>
					<Button size="sm" onClick={handleSave}>
						{t("save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { RuleEditDialog };
