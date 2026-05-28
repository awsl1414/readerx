import { memo } from "react";
import type { RenderPage } from "@readerx/reader-engine";
import type { ReadingAtmosphere } from "../types";
import { RunRenderer } from "./run-renderer";

type PageRendererProps = {
	readonly page: RenderPage;
	readonly atmosphere: ReadingAtmosphere;
};

function PageRendererInner({ page, atmosphere }: PageRendererProps) {
	return (
		<div
			className="reader-page"
			style={{ maxWidth: `${atmosphere.maxWidth}px`, margin: "0 auto" }}
		>
			{page.lines.map((line, i) => (
				<p key={i} style={{ height: `${line.height}px` }}>
					{line.runs.map((run, j) => (
						<RunRenderer key={j} run={run} atmosphere={atmosphere} />
					))}
				</p>
			))}
		</div>
	);
}

const PageRenderer = memo(PageRendererInner);

export { PageRenderer };
export type { PageRendererProps };
