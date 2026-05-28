import type { RenderRun } from "@readerx/reader-engine";
import type { ReadingAtmosphere } from "../types";

type RunRendererProps = {
	readonly run: RenderRun;
	readonly atmosphere: ReadingAtmosphere;
};

function RunRenderer({ run, atmosphere }: RunRendererProps) {
	const style = {
		fontSize: `${atmosphere.fontSize}px`,
		lineHeight: atmosphere.lineHeight,
	};

	if (run.style?.href) {
		return <a href={run.style.href} style={style}>{run.text}</a>;
	}
	if (run.style?.bold && run.style?.italic) {
		return <strong><em style={style}>{run.text}</em></strong>;
	}
	if (run.style?.bold) {
		return <strong style={style}>{run.text}</strong>;
	}
	if (run.style?.italic) {
		return <em style={style}>{run.text}</em>;
	}
	return <span style={style}>{run.text}</span>;
}

export { RunRenderer };
export type { RunRendererProps };
