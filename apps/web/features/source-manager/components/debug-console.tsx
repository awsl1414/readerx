"use client";

import { cn } from "@/lib/cn";
import type { DebugLog } from "../types";

type DebugConsoleProps = {
	readonly logs: readonly DebugLog[];
};

function levelClassName(level: DebugLog["level"]): string {
	switch (level) {
		case "info":
			return "text-muted-foreground";
		case "warn":
			return "text-yellow-600 dark:text-yellow-400";
		case "error":
			return "text-destructive";
	}
}

function DebugConsole({ logs }: DebugConsoleProps) {
	return (
		<div className="max-h-[200px] overflow-y-auto p-2 font-mono text-xs">
			{logs.length === 0 ? (
				<div className="text-muted-foreground/60">No logs</div>
			) : (
				logs.map((log, _i) => (
					<div
						key={log.timestamp}
						className={cn("py-0.5", levelClassName(log.level))}
					>
						[{log.level}] {log.message}
					</div>
				))
			)}
		</div>
	);
}

export { DebugConsole };
