"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

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
			<pre className="max-h-[300px] overflow-auto rounded-md bg-destructive/10 p-2 font-mono text-xs text-destructive whitespace-pre-wrap break-all">
				{error}
			</pre>
		);
	}

	return (
		<div>
			<div className="mb-1 flex gap-1">
				{(["raw", "formatted"] as const).map((mode) => (
					<button
						key={mode}
						type="button"
						onClick={() => setView(mode)}
						className={cn(
							"cursor-pointer rounded px-2 py-0.5 text-xs transition-colors",
							view === mode
								? "bg-surface-2 text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{mode}
					</button>
				))}
			</div>
			<pre className="max-h-[300px] overflow-auto rounded-md bg-surface-1 p-2 font-mono text-xs text-foreground/85 whitespace-pre-wrap break-all">
				{view === "formatted" ? tryFormat(result) : result}
			</pre>
		</div>
	);
}

export { DebugResultViewer };
