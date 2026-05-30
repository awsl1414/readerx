// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceFilterBar } from "@/features/source-manager/components/source-filter-bar";
import zhMessages from "@/messages/zh.json";

const messages = zhMessages;

afterEach(cleanup);

function renderWithProviders(ui: React.ReactElement) {
	return render(
		<NextIntlClientProvider locale="zh" messages={messages}>
			{ui}
		</NextIntlClientProvider>,
	);
}

describe("SourceFilterBar", () => {
	it("renders filter buttons", () => {
		renderWithProviders(
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

	it("calls onFilterChange when clicking a filter", async () => {
		const onFilterChange = vi.fn();
		renderWithProviders(
			<SourceFilterBar
				filterMode="all"
				searchQuery=""
				onFilterChange={onFilterChange}
				onSearchChange={vi.fn()}
				onImport={vi.fn()}
			/>,
		);
		await userEvent.click(screen.getByText("已启用"));
		expect(onFilterChange).toHaveBeenCalledWith("enabled");
	});
});
