import type { DocumentCache } from "./types";
import { parseHTML, parseXML } from "./dom-parse";

export function createDocumentCache(): DocumentCache {
	const htmlCache = new Map<string, Document>();
	const xmlCache = new Map<string, Document>();
	const jsonCache = new Map<string, unknown>();

	return {
		getHTML(html: string, _url?: string): Document {
			const cached = htmlCache.get(html);
			if (cached) return cached;
			const { document } = parseHTML(html);
			htmlCache.set(html, document);
			return document;
		},
		getXML(xml: string): Document {
			const cached = xmlCache.get(xml);
			if (cached) return cached;
			const { document } = parseXML(xml);
			xmlCache.set(xml, document);
			return document;
		},
		getJSON(json: string): unknown {
			const cached = jsonCache.get(json);
			if (cached !== undefined) return cached;
			const parsed: unknown = JSON.parse(json);
			jsonCache.set(json, parsed);
			return parsed;
		},
		dispose(): void {
			htmlCache.clear();
			xmlCache.clear();
			jsonCache.clear();
		},
	};
}
