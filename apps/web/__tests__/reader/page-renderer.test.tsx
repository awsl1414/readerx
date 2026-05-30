// @vitest-environment happy-dom

import type { RenderPage, RenderRun } from "@readerx/reader-engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ATMOSPHERE_PRESETS } from "@/features/reader/atmosphere";
import { PageRenderer } from "@/features/reader/components/page-renderer";
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

function makePage(overrides: Partial<RenderPage> = {}): RenderPage {
	return {
		index: 0,
		lines: [
			{
				runs: [makeRun({ text: "Hello world" })],
				x: 0,
				y: 0,
				width: 200,
				height: 24,
			},
		],
		dimensions: {
			width: 200,
			height: 600,
			contentHeight: 560,
			paddingTop: 20,
			paddingBottom: 20,
			paddingLeft: 20,
			paddingRight: 20,
		},
		...overrides,
	} as RenderPage;
}

describe("PageRenderer", () => {
	it("renders text content", () => {
		render(<PageRenderer page={makePage()} atmosphere={atm} />);
		expect(screen.getByText("Hello world")).toBeDefined();
	});

	it("renders bold runs as <strong>", () => {
		const page = makePage({
			lines: [
				{
					runs: [makeRun({ text: "Bold text", style: { bold: true } })],
					x: 0,
					y: 0,
					width: 200,
					height: 24,
				},
			],
		} as never);
		render(<PageRenderer page={page} atmosphere={atm} />);
		expect(screen.getByText("Bold text").tagName).toBe("STRONG");
	});

	it("renders link runs as <a>", () => {
		const page = makePage({
			lines: [
				{
					runs: [
						makeRun({ text: "Click", style: { href: "https://example.com" } }),
					],
					x: 0,
					y: 0,
					width: 200,
					height: 24,
				},
			],
		} as never);
		render(<PageRenderer page={page} atmosphere={atm} />);
		const el = screen.getByText("Click");
		expect(el.tagName).toBe("A");
	});

	it("renders multiple lines as <p> elements", () => {
		const page = makePage({
			lines: [
				{
					runs: [makeRun({ text: "Line 1" })],
					x: 0,
					y: 0,
					width: 200,
					height: 24,
				},
				{
					runs: [makeRun({ text: "Line 2" })],
					x: 0,
					y: 24,
					width: 200,
					height: 24,
				},
			],
		} as never);
		render(<PageRenderer page={page} atmosphere={atm} />);
		expect(screen.getByText("Line 1")).toBeDefined();
		expect(screen.getByText("Line 2")).toBeDefined();
	});
});
