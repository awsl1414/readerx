const ALLOWED_HREF_PROTOCOLS = new Set(["http:", "https:"]);

/** Returns a safe URL string or null if the protocol is not allowed. */
function sanitizeHref(raw: string): string | null {
	if (!raw) return null;
	try {
		const { protocol } = new URL(raw, "https://placeholder.invalid");
		if (ALLOWED_HREF_PROTOCOLS.has(protocol)) return raw;
		return null;
	} catch {
		return null;
	}
}

export { sanitizeHref };
