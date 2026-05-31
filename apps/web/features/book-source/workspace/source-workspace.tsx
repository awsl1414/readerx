"use client";

import type { RuleRecord } from "@readerx/schemas";
import { ArrowLeftIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RuleImportDialog } from "@/features/shared-rule-ui";
import { useSourceMutations } from "../hooks/use-source-mutations";
import { useSourceRules } from "../hooks/use-source-rules";
import { SourceEditorPanel } from "./source-editor-panel";
import { SourceListPanel } from "./source-list-panel";

function SourceWorkspace() {
	const t = useTranslations("sourceManager");
	const { data: sources = [], isLoading } = useSourceRules();
	const { importRules } = useSourceMutations();

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [importOpen, setImportOpen] = useState(false);
	const [mobileLayer, setMobileLayer] = useState<0 | 1>(0);

	const selectedSource = useMemo(
		() => sources.find((s) => s.id === selectedId),
		[sources, selectedId],
	);

	const enabledCount = useMemo(
		() => sources.filter((s) => s.enabled).length,
		[sources],
	);

	const handleSelect = (id: string) => {
		setSelectedId(id);
		setMobileLayer(1);
	};

	const handleDeselect = () => {
		setSelectedId(null);
		setMobileLayer(0);
	};

	const handleImport = (raw: string) => {
		try {
			const parsed = JSON.parse(raw);
			const records: RuleRecord<"book-source">[] = Array.isArray(parsed)
				? parsed.map((item: Record<string, unknown>, index: number) => ({
						id: String(item.id ?? crypto.randomUUID()),
						type: "book-source" as const,
						name: String(item.name ?? `Imported Source ${index + 1}`),
						enabled: true,
						tags: [],
						order: 0,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						data: item as RuleRecord<"book-source">["data"],
					}))
				: [];
			importRules.mutate(records);
		} catch {
			// Silently handle parse errors — the dialog shows preview
		}
	};

	return (
		<div className="flex h-full flex-col bg-background text-foreground">
			{/* Desktop layout: side-by-side */}
			<div className="flex flex-1 overflow-hidden">
				{/* Source List Panel */}
				<div
					className={
						"border-r border-border md:flex md:w-[300px] md:min-w-[300px] md:flex-col" +
						(mobileLayer === 0
							? " flex flex-col"
							: " hidden md:flex md:flex-col")
					}
				>
					{/* Import button */}
					<div className="flex items-center justify-between border-b border-border px-3 py-2">
						<span className="text-xs text-muted-foreground">
							{t("stats", { count: sources.length, enabled: enabledCount })}
						</span>
						<Button
							variant="outline"
							size="sm"
							className="text-xs"
							onClick={() => setImportOpen(true)}
						>
							<UploadIcon className="size-3.5" />
							{t("importLabel")}
						</Button>
					</div>
					<SourceListPanel
						sources={sources}
						isLoading={isLoading}
						selectedId={selectedId}
						onSelect={handleSelect}
						onImportOpen={() => setImportOpen(true)}
					/>
				</div>

				{/* Editor Panel */}
				<div
					className={
						"flex-1 overflow-hidden md:block" +
						(mobileLayer === 1 ? " block" : " hidden md:block")
					}
				>
					{/* Mobile back button */}
					{mobileLayer === 1 && selectedSource && (
						<div className="flex items-center border-b border-border px-2 py-1 md:hidden">
							<Button
								variant="ghost"
								size="icon"
								className="size-7"
								onClick={handleDeselect}
							>
								<ArrowLeftIcon className="size-4" />
							</Button>
							<span className="ml-2 text-sm font-medium truncate">
								{selectedSource.name}
							</span>
						</div>
					)}
					<SourceEditorPanel
						source={selectedSource}
						onDeselect={handleDeselect}
					/>
				</div>
			</div>

			{/* Footer status bar */}
			<div className="border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
				{t("stats", { count: sources.length, enabled: enabledCount })}
			</div>

			{/* Import Dialog */}
			<RuleImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				ruleType="book-source"
				onImport={handleImport}
				labels={{
					importLabel: t("importLabel"),
					cancelLabel: t("importClose"),
					uploadFileLabel: t("importSelectFile"),
				}}
			/>
		</div>
	);
}

export { SourceWorkspace };
