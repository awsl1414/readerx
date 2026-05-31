"use client";

import type {
	DomTransformDef,
	ExtractStepDef,
	RuleStepDef,
	ScriptStepDef,
	StringTransformDef,
} from "@readerx/schemas";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	GripVerticalIcon,
	PlusIcon,
	TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type PipelineEditorProps = {
	readonly steps: readonly RuleStepDef[];
	readonly onChange: (steps: RuleStepDef[]) => void;
	readonly className?: string;
	readonly disabled?: boolean;
};

const EXTRACT_ENGINES = [
	{ label: "CSS", value: "css" },
	{ label: "XPath", value: "xpath" },
	{ label: "JSONPath", value: "jsonpath" },
	{ label: "Regex", value: "regex" },
] as const;

const STRING_ACTIONS = [
	{ label: "Replace", value: "replace" },
	{ label: "Match", value: "match" },
	{ label: "Split", value: "split" },
	{ label: "Template", value: "template" },
	{ label: "Trim", value: "trim" },
] as const;

const DOM_ACTIONS = [
	{ label: "Remove", value: "remove" },
	{ label: "Unwrap", value: "unwrap" },
	{ label: "Strip", value: "strip" },
] as const;

const TYPE_COLORS: Record<string, string> = {
	extract: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	transform:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
	script:
		"bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function getStepSummary(step: RuleStepDef): string {
	if (step.type === "extract") {
		return `${step.engine.toUpperCase()}: ${step.selector}`;
	}
	if (step.type === "transform") {
		if (step.category === "string") {
			if (step.action === "replace") {
				return `replace: /${step.pattern ?? ""}/ → ${step.with ?? ""}`;
			}
			return `${step.action}${step.pattern ? `: ${step.pattern}` : ""}`;
		}
		return `${step.action}: ${step.selector}`;
	}
	if (step.type === "script") {
		return step.code.length > 40 ? `${step.code.slice(0, 40)}...` : step.code;
	}
	return "unknown";
}

/** 基于步骤内容生成稳定的 key（避免使用数组索引） */
function getStepKey(step: RuleStepDef): string {
	if (step.type === "extract") {
		return `${step.type}-${step.engine}-${step.selector}`;
	}
	if (step.type === "transform") {
		if (step.category === "string") {
			return `${step.type}-${step.category}-${step.action}-${step.pattern ?? ""}`;
		}
		return `${step.type}-${step.category}-${step.action}-${step.selector}`;
	}
	if (step.type === "script") {
		return `${step.type}-${step.code}`;
	}
	return "unknown";
}

function createDefaultStep(
	type: "extract" | "transform" | "script",
): RuleStepDef {
	if (type === "extract") {
		return { type: "extract", engine: "css", selector: "" };
	}
	if (type === "transform") {
		return {
			type: "transform",
			category: "string",
			action: "replace",
		};
	}
	return { type: "script", code: "" };
}

