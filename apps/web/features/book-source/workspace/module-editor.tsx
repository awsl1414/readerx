"use client";

import type { SourceModule, RuleExpression } from "@readerx/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequestConfigEditor } from "@/features/shared-rule-ui";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

type ModuleEditorProps = {
	readonly module: SourceModule;
	readonly onChange: (module: SourceModule) => void;
	readonly disabled?: boolean;
};

/** Convert a RuleExpression to a string for display in a text input. */
function expressionToString(expr: RuleExpression | undefined): string {
	if (expr === undefined) return "";
	if (typeof expr === "string") return expr;
	if (Array.isArray(expr)) return JSON.stringify(expr);
	return JSON.stringify(expr);
}

/** Parse a string back to a RuleExpression. */
function stringToExpression(value: string): RuleExpression {
	if (!value.trim()) return "";
	try {
		const parsed = JSON.parse(value);
		if (typeof parsed === "object" && parsed !== null) return parsed;
		return value;
	} catch {
		return value;
	}
}

function ModuleEditor({ module, onChange, disabled }: ModuleEditorProps) {
	const t = useTranslations("sourceManager");
	const [newRuleKey, setNewRuleKey] = useState("");

	const handleRequestChange = useCallback(
		(request: SourceModule["request"]) => {
			if (request === undefined) {
				const { request: _, ...rest } = module;
				onChange(rest as SourceModule);
			} else {
				onChange({ ...module, request });
			}
		},
		[module, onChange],
	);

	const handleRuleChange = useCallback(
		(key: string, value: string) => {
			const newRules = { ...module.rules };
			if (!value.trim()) {
				delete newRules[key];
			} else {
				newRules[key] = stringToExpression(value);
			}
			onChange({ ...module, rules: newRules });
		},
		[module, onChange],
	);

	const handleAddRule = useCallback(() => {
		const key = newRuleKey.trim();
		if (!key) return;
		const newRules = { ...module.rules, [key]: "" as RuleExpression };
		onChange({ ...module, rules: newRules });
		setNewRuleKey("");
	}, [module, newRuleKey, onChange]);

	const handleRemoveRule = useCallback(
		(key: string) => {
			const newRules = { ...module.rules };
			delete newRules[key];
			onChange({ ...module, rules: newRules });
		},
		[module, onChange],
	);

	const handleNextUrlChange = useCallback(
		(value: string) => {
			if (!value.trim()) {
				const { nextUrl: _, ...rest } = module;
				onChange(rest as SourceModule);
			} else {
				onChange({ ...module, nextUrl: stringToExpression(value) });
			}
		},
		[module, onChange],
	);

	const handleEnabledChange = useCallback(
		(enabled: boolean) => {
			onChange({ ...module, enabled });
		},
		[module, onChange],
	);

	const ruleEntries = Object.entries(module.rules);

	return (
		<div className="flex flex-col gap-4 p-4">
			{/* Enabled toggle */}
			<div className="flex items-center gap-2">
				<input
					type="checkbox"
					checked={module.enabled ?? true}
					onChange={(e) => handleEnabledChange(e.target.checked)}
					disabled={disabled}
					className="size-4"
				/>
				<Label>{t("enableModule")}</Label>
			</div>

			{/* Request Config */}
			{module.request && (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
						{t("requestConfigLabel")}
					</Label>
					<div className="rounded-lg border border-border p-3">
						<RequestConfigEditor
							config={module.request}
							onChange={handleRequestChange}
							{...(disabled !== undefined ? { disabled } : {})}
						/>
					</div>
				</div>
			)}
			{!module.request && (
				<Button
					variant="outline"
					size="sm"
					className="w-fit text-xs"
					onClick={() =>
						onChange({ ...module, request: {} })
					}
					disabled={disabled}
				>
					<PlusIcon className="size-3.5" />
					{t("addRequestConfig")}
				</Button>
			)}

			{/* Rules */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
					{t("moduleRules")}
				</Label>
				<div className="flex flex-col gap-2">
					{ruleEntries.map(([key, expr]) => (
						<div key={key} className="flex items-start gap-2">
							<Input
								value={key}
								readOnly
								className="w-28 shrink-0 font-mono text-xs"
								disabled={disabled}
							/>
							<Textarea
								value={expressionToString(expr)}
								onChange={(e) => handleRuleChange(key, e.target.value)}
								className="flex-1 font-mono text-xs min-h-[60px]"
								placeholder="Rule expression..."
								disabled={disabled}
							/>
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-destructive mt-1 shrink-0"
								onClick={() => handleRemoveRule(key)}
								disabled={disabled}
								aria-label={`Remove rule ${key}`}
							>
								<TrashIcon className="size-3.5" />
							</Button>
						</div>
					))}

					{/* Add new rule field */}
					<div className="flex items-center gap-2">
						<Input
							value={newRuleKey}
							onChange={(e) => setNewRuleKey(e.target.value)}
							placeholder="Field name"
							className="w-28 font-mono text-xs"
							disabled={disabled}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleAddRule();
								}
							}}
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={handleAddRule}
							disabled={disabled || !newRuleKey.trim()}
							className="shrink-0 text-xs"
						>
							<PlusIcon className="size-3.5" />
							{t("addRuleField")}
						</Button>
					</div>
				</div>
			</div>

			{/* nextUrl */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
					{t("fieldNextUrl")}
				</Label>
				<Textarea
					value={expressionToString(module.nextUrl)}
					onChange={(e) => handleNextUrlChange(e.target.value)}
					className="font-mono text-xs min-h-[40px]"
					placeholder="Rule for next page URL..."
					disabled={disabled}
				/>
			</div>
		</div>
	);
}

export { ModuleEditor };