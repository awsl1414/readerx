import {
	BookSourceRepository,
	db,
} from "@readerx/persistence";
import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { BookSourceRecord } from "@readerx/persistence";
import type { FilterMode } from "../types";

const repo = new BookSourceRepository(db.bookSources);

type UseSourcesOptions = {
	readonly filterMode: FilterMode;
	readonly searchQuery: string;
};

function useSources({ filterMode, searchQuery }: UseSourcesOptions) {
	return useQuery({
		queryKey: ["sources", filterMode, searchQuery] as const,
		queryFn: async () => {
			const all = searchQuery
				? await repo.search(searchQuery)
				: await repo.getAll();
			if (filterMode === "enabled") return all.filter((s) => s.enabled);
			if (filterMode === "disabled") return all.filter((s) => !s.enabled);
			return all;
		},
	});
}

function useSourceMutations() {
	const queryClient = useQueryClient();

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["sources"] });

	const enable = useMutation({
		mutationFn: ({
			url,
			enabled,
		}: { url: string; enabled: boolean }) =>
			repo.enable(url, enabled),
		onSuccess: invalidate,
	});

	const save = useMutation({
		mutationFn: (source: BookSourceRecord) => repo.save(source),
		onSuccess: invalidate,
	});

	const saveBatch = useMutation({
		mutationFn: (sources: BookSourceRecord[]) =>
			repo.saveBatch(sources),
		onSuccess: invalidate,
	});

	const remove = useMutation({
		mutationFn: (url: string) => repo.delete(url),
		onSuccess: invalidate,
	});

	const removeBatch = useMutation({
		mutationFn: (urls: string[]) => repo.deleteBatch(urls),
		onSuccess: invalidate,
	});

	return { enable, save, saveBatch, remove, removeBatch };
}

export { useSources, useSourceMutations };
