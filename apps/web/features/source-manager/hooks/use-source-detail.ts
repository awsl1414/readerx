import {
	BookSourceRepository,
	db,
} from "@readerx/persistence";
import { useQuery } from "@tanstack/react-query";

const repo = new BookSourceRepository(db.bookSources);

function useSourceDetail(url: string | null) {
	return useQuery({
		queryKey: ["source", url],
		queryFn: () => repo.get(url as string),
		enabled: url !== null,
	});
}

export { useSourceDetail };
