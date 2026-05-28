"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GestureMode } from "../types";
import type { SessionDeps } from "../types";
import { PageRenderer } from "./page-renderer";
import { IntentOverlay } from "./intent-overlay";
import { ChapterEnd } from "./chapter-end";
import { AtmospherePicker } from "./atmosphere-picker";
import { TocPanel } from "./toc-panel";
import { useReaderSession } from "../hooks/use-reader-session";
import { useGesture } from "../hooks/use-gesture";
import { getThemeColors } from "../atmosphere";

type ReaderViewProps = {
	readonly bookId: string;
	readonly deps: SessionDeps;
	readonly onBack: () => void;
	readonly gestureMode?: GestureMode;
};

const OVERLAY_DURATION = 1400;

function ReaderView({ bookId, deps, onBack, gestureMode = "horizontal" }: ReaderViewProps) {
	const { session, state, open, close, setAtmosphere } = useReaderSession(deps);
	const [controlsVisible, setControlsVisible] = useState(false);
	const [tocOpen, setTocOpen] = useState(false);
	const [atmosphereOpen, setAtmosphereOpen] = useState(false);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		open(bookId);
	}, [bookId, open]);

	const showControls = useCallback(() => {
		setControlsVisible(true);
		setAtmosphereOpen(false);
		if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
		hideTimerRef.current = setTimeout(() => {
			setControlsVisible(false);
			setAtmosphereOpen(false);
		}, OVERLAY_DURATION);
	}, []);

	const handleContentClick = useCallback(() => {
		if (tocOpen) {
			setTocOpen(false);
			return;
		}
		showControls();
	}, [tocOpen, showControls]);

	const handleNextPage = useCallback(() => {
		session?.nextPage();
	}, [session]);

	const handlePrevPage = useCallback(() => {
		session?.prevPage();
	}, [session]);

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
		return <div style={{ minHeight: "100vh", background: "oklch(0.12 0 0)" }} />;
	}

	const page = session.getPage(state.currentPage);
	const isLastPage = state.currentPage >= state.pageCount - 1;
	const colors = getThemeColors(state.atmosphere.theme);
	const chapterInfo = state.chapters[state.currentChapter];
	const chapterTitle = chapterInfo?.title ?? "";
	const hasPrevChapter = state.currentChapter > 0;
	const hasNextChapter = state.currentChapter < state.chapters.length - 1;

	return (
		<div
			style={{
				position: "relative",
				minHeight: "100vh",
				background: colors.bg,
				color: colors.text,
				overflow: "hidden",
			}}
			onPointerDown={gesture.onPointerDown}
			onPointerMove={gesture.onPointerMove}
			onPointerUp={gesture.onPointerUp}
			onWheel={gesture.onWheel}
		>
			<div
				onClick={handleContentClick}
				style={{
					display: "flex",
					transition: "transform 0.3s ease",
					transform: tocOpen ? "translateX(-24px)" : "none",
					minHeight: "100vh",
				}}
			>
				<div style={{ flex: 1, padding: "40px 0" }}>
					{page && !isLastPage && (
						<PageRenderer page={page} atmosphere={state.atmosphere} />
					)}
					{page && isLastPage && (
						<>
							<PageRenderer page={page} atmosphere={state.atmosphere} />
							<ChapterEnd
								chapterTitle={chapterTitle}
								hasNextChapter={hasNextChapter}
								onNextChapter={() => session.jumpToChapter(state.currentChapter + 1)}
							/>
						</>
					)}
				</div>
			</div>

			{tocOpen && (
				<div style={{
					position: "absolute",
					top: 0,
					right: 0,
					bottom: 0,
					display: "flex",
				}}>
					<div style={{ width: 1, background: "oklch(0.22 0 0)" }} />
					<TocPanel
						chapters={state.chapters}
						currentChapter={state.currentChapter}
						isMobile={deps.viewport.width < 768}
						onSelect={(index) => {
							session.jumpToChapter(index);
							setTocOpen(false);
						}}
					/>
				</div>
			)}

			<IntentOverlay
				visible={controlsVisible}
				chapterTitle={chapterTitle}
				progressPercent={state.pageCount > 0 ? Math.round((state.currentPage / state.pageCount) * 100) : 0}
				onBack={() => { close(); onBack(); }}
				onToc={() => setTocOpen(true)}
				onPrevChapter={() => { if (hasPrevChapter) session.jumpToChapter(state.currentChapter - 1); }}
				onNextChapter={() => { if (hasNextChapter) session.jumpToChapter(state.currentChapter + 1); }}
				onProgressClick={() => setAtmosphereOpen(!atmosphereOpen)}
			/>

			{controlsVisible && atmosphereOpen && (
				<div style={{
					position: "absolute",
					bottom: 56,
					left: "50%",
					transform: "translateX(-50%)",
				}}>
					<AtmospherePicker
						current={state.atmosphere.preset}
						onSelect={(preset) => {
							setAtmosphere(preset);
							setAtmosphereOpen(false);
						}}
					/>
				</div>
			)}
		</div>
	);
}

export { ReaderView };
export type { ReaderViewProps };
