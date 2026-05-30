import { Window } from "happy-dom";

export type ParsedDocument = {
	readonly document: Document;
	readonly dispose: () => void;
};

export function parseHTML(html: string): ParsedDocument {
	const window = new Window({
		settings: { disableJavaScriptEvaluation: true },
	});
	window.document.write(html);
	return {
		document: window.document as unknown as Document,
		dispose: () => {
			window.close();
		},
	};
}

export function parseXML(xml: string): ParsedDocument {
	const window = new Window({
		settings: { disableJavaScriptEvaluation: true },
	});
	const parser = new window.DOMParser();
	const doc = parser.parseFromString(xml, "text/xml");
	return {
		document: doc as unknown as Document,
		dispose: () => {
			window.close();
		},
	};
}
