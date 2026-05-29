// features/source-manager/components/debug-pipeline.tsx

"use client";

import type { DebugStageResult } from "../types";

type DebugPipelineProps = {
	readonly stages: readonly DebugStageResult[];
};

function statusIcon(status: DebugStageResult["status"]): string {
	switch (status) {
		case "success":
			return "✓";
		case "error":
			return "✗";
		case "running":
			return "▶";
		case "pending":
			return "○";
	}
}

function statusColor(status: DebugStageResult["status"]): string {
	switch (status) {
		case "success":
			return "oklch(0.7 0.15 150)";
		case "error":
			return "oklch(0.7 0.2 25)";
		case "running":
			return "oklch(0.7 0.15 85)";
		case "pending":
			return "oklch(0.5 0 0)";
	}
}

function DebugPipeline({ stages }: DebugPipelineProps) {
	if (stages.length === 0) {
		return (
			<div
				style={{
					padding: 16,
					color: "oklch(0.5 0 0)",
					textAlign: "center",
				}}
			>
				点击 "Run Pipeline" 开始调试
			</div>
		);
	}

	return (
		<div style={{ padding: "8px 0" }}>
			{stages.map((stage, i) => (
				<div
					key={`${stage.stage}-${i}`}
					style={{
						padding: "6px 12px",
						display: "flex",
						alignItems: "center",
						gap: 8,
						fontSize: "0.8rem",
						color: statusColor(stage.status),
						borderBottom: "1px solid oklch(0.15 0 0)",
					}}
				>
					<span style={{ width: 16, textAlign: "center" }}>
						{statusIcon(stage.status)}
					</span>
					<span style={{ flex: 1 }}>{stage.stage}</span>
					{stage.timing > 0 && (
						<span
							style={{ fontSize: "0.7rem", color: "oklch(0.5 0 0)" }}
						>
							{Math.round(stage.timing)}ms
						</span>
					)}
					{stage.result && (
						<span
							style={{ fontSize: "0.7rem", color: "oklch(0.5 0 0)" }}
						>
							{stage.result.length > 40
								? `${stage.result.slice(0, 40)}...`
								: stage.result}
						</span>
					)}
					{stage.error && (
						<span
							style={{
								fontSize: "0.7rem",
								color: "oklch(0.7 0.2 25)",
							}}
						>
							{stage.error.length > 30
								? `${stage.error.slice(0, 30)}...`
								: stage.error}
						</span>
					)}
				</div>
			))}
		</div>
	);
}

export { DebugPipeline };
