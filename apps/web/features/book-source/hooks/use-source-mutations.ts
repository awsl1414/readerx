"use client";

import type { RuleRecord } from "@readerx/schemas";
import { validateBookSourceData } from "@readerx/schemas";
import { db, RulesRepository } from "@readerx/persistence";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY, repo, TYPE } from "./use-source-rules";

function useSourceMutations() {
	const queryClient = useQueryClient();
	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: QUERY_KEY });

	const save = useMutation({
		mutationFn: (record: RuleRecord<"book-source">) => {
			const validation = validateBookSourceData(record.data);
			if (!validation.ok) throw new Error(validation.error.message);
			return repo.save(record);
		},
		onSuccess: invalidate,
	});

	const remove = useMutation({
		mutationFn: (id: string) => repo.delete(id),
		onSuccess: invalidate,
	});

	const toggleEnabled = useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
			repo.toggleEnabled(id, enabled),
		onSuccess: invalidate,
	});

	const importRules = useMutation({
		mutationFn: async (records: RuleRecord<"book-source">[]) => {
			for (const record of records) {
				const validation = validateBookSourceData(record.data);
				if (!validation.ok)
					throw new Error(`Rule "${record.name}": ${validation.error.message}`);
			}
			await repo.saveBatch(records);
		},
		onSuccess: invalidate,
	});

	return { save, remove, toggleEnabled, importRules };
}

export { useSourceMutations };
