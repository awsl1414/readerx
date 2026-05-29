// features/source-manager/store.ts
// Source manager UI state only. Data lives in TanStack Query.

import { create } from "zustand";
import type { FilterMode } from "./types";

type SourceManagerState = {
	selectedSourceUrl: string | null;
	filterMode: FilterMode;
	searchQuery: string;
	debuggerOpen: boolean;
	expandedSections: Set<string>;
};

type SourceManagerActions = {
	selectSource: (url: string | null) => void;
	setFilterMode: (mode: FilterMode) => void;
	setSearchQuery: (query: string) => void;
	toggleDebugger: () => void;
	setDebuggerOpen: (open: boolean) => void;
	toggleSection: (section: string) => void;
};

const useSourceManagerStore = create<
	SourceManagerState & SourceManagerActions
>((set) => ({
	selectedSourceUrl: null,
	filterMode: "all",
	searchQuery: "",
	debuggerOpen: false,
	expandedSections: new Set(["basic"]),

	selectSource: (url) =>
		set({ selectedSourceUrl: url, debuggerOpen: false }),
	setFilterMode: (mode) => set({ filterMode: mode }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	toggleDebugger: () =>
		set((s) => ({ debuggerOpen: !s.debuggerOpen })),
	setDebuggerOpen: (open) => set({ debuggerOpen: open }),
	toggleSection: (section) =>
		set((s) => {
			const next = new Set(s.expandedSections);
			if (next.has(section)) {
				next.delete(section);
			} else {
				next.add(section);
			}
			return { expandedSections: next };
		}),
}));

export { useSourceManagerStore };