function PipelineEditor({
	steps,
	onChange,
	className,
	disabled,
}: PipelineEditorProps) {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
	const [showAddMenu, setShowAddMenu] = useState(false);

	const handleAdd = (type: "extract" | "transform" | "script") => {
		const newStep = createDefaultStep(type);
		const next = [...steps, newStep];
		onChange(next);
		setExpandedIndex(next.length - 1);
		setShowAddMenu(false);
	};

	const handleRemove = (index: number) => {
		const next = steps.filter((_, i) => i !== index);
		onChange(next);
		if (expandedIndex === index) {
			setExpandedIndex(null);
		} else if (expandedIndex !== null && expandedIndex > index) {
			setExpandedIndex(expandedIndex - 1);
		}
	};

	const handleMove = (index: number, direction: -1 | 1) => {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= steps.length) return;
		const next = [...steps];
		const temp = next[targetIndex];
		const current = next[index];
		if (temp !== undefined && current !== undefined) {
			next[targetIndex] = current;
			next[index] = temp;
		}
		onChange(next);
		if (expandedIndex === index) {
			setExpandedIndex(targetIndex);
		} else if (expandedIndex === targetIndex) {
			setExpandedIndex(index);
		}
	};

	const handleUpdateStep = (index: number, step: RuleStepDef) => {
		const next = [...steps];
		next[index] = step;
		onChange(next);
	};

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{/* Step list */}
			{steps.length === 0 && (
				<p className="text-muted-foreground py-4 text-center text-xs">
					No steps defined. Click &quot;Add step&quot; to begin.
				</p>
			)}

			{steps.map((step, index) => (
				<div
					key={`step-${index}-${getStepKey(step)}`}
					className="border-border bg-surface-1 rounded-md border"
				>
					{/* Row header */}
					<div className="flex items-center gap-2 px-3 py-2">
						<Button
							variant="ghost"
							size="icon-sm"
							className="shrink-0 cursor-grab"
							disabled={disabled}
							onClick={() => handleMove(index, -1)}
							aria-label="Move up"
							title="Move up"
						>
							<GripVerticalIcon className="text-muted-foreground size-3.5" />
						</Button>

						<Badge
							variant="outline"
							className={cn(
								"shrink-0 border-0 text-[10px] font-medium",
								TYPE_COLORS[step.type],
							)}
						>
							{step.type}
						</Badge>

						<button
							type="button"
							className="text-foreground min-w-0 flex-1 cursor-pointer truncate text-left text-xs"
							onClick={() =>
								setExpandedIndex(expandedIndex === index ? null : index)
							}
						>
							{getStepSummary(step) || `Step ${index + 1}`}
						</button>

						<span className="text-muted-foreground shrink-0 text-[10px]">
							#{index + 1}
						</span>

						<Button
							variant="ghost"
							size="icon-sm"
							className="shrink-0"
							onClick={() =>
								setExpandedIndex(expandedIndex === index ? null : index)
							}
							aria-label={expandedIndex === index ? "Collapse" : "Expand"}
						>
							{expandedIndex === index ? (
								<ChevronDownIcon className="size-3.5" />
							) : (
								<ChevronRightIcon className="size-3.5" />
							)}
						</Button>

						<Button
							variant="ghost"
							size="icon-sm"
							className="text-destructive shrink-0"
							onClick={() => handleRemove(index)}
							disabled={disabled}
							aria-label="Remove step"
						>
							<TrashIcon className="size-3.5" />
						</Button>
					</div>

					{/* Expanded edit form */}
					{expandedIndex === index && (
						<div className="border-border border-t px-3 py-3">
							<StepEditor
								step={step}
								onChange={(updated) => handleUpdateStep(index, updated)}
								disabled={disabled ?? false}
							/>
						</div>
					)}
				</div>
			))}

			{/* Add step button */}
			<div className="relative">
				<Button
					variant="outline"
					size="sm"
					className="w-full"
					onClick={() => setShowAddMenu(!showAddMenu)}
					disabled={disabled}
				>
					<PlusIcon />
					Add step
				</Button>

				{showAddMenu && !disabled && (
					<div className="bg-popover border-border absolute bottom-full left-0 z-10 mb-1 w-full rounded-md border p-1 shadow-md">
						{(["extract", "transform", "script"] as const).map((type) => (
							<button
								key={type}
								type="button"
								className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
								onClick={() => handleAdd(type)}
							>
								<Badge
									variant="outline"
									className={cn("border-0 text-[10px]", TYPE_COLORS[type])}
								>
									{type}
								</Badge>
								<span className="text-foreground text-xs capitalize">
									{type} step
								</span>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ---- Step Editor (internal) ----

type StepEditorProps = {
	readonly step: RuleStepDef;
	readonly onChange: (step: RuleStepDef) => void;
	readonly disabled: boolean;
};

function StepEditor({ step, onChange, disabled }: StepEditorProps) {
	if (step.type === "extract") {
		return (
			<ExtractEditor step={step} onChange={onChange} disabled={disabled} />
		);
	}
	if (step.type === "transform") {
		return (
			<TransformEditor step={step} onChange={onChange} disabled={disabled} />
		);
	}
	if (step.type === "script") {
		return <ScriptEditor step={step} onChange={onChange} disabled={disabled} />;
	}
	return null;
}

// ---- Extract Step Editor ----

type ExtractEditorProps = {
	readonly step: ExtractStepDef;
	readonly onChange: (step: RuleStepDef) => void;
	readonly disabled: boolean;
};

function ExtractEditor({ step, onChange, disabled }: ExtractEditorProps) {
	const update = (overrides: Readonly<Partial<ExtractStepDef>>) => {
		onChange({ ...step, ...overrides });
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-end gap-2">
				<div className="flex flex-col gap-1.5">
					<Label>Engine</Label>
					<Select
						value={step.engine}
						onValueChange={(v) =>
							update({ engine: v as ExtractStepDef["engine"] })
						}
						disabled={disabled}
					>
						<SelectTrigger className="w-28">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{EXTRACT_ENGINES.map((eng) => (
								<SelectItem key={eng.value} value={eng.value}>
									{eng.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-1 flex-col gap-1.5">
					<Label>Selector</Label>
					<Input
						value={step.selector}
						onChange={(e) => update({ selector: e.target.value })}
						placeholder=".result-list > .item"
						className="font-mono text-xs"
						disabled={disabled}
					/>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<div className="flex flex-col gap-1.5">
					<Label>Output</Label>
					<Input
						value={step.output ?? ""}
						onChange={(e) =>
							update(e.target.value ? { output: e.target.value } : {})
						}
						placeholder="text"
						className="font-mono text-xs"
						disabled={disabled}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label>Attribute</Label>
					<Input
						value={step.attr ?? ""}
						onChange={(e) =>
							update(e.target.value ? { attr: e.target.value } : {})
						}
						placeholder="href"
						className="font-mono text-xs"
						disabled={disabled}
					/>
				</div>
			</div>
		</div>
	);
}

// ---- Transform Step Editor ----

type TransformEditorProps = {
	readonly step: StringTransformDef | DomTransformDef;
	readonly onChange: (step: RuleStepDef) => void;
	readonly disabled: boolean;
};

function TransformEditor({ step, onChange, disabled }: TransformEditorProps) {
	const handleCategoryChange = (v: string) => {
		if (v === "string") {
			onChange({
				type: "transform",
				category: "string",
				action: "replace",
			} satisfies StringTransformDef);
		} else {
			onChange({
				type: "transform",
				category: "dom",
				action: "remove",
				selector: "",
			} satisfies DomTransformDef);
		}
	};

	const handleActionChange = (v: string) => {
		if (step.category === "string") {
			onChange({
				...(step as StringTransformDef),
				action: v as StringTransformDef["action"],
			});
		} else {
			onChange({
				...(step as DomTransformDef),
				action: v as DomTransformDef["action"],
			});
		}
	};

	const actions = step.category === "string" ? STRING_ACTIONS : DOM_ACTIONS;

	return (
		<div className="flex flex-col gap-2">
			{/* Category + Action */}
			<div className="flex items-end gap-2">
				<div className="flex flex-col gap-1.5">
					<Label>Category</Label>
					<Select
						value={step.category}
						onValueChange={handleCategoryChange}
						disabled={disabled}
					>
						<SelectTrigger className="w-28">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="string">String</SelectItem>
							<SelectItem value="dom">DOM</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label>Action</Label>
					<Select
						value={step.action}
						onValueChange={handleActionChange}
						disabled={disabled}
					>
						<SelectTrigger className="w-28">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{actions.map((a) => (
								<SelectItem key={a.value} value={a.value}>
									{a.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* String-specific fields */}
			{step.category === "string" && (
				<StringTransformFields
					step={step as StringTransformDef}
					onChange={onChange}
					disabled={disabled}
				/>
			)}

			{/* DOM-specific fields */}
			{step.category === "dom" && (
				<div className="flex flex-col gap-1.5">
					<Label>Selector</Label>
					<Input
						value={(step as DomTransformDef).selector}
						onChange={(e) =>
							onChange({
								...(step as DomTransformDef),
								selector: e.target.value,
							})
						}
						placeholder=".ad, script"
						className="font-mono text-xs"
						disabled={disabled}
					/>
				</div>
			)}
		</div>
	);
}

// ---- String Transform Fields (internal) ----

type StringTransformFieldsProps = {
	readonly step: StringTransformDef;
	readonly onChange: (step: RuleStepDef) => void;
	readonly disabled: boolean;
};

function StringTransformFields({
	step,
	onChange,
	disabled,
}: StringTransformFieldsProps) {
	const update = (overrides: Readonly<Partial<StringTransformDef>>) => {
		onChange({ ...step, ...overrides });
	};

	return (
		<>
			{(step.action === "replace" ||
				step.action === "match" ||
				step.action === "split") && (
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1.5">
						<Label>Pattern</Label>
						<Input
							value={step.pattern ?? ""}
							onChange={(e) =>
								update(e.target.value ? { pattern: e.target.value } : {})
							}
							placeholder="Regex pattern"
							className="font-mono text-xs"
							disabled={disabled}
						/>
					</div>
					{step.action === "replace" && (
						<div className="flex flex-col gap-1.5">
							<Label>Replace with</Label>
							<Input
								value={step.with ?? ""}
								onChange={(e) =>
									update(e.target.value ? { with: e.target.value } : {})
								}
								placeholder="Replacement"
								className="font-mono text-xs"
								disabled={disabled}
							/>
						</div>
					)}
				</div>
			)}
			{step.action === "template" && (
				<div className="flex flex-col gap-1.5">
					<Label>Template</Label>
					<Input
						value={step.template ?? ""}
						onChange={(e) =>
							update(e.target.value ? { template: e.target.value } : {})
						}
						placeholder="{{result}}"
						className="font-mono text-xs"
						disabled={disabled}
					/>
				</div>
			)}
			{(step.action === "replace" || step.action === "match") && (
				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1.5">
						<Label>Flags</Label>
						<Input
							value={step.flags ?? ""}
							onChange={(e) =>
								update(e.target.value ? { flags: e.target.value } : {})
							}
							placeholder="gi"
							className="w-20 font-mono text-xs"
							disabled={disabled}
						/>
					</div>
					{step.action === "match" && (
						<div className="flex flex-col gap-1.5">
							<Label>Group</Label>
							<Input
								type="number"
								value={step.group ?? ""}
								onChange={(e) =>
									update(
										e.target.value ? { group: Number(e.target.value) } : {},
									)
								}
								placeholder="0"
								className="w-20"
								disabled={disabled}
							/>
						</div>
					)}
				</div>
			)}
		</>
	);
}

// ---- Script Step Editor ----

type ScriptEditorProps = {
	readonly step: ScriptStepDef;
	readonly onChange: (step: RuleStepDef) => void;
	readonly disabled: boolean;
};

function ScriptEditor({ step, onChange, disabled }: ScriptEditorProps) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label>JavaScript Code</Label>
			<Textarea
				value={step.code}
				onChange={(e) => onChange({ ...step, code: e.target.value })}
				placeholder="// result is the input&#10;return result.trim();"
				className="min-h-[80px] font-mono text-xs"
				disabled={disabled}
			/>
		</div>
	);
}

export type { PipelineEditorProps };
export { PipelineEditor };
