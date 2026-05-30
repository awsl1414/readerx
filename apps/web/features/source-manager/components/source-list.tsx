"use client";

import type { BookSourceRecord } from "@readerx/persistence";
import { useTranslations } from "next-intl";
import { useSourceCapabilities } from "../hooks/use-source-capabilities";
import { useSourceMutations } from "../hooks/use-sources";
import { useSourceManagerStore } from "../store";
import { SourceEmptyState } from "./source-empty-state";
import { SourceFilterBar } from "./source-filter-bar";
import { SourceListItem } from "./source-list-item";

type SourceListProps = {
	readonly sources: readonly BookSourceRecord[];
	readonly isLoading: boolean;
	readonly importOpen: boolean;
	readonly onImportOpen: () => void;
};

function SourceListItemWithCapabilities({
	source,
	selected,
}: {
	readonly source: BookSourceRecord;
	readonly selected: boolean;
}) {
	const capabilities = useSourceCapabilities(source);
	const { enable } = useSourceMutations();
	const selectSource = useSourceManagerStore((s) => s.selectSource);

	return (
		<SourceListItem
			source={source}
			capabilities={capabilities}
			selected={selected}
			onSelect={selectSource}
			onToggleEnabled={(url, enabled) => enable.mutate({ url, enabled })}
		/>
	);
}

function SourceList({ sources, isLoading, onImportOpen }: SourceListProps) {
	const t = useTranslations("sourceManager");
	const tCommon = useTranslations("common");
	const filterMode = useSourceManagerStore((s) => s.filterMode);
	const searchQuery = useSourceManagerStore((s) => s.searchQuery);
	const setFilterMode = useSourceManagerStore((s) => s.setFilterMode);
	const setSearchQuery = useSourceManagerStore((s) => s.setSearchQuery);
	const selectedUrl = useSourceManagerStore((s) => s.selectedSourceUrl);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
				{tCommon("loading")}
			</div>
		);
	}

	if (sources.length === 0 && !searchQuery) {
		return <SourceEmptyState onImport={onImportOpen} />;
	}

	return (
		<div className="flex h-full flex-col">
			<SourceFilterBar
				filterMode={filterMode}
				searchQuery={searchQuery}
				onFilterChange={setFilterMode}
				onSearchChange={setSearchQuery}
				onImport={onImportOpen}
			/>
			<div className="flex-1 overflow-y-auto">
				{sources.length === 0 ? (
					<div className="p-6 text-center text-sm text-muted-foreground">
						{t("noMatch")}
					</div>
				) : (
					sources.map((source) => (
						<SourceListItemWithCapabilities
							key={source.bookSourceUrl}
							source={source}
							selected={source.bookSourceUrl === selectedUrl}
						/>
					))
				)}
			</div>
		</div>
	);
}

export { SourceList };
