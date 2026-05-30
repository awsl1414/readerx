import { describe, it, expect, beforeEach } from "vitest";
import { useBookshelfStore } from "@/features/bookshelf/store";

describe("bookshelfStore", () => {
	beforeEach(() => {
		useBookshelfStore.setState({
			viewMode: "grid",
			sortBy: "recentRead",
			selectedGroupId: null,
			managementMode: false,
			selectedBookUrls: new Set(),
		});
	});

	it("should toggle view mode", () => {
		const store = useBookshelfStore.getState();
		expect(store.viewMode).toBe("grid");

		useBookshelfStore.getState().setViewMode("list");
		expect(useBookshelfStore.getState().viewMode).toBe("list");
	});

	it("should change sort mode", () => {
		useBookshelfStore.getState().setSortBy("title");
		expect(useBookshelfStore.getState().sortBy).toBe("title");
	});

	it("should select a group", () => {
		useBookshelfStore.getState().setSelectedGroupId("group-1");
		expect(useBookshelfStore.getState().selectedGroupId).toBe("group-1");
	});

	it("should toggle management mode", () => {
		useBookshelfStore.getState().toggleManagementMode();
		expect(useBookshelfStore.getState().managementMode).toBe(true);
		useBookshelfStore.getState().toggleManagementMode();
		expect(useBookshelfStore.getState().managementMode).toBe(false);
	});

	it("should toggle book selection", () => {
		useBookshelfStore.getState().toggleBookSelection("book-1");
		expect(useBookshelfStore.getState().selectedBookUrls.has("book-1")).toBe(
			true,
		);
		useBookshelfStore.getState().toggleBookSelection("book-1");
		expect(useBookshelfStore.getState().selectedBookUrls.has("book-1")).toBe(
			false,
		);
	});

	it("should clear selection", () => {
		useBookshelfStore.getState().toggleBookSelection("book-1");
		useBookshelfStore.getState().toggleBookSelection("book-2");
		useBookshelfStore.getState().clearSelection();
		expect(useBookshelfStore.getState().selectedBookUrls.size).toBe(0);
	});
});
