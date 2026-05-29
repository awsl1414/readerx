// features/source-manager/components/source-workspace.tsx

"use client";

import { useState } from "react";
import { useSourceDetail } from "../hooks/use-source-detail";
import { useSources } from "../hooks/use-sources";
import { useSourceManagerStore } from "../store";
import { ImportDialog } from "./import-dialog";
import { SourceDebugger } from "./source-debugger";
import { SourceEditor } from "./source-editor";
import { SourceList } from "./source-list";

function SourceWorkspace() {
	const selectedUrl = useSourceManagerStore((s) => s.selectedSourceUrl);
	const debuggerOpen = useSourceManagerStore((s) => s.debuggerOpen);
	const filterMode = useSourceManagerStore((s) => s.filterMode);
	const searchQuery = useSourceManagerStore((s) => s.searchQuery);
	const [importOpen, setImportOpen] = useState(false);

	const { data: sources = [], isLoading } = useSources({
		filterMode,
		searchQuery,
	});
	const { data: selectedSource } = useSourceDetail(selectedUrl);

	return (
		<div
			style={{
				display: "flex",
				height: "100%",
				background: "oklch(0.12 0 0)",
				color: "oklch(0.9 0 0)",
			}}
		>
			{/* Layer 0: Source List */}
			<div
				style={{
					width: 280,
					minWidth: 280,
					borderRight: "1px solid oklch(0.2 0 0)",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<SourceList
					sources={sources}
					isLoading={isLoading}
					importOpen={importOpen}
					onImportOpen={() => setImportOpen(true)}
				/>
			</div>

			{/* Layer 1: Source Editor */}
			<div style={{ flex: 1, overflow: "hidden" }}>
				{selectedSource ? (
					<SourceEditor source={selectedSource} />
				) : (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							height: "100%",
							color: "oklch(0.5 0 0)",
						}}
					>
						选择一个书源进行编辑
					</div>
				)}
			</div>

			{/* Layer 2: Source Debugger */}
			{debuggerOpen && selectedSource && (
				<div
					style={{
						width: 360,
						borderLeft: "1px solid oklch(0.2 0 0)",
					}}
				>
					<SourceDebugger source={selectedSource} />
				</div>
			)}

			{/* Import Dialog */}
			<ImportDialog
				open={importOpen}
				onClose={() => setImportOpen(false)}
			/>
		</div>
	);
}

export { SourceWorkspace };
