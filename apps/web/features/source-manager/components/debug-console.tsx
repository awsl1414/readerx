// features/source-manager/components/debug-console.tsx

"use client";

import type { DebugLog } from "../types";

type DebugConsoleProps = {
	readonly logs: readonly DebugLog[];
};

function levelColor(level: DebugLog["level"]): string {
	switch (level) {
		case "info":
			return "oklch(0.7 0 0)";
		case "warn":
			return "oklch(0.75 0.15 85)";
		case "error":
			return "oklch(0.7 0.2 25)";
	}
}

function DebugConsole({ logs }: DebugConsoleProps) {
	return (
		<div
			style={{
				fontFamily: "monospace",
				fontSize: "0.75rem",
				padding: 8,
				maxHeight: 200,
				overflow: "auto",
			}}
		>
			{logs.length === 0 ? (
				<div style={{ color: "oklch(0.4 0 0)" }}>No logs</div>
			) : (
				logs.map((log, i) => (
					<div
						key={i}
						style={{ color: levelColor(log.level), padding: "2px 0" }}
					>
						[{log.level}] {log.message}
					</div>
				))
			)}
		</div>
	);
}

export { DebugConsole };
