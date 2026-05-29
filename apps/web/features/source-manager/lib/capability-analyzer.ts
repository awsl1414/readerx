// features/source-manager/lib/capability-analyzer.ts

import type { SourceCapabilities } from "../types";

type SourceLike = Record<string, unknown>;

/** Regex patterns for detecting source capabilities. */
const JS_PATTERN = /@js:|<js>|<\/js>/;
const WEBVIEW_PATTERN = /startBrowserAwait|launchBrowser/;
const JAVA_API_PATTERN =
	/java\.(ajax|get|put|getString|getStringList|log|base64Encode|aesBase64DecodeToString|androidId|startBrowserAwait)/;
const CRYPTO_PATTERN = /aes|des|base64|md5|hmac/i;
const MULTI_PAGE_PATTERN = /nextContentUrl|nextTocUrl/;

/** Recursively collect all string values and object keys from a nested object. */
function collectStrings(obj: unknown): string[] {
	if (typeof obj === "string") return [obj];
	if (obj === null || obj === undefined) return [];
	if (Array.isArray(obj)) return obj.flatMap(collectStrings);
	if (typeof obj === "object") {
		const record = obj as Record<string, unknown>;
		const keys = Object.keys(record);
		const values = Object.values(record).flatMap(collectStrings);
		return [...keys, ...values];
	}
	return [];
}

/** Analyze a book source's capabilities by statically scanning its fields. */
function analyzeCapabilities(source: SourceLike): SourceCapabilities {
	const allText = collectStrings(source).join(" ");

	const usesJs = JS_PATTERN.test(allText);
	const usesCookieJar = source.enabledCookieJar === true;
	const usesWebView = WEBVIEW_PATTERN.test(allText);
	const usesJavaApi = JAVA_API_PATTERN.test(allText);
	const usesCrypto = CRYPTO_PATTERN.test(allText);
	const usesMultiPage = MULTI_PAGE_PATTERN.test(allText);

	let webCompatibility: SourceCapabilities["webCompatibility"] = "full";
	if (usesWebView) {
		webCompatibility = "unsupported";
	} else if (usesJs || usesCookieJar || usesJavaApi) {
		webCompatibility = "partial";
	}

	return {
		usesJs,
		usesCookieJar,
		usesWebView,
		usesJavaApi,
		usesCrypto,
		usesMultiPage,
		webCompatibility,
	};
}

export { analyzeCapabilities };
