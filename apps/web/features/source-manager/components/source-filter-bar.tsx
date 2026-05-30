"use client";

import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilterMode } from "../types";

type SourceFilterBarProps = {
	readonly filterMode: FilterMode;
	readonly searchQuery: string;
	readonly onFilterChange: (mode: FilterMode) => void;
	readonly onSearchChange: (query: string) => void;
	readonly onImport: () => void;
};

function SourceFilterBar({
	filterMode,
	searchQuery,
	onFilterChange,
	onSearchChange,
	onImport,
}: SourceFilterBarProps) {
	const t = useTranslations("sourceManager");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleSearch = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => onSearchChange(value), 300);
		},
		[onSearchChange],
	);

	// Cleanup debounce timer on unmount
	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	return (
		<div className="flex flex-col gap-2 p-3">
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					placeholder={t("searchPlaceholder")}
					defaultValue={searchQuery}
					onChange={handleSearch}
					className="h-8 pl-8 text-xs"
				/>
			</div>
			<Tabs
				value={filterMode}
				onValueChange={(v) => onFilterChange(v as FilterMode)}
			>
				<TabsList className="h-7 w-full">
					<TabsTrigger value="all" className="text-xs flex-1">
						{t("filterAll")}
					</TabsTrigger>
					<TabsTrigger value="enabled" className="text-xs flex-1">
						{t("filterEnabled")}
					</TabsTrigger>
					<TabsTrigger value="disabled" className="text-xs flex-1">
						{t("filterDisabled")}
					</TabsTrigger>
				</TabsList>
			</Tabs>
			<Button variant="outline" size="sm" onClick={onImport} className="w-full">
				<Plus className="size-3.5" />
				{t("import")}
			</Button>
		</div>
	);
}

export { SourceFilterBar };
