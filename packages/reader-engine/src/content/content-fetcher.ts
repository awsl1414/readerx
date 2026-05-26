import type {
	HttpFetcher,
	HttpFetcherOptions,
} from "../contracts/http-fetcher";

type FetchResult = {
	readonly body: Uint8Array;
	readonly detectedCharset?: string;
};

async function fetchRaw(
	httpFetcher: HttpFetcher,
	url: string,
	options?: HttpFetcherOptions,
): Promise<FetchResult> {
	const response = await httpFetcher.fetch(url, options ?? {});
	const charset = detectCharsetFromHeaders(response.headers);
	return { body: response.body, detectedCharset: charset };
}

/**
 * Extract the charset from Content-Type header value.
 * e.g. "text/html; charset=gbk" → "gbk"
 */
function detectCharsetFromHeaders(
	headers: Record<string, string>,
): string | undefined {
	const ct = headers["content-type"] ?? headers["Content-Type"];
	if (ct === undefined) return undefined;

	const match = ct.match(/charset\s*=\s*([^\s;]+)/i);
	if (match === null) return undefined;

	const value = match[1];
	if (value === undefined) return undefined;

	// Strip surrounding quotes if present
	return value.replace(/^["']|["']$/g, "").trim();
}

export type { FetchResult };
export { detectCharsetFromHeaders, fetchRaw };
