"use client";

import type { RuleRecord, RuleType } from "@readerx/schemas";
import { PlusIcon, SearchIcon, TrashIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

type RuleListProps<T extends RuleType = RuleType> = {
	readonly items: readonly RuleRecord<T>[];
	readonly onSearch?: (query: string) => void;
	readonly onToggle?: (id: string, enabled: boolean) => void;
	readonly onEdit?: (id: string) => void;
	readonly onDelete?: (id: string) => void;
	readonly onAdd?: () => void;
	readonly onBatchDelete?: (ids: readonly string[]) => void;
	readonly selectedIds?: ReadonlySet<string>;
	readonly onSelectionChange?: (ids: Set<string>) => void;
	readonly className?: string;
	readonly isLoading?: boolean;
	readonly emptyMessage?: string;
};

function RuleList<T extends RuleType = RuleType>({
	items,
	onSearch: _onSearch,
	onToggle,
	onEdit,
	onDelete,
	onAdd,
	onBatchDelete,
	selectedIds: controlledSelected,
	onSelectionChange,
	className,
	isLoading,
	emptyMessage = "No rules found.",
}: RuleListProps<T>) {
	const [searchQuery, setSearchQuery] = useState("");
	const [internalSelected, setInternalSelected] = useState<Set<string>>(
		new Set(),
	);

	const selected = controlledSelected ?? internalSelected;

	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) return items;
		const q = searchQuery.toLowerCase();
		return items.filter(
			(item) =>
				item.name.toLowerCase().includes(q) ||
				item.tags.some((tag) => tag.toLowerCase().includes(q)),
		);
	}, [items, searchQuery]);

	const handleSearch = (value: string) => {
		setSearchQuery(value);
		_onSearch?.(value);
	};

	const toggleSelect = (id: string) => {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		if (onSelectionChange) {
			onSelectionChange(next);
		} else {
			setInternalSelected(next);
		}
	};

	const handleBatchDelete = () => {
		if (selected.size > 0 && onBatchDelete) {
			onBatchDelete([...selected]);
			const next = new Set<string>();
			if (onSelectionChange) {
				onSelectionChange(next);
			} else {
				setInternalSelected(next);
			}
		}
	};

	if (isLoading) {
		return (
			<div className={cn("flex items-center justify-center py-12", className)}>
				<p className="text-muted-foreground text-sm">Loading...</p>
			</div>
		);
	}

	return (
		<div className={cn("flex h-full flex-col", className)}>
			{/* Search bar */}
			<div className="flex items-center gap-2 px-4 py-3">
				<div className="relative flex-1">
					<SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
					<Input
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						placeholder="Search rules..."
						className="pl-8"
					/>
				</div>
				{onAdd && (
					<Button size="sm" onClick={onAdd}>
						<PlusIcon />
						Add
					</Button>
				)}
			</div>

			{/* Batch actions toolbar */}
			{selected.size > 0 && (
				<div className="border-border bg-muted/50 flex items-center gap-2 border-b px-4 py-2">
					<span className="text-muted-foreground text-xs">
						{selected.size} selected
					</span>
					<div className="flex-1" />
					{onBatchDelete && (
						<Button variant="destructive" size="sm" onClick={handleBatchDelete}>
							<TrashIcon className="size-3.5" />
							Delete
						</Button>
					)}
				</div>
			)}

			{/* List */}
			<ScrollArea className="flex-1">
				{filteredItems.length === 0 ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-muted-foreground text-sm">{emptyMessage}</p>
					</div>
				) : (
					<div className="divide-y divide-border">
						{filteredItems.map((item) => (
							<button
								key={item.id}
								type="button"
								className={cn(
									"flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
									selected.has(item.id)
										? "bg-accent"
										: "hover:bg-muted/50 cursor-pointer",
								)}
								onClick={() => onEdit?.(item.id)}
							>
								{onSelectionChange && (
									<input
										type="checkbox"
										checked={selected.has(item.id)}
										onChange={() => toggleSelect(item.id)}
										onClick={(e) => e.stopPropagation()}
										className="size-3.5"
									/>
								)}

								<div className="min-w-0 flex-1">
									<p className="text-foreground truncate text-sm font-medium">
										{item.name}
									</p>
									{item.tags.length > 0 && (
										<div className="mt-0.5 flex flex-wrap gap-1">
											{item.tags.slice(0, 3).map((tag) => (
												<Badge
													key={tag}
													variant="outline"
													className="text-[10px]"
												>
													{tag}
												</Badge>
											))}
											{item.tags.length > 3 && (
												<span className="text-muted-foreground text-[10px]">
													+{item.tags.length - 3}
												</span>
											)}
										</div>
									)}
								</div>

								{!item.enabled && (
									<Badge
										variant="outline"
										className="text-muted-foreground shrink-0"
									>
										Off
									</Badge>
								)}

								{onToggle && (
									<Switch
										checked={item.enabled}
										onCheckedChange={(checked: boolean) =>
											onToggle(item.id, checked)
										}
										onClick={(e: React.MouseEvent) => e.stopPropagation()}
										size="sm"
										aria-label="Toggle enabled"
										className="shrink-0"
									/>
								)}

								{onDelete && (
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive shrink-0"
										onClick={(e) => {
											e.stopPropagation();
											onDelete(item.id);
										}}
										aria-label={`Delete ${item.name}`}
									>
										<TrashIcon className="size-3.5" />
									</Button>
								)}
							</button>
						))}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}

export type { RuleListProps };
export { RuleList };
