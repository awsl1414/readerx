"use client";

import { useParams, useRouter } from "next/navigation";
import { ReaderView } from "@/features/reader";
import type { SessionDeps } from "@/features/reader/types";
import { useMemo } from "react";

function ReaderPage() {
	const params = useParams<{ bookId: string }>();
	const router = useRouter();

	const deps = useMemo<SessionDeps>(
		() => ({
			bridge: {
				executeRule: async () => ({
					ok: false,
					error: "not implemented",
				}),
			},
			bookRepo: {
				get: async () => undefined,
				updateProgress: async () => {},
			},
			chapterRepo: {
				getByBook: async () => [],
				getByIndex: async () => undefined,
			},
			sourceRepo: {
				get: async () => undefined,
			},
			viewport: { width: window.innerWidth, height: window.innerHeight },
		}),
		[],
	);

	return (
		<ReaderView
			bookId={decodeURIComponent(params.bookId)}
			deps={deps}
			onBack={() => router.back()}
		/>
	);
}

export { ReaderPage };
