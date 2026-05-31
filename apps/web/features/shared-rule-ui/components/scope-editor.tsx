"use client";

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
import type { ReplaceScope } from "@readerx/schemas";

type ScopeEditorProps = {
	readonly scope: ReplaceScope;
	readonly onChange: (scope: ReplaceScope) => void;
	readonly className?: string;
	readonly disabled?: boolean;
};

const TARGET_OPTIONS = [
	{ label: "Both", value: "both" },
	{ label: "Content", value: "content" },
	{ label: "Title", value: "title" },
] as const;

function joinList(items: readonly string[] | undefined): string {
	return items?.join(", ") ?? "";
}

function splitList(value: string): readonly string[] {
	if (!value.trim()) return [];
	return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function ScopeEditor({
	scope,
	onChange,
	className,
	disabled,
}: ScopeEditorProps) {
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
				<Label htmlFor="scope-include">Include (comma-separated)</Label>
				<Input
					id="scope-include"
					value={joinList(scope.include)}
					onChange={(e) => handleIncludeChange(e.target.value)}
					placeholder="e.g. *.example.com, sub.domain.com"
					disabled={disabled}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="scope-exclude">Exclude (comma-separated)</Label>
				<Input
					id="scope-exclude"
					value={joinList(scope.exclude)}
					onChange={(e) => handleExcludeChange(e.target.value)}
					placeholder="e.g. *.ads.example.com"
					disabled={disabled}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="scope-target">Target</Label>
				<Select
					value={scope.target ?? "both"}
					onValueChange={handleTargetChange}
					disabled={disabled ?? false}
				>
					<SelectTrigger id="scope-target" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TARGET_OPTIONS.map((opt) => (
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

export { ScopeEditor };
export type { ScopeEditorProps };
