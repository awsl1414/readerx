"use client";

import type { DictField, DictRuleData, RequestConfig, RuleRecord, RuleStepDef } from "@readerx/schemas";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	PipelineEditor,
	RequestConfigEditor,
	TagInput,
} from "@/features/shared-rule-ui";
import { MinusIcon, PlusIcon } from "lucide-react";

type DictRuleEditorProps = {
	readonly rule: RuleRecord<"dict"> | null;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly onSave: (rule: RuleRecord<"dict">) => void;
	readonly onDelete: (id: string) => void;
};

type FieldEntry = {
	readonly name: string;
	readonly schema: "html" | "string" | "html[]" | "string[]";
	readonly pipeline: readonly RuleStepDef[];
};

type VariableEntry = {
	readonly key: string;
	readonly value: string;
};

type FormState = {
	readonly id: string;
	readonly name: string;
	readonly enabled: boolean;
	readonly order: number;
	readonly tags: readonly string[];
	readonly description: string;
	readonly weight: number;
	readonly request: RequestConfig;
	readonly fields: readonly FieldEntry[];
	readonly variables: readonly VariableEntry[];
};

const SCHEMA_OPTIONS = [
	{ label: "HTML", value: "html" },
	{ label: "String", value: "string" },
	{ label: "HTML[]", value: "html[]" },
	{ label: "String[]", value: "string[]" },
] as const;

function createDefaultForm(): FormState {
	return {
		id: "",
		name: "",
		enabled: true,
		order: 0,
		tags: [],
		description: "",
		weight: 50,
		request: {},
		fields: [],
		variables: [],
	};
}

function ruleToForm(rule: RuleRecord<"dict">): FormState {
	const data = rule.data;
	const fieldEntries: FieldEntry[] = data.fields
		? Object.entries(data.fields).map(([name, field]) => ({
				name,
				schema: field.schema ?? "html",
				pipeline: field.pipeline,
			}))
		: [];

	const variableEntries: VariableEntry[] = data.variables
		? Object.entries(data.variables).map(([key, value]) => ({ key, value }))
		: [];

	return {
		id: rule.id,
		name: rule.name,
		enabled: rule.enabled,
		order: rule.order,
		tags: rule.tags,
		description: data.description ?? "",
		weight: data.weight ?? 50,
		request: data.request,
		fields: fieldEntries,
		variables: variableEntries,
	};
}

function formToRecord(form: FormState): RuleRecord<"dict"> {
	const now = new Date().toISOString();

	const fields: Record<string, DictField> = {};
	for (const entry of form.fields) {
		if (!entry.name.trim()) continue;
		const field: DictField = {
			pipeline: [...entry.pipeline],
			...(entry.schema !== "html" && { schema: entry.schema }),
		};
		fields[entry.name] = field;
	}

	const variables: Record<string, string> = {};
	for (const v of form.variables) {
		if (v.key.trim()) {
			variables[v.key] = v.value;
		}
	}

	const data: DictRuleData = {
		request: form.request,
		...(form.description && { description: form.description }),
		...(form.weight !== 50 && { weight: form.weight }),
		...(Object.keys(variables).length > 0 && { variables }),
		...(Object.keys(fields).length > 0 && { fields }),
	};

	return {
		id: form.id || crypto.randomUUID(),
		type: "dict",
		name: form.name,
		enabled: form.enabled,
		tags: form.tags,
		order: form.order,
		createdAt: now,
		updatedAt: now,
		data,
	};
}

