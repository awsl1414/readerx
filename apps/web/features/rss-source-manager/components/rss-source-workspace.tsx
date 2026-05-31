"use client";

import type { RssSourceRecord } from "@readerx/persistence";
import { UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RuleImportDialog } from "@/features/shared-rule-ui";
import { useRssSourceDetail } from "../hooks/use-rss-source-detail";
import { useRssSourceMutations, useRssSources } from "../hooks/use-rss-sources";
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
	const { saveBatch } = useRssSourceMutations();

	const [importOpen, setImportOpen] = useState(false);

	// 客户端过滤
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

	const handleImport = (raw: string) => {
		try {
			const parsed: unknown = JSON.parse(raw);
			const records: RssSourceRecord[] = Array.isArray(parsed)
				? parsed.map((item: Record<string, unknown>) => ({
						sourceUrl: String(item.sourceUrl ?? ""),
						sourceName: String(item.sourceName ?? "未命名"),
						sourceGroup: String(item.sourceGroup ?? ""),
						enabled: true,
						articleStyle: 0,
						customOrder: 0,
						createdAt: Date.now(),
						updatedAt: Date.now(),
						raw: item as Record<string, unknown>,
					}))
				: [];
			saveBatch.mutate(records);
		} catch {
			// 解析错误由对话框预览处理
		}
	};

	const enabledCount = useMemo(
		() => sources.filter((s) => s.enabled).length,
		[sources],
	);

	return (
		<div className="flex h-full flex-col bg-background text-foreground">
			<div className="flex flex-1 overflow-hidden">
				{/* 订阅源列表面板 */}
				<div
					className={
						"border-r border-border md:flex md:w-[280px] md:min-w-[280px] md:flex-col" +
						(mobileLayer === 0
							? " flex flex-col"
							: " hidden md:flex md:flex-col")
					}
				>
					{/* 导入按钮 */}
					<div className="flex items-center justify-between border-b border-border px-3 py-2">
						<span className="text-xs text-muted-foreground">
							{t("total", { count: sources.length })}
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

					<RssSourceListPanel
						sources={sources}
						isLoading={isLoading}
						onImportOpen={() => setImportOpen(true)}
					/>
				</div>

				{/* 编辑面板 */}
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

			{/* 底部状态栏 */}
			<div className="border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
				{t("total", { count: sources.length })} · {enabledCount} 已启用
			</div>

			{/* 导入对话框 */}
			<RuleImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				ruleType="rss-source"
				onImport={handleImport}
				labels={{
					titleLabel: t("importTitle"),
					importLabel: t("importLabel"),
					cancelLabel: t("cancelLabel"),
					uploadFileLabel: t("uploadFileLabel"),
				}}
			/>
		</div>
	);
}

export { RssSourceWorkspace };
