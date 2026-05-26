/**
 * HTTP 客户端封装
 */

export interface FetchOptions {
	method?: string;
	headers?: Record<string, string>;
	body?: string;
	charset?: string;
	timeout?: number;
}

export class HttpClient {
	private defaultHeaders: Record<string, string> = {};

	setDefaultHeaders(headers: Record<string, string>): void {
		this.defaultHeaders = { ...this.defaultHeaders, ...headers };
	}

	async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
		const headers = { ...this.defaultHeaders, ...options.headers };
		return fetch(url, {
			method: options.method ?? "GET",
			headers,
			body: options.body ?? null,
		});
	}
}
