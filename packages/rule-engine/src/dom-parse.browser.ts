export type ParsedDocument = {
	readonly document: Document;
	readonly dispose: () => void;
};

export function parseHTML(html: string, _url?: string): ParsedDocument {
	const parser = new DOMParser();
	return {
		document: parser.parseFromString(html, "text/html"),
		dispose: () => {},
	};
}

export function parseXML(xml: string): ParsedDocument {
	const parser = new DOMParser();
	return {
		document: parser.parseFromString(xml, "text/xml"),
		dispose: () => {},
	};
}
