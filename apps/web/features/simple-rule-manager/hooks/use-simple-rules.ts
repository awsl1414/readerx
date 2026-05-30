"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { RuleManagerConfig } from "../types";

function useSimpleRules<T extends { id: string }>(
	config: RuleManagerConfig<T>,
) {
	const repo = useMemo(() => config.createRepository(), [config]);

	return useQuery({
		queryKey: [config.queryKeyPrefix],
		queryFn: () => repo.getAll(),
		staleTime: 60_000,
	});
}

function useSimpleRuleMutations<T extends { id: string }>(
	config: RuleManagerConfig<T>,
) {
	const queryClient = useQueryClient();
	const repo = useMemo(() => config.createRepository(), [config]);

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });

	const save = useMutation({
		mutationFn: (entity: T) => repo.save(entity),
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
					throw new Error(`Entity ${id} not found`);
				}
				return repo.save({ ...existing, enabled } as T);
			}),
		onSuccess: invalidate,
	});

	return { save, remove, toggleEnabled };
}

export { useSimpleRuleMutations, useSimpleRules };
