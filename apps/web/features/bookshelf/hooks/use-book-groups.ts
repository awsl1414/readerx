"use client";

import { createDB } from "@readerx/persistence";
import { useQuery } from "@tanstack/react-query";

type BookGroupForList = {
	readonly groupId: number;
	readonly groupName: string;
};

async function fetchBookGroups(): Promise<readonly BookGroupForList[]> {
	const db = createDB();
	const groups = await db.bookGroups.toArray();
	return groups.map((g) => ({
		groupId: g.groupId,
		groupName: g.groupName,
	}));
}

export type { BookGroupForList };

export function useBookGroups() {
	return useQuery({
		queryKey: ["bookGroups"],
		queryFn: fetchBookGroups,
		staleTime: 60_000,
	});
}
