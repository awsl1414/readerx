import { create } from "zustand";

type ViewMode = "grid" | "list";
type SortBy = "recentRead" | "addedTime" | "title" | "manual";

type BookshelfState = {
	readonly viewMode: ViewMode;
	readonly sortBy: SortBy;
	readonly selectedGroupId: string | null;
	readonly managementMode: boolean;
	readonly selectedBookUrls: Set<string>;
};

type BookshelfActions = {
	readonly setViewMode: (mode: ViewMode) => void;
	readonly setSortBy: (sort: SortBy) => void;
	readonly setSelectedGroupId: (groupId: string | null) => void;
	readonly toggleManagementMode: () => void;
	readonly toggleBookSelection: (bookUrl: string) => void;
	readonly clearSelection: () => void;
};

export type BookshelfStore = BookshelfState & BookshelfActions;

export const useBookshelfStore = create<BookshelfStore>()((set) => ({
	viewMode: "grid",
	sortBy: "recentRead",
	selectedGroupId: null,
	managementMode: false,
	selectedBookUrls: new Set<string>(),

	setViewMode: (mode) => set({ viewMode: mode }),
	setSortBy: (sort) => set({ sortBy: sort }),
	setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),
	toggleManagementMode: () =>
		set((state) => ({
			managementMode: !state.managementMode,
			selectedBookUrls: new Set<string>(),
		})),
	toggleBookSelection: (bookUrl) =>
		set((state) => {
			const next = new Set(state.selectedBookUrls);
			if (next.has(bookUrl)) {
				next.delete(bookUrl);
			} else {
				next.add(bookUrl);
			}
			return { selectedBookUrls: next };
		}),
	clearSelection: () => set({ selectedBookUrls: new Set<string>() }),
}));
