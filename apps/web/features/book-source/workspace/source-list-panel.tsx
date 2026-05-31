"use client";

import type { RuleRecord } from "@readerx/schemas";
import { BookOpenIcon, SearchIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SourceListPanelProps = {
	readonly sources: readonly RuleRecord<"book-source">[];
	readonly isLoading: boolean;
	readonly selectedId: string | null;
	readonly onSelect: (id: string) => void;
	readonly onImportOpen: () => void;
};

function getModuleTypes(source: RuleRecord<"book-source">): string[] {
	return source.data.modules.map((m) => m.type);
}

function SourceListPanel({
	sources,
	isLoading,
	selectedId,
	onSelect,
	onImportOpen,
}: SourceListPanelProps) {
	const t = useTranslations("sourceManager");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredSources = useMemo(() => {
		if (!searchQuery.trim()) return sources;
		const q = searchQuery.toLowerCase();
		return sources.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				s.data.baseUrl.toLowerCase().includes(q),
		);
	}, [sources, searchQuery]);

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
				{t("loading")}
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			{/* Search */}
			<div className="border-b border-border p-3">
				<div className="relative">
					<SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t("searchPlaceholder")}
						className="h-8 pl-8 text-xs"
					/>
				</div>
			</div>

			{/* 列表 / 空状态 */}
			<div className="flex-1 overflow-y-auto">
				{filteredSources.length === 0 ? (
					searchQuery ? (
						<div className="p-6 text-center text-sm text-muted-foreground">
							{t("noMatchResult")}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
							<div className="flex size-16 items-center justify-center rounded-full bg-surface-2">
								<BookOpenIcon className="size-8 text-muted-foreground" />
							</div>
							<h3 className="text-base font-medium">{t("emptyTitle")}</h3>
							<p className="text-sm text-muted-foreground">
								{t("emptyDescription")}
							</p>
							<Button variant="outline" size="sm" onClick={onImportOpen}>
								<UploadIcon className="size-3.5" />
								{t("emptyImport")}
							</Button>
						</div>
					)
				) : (
					filteredSources.map((source) => {
						const isSelected = source.id === selectedId;
						const moduleTypes = getModuleTypes(source);
						return (
							<button
								type="button"
								key={source.id}
								className={`w-full border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-accent ${
									isSelected ? "bg-accent" : ""
								}`}
								onClick={() => onSelect(source.id)}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="truncate text-sm font-medium">
										{source.name}
									</span>
									<div className="flex shrink-0 items-center gap-1.5">
										{source.data.weight != null && (
											<span className="text-muted-foreground text-xs">
												★{source.data.weight}
											</span>
										)}
										<Badge
											variant={source.enabled ? "default" : "outline"}
											className="text-[10px] px-1.5 py-0"
										>
											{source.enabled ? t("enabled") : t("disabled")}
										</Badge>
									</div>
								</div>
								<div className="mt-1 flex items-center gap-1">
									{moduleTypes.map((mt) => (
										<Badge
											key={mt}
											variant="secondary"
											className="text-[10px] px-1 py-0"
										>
											{mt}
										</Badge>
									))}
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
}

export { SourceListPanel };
