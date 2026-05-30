// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TocPanel } from "@/features/reader/components/toc-panel";
import type { ChapterInfo } from "@/features/reader/types";

const chapters: readonly ChapterInfo[] = [
	{ index: 0, title: "第一章", isVolume: false },
	{ index: 1, title: "第二章", isVolume: false },
	{ index: 2, title: "第三章", isVolume: false },
];

describe("TocPanel", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders chapter list with titles", () => {
		render(
			<TocPanel
				chapters={chapters}
				currentChapter={0}
				onSelect={vi.fn()}
				isMobile={false}
			/>,
		);

		expect(screen.getByText(/第一章/)).toBeTruthy();
		expect(screen.getByText(/第二章/)).toBeTruthy();
		expect(screen.getByText(/第三章/)).toBeTruthy();
	});

	it("highlights current chapter", () => {
		const { container } = render(
			<TocPanel
				chapters={chapters}
				currentChapter={1}
				onSelect={vi.fn()}
				isMobile={false}
			/>,
		);

		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(3);

		const currentButton = buttons[1];
		expect(currentButton).toBeTruthy();
		// Active chapter uses font-medium and bg-foreground/10
		expect(currentButton?.className).toContain("font-medium");
	});

	it("fires onSelect with correct index when chapter is clicked", () => {
		const onSelect = vi.fn();
		render(
			<TocPanel
				chapters={chapters}
				currentChapter={0}
				onSelect={onSelect}
				isMobile={false}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		expect(buttons).toHaveLength(3);

		const target = buttons[2];
		expect(target).toBeTruthy();
		if (!target) return;
		fireEvent.click(target);

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(2);
	});

	it("applies mobile width class when isMobile=true", () => {
		const { container } = render(
			<TocPanel
				chapters={chapters}
				currentChapter={0}
				onSelect={vi.fn()}
				isMobile={true}
			/>,
		);

		const panel = container.firstChild as HTMLElement;
		expect(panel).toBeTruthy();
		expect(panel.className).toContain("w-[60%]");
	});

	it("applies desktop width class when isMobile=false", () => {
		const { container } = render(
			<TocPanel
				chapters={chapters}
				currentChapter={0}
				onSelect={vi.fn()}
				isMobile={false}
			/>,
		);

		const panel = container.firstChild as HTMLElement;
		expect(panel).toBeTruthy();
		expect(panel.className).toContain("w-[35%]");
	});
});
