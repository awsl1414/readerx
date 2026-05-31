"use client";

import type { RuleRecord } from "@readerx/schemas";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

type SourceListPanelProps = {
	readonly sources: readonly RuleRecord<"book-source">[];
	readonly isLoading: boolean;
	readonly selectedId: string | null;
	readonly onSelect: (id: string) => void;
	readonly onImportOpen: () => void;
};

const TYPE_LABELS: Record<string, string> = {
	novel: "小说",
	audio: "音频",
	comic: "漫画",
	file: "文件",
};

function getModuleTypes(
	source: RuleRecord<"book-source">,
): string[] {
	return source.data.modules.map((m) => m.type);
}

function SourceListPanel({
	sources,
	isLoading,
	selectedId,
	onSelect,
}: SourceListPanelProps) {
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
				加载中...
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
						placeholder="搜索书源..."
						className="h-8 pl-8 text-xs"
					/>
				</div>
			</div>

			{/* List */}
			<div className="flex-1 overflow-y-auto">
				{filteredSources.length === 0 ? (
					<div className="p-6 text-center text-sm text-muted-foreground">
						{searchQuery ? "无匹配结果" : "暂无书源，点击导入"}
					</div>
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
											{source.enabled ? "启用" : "停用"}
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
