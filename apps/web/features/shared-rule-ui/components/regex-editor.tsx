"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

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
}: RegexEditorProps) {
	const [internalTest, setInternalTest] = useState("");
	const testValue = testString ?? internalTest;
	const handleTestChange = onTestStringChange ?? setInternalTest;

	const testResult: TestResult = useMemo(() => {
		if (!pattern) return { status: "idle" };
		if (literal) {
			if (!testValue) return { status: "idle" };
			const hasMatch = testValue.includes(pattern);
			return hasMatch
				? { status: "match", count: 1 }
				: { status: "no-match" };
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
					Pattern
					<span className="text-destructive ml-0.5">*</span>
				</Label>
				<Input
					id="regex-pattern"
					value={pattern}
					onChange={(e) => onPatternChange(e.target.value)}
					placeholder={literal ? "Literal text..." : "Regex pattern..."}
					className={cn(!literal && "font-mono text-xs")}
					disabled={disabled}
				/>
			</div>

			{/* Flags + Literal toggle row */}
			<div className="flex items-end gap-4">
				{!literal && onFlagsChange && (
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="regex-flags">Flags</Label>
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
							onCheckedChange={(checked: boolean) =>
								onLiteralChange(checked)
							}
							size="sm"
							disabled={disabled}
						/>
						<Label htmlFor="regex-literal" className="cursor-pointer">
							Literal
						</Label>
					</div>
				)}
			</div>

			{/* Test area */}
			{showTest && (
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="regex-test">Test</Label>
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
								testResult.status === "match" && "text-green-600 dark:text-green-400",
								testResult.status === "no-match" && "text-muted-foreground",
								testResult.status === "error" && "text-destructive",
							)}
						>
							{testResult.status === "match" &&
								`Match (${testResult.count} result${testResult.count > 1 ? "s" : ""})`}
							{testResult.status === "no-match" && "No match"}
							{testResult.status === "error" && testResult.message}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

export { RegexEditor };
export type { RegexEditorProps };
