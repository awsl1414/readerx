// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookCard } from "@/features/bookshelf/components/book-card";

describe("BookCard", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders book name and author", () => {
		render(
			<BookCard
				bookUrl="test://book"
				name="测试书籍"
				author="测试作者"
				coverUrl={null}
				progress={65}
			/>,
		);
		expect(screen.getByText("测试书籍")).toBeDefined();
		expect(screen.getByText("测试作者")).toBeDefined();
	});

	it("renders progress when > 0", () => {
		render(
			<BookCard
				bookUrl="test://book"
				name="书"
				author="作者"
				coverUrl={null}
				progress={65}
			/>,
		);
		expect(screen.getByText("65%")).toBeDefined();
	});

	it("hides progress when 0", () => {
		render(
			<BookCard
				bookUrl="test://book"
				name="书"
				author="作者"
				coverUrl={null}
				progress={0}
			/>,
		);
		expect(screen.queryByText("0%")).toBeNull();
	});
});
