"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

type RegexEditorLabels = {
	readonly patternLabel?: string;
	readonly flagsLabel?: string;
	readonly literalLabel?: string;
	readonly testLabel?: string;
	readonly matchLabel?: string;
	readonly noMatchLabel?: string;
	readonly patternPlaceholder?: string;
	readonly literalPlaceholder?: string;
};

type RegexEditorProps = {
	readonly pattern: string;
	readonly onPatternChange: (pattern: string) => void;
	readonly flags?: string;
	readonly onFlagsChange?: (flags: string) => void;
	readonly literal?: boolean;
	readonly onLiteralChange?: (literal: boolean) => void;
	readonly testString?: string;
	readonly onTestStringChange?: (value: string) => void;
	readonly showTest?: boolean;
	readonly className?: string;
	readonly disabled?: boolean;
	readonly labels?: RegexEditorLabels;
};

type TestResult =
	| { readonly status: "idle" }
	| { readonly status: "match"; readonly count: number }
	| { readonly status: "no-match" }
	| { readonly status: "error"; readonly message: string };

function RegexEditor({
	pattern,
	onPatternChange,
	flags = "",
	onFlagsChange,
	literal = false,
	onLiteralChange,
	testString = "",
	onTestStringChange,
	showTest = true,
	className,
	disabled,
	labels = {},
}: RegexEditorProps) {
	const [internalTest, setInternalTest] = useState("");
	const testValue = testString ?? internalTest;
	const handleTestChange = onTestStringChange ?? setInternalTest;

	const testResult: TestResult = useMemo(() => {
		if (!pattern) return { status: "idle" };
		if (literal) {
			if (!testValue) return { status: "idle" };
			const hasMatch = testValue.includes(pattern);
			return hasMatch ? { status: "match", count: 1 } : { status: "no-match" };
		}
		try {
			const regex = new RegExp(pattern, flags || undefined);
			if (!testValue) return { status: "idle" };
			const matches = testValue.match(regex);
			if (matches && matches.length > 0) {
				return { status: "match", count: matches.length };
			}
			return { status: "no-match" };
		} catch (e) {
			return {
				status: "error",
				message: e instanceof Error ? e.message : "Invalid regex",
			};
		}
	}, [pattern, flags, literal, testValue]);

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{/* Pattern input */}
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="regex-pattern">
					{labels.patternLabel ?? "Pattern"}
					<span className="text-destructive ml-0.5">*</span>
				</Label>
				<Input
					id="regex-pattern"
					value={pattern}
					onChange={(e) => onPatternChange(e.target.value)}
					placeholder={
						literal
							? (labels.literalPlaceholder ?? "Literal text...")
							: (labels.patternPlaceholder ?? "Regex pattern...")
					}
					className={cn(!literal && "font-mono text-xs")}
					disabled={disabled}
				/>
			</div>

			{/* Flags + Literal toggle row */}
			<div className="flex items-end gap-4">
				{!literal && onFlagsChange && (
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="regex-flags">{labels.flagsLabel ?? "Flags"}</Label>
						<Input
							id="regex-flags"
							value={flags}
							onChange={(e) => onFlagsChange(e.target.value)}
							placeholder="gi"
							className="w-20 font-mono text-xs"
							disabled={disabled}
						/>
					</div>
				)}
				{onLiteralChange && (
					<div className="flex items-center gap-2 pb-1">
						<Switch
							id="regex-literal"
							checked={literal}
							onCheckedChange={(checked: boolean) => onLiteralChange(checked)}
							size="sm"
							disabled={disabled}
						/>
						<Label htmlFor="regex-literal" className="cursor-pointer">
							{labels.literalLabel ?? "Literal"}
						</Label>
					</div>
				)}
			</div>

			{/* Test area */}
			{showTest && (
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="regex-test">{labels.testLabel ?? "Test"}</Label>
					<Input
						id="regex-test"
						value={testValue}
						onChange={(e) => handleTestChange(e.target.value)}
						placeholder="Enter test string..."
						disabled={disabled}
					/>
					{testResult.status !== "idle" && (
						<p
							className={cn(
								"text-xs",
								testResult.status === "match" &&
									"text-green-600 dark:text-green-400",
								testResult.status === "no-match" && "text-muted-foreground",
								testResult.status === "error" && "text-destructive",
							)}
						>
							{testResult.status === "match" &&
								`${labels.matchLabel ?? "Match"} (${testResult.count} result${testResult.count > 1 ? "s" : ""})`}
							{testResult.status === "no-match" &&
								(labels.noMatchLabel ?? "No match")}
							{testResult.status === "error" && testResult.message}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

export type { RegexEditorProps };
export { RegexEditor };
