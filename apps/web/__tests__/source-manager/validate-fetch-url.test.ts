// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateFetchUrl } from "@/features/source-manager/utils/validate-fetch-url";

describe("validateFetchUrl", () => {
	describe("valid URLs", () => {
		it("accepts https URL", () => {
			expect(validateFetchUrl("https://example.com/sources.json")).toBeNull();
		});

		it("accepts http URL", () => {
			expect(validateFetchUrl("http://example.com")).toBeNull();
		});

		it("accepts public IP address", () => {
			expect(validateFetchUrl("http://8.8.8.8/")).toBeNull();
		});

		it("accepts https URL with port", () => {
			expect(validateFetchUrl("https://example.com:8443/api")).toBeNull();
		});
	});

	describe("invalid protocols", () => {
		it("rejects file:// protocol", () => {
			expect(validateFetchUrl("file:///etc/passwd")).toBe(
				"Only http: and https: URLs are allowed",
			);
		});

		it("rejects ftp:// protocol", () => {
			expect(validateFetchUrl("ftp://example.com")).toBe(
				"Only http: and https: URLs are allowed",
			);
		});

		it("rejects javascript: protocol", () => {
			expect(validateFetchUrl("javascript:void(0)")).toBe(
				"Only http: and https: URLs are allowed",
			);
		});

		it("rejects data: protocol", () => {
			expect(validateFetchUrl("data:text/html,<h1>test</h1>")).toBe(
				"Only http: and https: URLs are allowed",
			);
		});
	});

	describe("malformed URLs", () => {
		it("rejects plain text", () => {
			expect(validateFetchUrl("not-a-url")).toBe("Invalid URL format");
		});

		it("rejects empty string", () => {
			expect(validateFetchUrl("")).toBe("Invalid URL format");
		});
	});

	describe("private / reserved IPs", () => {
		it("rejects 192.168.x.x (private Class C)", () => {
			expect(validateFetchUrl("http://192.168.1.1/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects 10.x.x.x (private Class A)", () => {
			expect(validateFetchUrl("http://10.0.0.1/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects 127.0.0.1 (loopback)", () => {
			expect(validateFetchUrl("http://127.0.0.1/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects 169.254.169.254 (cloud metadata)", () => {
			expect(validateFetchUrl("http://169.254.169.254/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects 172.20.0.1 (private Class B)", () => {
			expect(validateFetchUrl("http://172.20.0.1/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects 172.16.0.1 (private Class B lower bound)", () => {
			expect(validateFetchUrl("http://172.16.0.1/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects 172.31.255.255 (private Class B upper bound)", () => {
			expect(validateFetchUrl("http://172.31.255.255/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects localhost", () => {
			expect(validateFetchUrl("http://localhost/")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects localhost with port", () => {
			expect(validateFetchUrl("http://localhost:3000/api")).toBe(
				"Private network addresses are not allowed",
			);
		});

		it("rejects 0.0.0.0", () => {
			expect(validateFetchUrl("http://0.0.0.0/")).toBe(
				"Private network addresses are not allowed",
			);
		});
	});

	describe("public IP boundary checks", () => {
		it("accepts 172.15.255.255 (just below private range)", () => {
			expect(validateFetchUrl("http://172.15.255.255/")).toBeNull();
		});

		it("accepts 172.32.0.1 (just above private range)", () => {
			expect(validateFetchUrl("http://172.32.0.1/")).toBeNull();
		});
	});
});
