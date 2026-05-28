"use client";

import { useParams, useRouter } from "next/navigation";
import { ReaderView } from "@/features/reader";
import type { SessionDeps } from "@/features/reader/types";
import { useMemo, useState, useEffect } from "react";
import { useWorkerBridge } from "@/components/worker-bridge-provider";
import { browserHttpFetcher } from "@/lib/browser-http-fetcher";
import {
	db,
	BookRepository,
	BookChapterRepository,
	BookSourceRepository,
} from "@readerx/persistence";

function ReaderPage() {
	const params = useParams<{ bookId: string }>();
	const router = useRouter();
	const bridge = useWorkerBridge();

	const [viewport, setViewport] = useState(() =>
		typeof window === "undefined"
			? { width: 1024, height: 768 }
			: { width: window.innerWidth, height: window.innerHeight },
	);

	useEffect(() => {
		const handleResize = () => {
			setViewport({ width: window.innerWidth, height: window.innerHeight });
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
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
			viewport,
		};
	}, [bridge, viewport]);

	return (
		<ReaderView
			bookId={decodeURIComponent(params.bookId)}
			deps={deps}
			onBack={() => router.back()}
		/>
	);
}

export { ReaderPage };
