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
		<div className="absolute inset-0 z-10 transition-opacity duration-300 ease-in-out">
			<button
				type="button"
				aria-label="返回"
				onClick={onBack}
				className="absolute top-4 left-4 rounded-[20px] bg-foreground/80 px-3.5 py-1.5 text-xs text-background backdrop-blur-xl cursor-pointer"
			>
				←
			</button>

			<div className="absolute top-[18px] left-1/2 -translate-x-1/2 text-xs opacity-50 text-reader-text">
				{chapterTitle}
			</div>

			<button
				type="button"
				aria-label="目录"
				onClick={onToc}
				className="absolute top-4 right-4 rounded-[20px] bg-foreground/80 px-3.5 py-1.5 text-xs text-background backdrop-blur-xl cursor-pointer"
			>
				☰
			</button>

			<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[11px] opacity-50 text-reader-text">
				<button
					type="button"
					aria-label="上一章"
					onClick={onPrevChapter}
					className="bg-transparent border-none text-inherit cursor-pointer"
				>
					上一章
				</button>
				<button
					type="button"
					onClick={onProgressClick}
					className="bg-transparent border-none text-inherit cursor-pointer"
				>
					{progressPercent}%
				</button>
				<button
					type="button"
					aria-label="下一章"
					onClick={onNextChapter}
					className="bg-transparent border-none text-inherit cursor-pointer"
				>
					下一章
				</button>
			</div>
		</div>
	);
}

export type { IntentOverlayProps };
export { IntentOverlay };
