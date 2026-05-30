"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useRssSourceDetail } from "../hooks/use-rss-source-detail";
import { useRssSources } from "../hooks/use-rss-sources";
import { useRssSourceStore } from "../store";
import { RssSourceEditorPanel } from "./rss-source-editor-panel";
import { RssSourceListPanel } from "./rss-source-list-panel";

function RssSourceWorkspace() {
	const t = useTranslations("rssSourceManager");
	const selectedUrl = useRssSourceStore((s) => s.selectedSourceUrl);
	const filterMode = useRssSourceStore((s) => s.filterMode);
	const searchQuery = useRssSourceStore((s) => s.searchQuery);
	const mobileLayer = useRssSourceStore((s) => s.mobileLayer);

	const { data: allSources = [], isLoading } = useRssSources();
	const { data: selectedSource } = useRssSourceDetail(selectedUrl);

	// Client-side filtering
	const sources = useMemo(() => {
		let filtered = allSources;

		if (filterMode === "enabled") {
			filtered = filtered.filter((s) => s.enabled);
		} else if (filterMode === "disabled") {
			filtered = filtered.filter((s) => !s.enabled);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(s) =>
					s.sourceName.toLowerCase().includes(query) ||
					s.sourceUrl.toLowerCase().includes(query) ||
					(s.sourceGroup ?? "").toLowerCase().includes(query),
			);
		}

		return filtered;
	}, [allSources, filterMode, searchQuery]);

	return (
		<div className="flex h-full bg-background text-foreground">
			{/* Layer 0: Source List */}
			<div
				className={
					"border-r border-border md:flex md:w-[280px] md:min-w-[280px] md:flex-col" +
					(mobileLayer === 0 ? " flex flex-col" : " hidden md:flex md:flex-col")
				}
			>
				<RssSourceListPanel sources={sources} isLoading={isLoading} />
			</div>

			{/* Layer 1: Source Editor */}
			<div
				className={
					"flex-1 overflow-hidden md:block" +
					(mobileLayer === 1 ? " block" : " hidden md:block")
				}
			>
				{selectedSource ? (
					<RssSourceEditorPanel source={selectedSource} />
				) : (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
						{t("selectToEdit")}
					</div>
				)}
			</div>
		</div>
	);
}

export { RssSourceWorkspace };
