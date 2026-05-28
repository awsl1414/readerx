// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { IntentOverlay } from "@/features/reader/components/intent-overlay";

afterEach(cleanup);

describe("IntentOverlay", () => {
	it("is hidden by default", () => {
		render(
			<IntentOverlay
				visible={false}
				chapterTitle="Chapter 1"
				progressPercent={12}
				onBack={vi.fn()}
				onToc={vi.fn()}
				onPrevChapter={vi.fn()}
				onNextChapter={vi.fn()}
				onProgressClick={vi.fn()}
			/>,
		);
		expect(screen.queryByText("Chapter 1")).toBeNull();
	});

	it("shows controls when visible", () => {
		render(
			<IntentOverlay
				visible={true}
				chapterTitle="Chapter 1"
				progressPercent={50}
				onBack={vi.fn()}
				onToc={vi.fn()}
				onPrevChapter={vi.fn()}
				onNextChapter={vi.fn()}
				onProgressClick={vi.fn()}
			/>,
		);
		expect(screen.getByText("Chapter 1")).toBeDefined();
		expect(screen.getByText("50%")).toBeDefined();
	});

	it("calls onBack when back button clicked", () => {
		const onBack = vi.fn();
		render(
			<IntentOverlay
				visible={true}
				chapterTitle="Ch1"
				progressPercent={0}
				onBack={onBack}
				onToc={vi.fn()}
				onPrevChapter={vi.fn()}
				onNextChapter={vi.fn()}
				onProgressClick={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("←"));
		expect(onBack).toHaveBeenCalledOnce();
	});

	it("calls onToc when TOC button clicked", () => {
		const onToc = vi.fn();
		render(
			<IntentOverlay
				visible={true}
				chapterTitle="Ch1"
				progressPercent={0}
				onBack={vi.fn()}
				onToc={onToc}
				onPrevChapter={vi.fn()}
				onNextChapter={vi.fn()}
				onProgressClick={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("☰"));
		expect(onToc).toHaveBeenCalledOnce();
	});
});
