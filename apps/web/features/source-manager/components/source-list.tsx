// features/source-manager/components/source-list.tsx

"use client";

import type { BookSourceRecord } from "@readerx/persistence";
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

function SourceList({
	sources,
	isLoading,
	importOpen,
	onImportOpen,
}: SourceListProps) {
	const filterMode = useSourceManagerStore((s) => s.filterMode);
	const searchQuery = useSourceManagerStore((s) => s.searchQuery);
	const setFilterMode = useSourceManagerStore((s) => s.setFilterMode);
	const setSearchQuery = useSourceManagerStore((s) => s.setSearchQuery);
	const selectedUrl = useSourceManagerStore((s) => s.selectedSourceUrl);

	if (isLoading) {
		return (
			<div style={{ padding: 24, color: "oklch(0.5 0 0)", textAlign: "center" }}>
				加载中...
			</div>
		);
	}

	if (sources.length === 0 && !searchQuery) {
		return <SourceEmptyState onImport={onImportOpen} />;
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<SourceFilterBar
				filterMode={filterMode}
				searchQuery={searchQuery}
				onFilterChange={setFilterMode}
				onSearchChange={setSearchQuery}
				onImport={onImportOpen}
			/>
			<div style={{ flex: 1, overflow: "auto" }}>
				{sources.length === 0 ? (
					<div style={{ padding: 24, color: "oklch(0.5 0 0)", textAlign: "center" }}>
						未找到匹配的书源
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