function DictRuleEditor({
	rule,
	open,
	onOpenChange,
	onSave,
	onDelete,
}: DictRuleEditorProps) {
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

	const updateFieldEntry = (
		index: number,
		patch: Partial<FieldEntry>,
	) => {
		setFormState((prev) => {
			const next = [...prev.fields];
			const current = next[index];
			if (current) {
				next[index] = { ...current, ...patch };
			}
			return { ...prev, fields: next };
		});
	};

	const addFieldEntry = () => {
		setFormState((prev) => ({
			...prev,
			fields: [
				...prev.fields,
				{ name: "", schema: "html", pipeline: [] },
			],
		}));
	};

	const removeFieldEntry = (index: number) => {
		setFormState((prev) => ({
			...prev,
			fields: prev.fields.filter((_, i) => i !== index),
		}));
	};

	const updateVariable = (
		index: number,
		patch: Partial<VariableEntry>,
	) => {
		setFormState((prev) => {
			const next = [...prev.variables];
			const current = next[index];
			if (current) {
				next[index] = { ...current, ...patch };
			}
			return { ...prev, variables: next };
		});
	};

	const addVariable = () => {
		setFormState((prev) => ({
			...prev,
			variables: [...prev.variables, { key: "", value: "" }],
		}));
	};

	const removeVariable = (index: number) => {
		setFormState((prev) => ({
			...prev,
			variables: prev.variables.filter((_, i) => i !== index),
		}));
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
			<DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "编辑词典规则" : "添加词典规则"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{isEditing ? "编辑词典规则" : "创建新的词典规则"}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					{/* Name */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="dr-name">
							名称
							<span className="text-destructive ml-0.5">*</span>
						</Label>
						<Input
							id="dr-name"
							value={formState.name}
							onChange={(e) => updateField("name", e.target.value)}
							required
						/>
					</div>

					{/* Description */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="dr-description">描述</Label>
						<Textarea
							id="dr-description"
							value={formState.description}
							onChange={(e) => updateField("description", e.target.value)}
						/>
					</div>

					{/* Request Config */}
					<div className="flex flex-col gap-1.5">
						<Label>请求配置</Label>
						<RequestConfigEditor
							config={formState.request}
							onChange={(config) => updateField("request", config)}
						/>
					</div>

					{/* Fields Section */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<Label>提取字段</Label>
							<Button
								variant="outline"
								size="sm"
								onClick={addFieldEntry}
							>
								<PlusIcon className="size-3.5" />
								添加字段
							</Button>
						</div>

						{formState.fields.length === 0 && (
							<p className="text-muted-foreground py-2 text-center text-xs">
								暂无提取字段。点击"添加字段"开始定义。
							</p>
						)}

						{formState.fields.map((field, index) => (
							<div
								key={`field-${index}`}
								className="border-border bg-surface-1 rounded-md border p-3"
							>
								<div className="flex items-center gap-2">
									<div className="flex flex-1 flex-col gap-1.5">
										<Input
											value={field.name}
											onChange={(e) =>
												updateFieldEntry(index, { name: e.target.value })
											}
											placeholder="字段名 (如 definition, phonetic)"
											className="font-mono text-xs"
										/>
									</div>

									<Select
										value={field.schema}
										onValueChange={(v) =>
											updateFieldEntry(index, {
												schema: v as FieldEntry["schema"],
											})
										}
									>
										<SelectTrigger className="w-28">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{SCHEMA_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive shrink-0"
										onClick={() => removeFieldEntry(index)}
										aria-label="移除字段"
									>
										<MinusIcon className="size-3.5" />
									</Button>
								</div>

								<div className="mt-2">
									<PipelineEditor
										steps={field.pipeline}
										onChange={(steps) =>
											updateFieldEntry(index, { pipeline: steps })
										}
									/>
								</div>
							</div>
						))}
					</div>

					{/* Variables Section */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<Label>变量</Label>
							<Button
								variant="outline"
								size="sm"
								onClick={addVariable}
							>
								<PlusIcon className="size-3.5" />
								添加变量
							</Button>
						</div>

						{formState.variables.length === 0 && (
							<p className="text-muted-foreground py-2 text-center text-xs">
								暂无变量。在 URL 或字段中通过 {"{{varName}}"} 引用。
							</p>
						)}

						{formState.variables.map((v, index) => (
							<div
								key={`var-${index}`}
								className="flex items-center gap-1.5"
							>
								<Input
									value={v.key}
									onChange={(e) =>
										updateVariable(index, { key: e.target.value })
									}
									placeholder="变量名"
									className="w-32 font-mono text-xs"
								/>
								<Input
									value={v.value}
									onChange={(e) =>
										updateVariable(index, { value: e.target.value })
									}
									placeholder="变量值"
									className="flex-1 font-mono text-xs"
								/>
								<Button
									variant="ghost"
									size="icon-sm"
									className="text-destructive shrink-0"
									onClick={() => removeVariable(index)}
									aria-label="移除变量"
								>
									<MinusIcon className="size-3.5" />
								</Button>
							</div>
						))}
					</div>

					{/* Enabled */}
					<div className="flex items-center gap-2">
						<Switch
							id="dr-enabled"
							checked={formState.enabled}
							onCheckedChange={(checked: boolean) =>
								updateField("enabled", checked)
							}
							size="sm"
						/>
						<Label htmlFor="dr-enabled" className="cursor-pointer">
							启用
						</Label>
					</div>

					{/* Weight */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="dr-weight">权重 (0-100)</Label>
						<Input
							id="dr-weight"
							type="number"
							value={formState.weight}
							onChange={(e) =>
								updateField("weight", Number(e.target.value))
							}
							min={0}
							max={100}
						/>
					</div>

					{/* Tags */}
					<TagInput
						tags={[...formState.tags]}
						onChange={(t) => updateField("tags", t)}
						placeholder="添加标签..."
					/>
				</div>

				<DialogFooter>
					{isEditing && (
						<Button variant="destructive" size="sm" onClick={handleDelete}>
							删除
						</Button>
					)}
					<div className="flex-1" />
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
					>
						取消
					</Button>
					<Button
						size="sm"
						onClick={handleSave}
						disabled={!formState.name}
					>
						保存
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { DictRuleEditor };
