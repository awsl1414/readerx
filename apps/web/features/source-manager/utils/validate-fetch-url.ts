const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:"]);

const PRIVATE_IP_REGEX =
	/^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/;

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);

/** Validates a URL for safe fetching. Returns an error message or null. */
function validateFetchUrl(raw: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return "Invalid URL format";
	}
	if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
		return "Only http: and https: URLs are allowed";
	}
	const hostname = parsed.hostname;
	if (PRIVATE_IP_REGEX.test(hostname)) {
		return "Private network addresses are not allowed";
	}
	if (BLOCKED_HOSTNAMES.has(hostname)) {
		return "Private network addresses are not allowed";
	}
	return null;
}

export { validateFetchUrl };
