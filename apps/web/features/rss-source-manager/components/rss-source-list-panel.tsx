"use client";

import type { RssSourceRecord } from "@readerx/persistence";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRssSourceMutations } from "../hooks/use-rss-sources";
import { useRssSourceStore } from "../store";
import type { RssFilterMode } from "../types";
import { RssSourceEmptyState } from "./rss-source-empty-state";
import { RssSourceListItem } from "./rss-source-list-item";

type RssSourceListPanelProps = {
	readonly sources: readonly RssSourceRecord[];
	readonly isLoading: boolean;
};

function RssSourceListPanel({ sources, isLoading }: RssSourceListPanelProps) {
	const t = useTranslations("rssSourceManager");
	const tCommon = useTranslations("common");
	const filterMode = useRssSourceStore((s) => s.filterMode);
	const searchQuery = useRssSourceStore((s) => s.searchQuery);
	const setFilterMode = useRssSourceStore((s) => s.setFilterMode);
	const setSearchQuery = useRssSourceStore((s) => s.setSearchQuery);
	const selectedUrl = useRssSourceStore((s) => s.selectedSourceUrl);
	const selectSource = useRssSourceStore((s) => s.selectSource);
	const { enable } = useRssSourceMutations();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
				{tCommon("loading")}
			</div>
		);
	}

	if (sources.length === 0 && !searchQuery) {
		return <RssSourceEmptyState />;
	}

	return (
		<div className="flex h-full flex-col">
			{/* Search + Import Header */}
			<div className="border-b border-border p-3 space-y-2">
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t("searchPlaceholder")}
							className="h-8 pl-8 text-xs"
						/>
					</div>
					<button
						type="button"
						onClick={() => selectSource(null)}
						className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-2"
						aria-label={t("addSource")}
					>
						<Plus className="size-4" />
					</button>
				</div>
				<Tabs
					value={filterMode}
					onValueChange={(v) => setFilterMode(v as RssFilterMode)}
				>
					<TabsList className="h-7 w-full">
						<TabsTrigger value="all" className="text-xs flex-1">
							{t("filterAll")}
						</TabsTrigger>
						<TabsTrigger value="enabled" className="text-xs flex-1">
							{t("filterEnabled")}
						</TabsTrigger>
						<TabsTrigger value="disabled" className="text-xs flex-1">
							{t("filterDisabled")}
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Source count */}
			<div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
				{t("total", { count: sources.length })}
			</div>

			{/* Source List */}
			<div className="flex-1 overflow-y-auto">
				{sources.length === 0 ? (
					<div className="p-6 text-center text-sm text-muted-foreground">
						{t("noMatch")}
					</div>
				) : (
					sources.map((source) => (
						<RssSourceListItem
							key={source.sourceUrl}
							source={source}
							selected={source.sourceUrl === selectedUrl}
							onSelect={selectSource}
							onToggleEnabled={(url, enabled) =>
								enable.mutate({ url, enabled })
							}
						/>
					))
				)}
			</div>
		</div>
	);
}

export { RssSourceListPanel };
