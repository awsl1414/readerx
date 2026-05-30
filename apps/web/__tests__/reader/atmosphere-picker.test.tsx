// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtmospherePicker } from "@/features/reader/components/atmosphere-picker";

describe("AtmospherePicker", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders three preset buttons", () => {
		const onSelect = vi.fn();
		render(<AtmospherePicker current="novel" onSelect={onSelect} />);

		const buttons = screen.getAllByRole("button");
		expect(buttons).toHaveLength(3);
	});

	it("highlights current preset", () => {
		const onSelect = vi.fn();
		const { container } = render(
			<AtmospherePicker current="focus" onSelect={onSelect} />,
		);

		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(3);

		// The "focus" button should have opacity-100 class, others opacity-30
		for (const button of buttons) {
		const html = button as HTMLElement;
		if (html.title === "专注") {
		expect(html.className).toContain("opacity-100");
		expect(html.className).toContain("border-b");
		} else {
		expect(html.className).toContain("opacity-30");
		}
		}
	});

	it("calls onSelect when clicked", () => {
		const onSelect = vi.fn();
		render(<AtmospherePicker current="novel" onSelect={onSelect} />);

		const buttons = screen.getAllByRole("button");
		expect(buttons).toHaveLength(3);

		for (let i = 0; i < buttons.length; i++) {
			const button = buttons[i];
			if (button === undefined) continue;
			fireEvent.click(button);
		}

		expect(onSelect).toHaveBeenCalledTimes(3);
		expect(onSelect).toHaveBeenNthCalledWith(1, "novel");
		expect(onSelect).toHaveBeenNthCalledWith(2, "focus");
		expect(onSelect).toHaveBeenNthCalledWith(3, "dense");
	});
});