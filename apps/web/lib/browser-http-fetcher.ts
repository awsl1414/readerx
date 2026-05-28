import type {
	HttpFetcher,
	HttpFetcherOptions,
	HttpFetcherResponse,
} from "@readerx/reader-engine";

const browserHttpFetcher: HttpFetcher = {
	async fetch(
		url: string,
		options: HttpFetcherOptions,
	): Promise<HttpFetcherResponse> {
		const controller = new AbortController();
		const timeoutId = options.timeout
			? setTimeout(() => controller.abort(), options.timeout)
			: undefined;

		try {
			const init: RequestInit = {
				method: options.method ?? "GET",
				signal: controller.signal,
			};
			if (options.headers) {
				init.headers = new Headers(options.headers);
			}
			if (options.body) {
				init.body = options.body;
			}

			const resp = await fetch(url, init);
			const buffer = await resp.arrayBuffer();
			const headers: Record<string, string> = {};
			resp.headers.forEach((value, key) => {
				headers[key] = value;
			});

			return {
				ok: resp.ok,
				status: resp.status,
				body: new Uint8Array(buffer),
				headers,
			};
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === "AbortError") {
				return {
					ok: false,
					status: 0,
					body: new Uint8Array(),
					headers: {},
				};
			}
			throw err;
		} finally {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
		}
	},
};

export { browserHttpFetcher };
