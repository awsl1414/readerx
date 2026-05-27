"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WorkerBridgeProvider } from "./worker-bridge-provider";

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
			}),
	);

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<WorkerBridgeProvider>{children}</WorkerBridgeProvider>
		</QueryProvider>
	);
}
