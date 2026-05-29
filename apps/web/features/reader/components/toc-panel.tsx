import type { ChapterInfo } from "../types";

type TocPanelProps = {
	readonly chapters: readonly ChapterInfo[];
	readonly currentChapter: number;
	readonly onSelect: (index: number) => void;
	readonly isMobile: boolean;
};

function TocPanel({
	chapters,
	currentChapter,
	onSelect,
	isMobile,
}: TocPanelProps) {
	const width = isMobile ? "60%" : "35%";

	return (
		<div
			style={{
				width,
				minWidth: 0,
				overflowY: "auto",
				padding: "20px 16px",
				fontFamily: "system-ui",
				fontSize: 12,
			}}
		>
			<div
				style={{
					fontSize: 13,
					marginBottom: 14,
					opacity: 0.5,
					letterSpacing: 0.5,
				}}
			>
				目录
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
				{chapters.map((ch) => (
					<button
						key={ch.index}
						type="button"
						onClick={() => onSelect(ch.index)}
						style={{
							padding: "8px 10px",
							borderRadius: 6,
							border: "none",
							textAlign: "left",
							cursor: "pointer",
							fontSize: "inherit",
							fontFamily: "inherit",
							color: "inherit",
							background:
								ch.index === currentChapter
									? "oklch(0.18 0.01 260)"
									: "transparent",
							opacity:
								ch.index === currentChapter
									? 0.9
									: ch.index < currentChapter
										? 0.3
										: 0.7,
							fontWeight: ch.index === currentChapter ? 500 : 400,
						}}
					>
						第 {ch.index + 1} 章 · {ch.title}
					</button>
				))}
			</div>
		</div>
	);
}

export type { TocPanelProps };
export { TocPanel };
