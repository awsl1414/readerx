"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { WorkerBridge } from "@/lib/worker-bridge";
import { WorkerBridge as WorkerBridgeClass } from "@/lib/worker-bridge";

const WorkerBridgeContext = createContext<WorkerBridgeClass | null>(null);

function WorkerBridgeProvider({ children }: { children: ReactNode }) {
	const [bridge] = useState(() => new WorkerBridgeClass());

	useEffect(() => () => bridge.dispose(), [bridge]);

	return (
		<WorkerBridgeContext value={bridge}>
			{children}
		</WorkerBridgeContext>
	);
}

function useWorkerBridge(): WorkerBridge {
	const bridge = useContext(WorkerBridgeContext);
	if (!bridge) {
		throw new Error(
			"useWorkerBridge must be used within a <WorkerBridgeProvider />",
		);
	}
	return bridge;
}

export { WorkerBridgeProvider, useWorkerBridge };
