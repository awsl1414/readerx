type HttpFetcher = {
	fetch(url: string, options: HttpFetcherOptions): Promise<HttpFetcherResponse>;
};

type HttpFetcherOptions = {
	readonly method?: "GET" | "POST";
	readonly headers?: Record<string, string>;
	readonly body?: string;
	readonly timeout?: number;
};

type HttpFetcherResponse = {
	readonly ok: boolean;
	readonly status: number;
	readonly body: Uint8Array;
	readonly headers: Record<string, string>;
};

export type { HttpFetcher, HttpFetcherOptions, HttpFetcherResponse };
