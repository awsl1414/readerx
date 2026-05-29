// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSources } from "@/features/source-manager/hooks/use-sources";

const { mockRepo } = vi.hoisted(() => {
	const sources = [
		{
			bookSourceUrl: "https://a.com",
			bookSourceName: "Source A",
			enabled: true,
			bookSourceType: 0,
			enabledExplore: false,
			customOrder: 0,
			lastUpdateTime: 0,
			weight: 0,
			respondTime: 0,
		},
		{
			bookSourceUrl: "https://b.com",
			bookSourceName: "Source B",
			enabled: false,
			bookSourceType: 0,
			enabledExplore: false,
			customOrder: 1,
			lastUpdateTime: 0,
			weight: 0,
			respondTime: 0,
		},
	];

	const mockRepo = {
		search: vi.fn(async () => sources),
		getAll: vi.fn(async () => sources),
	};

	return { mockRepo };
});

vi.mock("@readerx/persistence", () => {
	return {
		BookSourceRepository: class {
			search = mockRepo.search;
			getAll = mockRepo.getAll;
		},
		db: { bookSources: {} },
	};
});

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
}

describe("useSources", () => {
	it("returns all sources when filter is 'all' and query is empty", async () => {
		const { result } = renderHook(
			() => useSources({ filterMode: "all", searchQuery: "" }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toHaveLength(2);
	});

	it("filters enabled sources", async () => {
		const { result } = renderHook(
			() => useSources({ filterMode: "enabled", searchQuery: "" }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toHaveLength(1);
		expect(result.current.data?.[0]?.bookSourceName).toBe("Source A");
	});

	it("filters disabled sources", async () => {
		const { result } = renderHook(
			() => useSources({ filterMode: "disabled", searchQuery: "" }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toHaveLength(1);
		expect(result.current.data?.[0]?.bookSourceName).toBe("Source B");
	});
});
