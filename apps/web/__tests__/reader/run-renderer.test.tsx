// @vitest-environment jsdom

import type { RenderRun } from "@readerx/reader-engine";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ATMOSPHERE_PRESETS } from "@/features/reader/atmosphere";
import { RunRenderer } from "@/features/reader/components/run-renderer";
import type { ReadingAtmosphere } from "@/features/reader/types";

const atm = ATMOSPHERE_PRESETS.novel as ReadingAtmosphere;

function makeRun(overrides: Partial<RenderRun> = {}): RenderRun {
	return {
		text: "Hello",
		x: 0,
		width: 50,
		sourceNodeId: "n1",
		...overrides,
	} as RenderRun;
}

afterEach(cleanup);

describe("RunRenderer", () => {
	it("renders plain text run", () => {
		render(
			<RunRenderer run={makeRun({ text: "Plain text" })} atmosphere={atm} />,
		);
		const el = screen.getByText("Plain text");
		expect(el.tagName).toBe("SPAN");
	});

	it("renders bold style (Strong)", () => {
		render(
			<RunRenderer
				run={makeRun({ text: "Bold text", style: { bold: true } })}
				atmosphere={atm}
			/>,
		);
		const el = screen.getByText("Bold text");
		expect(el.tagName).toBe("STRONG");
	});

	it("renders italic style (Emphasis)", () => {
		render(
			<RunRenderer
				run={makeRun({ text: "Italic text", style: { italic: true } })}
				atmosphere={atm}
			/>,
		);
		const el = screen.getByText("Italic text");
		expect(el.tagName).toBe("EM");
	});

	it("renders bold+italic combined", () => {
		render(
			<RunRenderer
				run={makeRun({
					text: "Bold italic",
					style: { bold: true, italic: true },
				})}
				atmosphere={atm}
			/>,
		);
		const el = screen.getByText("Bold italic");
		expect(el.tagName).toBe("EM");
		expect(el.parentElement?.tagName).toBe("STRONG");
	});

	it("renders link run as <a> with href", () => {
		render(
			<RunRenderer
				run={makeRun({
					text: "Click here",
					style: { href: "https://example.com" },
				})}
				atmosphere={atm}
			/>,
		);
		const el = screen.getByText("Click here");
		expect(el.tagName).toBe("A");
		expect(el.getAttribute("href")).toBe("https://example.com");
	});

	it("renders link run with bold style", () => {
		render(
			<RunRenderer
				run={makeRun({
					text: "Bold link",
					style: { bold: true, href: "https://example.com" },
				})}
				atmosphere={atm}
			/>,
		);
		const el = screen.getByText("Bold link");
		expect(el.tagName).toBe("A");
		expect(el.getAttribute("href")).toBe("https://example.com");
	});

	it("applies atmosphere color to text", () => {
		render(<RunRenderer run={makeRun({ text: "Styled" })} atmosphere={atm} />);
		const el = screen.getByText("Styled");
		expect(el.style.fontSize).toBe(`${atm.fontSize}px`);
		expect(el.style.lineHeight).toBe(String(atm.lineHeight));
	});

	it("empty text run", () => {
		render(<RunRenderer run={makeRun({ text: "" })} atmosphere={atm} />);
		const el = document.querySelector("span");
		expect(el).toBeDefined();
		expect(el?.textContent).toBe("");
	});
});
