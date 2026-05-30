import { create } from "zustand";
import type { RssFilterMode } from "./types";

type RssSourceState = {
	selectedSourceUrl: string | null;
	filterMode: RssFilterMode;
	searchQuery: string;
	mobileLayer: 0 | 1;
	expandedSections: Set<string>;
};

type RssSourceActions = {
	selectSource: (url: string | null) => void;
	setFilterMode: (mode: RssFilterMode) => void;
	setSearchQuery: (query: string) => void;
	navigateToLayer: (layer: 0 | 1) => void;
	goBack: () => void;
	toggleSection: (section: string) => void;
};

const useRssSourceStore = create<RssSourceState & RssSourceActions>((set) => ({
	selectedSourceUrl: null,
	filterMode: "all" as RssFilterMode,
	searchQuery: "",
	mobileLayer: 0,
	expandedSections: new Set(["basic"]),

	selectSource: (url) =>
		set({ selectedSourceUrl: url, mobileLayer: url ? 1 : 0 }),
	setFilterMode: (mode) => set({ filterMode: mode }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	navigateToLayer: (layer) => set({ mobileLayer: layer }),
	goBack: () => set({ mobileLayer: 0, selectedSourceUrl: null }),
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

export { useRssSourceStore };
