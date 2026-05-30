"use client";

import { useQuery } from "@tanstack/react-query";
import { createDB } from "@readerx/persistence";
import type { Book } from "@readerx/persistence";

type BookForList = {
	readonly bookUrl: string;
	readonly name: string;
	readonly author: string;
	readonly coverUrl: string | null;
	readonly durChapterTime: number;
	readonly durChapterTitle: string | null;
	readonly durChapterIndex: number;
	readonly totalChapterNum: number;
	readonly durChapterPos: number;
	readonly groupIds: readonly number[];
};

function toBookForList(b: Book): BookForList {
	return {
		bookUrl: b.bookUrl,
		name: b.name,
		author: b.author,
		coverUrl: b.coverUrl ?? null,
		durChapterTime: b.durChapterTime,
		durChapterTitle: b.durChapterTitle ?? null,
		durChapterIndex: b.durChapterIndex,
		totalChapterNum: b.totalChapterNum,
		durChapterPos: b.durChapterPos,
		groupIds: b.groupIds,
	};
}

async function fetchBooks(
	groupId: number | null,
	sortBy: string,
): Promise<readonly BookForList[]> {
	const db = createDB();
	const books = await db.books.toArray();

	const filtered =
		groupId !== null
			? books.filter((b) => b.groupIds.includes(groupId))
			: books;

	const sorted = [...filtered].sort((a, b) => {
		switch (sortBy) {
			case "recentRead":
				return b.durChapterTime - a.durChapterTime;
			case "addedTime":
				return b.order - a.order;
			case "title":
				return a.name.localeCompare(b.name, "zh");
			default:
				return 0;
		}
	});

	return sorted.map(toBookForList);
}

export type { BookForList };

export function useBooks(groupId: number | null, sortBy: string) {
	return useQuery({
		queryKey: ["books", groupId, sortBy],
		queryFn: () => fetchBooks(groupId, sortBy),
		staleTime: 30_000,
	});
}
