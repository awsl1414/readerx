// features/source-manager/components/source-debugger.tsx

"use client";

import { useState } from "react";
import type { BookSourceRecord } from "@readerx/persistence";
import { useSourceDebug } from "../hooks/use-source-debug";
import { useSourceManagerStore } from "../store";
import { DebugConsole } from "./debug-console";
import { DebugPipeline } from "./debug-pipeline";
import { DebugResultViewer } from "./debug-result-viewer";

type SourceDebuggerProps = {
	readonly source: BookSourceRecord;
};

type DebuggerTab = "pipeline" | "console";

function SourceDebugger({ source }: SourceDebuggerProps) {
	const { stages, logs, isRunning, runPipeline, abort, reset } =
		useSourceDebug();
	const setDebuggerOpen = useSourceManagerStore((s) => s.setDebuggerOpen);
	const [testUrl, setTestUrl] = useState("");
	const [activeTab, setActiveTab] = useState<DebuggerTab>("pipeline");

	const lastStage = stages[stages.length - 1];

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			{/* Header */}
			<div
				style={{
					padding: "8px 12px",
					borderBottom: "1px solid oklch(0.2 0 0)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<span style={{ fontSize: "0.85rem", fontWeight: 500 }}>调试器</span>
				<button
					type="button"
					onClick={() => setDebuggerOpen(false)}
					style={{
						background: "transparent",
						border: "none",
						color: "oklch(0.5 0 0)",
						cursor: "pointer",
						fontSize: "0.8rem",
					}}
				>
					&#x25B8; 收起
				</button>
			</div>

			{/* URL input */}
			<div
				style={{
					padding: "8px 12px",
					borderBottom: "1px solid oklch(0.2 0 0)",
				}}
			>
				<input
					type="url"
					placeholder="输入测试 URL..."
					value={testUrl}
					onChange={(e) => setTestUrl(e.target.value)}
					style={{
						width: "100%",
						padding: "6px 8px",
						borderRadius: 6,
						border: "1px solid oklch(0.3 0 0)",
						background: "oklch(0.12 0 0)",
						color: "oklch(0.9 0 0)",
						fontSize: "0.8rem",
						boxSizing: "border-box",
					}}
				/>
				<div style={{ display: "flex", gap: 8, marginTop: 6 }}>
					<button
						type="button"
						onClick={() => {
							void runPipeline(testUrl);
						}}
						disabled={isRunning || !testUrl.trim()}
						style={{
							flex: 1,
							padding: "5px 12px",
							borderRadius: 6,
							background: "oklch(0.5 0.2 150)",
							color: "white",
							border: "none",
							cursor: isRunning ? "wait" : "pointer",
							fontSize: "0.8rem",
						}}
					>
						{isRunning ? "执行中..." : "▶ Run Pipeline"}
					</button>
					{isRunning && (
						<button
							type="button"
							onClick={abort}
							style={{
								padding: "5px 12px",
								borderRadius: 6,
								background: "oklch(0.5 0.2 25)",
								color: "white",
								border: "none",
								cursor: "pointer",
								fontSize: "0.8rem",
							}}
						>
							&#x25A0; Stop
						</button>
					)}
					<button
						type="button"
						onClick={reset}
						style={{
							padding: "5px 8px",
							borderRadius: 6,
							border: "1px solid oklch(0.3 0 0)",
							background: "transparent",
							color: "oklch(0.6 0 0)",
							cursor: "pointer",
							fontSize: "0.8rem",
						}}
					>
						重置
					</button>
				</div>
			</div>

			{/* Tab switch */}
			<div
				style={{
					display: "flex",
					borderBottom: "1px solid oklch(0.2 0 0)",
				}}
			>
				{(["pipeline", "console"] as const).map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setActiveTab(t)}
						style={{
							flex: 1,
							padding: "6px 0",
							background: "transparent",
							border: "none",
							borderBottom:
								activeTab === t
									? "2px solid oklch(0.6 0.2 250)"
									: "none",
							color:
								activeTab === t
									? "oklch(0.85 0 0)"
									: "oklch(0.5 0 0)",
							cursor: "pointer",
							fontSize: "0.8rem",
						}}
					>
						{t === "pipeline" ? "Pipeline" : "Console"}
					</button>
				))}
			</div>

			{/* Content */}
			<div style={{ flex: 1, overflow: "auto" }}>
				{activeTab === "pipeline" && (
					<>
						<DebugPipeline stages={stages} />
						{lastStage && (
							<div style={{ padding: 12 }}>
								<DebugResultViewer
									result={lastStage.result}
									error={lastStage.error}
								/>
							</div>
						)}
					</>
				)}
				{activeTab === "console" && <DebugConsole logs={logs} />}
			</div>
		</div>
	);
}

export { SourceDebugger };
