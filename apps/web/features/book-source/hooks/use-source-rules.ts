"use client";

import type { RuleRecord } from "@readerx/schemas";
import { db, RulesRepository } from "@readerx/persistence";
import { useQuery } from "@tanstack/react-query";

const repo = new RulesRepository(db.rules);
const TYPE = "book-source" as const;
const QUERY_KEY = ["rules", TYPE];

function useSourceRules() {
	return useQuery({
		queryKey: QUERY_KEY,
		queryFn: () => repo.getByType(TYPE),
		staleTime: 60_000,
	});
}

export { useSourceRules };
export { QUERY_KEY, repo, TYPE };
