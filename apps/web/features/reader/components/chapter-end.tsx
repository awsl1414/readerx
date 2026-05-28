type ChapterEndProps = {
	readonly chapterTitle: string;
	readonly hasNextChapter: boolean;
	readonly onNextChapter: () => void;
};

function ChapterEnd({ chapterTitle, hasNextChapter, onNextChapter }: ChapterEndProps) {
	return (
		<div style={{
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			minHeight: "40vh",
			padding: "20px",
			textAlign: "center",
			fontFamily: "system-ui",
		}}>
			<div style={{ width: 40, height: 1, background: "currentColor", opacity: 0.15, margin: "0 auto 40px" }} />
			<div style={{ fontSize: 12, opacity: 0.4, marginBottom: 8 }}>你已读完本章</div>
			{hasNextChapter && (
				<button
					type="button"
					onClick={onNextChapter}
					style={{
						fontSize: 13,
						opacity: 0.6,
						background: "none",
						border: "none",
						color: "inherit",
						cursor: "pointer",
						padding: "8px 16px",
					}}
				>
					继续下一章 →
				</button>
			)}
			<div style={{ fontSize: 11, opacity: 0.25, marginTop: 32 }}>{chapterTitle}</div>
		</div>
	);
}

export { ChapterEnd };
export type { ChapterEndProps };
