/**
 * Decode a raw byte array to a string using the specified charset.
 * Falls back to UTF-8 when the charset is missing or unsupported.
 */
function decodeBody(body: Uint8Array, charset?: string): string {
	if (charset !== undefined && charset.length > 0) {
		try {
			const decoder = new TextDecoder(charset, { fatal: true });
			return decoder.decode(body);
		} catch {
			// Unsupported or invalid charset — fall through to UTF-8
		}
	}

	const utf8 = new TextDecoder("utf-8", { fatal: false });
	return utf8.decode(body);
}

export { decodeBody };
