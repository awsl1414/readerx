// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceFilterBar } from "@/features/source-manager/components/source-filter-bar";

afterEach(cleanup);

describe("SourceFilterBar", () => {
	it("renders filter buttons", () => {
		render(
			<SourceFilterBar
				filterMode="all"
				searchQuery=""
				onFilterChange={vi.fn()}
				onSearchChange={vi.fn()}
				onImport={vi.fn()}
			/>,
		);
		expect(screen.getByText("全部")).toBeTruthy();
		expect(screen.getByText("已启用")).toBeTruthy();
		expect(screen.getByText("已禁用")).toBeTruthy();
	});

	it("calls onFilterChange when clicking a filter", () => {
		const onFilterChange = vi.fn();
		render(
			<SourceFilterBar
				filterMode="all"
				searchQuery=""
				onFilterChange={onFilterChange}
				onSearchChange={vi.fn()}
				onImport={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("已启用"));
		expect(onFilterChange).toHaveBeenCalledWith("enabled");
	});
});
