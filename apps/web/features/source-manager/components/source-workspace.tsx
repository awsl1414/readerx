// features/source-manager/components/source-workspace.tsx

"use client";

import { useState } from "react";
import type { BookSourceRecord } from "@readerx/persistence";
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

	const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

	if (isMobile) {
		return (
			<MobileLayout
				sources={sources}
				isLoading={isLoading}
				selectedSource={selectedSource ?? null}
				importOpen={importOpen}
				setImportOpen={setImportOpen}
			/>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				height: "100vh",
				background: "oklch(0.12 0 0)",
				color: "oklch(0.9 0 0)",
			}}
		>
			{/* Layer 0: Source List */}
			<div
				style={{
					width: 280,
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

/** Mobile layout: stack navigation based on Zustand state. */
function MobileLayout({
	sources,
	isLoading,
	selectedSource,
	importOpen,
	setImportOpen,
}: {
	readonly sources: readonly BookSourceRecord[];
	readonly isLoading: boolean;
	readonly selectedSource: BookSourceRecord | null;
	readonly importOpen: boolean;
	readonly setImportOpen: (open: boolean) => void;
}) {
	const debuggerOpen = useSourceManagerStore((s) => s.debuggerOpen);
	const selectSource = useSourceManagerStore((s) => s.selectSource);
	const setDebuggerOpen = useSourceManagerStore((s) => s.setDebuggerOpen);

	return (
		<div
			style={{
				height: "100vh",
				background: "oklch(0.12 0 0)",
				color: "oklch(0.9 0 0)",
			}}
		>
			{debuggerOpen && selectedSource ? (
				<div>
					<button
						type="button"
						onClick={() => setDebuggerOpen(false)}
						style={{
							padding: 8,
							background: "transparent",
							border: "none",
							color: "oklch(0.7 0 0)",
							cursor: "pointer",
						}}
					>
						← 返回编辑
					</button>
					<SourceDebugger source={selectedSource} />
				</div>
			) : selectedSource ? (
				<div>
					<button
						type="button"
						onClick={() => selectSource(null)}
						style={{
							padding: 8,
							background: "transparent",
							border: "none",
							color: "oklch(0.7 0 0)",
							cursor: "pointer",
						}}
					>
						← 返回列表
					</button>
					<SourceEditor source={selectedSource} />
				</div>
			) : (
				<SourceList
					sources={sources}
					isLoading={isLoading}
					importOpen={importOpen}
					onImportOpen={() => setImportOpen(true)}
				/>
			)}
			<ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
		</div>
	);
}

export { SourceWorkspace };
