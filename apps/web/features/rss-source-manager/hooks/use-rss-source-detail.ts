import { db, RssSourceRepository } from "@readerx/persistence";
import { useQuery } from "@tanstack/react-query";

const repo = new RssSourceRepository(db.rssSources);

function useRssSourceDetail(url: string | null) {
	return useQuery({
		queryKey: ["rssSource", url],
		queryFn: () => repo.get(url ?? ""),
		enabled: url !== null,
	});
}

export { useRssSourceDetail };
