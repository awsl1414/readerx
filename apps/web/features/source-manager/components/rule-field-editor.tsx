"use client";

import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type RuleFieldEditorProps = {
	readonly label: string;
	readonly fieldName: string;
	readonly value: string;
	readonly onChange: (fieldName: string, value: string) => void;
	readonly error?: string;
};

/** Detect the parser type from a rule string prefix. */
function detectParserType(rule: string): string | null {
	if (!rule) return null;
	if (rule.startsWith("@js:") || rule.includes("<js>")) return "JS";
	if (rule.startsWith("$.") || rule.startsWith("$[")) return "JSONPath";
	if (rule.startsWith("//") || rule.startsWith("@")) return "XPath";
	if (
		rule.startsWith("class.") ||
		rule.startsWith("tag.") ||
		rule.startsWith("id.") ||
		rule.startsWith("@css:")
	)
		return "CSS";
	if (rule.startsWith("##")) return "Regex";
	return null;
}

function RuleFieldEditor({
	label,
	fieldName,
	value,
	onChange,
	error,
}: RuleFieldEditorProps) {
	const parserType = useMemo(() => detectParserType(value), [value]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			onChange(fieldName, e.target.value);
		},
		[fieldName, onChange],
	);

	const lineCount = Math.max(2, value.split("\n").length);

	return (
		<div className="mb-2">
			<div className="mb-1 flex items-center gap-2">
				<Label
					htmlFor={fieldName}
					className="text-xs font-medium text-muted-foreground"
				>
					{label}
				</Label>
				{parserType && (
					<Badge
						variant="secondary"
						className="font-mono text-[0.65rem] px-1.5 py-0"
					>
						{parserType}
					</Badge>
				)}
			</div>
			<Textarea
				id={fieldName}
				value={value}
				onChange={handleChange}
				rows={lineCount}
				className={cn(
					"font-mono text-xs resize-y",
					error && "border-destructive",
				)}
			/>
			{error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
		</div>
	);
}

export { RuleFieldEditor };
