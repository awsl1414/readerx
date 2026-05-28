import type { Document, RenderResult } from "@readerx/reader-engine";
import { layoutDocument, toRenderModel } from "@readerx/reader-engine";
import { toLayoutConfig } from "./atmosphere";
import type { ReadingAtmosphere } from "./types";

type Viewport = { width: number; height: number };

class RenderScheduler {
	private version = 0;
	private readonly onResult: (result: RenderResult) => void;

	constructor(onResult: (result: RenderResult) => void) {
		this.onResult = onResult;
	}

	invalidate(
		document: Document,
		atmosphere: ReadingAtmosphere,
		viewport: Viewport,
	): void {
		const expectedVersion = ++this.version;
		const config = toLayoutConfig(atmosphere, viewport);
		const result = layoutDocument(document, config);
		if (this.version !== expectedVersion) return;
		const renderResult = toRenderModel(result);
		this.onResult(renderResult);
	}
}

export { RenderScheduler };
