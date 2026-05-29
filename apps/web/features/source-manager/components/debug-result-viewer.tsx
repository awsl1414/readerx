// features/source-manager/components/debug-result-viewer.tsx

"use client";

import { useState } from "react";

type DebugResultViewerProps = {
	readonly result: string;
	readonly error: string;
};

function tryFormat(text: string): string {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
}

function DebugResultViewer({ result, error }: DebugResultViewerProps) {
	const [view, setView] = useState<"raw" | "formatted">("raw");

	if (error) {
		return (
			<pre
				style={{
					padding: 8,
					background: "oklch(0.15 0.02 25)",
					borderRadius: 6,
					color: "oklch(0.7 0.2 25)",
					fontSize: "0.75rem",
					fontFamily: "monospace",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all",
				}}
			>
				{error}
			</pre>
		);
	}

	return (
		<div>
			<div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
				<button
					type="button"
					onClick={() => setView("raw")}
					style={{
						padding: "2px 8px",
						borderRadius: 3,
						border: "none",
						background:
							view === "raw" ? "oklch(0.25 0 0)" : "transparent",
						color:
							view === "raw" ? "oklch(0.9 0 0)" : "oklch(0.5 0 0)",
						cursor: "pointer",
						fontSize: "0.75rem",
					}}
				>
					raw
				</button>
				<button
					type="button"
					onClick={() => setView("formatted")}
					style={{
						padding: "2px 8px",
						borderRadius: 3,
						border: "none",
						background:
							view === "formatted"
								? "oklch(0.25 0 0)"
								: "transparent",
						color:
							view === "formatted"
								? "oklch(0.9 0 0)"
								: "oklch(0.5 0 0)",
						cursor: "pointer",
						fontSize: "0.75rem",
					}}
				>
					formatted
				</button>
			</div>
			<pre
				style={{
					padding: 8,
					background: "oklch(0.1 0 0)",
					borderRadius: 6,
					color: "oklch(0.85 0 0)",
					fontSize: "0.75rem",
					fontFamily: "monospace",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all",
					maxHeight: 300,
					overflow: "auto",
				}}
			>
				{view === "formatted" ? tryFormat(result) : result}
			</pre>
		</div>
	);
}

export { DebugResultViewer };
