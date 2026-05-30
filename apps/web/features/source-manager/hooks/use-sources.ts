import type { BookSourceRecord } from "@readerx/persistence";
import { BookSourceRepository, db } from "@readerx/persistence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const repo = new BookSourceRepository(db.bookSources);

function useSources() {
	return useQuery({
		queryKey: ["sources"],
		queryFn: () => repo.getAll(),
		staleTime: 60_000,
	});
}

function useSourceMutations() {
	const queryClient = useQueryClient();

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["sources"] });

	const enable = useMutation({
		mutationFn: ({ url, enabled }: { url: string; enabled: boolean }) =>
			repo.enable(url, enabled),
		onSuccess: invalidate,
	});

	const save = useMutation({
		mutationFn: (source: BookSourceRecord) => repo.save(source),
		onSuccess: invalidate,
	});

	const saveBatch = useMutation({
		mutationFn: (sources: BookSourceRecord[]) => repo.saveBatch(sources),
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

export { useSourceMutations, useSources };
