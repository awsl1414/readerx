import { create } from "zustand";
import type { FilterMode } from "./types";

type SourceManagerState = {
	selectedSourceUrl: string | null;
	filterMode: FilterMode;
	searchQuery: string;
	debuggerOpen: boolean;
	expandedSections: Set<string>;
	mobileLayer: 0 | 1 | 2;
	isDirty: boolean;
};

type SourceManagerActions = {
	selectSource: (url: string | null) => void;
	setFilterMode: (mode: FilterMode) => void;
	setSearchQuery: (query: string) => void;
	toggleDebugger: () => void;
	setDebuggerOpen: (open: boolean) => void;
	toggleSection: (section: string) => void;
	navigateToLayer: (layer: 0 | 1 | 2) => void;
	goBack: () => void;
	setDirty: (dirty: boolean) => void;
};

const useSourceManagerStore = create<SourceManagerState & SourceManagerActions>(
	(set) => ({
		selectedSourceUrl: null,
		filterMode: "all" as FilterMode,
		searchQuery: "",
		debuggerOpen: false,
		expandedSections: new Set(["basic"]),
		mobileLayer: 0,
		isDirty: false,

		selectSource: (url) =>
			set({
				selectedSourceUrl: url,
				debuggerOpen: false,
				isDirty: false,
				mobileLayer: url ? 1 : 0,
			}),
		setFilterMode: (mode) => set({ filterMode: mode }),
		setSearchQuery: (query) => set({ searchQuery: query }),
		toggleDebugger: () => set((s) => ({ debuggerOpen: !s.debuggerOpen })),
		setDebuggerOpen: (open) =>
			set({ debuggerOpen: open, mobileLayer: open ? 2 : 1 }),
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
		navigateToLayer: (layer) => set({ mobileLayer: layer }),
		goBack: () =>
			set((s) => {
				if (s.mobileLayer === 2) return { mobileLayer: 1, debuggerOpen: false };
				if (s.mobileLayer === 1)
					return { mobileLayer: 0, selectedSourceUrl: null, isDirty: false };
				return s;
			}),
		setDirty: (dirty) => set({ isDirty: dirty }),
	}),
);

export { useSourceManagerStore };
