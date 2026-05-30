import { parseHTML, parseXML } from "./dom-parse";
import type { DocumentCache } from "./types";

export function createDocumentCache(): DocumentCache {
	const htmlCache = new Map<string, Document>();
	const xmlCache = new Map<string, Document>();
	const jsonCache = new Map<string, unknown>();
	const disposers: Array<() => void> = [];

	return {
		getHTML(html: string, _url?: string): Document {
			const cached = htmlCache.get(html);
			if (cached) return cached;
			const parsed = parseHTML(html);
			htmlCache.set(html, parsed.document);
			disposers.push(parsed.dispose);
			return parsed.document;
		},
		getXML(xml: string): Document {
			const cached = xmlCache.get(xml);
			if (cached) return cached;
			const parsed = parseXML(xml);
			xmlCache.set(xml, parsed.document);
			disposers.push(parsed.dispose);
			return parsed.document;
		},
		getJSON(json: string): unknown {
			const cached = jsonCache.get(json);
			if (cached !== undefined) return cached;
			const parsed: unknown = JSON.parse(json);
			jsonCache.set(json, parsed);
			return parsed;
		},
		dispose(): void {
			for (const dispose of disposers) {
				dispose();
			}
			disposers.length = 0;
			htmlCache.clear();
			xmlCache.clear();
			jsonCache.clear();
		},
	};
}
