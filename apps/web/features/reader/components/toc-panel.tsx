import { cn } from "@/lib/cn";
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
	return (
		<div
			className={cn(
				"min-w-0 overflow-y-auto py-5 px-4 font-sans text-xs",
				isMobile ? "w-[60%]" : "w-[35%]",
			)}
		>
			<div className="text-[13px] mb-3.5 opacity-50 tracking-wide text-reader-text">
				目录
			</div>
			<div className="flex flex-col gap-px">
				{chapters.map((ch) => (
					<button
						key={ch.index}
						type="button"
						onClick={() => onSelect(ch.index)}
						className={cn(
							"px-2.5 py-2 rounded-md text-left cursor-pointer text-inherit font-inherit border-none",
							ch.index === currentChapter
								? "bg-foreground/10 opacity-90 font-medium text-reader-text"
								: "bg-transparent",
							ch.index !== currentChapter &&
								(ch.index < currentChapter ? "opacity-30" : "opacity-70"),
						)}
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
