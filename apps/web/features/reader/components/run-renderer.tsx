import type { RenderRun } from "@readerx/reader-engine";
import { memo } from "react";
import type { ReadingAtmosphere } from "../types";
import { sanitizeHref } from "../utils/sanitize-href";

type RunRendererProps = {
	readonly run: RenderRun;
	readonly atmosphere: ReadingAtmosphere;
};

const RunRenderer = memo(function RunRenderer({
	run,
	atmosphere,
}: RunRendererProps) {
	const style = {
		fontSize: `${atmosphere.fontSize}px`,
		lineHeight: atmosphere.lineHeight,
	};

	const safeHref = run.style?.href ? sanitizeHref(run.style.href) : null;
	if (safeHref) {
		return (
			<a href={safeHref} style={style}>
				{run.text}
			</a>
		);
	}
	if (run.style?.href) {
		return <span style={style}>{run.text}</span>;
	}
	if (run.style?.bold && run.style?.italic) {
		return (
			<strong>
				<em style={style}>{run.text}</em>
			</strong>
		);
	}
	if (run.style?.bold) {
		return <strong style={style}>{run.text}</strong>;
	}
	if (run.style?.italic) {
		return <em style={style}>{run.text}</em>;
	}
	return <span style={style}>{run.text}</span>;
});

export type { RunRendererProps };
export { RunRenderer };
