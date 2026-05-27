import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../src/fetch";

describe("HttpClient", () => {
	it("sets default headers", () => {
		const client = new HttpClient();
		client.setDefaultHeaders({ "X-Default": "yes" });
		expect(client.defaultHeaders).toEqual({ "X-Default": "yes" });
	});

	it("merges default headers on subsequent setDefaultHeaders calls", () => {
		const client = new HttpClient();
		client.setDefaultHeaders({ A: "1" });
		client.setDefaultHeaders({ B: "2" });
		expect(client.defaultHeaders).toEqual({ A: "1", B: "2" });
	});

	it("overwrites existing default header", () => {
		const client = new HttpClient();
		client.setDefaultHeaders({ A: "1" });
		client.setDefaultHeaders({ A: "2" });
		expect(client.defaultHeaders).toEqual({ A: "2" });
	});

	it("calls fetch with merged headers", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("ok"));
		const client = new HttpClient();
		client.setDefaultHeaders({ Auth: "token" });
		await client.fetch("https://example.com", {
			headers: { "Content-Type": "json" },
		});
		expect(spy).toHaveBeenCalledWith("https://example.com", {
			method: "GET",
			headers: { Auth: "token", "Content-Type": "json" },
			body: null,
		});
		spy.mockRestore();
	});

	it("request headers override default headers", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("ok"));
		const client = new HttpClient();
		client.setDefaultHeaders({ Auth: "default" });
		await client.fetch("https://example.com", {
			headers: { Auth: "override" },
		});
		expect(spy).toHaveBeenCalledWith("https://example.com", {
			method: "GET",
			headers: { Auth: "override" },
			body: null,
		});
		spy.mockRestore();
	});

	it("defaults to GET method when no method specified", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("ok"));
		const client = new HttpClient();
		await client.fetch("https://example.com");
		expect(spy).toHaveBeenCalledWith("https://example.com", {
			method: "GET",
			headers: {},
			body: null,
		});
		spy.mockRestore();
	});

	it("passes POST method and body", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("ok"));
		const client = new HttpClient();
		await client.fetch("https://example.com", {
			method: "POST",
			body: "data",
		});
		expect(spy).toHaveBeenCalledWith("https://example.com", {
			method: "POST",
			headers: {},
			body: "data",
		});
		spy.mockRestore();
	});

	it("passes null body when no body specified", async () => {
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(new Response("ok"));
		const client = new HttpClient();
		await client.fetch("https://example.com");
		expect(spy).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ body: null }),
		);
		spy.mockRestore();
	});
});
