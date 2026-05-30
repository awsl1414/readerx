const ALLOWED_FETCH_OPTION_KEYS = new Set([
	"method",
	"headers",
	"body",
	"mode",
	"cache",
	"redirect",
	"referrer",
	"signal",
]);

/**
 * Strips unsafe fields from a fetch options object produced by the QuickJS
 * sandbox. Only whitelisted keys are retained; "credentials" is explicitly
 * excluded to prevent cookie leakage from the sandbox.
 */
function sanitizeFetchOptions(raw: Record<string, unknown>): RequestInit {
	const sanitized: Record<string, unknown> = {};
	for (const key of Object.keys(raw)) {
		if (ALLOWED_FETCH_OPTION_KEYS.has(key)) {
			sanitized[key] = raw[key];
		}
	}
	return sanitized as RequestInit;
}

export { sanitizeFetchOptions };
