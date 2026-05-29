// features/source-manager/components/rule-field-editor.tsx

"use client";

import { useCallback, useMemo } from "react";

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
		<div style={{ marginBottom: 8 }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					marginBottom: 4,
				}}
			>
				<label
					htmlFor={fieldName}
					style={{
						fontSize: "0.8rem",
						color: "oklch(0.7 0 0)",
						fontWeight: 500,
					}}
				>
					{label}
				</label>
				{parserType && (
					<span
						style={{
							padding: "1px 6px",
							borderRadius: 3,
							background: "oklch(0.2 0.03 250)",
							color: "oklch(0.7 0.1 250)",
							fontSize: "0.65rem",
							fontFamily: "monospace",
						}}
					>
						{parserType}
					</span>
				)}
			</div>
			<textarea
				id={fieldName}
				value={value}
				onChange={handleChange}
				rows={lineCount}
				style={{
					width: "100%",
					padding: "6px 8px",
					borderRadius: 6,
					border: `1px solid ${
						error ? "oklch(0.6 0.2 25)" : "oklch(0.25 0 0)"
					}`,
					background: "oklch(0.1 0 0)",
					color: "oklch(0.9 0 0)",
					fontSize: "0.8rem",
					fontFamily: "monospace",
					resize: "vertical",
					lineHeight: 1.5,
					boxSizing: "border-box",
				}}
			/>
			{error && (
				<p
					style={{
						fontSize: "0.75rem",
						color: "oklch(0.7 0.2 25)",
						marginTop: 2,
					}}
				>
					{error}
				</p>
			)}
		</div>
	);
}

export { RuleFieldEditor };
