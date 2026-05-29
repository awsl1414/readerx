import type { RenderPage } from "@readerx/reader-engine";
import { memo } from "react";
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
				// biome-ignore lint/suspicious/noArrayIndexKey: line position is stable within a laid-out page
				<p key={`l${i}-y${line.y}`} style={{ height: `${line.height}px` }}>
					{line.runs.map((run) => (
						<RunRenderer
							key={run.sourceNodeId}
							run={run}
							atmosphere={atmosphere}
						/>
					))}
				</p>
			))}
		</div>
	);
}

const PageRenderer = memo(PageRendererInner);

export type { PageRendererProps };
export { PageRenderer };
