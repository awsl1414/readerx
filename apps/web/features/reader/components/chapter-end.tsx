type ChapterEndProps = {
	readonly chapterTitle: string;
	readonly hasNextChapter: boolean;
	readonly onNextChapter: () => void;
};

function ChapterEnd({
	chapterTitle,
	hasNextChapter,
	onNextChapter,
}: ChapterEndProps) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[40vh] p-5 text-center font-sans">
			<div className="w-10 h-px bg-current opacity-15 mx-auto mb-10" />
			<div className="text-xs opacity-40 mb-2 text-reader-text">
				你已读完本章
			</div>
			{hasNextChapter && (
				<button
					type="button"
					onClick={onNextChapter}
					className="text-[13px] opacity-60 bg-transparent border-none text-inherit cursor-pointer px-4 py-2 text-reader-text"
				>
					继续下一章 →
				</button>
			)}
			<div className="text-[11px] opacity-25 mt-8 text-reader-text">
				{chapterTitle}
			</div>
		</div>
	);
}

export type { ChapterEndProps };
export { ChapterEnd };
