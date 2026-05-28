import type { Document, RenderResult, TextLayouter } from "@readerx/reader-engine";
import { layoutDocument, toRenderModel } from "@readerx/reader-engine";
import { toLayoutConfig } from "./atmosphere";
import type { ReadingAtmosphere } from "./types";

type Viewport = { width: number; height: number };

class RenderScheduler {
	private version = 0;
	private readonly onResult: (result: RenderResult) => void;
	private layouter: TextLayouter | null = null;

	constructor(onResult: (result: RenderResult) => void, layouter?: TextLayouter) {
		this.onResult = onResult;
		if (layouter) this.layouter = layouter;
	}

	setLayouter(layouter: TextLayouter): void {
		this.layouter = layouter;
	}

	invalidate(
		document: Document,
		atmosphere: ReadingAtmosphere,
		viewport: Viewport,
	): void {
		if (!this.layouter) return;
		const expectedVersion = ++this.version;
		const config = toLayoutConfig(atmosphere, viewport);
		const result = layoutDocument(document, config, this.layouter);
		if (this.version !== expectedVersion) return;
		const renderResult = toRenderModel(result);
		this.onResult(renderResult);
	}
}

export { RenderScheduler };
