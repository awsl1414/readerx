"use client";

import { AlertCircle, Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DebugStageResult } from "../types";

type DebugPipelineProps = {
	readonly stages: readonly DebugStageResult[];
};

function StatusIcon({ status }: { status: DebugStageResult["status"] }) {
	switch (status) {
		case "success":
			return <Check className="size-3.5 text-green-600 dark:text-green-400" />;
		case "error":
			return <AlertCircle className="size-3.5 text-destructive" />;
		case "running":
			return (
				<Loader2 className="size-3.5 animate-spin text-yellow-600 dark:text-yellow-400" />
			);
		case "pending":
			return <Circle className="size-3.5 text-muted-foreground" />;
	}
}

function stageColor(status: DebugStageResult["status"]): string {
	switch (status) {
		case "success":
			return "text-green-600 dark:text-green-400";
		case "error":
			return "text-destructive";
		case "running":
			return "text-yellow-600 dark:text-yellow-400";
		case "pending":
			return "text-muted-foreground";
	}
}

function DebugPipeline({ stages }: DebugPipelineProps) {
	if (stages.length === 0) {
		return (
			<div className="py-4 text-center text-sm text-muted-foreground">
				{`点击 "Run Pipeline" 开始调试`}
			</div>
		);
	}

	return (
		<div className="divide-y divide-border py-1">
			{stages.map((stage, _i) => (
				<div
					key={`${stage.stage}-${stage.timing}`}
					className={cn(
						"flex items-center gap-2 px-3 py-1.5 text-xs",
						stageColor(stage.status),
					)}
				>
					<StatusIcon status={stage.status} />
					<span className="flex-1">{stage.stage}</span>
					{stage.timing > 0 && (
						<span className="text-[0.65rem] text-muted-foreground">
							{Math.round(stage.timing)}ms
						</span>
					)}
					{stage.result && (
						<span className="max-w-[160px] truncate text-[0.65rem] text-muted-foreground">
							{stage.result}
						</span>
					)}
					{stage.error && (
						<span className="max-w-[120px] truncate text-[0.65rem] text-destructive">
							{stage.error}
						</span>
					)}
				</div>
			))}
		</div>
	);
}

export { DebugPipeline };
