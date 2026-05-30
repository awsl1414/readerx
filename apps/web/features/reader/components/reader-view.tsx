"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGesture } from "../hooks/use-gesture";
import { useReaderSession } from "../hooks/use-reader-session";
import type { AtmospherePreset, GestureMode, SessionDeps } from "../types";
import { AtmospherePicker } from "./atmosphere-picker";
import { ChapterEnd } from "./chapter-end";
import { IntentOverlay } from "./intent-overlay";
import { PageRenderer } from "./page-renderer";
import { TocPanel } from "./toc-panel";

type ReaderViewProps = {
	readonly bookId: string;
	readonly deps: SessionDeps;
	readonly onBack: () => void;
	readonly gestureMode?: GestureMode;
};

/** Duration before controls auto-hide (ms). Matches roadmap 6.1.5 spec. */
const OVERLAY_DURATION = 3000;

function ReaderView({
	bookId,
	deps,
	onBack,
	gestureMode = "horizontal",
}: ReaderViewProps) {
	const { session, state, open, close, setAtmosphere } = useReaderSession(deps);
	const [controlsVisible, setControlsVisible] = useState(false);
	const [tocOpen, setTocOpen] = useState(false);
	const [atmosphereOpen, setAtmosphereOpen] = useState(false);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentChapterRef = useRef(0);
	const hasPrevChapterRef = useRef(false);
	const hasNextChapterRef = useRef(false);

	useEffect(() => {
		open(bookId);
	}, [bookId, open]);

	const hideControls = useCallback(() => {
		if (hideTimerRef.current) {
			clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
		setControlsVisible(false);
		setAtmosphereOpen(false);
	}, []);

	const showControls = useCallback(() => {
		if (hideTimerRef.current) {
			// Controls already visible — dismiss early (toggle behavior)
			hideControls();
			return;
		}
		setControlsVisible(true);
		setAtmosphereOpen(false);
		hideTimerRef.current = setTimeout(() => {
			hideTimerRef.current = null;
			setControlsVisible(false);
			setAtmosphereOpen(false);
		}, OVERLAY_DURATION);
	}, [hideControls]);

	const handleContentClick = useCallback(() => {
		if (tocOpen) {
			setTocOpen(false);
			return;
		}
		showControls();
	}, [tocOpen, showControls]);

	const handleContentKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleContentClick();
			}
		},
		[handleContentClick],
	);

	const handleNextPage = useCallback(() => {
		session?.nextPage();
	}, [session]);

	const handlePrevPage = useCallback(() => {
		session?.prevPage();
	}, [session]);

	const handleNextChapter = useCallback(() => {
		if (hasNextChapterRef.current && session) {
			session.jumpToChapter(currentChapterRef.current + 1);
		}
	}, [session]);

	const handlePrevChapter = useCallback(() => {
		if (hasPrevChapterRef.current && session) {
			session.jumpToChapter(currentChapterRef.current - 1);
		}
	}, [session]);

	const handleProgressClick = useCallback(() => {
		setAtmosphereOpen((prev) => !prev);
	}, []);

	const handleAtmosphereSelect = useCallback(
		(preset: AtmospherePreset) => {
			setAtmosphere(preset);
			setAtmosphereOpen(false);
		},
		[setAtmosphere],
	);

	const handleTocSelect = useCallback(
		(index: number) => {
			if (session) {
				session.jumpToChapter(index);
				setTocOpen(false);
			}
		},
		[session],
	);

	const handleBack = useCallback(() => {
		close();
		onBack();
	}, [close, onBack]);

	const gesture = useGesture({
		mode: gestureMode,
		onNext: handleNextPage,
		onPrev: handlePrevPage,
	});

	useEffect(() => {
		return () => {
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
		};
	}, []);

	if (!session || !state) {
		return <div className="min-h-dvh bg-surface-0" />;
	}

	const page = session.getPage(state.currentPage);
	const isLastPage = state.currentPage >= state.pageCount - 1;
	const chapterInfo = state.chapters[state.currentChapter];
	const chapterTitle = chapterInfo?.title ?? "";
	const hasPrevChapter = state.currentChapter > 0;
	const hasNextChapter = state.currentChapter < state.chapters.length - 1;

	currentChapterRef.current = state.currentChapter;
	hasPrevChapterRef.current = hasPrevChapter;
	hasNextChapterRef.current = hasNextChapter;

	return (
		<div
			data-reader-theme={state.atmosphere.theme}
			className="relative min-h-dvh bg-reader-bg text-reader-text overflow-hidden"
		>
			<div
				role="application"
				aria-label="Reader content"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: reader viewport with custom keyboard/gesture interaction model
				tabIndex={0}
				onClick={handleContentClick}
				onKeyDown={handleContentKeyDown}
				onPointerDown={gesture.onPointerDown}
				onPointerMove={gesture.onPointerMove}
				onPointerUp={gesture.onPointerUp}
				onWheel={gesture.onWheel}
				className="flex min-h-dvh outline-none"
				style={{
					transition: "transform 0.3s ease",
					transform: tocOpen ? "translateX(-24px)" : "none",
				}}
			>
				<div className="flex-1 py-10">
					{page && !isLastPage && (
						<PageRenderer page={page} atmosphere={state.atmosphere} />
					)}
					{page && isLastPage && (
						<>
							<PageRenderer page={page} atmosphere={state.atmosphere} />
							<ChapterEnd
								chapterTitle={chapterTitle}
								hasNextChapter={hasNextChapter}
								onNextChapter={handleNextChapter}
							/>
						</>
					)}
				</div>
			</div>

			{tocOpen && (
				<div className="absolute top-0 right-0 bottom-0 flex">
					<div className="w-px bg-reader-divider" />
					<TocPanel
						chapters={state.chapters}
						currentChapter={state.currentChapter}
						isMobile={deps.isMobile}
						onSelect={handleTocSelect}
					/>
				</div>
			)}

			<IntentOverlay
				visible={controlsVisible}
				chapterTitle={chapterTitle}
				progressPercent={
					state.pageCount > 0
						? Math.round((state.currentPage / state.pageCount) * 100)
						: 0
				}
				onBack={handleBack}
				onToc={() => setTocOpen(true)}
				onPrevChapter={handlePrevChapter}
				onNextChapter={handleNextChapter}
				onProgressClick={handleProgressClick}
			/>

			{controlsVisible && atmosphereOpen && (
				<div className="absolute bottom-14 left-1/2 -translate-x-1/2">
					<AtmospherePicker
						current={state.atmosphere.preset}
						onSelect={handleAtmosphereSelect}
					/>
				</div>
			)}
		</div>
	);
}

export type { ReaderViewProps };
export { ReaderView };
