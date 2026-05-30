"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useSourceDetail } from "../hooks/use-source-detail";
import { useSources } from "../hooks/use-sources";
import { useSourceManagerStore } from "../store";
import { ImportDialog } from "./import-dialog";
import { SourceDebugger } from "./source-debugger";
import { SourceEditor } from "./source-editor";
import { SourceList } from "./source-list";

function SourceWorkspace() {
	const t = useTranslations("sourceManager");
	const selectedUrl = useSourceManagerStore((s) => s.selectedSourceUrl);
	const debuggerOpen = useSourceManagerStore((s) => s.debuggerOpen);
	const filterMode = useSourceManagerStore((s) => s.filterMode);
	const searchQuery = useSourceManagerStore((s) => s.searchQuery);
	const mobileLayer = useSourceManagerStore((s) => s.mobileLayer);

	const [importOpen, setImportOpen] = useState(false);

	const { data: allSources = [], isLoading } = useSources();
	const { data: selectedSource } = useSourceDetail(selectedUrl);

	// Client-side filtering based on filterMode and searchQuery
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
					s.bookSourceName.toLowerCase().includes(query) ||
					s.bookSourceUrl.toLowerCase().includes(query) ||
					(s.bookSourceGroup ?? "").toLowerCase().includes(query),
			);
		}

		return filtered;
	}, [allSources, filterMode, searchQuery]);

	return (
		<div className="flex h-full bg-background text-foreground">
			{/* Mobile: show only active layer */}
			{/* Desktop: always show list panel */}

			{/* Layer 0: Source List */}
			<div
				className={
					"border-r border-border md:flex md:w-[280px] md:min-w-[280px] md:flex-col" +
					(mobileLayer === 0 ? " flex flex-col" : " hidden md:flex md:flex-col")
				}
			>
				<SourceList
					sources={sources}
					isLoading={isLoading}
					onImportOpen={() => setImportOpen(true)}
				/>
			</div>

			{/* Layer 1: Source Editor */}
			<div
				className={
					"flex-1 overflow-hidden md:block" +
					(mobileLayer === 1 ? " block" : " hidden md:block")
				}
			>
				{selectedSource ? (
					<SourceEditor source={selectedSource} />
				) : (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
						{t("selectToEdit")}
					</div>
				)}
			</div>

			{/* Layer 2: Source Debugger (desktop: side panel, mobile: overlay) */}
			{debuggerOpen && selectedSource && (
				<div
					className={
						"w-[320px] border-l border-border" +
						(mobileLayer === 2
							? " fixed inset-0 z-40 w-full bg-background md:relative md:z-auto md:w-[320px]"
							: " hidden md:block")
					}
				>
					<SourceDebugger source={selectedSource} />
				</div>
			)}

			{/* Import Dialog */}
			<ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
		</div>
	);
}

export { SourceWorkspace };
