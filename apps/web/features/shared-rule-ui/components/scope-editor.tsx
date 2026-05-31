"use client";

import type { ReplaceScope } from "@readerx/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

type ScopeEditorLabels = {
	readonly includeLabel?: string;
	readonly excludeLabel?: string;
	readonly targetLabel?: string;
	readonly targetBoth?: string;
	readonly targetContent?: string;
	readonly targetTitle?: string;
};

type ScopeEditorProps = {
	readonly scope: ReplaceScope;
	readonly onChange: (scope: ReplaceScope) => void;
	readonly className?: string;
	readonly disabled?: boolean;
	readonly labels?: ScopeEditorLabels;
};

function joinList(items: readonly string[] | undefined): string {
	return items?.join(", ") ?? "";
}

function splitList(value: string): readonly string[] {
	if (!value.trim()) return [];
	return value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

function ScopeEditor({
	scope,
	onChange,
	className,
	disabled,
	labels = {},
}: ScopeEditorProps) {
	const targetOptions = [
		{ label: labels.targetBoth ?? "Both", value: "both" },
		{ label: labels.targetContent ?? "Content", value: "content" },
		{ label: labels.targetTitle ?? "Title", value: "title" },
	] as const;

	const handleIncludeChange = (value: string) => {
		const include = splitList(value);
		onChange({ ...scope, include });
	};

	const handleExcludeChange = (value: string) => {
		const exclude = splitList(value);
		onChange({ ...scope, exclude });
	};

	const handleTargetChange = (value: string) => {
		const target = value as "content" | "title" | "both";
		onChange({ ...scope, target });
	};

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="scope-include">
					{labels.includeLabel ?? "Include (comma-separated)"}
				</Label>
				<Input
					id="scope-include"
					value={joinList(scope.include)}
					onChange={(e) => handleIncludeChange(e.target.value)}
					placeholder="e.g. *.example.com, sub.domain.com"
					disabled={disabled}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="scope-exclude">
					{labels.excludeLabel ?? "Exclude (comma-separated)"}
				</Label>
				<Input
					id="scope-exclude"
					value={joinList(scope.exclude)}
					onChange={(e) => handleExcludeChange(e.target.value)}
					placeholder="e.g. *.ads.example.com"
					disabled={disabled}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="scope-target">{labels.targetLabel ?? "Target"}</Label>
				<Select
					value={scope.target ?? "both"}
					onValueChange={handleTargetChange}
					disabled={disabled ?? false}
				>
					<SelectTrigger id="scope-target" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{targetOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

export type { ScopeEditorProps };
export { ScopeEditor };
