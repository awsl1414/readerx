// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterEnd } from "@/features/reader/components/chapter-end";

describe("ChapterEnd", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders chapter title", () => {
		render(
			<ChapterEnd
				chapterTitle="测试章节"
				hasNextChapter={false}
				onNextChapter={vi.fn()}
			/>,
		);

		expect(screen.getByText("测试章节")).toBeTruthy();
	});

	it("renders next chapter button when hasNextChapter=true and fires onNextChapter", () => {
		const onNextChapter = vi.fn();
		render(
			<ChapterEnd
				chapterTitle="测试章节"
				hasNextChapter={true}
				onNextChapter={onNextChapter}
			/>,
		);

		const button = screen.getByRole("button", { name: /继续下一章/ });
		expect(button).toBeTruthy();

		fireEvent.click(button);
		expect(onNextChapter).toHaveBeenCalledTimes(1);
	});

	it("does not show next chapter button when hasNextChapter=false", () => {
		render(
			<ChapterEnd
				chapterTitle="测试章节"
				hasNextChapter={false}
				onNextChapter={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("button")).toBeNull();
	});

	it("shows finished text when no next chapter", () => {
		render(
			<ChapterEnd
				chapterTitle="最后一章"
				hasNextChapter={false}
				onNextChapter={vi.fn()}
			/>,
		);

		expect(screen.getByText("你已读完本章")).toBeTruthy();
	});
});
