"use client";

import {
	BookChapterRepository,
	BookRepository,
	BookSourceRepository,
	db,
} from "@readerx/persistence";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWorkerBridge } from "@/components/worker-bridge-provider";
import { ReaderView } from "@/features/reader";
import type { SessionDeps } from "@/features/reader/types";
import { browserHttpFetcher } from "@/lib/browser-http-fetcher";

/** Debounce interval for viewport resize events (ms). */
const RESIZE_DEBOUNCE_MS = 200;

function ReaderPage() {
	const params = useParams<{ bookId: string }>();
	const router = useRouter();
	const bridge = useWorkerBridge();

	const [isMobile, setIsMobile] = useState(() =>
		typeof window === "undefined" ? false : window.innerWidth < 768,
	);

	useEffect(() => {
		let timerId: ReturnType<typeof setTimeout> | null = null;
		const handleResize = () => {
			if (timerId !== null) clearTimeout(timerId);
			timerId = setTimeout(() => {
				setIsMobile(window.innerWidth < 768);
			}, RESIZE_DEBOUNCE_MS);
		};
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
			if (timerId !== null) clearTimeout(timerId);
		};
	}, []);

	const deps = useMemo<SessionDeps>(() => {
		const bookRepo = new BookRepository(db.books);
		const chapterRepo = new BookChapterRepository(db.chapters);
		const sourceRepo = new BookSourceRepository(db.bookSources);

		return {
			httpFetcher: browserHttpFetcher,
			jsExecutor: bridge.createJsExecutor(),
			bookRepo: {
				get: (bookUrl: string) => bookRepo.get(bookUrl),
				updateProgress: (
					bookUrl: string,
					durChapterIndex: number,
					durChapterPos: number,
				) => bookRepo.updateProgress(bookUrl, durChapterIndex, durChapterPos),
			},
			chapterRepo: {
				getByBook: (bookUrl: string) =>
					chapterRepo.getByBook(bookUrl).then((chs) =>
						chs.map((c) => ({
							index: c.index,
							title: c.title,
							isVolume: c.isVolume,
						})),
					),
				getByIndex: (bookUrl: string, index: number) =>
					chapterRepo.getByIndex(bookUrl, index).then((ch) =>
						ch
							? {
									resourceUrl: ch.resourceUrl ?? ch.url,
									title: ch.title,
								}
							: undefined,
					),
			},
			sourceRepo: {
				get: (sourceUrl: string) =>
					sourceRepo.get(sourceUrl).then((src) => {
						if (!src) return undefined;
						const result: { bookSourceUrl: string; ruleContent?: string } = {
							bookSourceUrl: src.bookSourceUrl,
						};
						const rc = src.ruleContent as string | undefined;
						if (rc !== undefined) {
							result.ruleContent = rc;
						}
						return result;
					}),
			},
			isMobile,
		};
	}, [bridge, isMobile]);

	return (
		<ReaderView
			bookId={decodeURIComponent(params.bookId)}
			deps={deps}
			onBack={() => router.back()}
		/>
	);
}

export { ReaderPage };
