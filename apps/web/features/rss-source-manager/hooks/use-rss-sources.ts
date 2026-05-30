import type { RssSourceRecord } from "@readerx/persistence";
import { db, RssSourceRepository } from "@readerx/persistence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const repo = new RssSourceRepository(db.rssSources);

function useRssSources() {
	return useQuery({
		queryKey: ["rssSources"],
		queryFn: () => repo.getAll(),
		staleTime: 60_000,
	});
}

function useRssSourceMutations() {
	const queryClient = useQueryClient();

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["rssSources"] });

	const enable = useMutation({
		mutationFn: ({ url, enabled }: { url: string; enabled: boolean }) =>
			repo.enable(url, enabled),
		onSuccess: invalidate,
	});

	const save = useMutation({
		mutationFn: (source: RssSourceRecord) => repo.save(source),
		onSuccess: invalidate,
	});

	const saveBatch = useMutation({
		mutationFn: (sources: RssSourceRecord[]) => repo.saveBatch(sources),
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

export { useRssSourceMutations, useRssSources };
