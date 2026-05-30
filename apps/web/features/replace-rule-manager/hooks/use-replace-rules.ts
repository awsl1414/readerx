"use client";

import type { ReplaceRule } from "@readerx/persistence";
import { db, ReplaceRuleRepository } from "@readerx/persistence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const repo = new ReplaceRuleRepository(db.replaceRules);

function useReplaceRules() {
	return useQuery({
		queryKey: ["replaceRules"],
		queryFn: () => repo.getAll(),
		staleTime: 60_000,
	});
}

function useReplaceRuleMutations() {
	const queryClient = useQueryClient();

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["replaceRules"] });

	const save = useMutation({
		mutationFn: (rule: ReplaceRule) => repo.save(rule),
		onSuccess: invalidate,
	});

	const remove = useMutation({
		mutationFn: (id: string) => repo.delete(id),
		onSuccess: invalidate,
	});

	const toggleEnabled = useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
			repo.getById(id).then((existing) => {
				if (!existing) {
					throw new Error(`ReplaceRule ${id} not found`);
				}
				return repo.save({
					...existing,
					enabled,
					updatedAt: Date.now(),
				});
			}),
		onSuccess: invalidate,
	});

	return { save, remove, toggleEnabled };
}

export { useReplaceRuleMutations, useReplaceRules };
