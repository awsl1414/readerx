type IntentOverlayProps = {
	readonly visible: boolean;
	readonly chapterTitle: string;
	readonly progressPercent: number;
	readonly onBack: () => void;
	readonly onToc: () => void;
	readonly onPrevChapter: () => void;
	readonly onNextChapter: () => void;
	readonly onProgressClick: () => void;
};

const capsule: React.CSSProperties = {
	position: "absolute",
	background: "oklch(0.15 0.01 260 / 0.8)",
	backdropFilter: "blur(12px)",
	borderRadius: 20,
	padding: "6px 14px",
	fontSize: 12,
	cursor: "pointer",
};

function IntentOverlay({
	visible,
	chapterTitle,
	progressPercent,
	onBack,
	onToc,
	onPrevChapter,
	onNextChapter,
	onProgressClick,
}: IntentOverlayProps) {
	if (!visible) {
		return null;
	}

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 10,
				transition: "opacity 0.3s ease",
			}}
		>
			<button
				type="button"
				onClick={onBack}
				style={{ ...capsule, top: 16, left: 16 }}
			>
				←
			</button>

			<div
				style={{
					position: "absolute",
					top: 18,
					left: "50%",
					transform: "translateX(-50%)",
					fontSize: 12,
					opacity: 0.5,
				}}
			>
				{chapterTitle}
			</div>

			<button
				type="button"
				onClick={onToc}
				style={{ ...capsule, top: 16, right: 16 }}
			>
				☰
			</button>

			<div
				style={{
					position: "absolute",
					bottom: 16,
					left: "50%",
					transform: "translateX(-50%)",
					display: "flex",
					alignItems: "center",
					gap: 16,
					fontSize: 11,
					opacity: 0.5,
				}}
			>
				<button
					type="button"
					onClick={onPrevChapter}
					style={{
						background: "none",
						border: "none",
						color: "inherit",
						cursor: "pointer",
					}}
				>
					上一章
				</button>
				<button
					type="button"
					onClick={onProgressClick}
					style={{
						background: "none",
						border: "none",
						color: "inherit",
						cursor: "pointer",
					}}
				>
					{progressPercent}%
				</button>
				<button
					type="button"
					onClick={onNextChapter}
					style={{
						background: "none",
						border: "none",
						color: "inherit",
						cursor: "pointer",
					}}
				>
					下一章
				</button>
			</div>
		</div>
	);
}

export { IntentOverlay };
export type { IntentOverlayProps };
