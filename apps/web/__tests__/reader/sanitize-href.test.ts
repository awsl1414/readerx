// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeHref } from "@/features/reader/utils/sanitize-href";

describe("sanitizeHref", () => {
	it("allows https URLs", () => {
		expect(sanitizeHref("https://example.com")).toBe("https://example.com");
	});

	it("allows http URLs with path", () => {
		expect(sanitizeHref("http://example.com/path")).toBe(
			"http://example.com/path",
		);
	});

	it("allows relative paths starting with /", () => {
		expect(sanitizeHref("/chapter/1")).toBe("/chapter/1");
	});

	it("blocks javascript: protocol", () => {
		expect(sanitizeHref("javascript:alert(1)")).toBeNull();
	});

	it("blocks data: protocol", () => {
		expect(sanitizeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(sanitizeHref("")).toBeNull();
	});

	it("blocks vbscript: protocol", () => {
		expect(sanitizeHref("vbscript:MsgBox(1)")).toBeNull();
	});

	it("blocks mailto: protocol", () => {
		expect(sanitizeHref("mailto:user@example.com")).toBeNull();
	});

	it("allows https with query string", () => {
		expect(sanitizeHref("https://example.com/page?q=test")).toBe(
			"https://example.com/page?q=test",
		);
	});

	it("allows https with fragment", () => {
		expect(sanitizeHref("https://example.com/page#section")).toBe(
			"https://example.com/page#section",
		);
	});

	it("allows relative path without leading slash", () => {
		// "chapter/1" resolves against the base as a relative URL
		// with protocol "https:", so it is allowed
		expect(sanitizeHref("chapter/1")).toBe("chapter/1");
	});
});
