"use client";

import type { RuleRecord } from "@readerx/schemas";
import { validateDictRuleData } from "@readerx/schemas";
import { db, RulesRepository } from "@readerx/persistence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const repo = new RulesRepository(db.rules);
const TYPE = "dict" as const;
const QUERY_KEY = ["rules", TYPE];

function useDictRules() {
	return useQuery({
		queryKey: QUERY_KEY,
		queryFn: () => repo.getByType(TYPE),
		staleTime: 60_000,
	});
}

function useDictRuleMutations() {
	const queryClient = useQueryClient();
	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: QUERY_KEY });

	const save = useMutation({
		mutationFn: (record: RuleRecord<"dict">) => {
			const validation = validateDictRuleData(record.data);
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
		mutationFn: async (records: RuleRecord<"dict">[]) => {
			for (const record of records) {
				const validation = validateDictRuleData(record.data);
				if (!validation.ok)
					throw new Error(`Rule "${record.name}": ${validation.error.message}`);
			}
			await repo.saveBatch(records);
		},
		onSuccess: invalidate,
	});

	return { save, remove, toggleEnabled, importRules };
}

export { useDictRules, useDictRuleMutations };
