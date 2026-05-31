/**
 * Fetcher interface — abstract HTTP request abstraction for rule execution.
 *
 * Decouples the rule-engine / reader-engine from concrete HTTP implementations
 * (browser fetch, Node undici, etc.).
 */

import type { RequestConfig } from "@readerx/schemas";

type FetcherResponse = {
	readonly status: number;
	readonly headers: Readonly<Record<string, string>>;
	readonly body: string;
	readonly dom?: () => Document;
	readonly json?: () => unknown;
};

interface Fetcher {
	fetch(request: RequestConfig): Promise<FetcherResponse>;
}

export type { Fetcher, FetcherResponse };
