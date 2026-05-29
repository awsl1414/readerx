// features/source-manager/hooks/use-source-debug.ts

import { useCallback, useRef, useState } from "react";
import { useWorkerBridge } from "@/components/worker-bridge-provider";
import type {
	DebugLog,
	DebugStage,
	DebugStageResult,
	NetworkRequest,
} from "../types";

type UseSourceDebugReturn = {
	readonly stages: readonly DebugStageResult[];
	readonly networkRequests: readonly NetworkRequest[];
	readonly logs: readonly DebugLog[];
	readonly isRunning: boolean;
	readonly runPipeline: (testUrl: string) => Promise<void>;
	readonly runStage: (
		stage: DebugStage,
		rule: string,
		content: string,
	) => Promise<void>;
	readonly abort: () => void;
	readonly reset: () => void;
};

function useSourceDebug(): UseSourceDebugReturn {
	const bridge = useWorkerBridge();
	const [stages, setStages] = useState<DebugStageResult[]>([]);
	const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>(
		[],
	);
	const [logs, setLogs] = useState<DebugLog[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	const addLog = useCallback(
		(level: DebugLog["level"], message: string) => {
			setLogs((prev) => [
				...prev,
				{ level, message, timestamp: Date.now() },
			]);
		},
		[],
	);

	const runStage = useCallback(
		async (stage: DebugStage, rule: string, content: string) => {
			const start = performance.now();
			const entry: DebugStageResult = {
				stage,
				status: "running",
				timing: 0,
				requestUrl: "",
				responseStatus: 0,
				result: "",
				error: "",
				logs: [],
			};

			setStages((prev) => [...prev, entry]);

			try {
				const result = await bridge.executeRule(rule, content);
				const timing = performance.now() - start;

				const final: DebugStageResult = {
					...entry,
					status: result.ok ? "success" : "error",
					timing,
					result: result.ok
						? typeof result.value === "string"
							? result.value
							: result.value.join("\n")
						: "",
					error: result.ok ? "" : result.error.message,
				};

				setStages((prev) =>
					prev.map((s) =>
						s.stage === stage && s.status === "running" ? final : s,
					),
				);
				addLog(
					result.ok ? "info" : "error",
					`[${stage}] ${result.ok ? "Success" : "Failed: " + result.error.message}`,
				);
			} catch (e: unknown) {
				const timing = performance.now() - start;
				const errorMsg = e instanceof Error ? e.message : String(e);
				setStages((prev) =>
					prev.map((s) =>
						s.stage === stage && s.status === "running"
							? { ...s, status: "error", timing, error: errorMsg }
							: s,
					),
				);
				addLog("error", `[${stage}] Error: ${errorMsg}`);
			}
		},
		[bridge, addLog],
	);

	const runPipeline = useCallback(
		async (testUrl: string) => {
			setIsRunning(true);
			setStages([]);
			setLogs([]);
			setNetworkRequests([]);

			const controller = new AbortController();
			abortRef.current = controller;

			addLog("info", `Pipeline started with URL: ${testUrl}`);

			setIsRunning(false);
			addLog("info", "Pipeline completed");
		},
		[addLog],
	);

	const abort = useCallback(() => {
		abortRef.current?.abort();
		setIsRunning(false);
		addLog("warn", "Pipeline aborted by user");
	}, [addLog]);

	const reset = useCallback(() => {
		setStages([]);
		setNetworkRequests([]);
		setLogs([]);
		setIsRunning(false);
	}, []);

	return {
		stages,
		networkRequests,
		logs,
		isRunning,
		runPipeline,
		runStage,
		abort,
		reset,
	};
}

export { useSourceDebug };
